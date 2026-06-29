import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike, In } from 'typeorm';
import { createClient } from '@supabase/supabase-js';
import { AccidentReport } from '../entities/accident-report.entity';
import { Business } from '../entities/business.entity';
import { ReportConfig } from '../entities/report-config.entity';
import { User } from '../entities/user.entity';
import {
  AccidentReportQueryDto,
  SummaryQueryDto,
  CreateEnterpriseReportDto,
  UpdateEnterpriseReportDto,
} from '../../libs/shared/models/accident-report.dto';

const STATUS_DRAFT = 'Đang báo cáo';
const STATUS_SUBMITTED = 'Đã nộp';
const STATUS_APPROVED = 'Đã tiếp nhận';
const STATUS_REJECTED = 'Từ chối';

@Injectable()
export class AccidentReportService {
  private supabaseAdmin = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!,
  );

  constructor(
    @InjectRepository(AccidentReport)
    private readonly repo: Repository<AccidentReport>,
    @InjectRepository(Business)
    private readonly businessRepo: Repository<Business>,
    @InjectRepository(ReportConfig)
    private readonly configRepo: Repository<ReportConfig>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  async uploadReportFile(
    file: Express.Multer.File,
    userId: string,
  ): Promise<string> {
    const business = await this.resolveBusiness(userId);
    const taxCode = business.taxCode;
    const ext = file.originalname.split('.').pop();
    const fileName = `report-${taxCode}-${Date.now()}.${ext}`;
    const fileBlob = new Blob([new Uint8Array(file.buffer)], {
      type: file.mimetype,
    });

    const { error } = await this.supabaseAdmin.storage
      .from('businesses')
      .upload(fileName, fileBlob, { contentType: file.mimetype, upsert: true });

    if (error) {
      throw new BadRequestException('Lỗi khi tải file lên hệ thống!');
    }

    const { data } = this.supabaseAdmin.storage
      .from('businesses')
      .getPublicUrl(fileName);

    return data.publicUrl;
  }

  // ===== Màn hình Sở =====

  async findAll(query: AccidentReportQueryDto) {
    const { page = 1, pageSize = 10, ten, mst, ky, tt, nam } = query;

    const where: Record<string, unknown> = {};
    if (ten) where.ten = ILike(`%${ten}%`);
    if (mst) where.mst = ILike(`%${mst}%`);
    if (ky) where.ky = ky;
    if (tt) where.status = tt;
    // Lọc theo năm: báo cáo gắn config_id, mà report_configs có cột nam.
    if (nam) {
      const configs = await this.configRepo.find({ where: { nam } });
      if (configs.length === 0) return { data: [], total: 0, page, pageSize };
      where.configId = In(configs.map((c) => c.id));
    }

    const [data, total] = await this.repo.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    const configIds = [...new Set(data.map((r) => r.configId))];
    const configs = configIds.length
      ? await this.configRepo.find({ where: { id: In(configIds) } })
      : [];
    const namByConfig = new Map(configs.map((c) => [c.id, c.nam]));

    return {
      data: data.map((r) =>
        this.toListItem(r, namByConfig.get(r.configId) ?? null),
      ),
      total,
      page,
      pageSize,
    };
  }

  async findOne(id: number) {
    const report = await this.repo.findOne({ where: { id } });
    if (!report) throw new NotFoundException('Không tìm thấy báo cáo');

    return report;
  }

  async approve(id: number, userId?: string): Promise<{ message: string }> {
    const report = await this.repo.findOne({ where: { id } });
    if (!report) throw new NotFoundException('Không tìm thấy báo cáo');

    const fullName = userId ? await this.lookupFullName(userId) : null;
    report.status = STATUS_APPROVED;
    report.acceptedAt = new Date();
    report.acceptedBy = fullName;
    await this.repo.save(report);
    return { message: 'Đã tiếp nhận báo cáo' };
  }

  async approveMany(ids: number[], userId?: string): Promise<{ message: string }> {
    if (ids.length === 0) return { message: 'Không có báo cáo nào được chọn' };
    const fullName = userId ? await this.lookupFullName(userId) : null;
    await this.repo
      .createQueryBuilder()
      .update(AccidentReport)
      .set({
        status: STATUS_APPROVED,
        acceptedAt: new Date(),
        acceptedBy: fullName,
      } as never)
      .whereInIds(ids)
      .execute();
    return { message: `Đã duyệt ${ids.length} báo cáo` };
  }

  async rejectMany(
    ids: number[],
    reason: string,
    userId?: string,
  ): Promise<{ message: string }> {
    if (ids.length === 0) return { message: 'Không có báo cáo nào được chọn' };
    const fullName = userId ? await this.lookupFullName(userId) : null;
    await this.repo
      .createQueryBuilder()
      .update(AccidentReport)
      .set({
        status: STATUS_REJECTED,
        rejectionReason: reason || '—',
        rejectedAt: new Date(),
        rejectedBy: fullName,
      } as never)
      .whereInIds(ids)
      .execute();
    return { message: `Đã từ chối ${ids.length} báo cáo` };
  }

  async remove(id: number): Promise<{ message: string }> {
    const report = await this.repo.findOne({ where: { id } });
    if (!report) throw new NotFoundException('Không tìm thấy báo cáo');
    await this.repo.remove(report);
    return { message: 'Xóa thành công' };
  }


  async getSummary(query: SummaryQueryDto): Promise<{
    rows: Record<string, number[]>;
    phanLoai: Record<string, number[]>;
  }> {
    const { nam, ky } = query;

    const where: Record<string, unknown> = {};
    if (ky) where.ky = ky;
    if (nam) {
      const configs = await this.configRepo.find({ where: { nam } });
      where.configId = In(configs.map((c) => c.id));
      if (configs.length === 0) return { rows: {}, phanLoai: {} };
    }

    const reports = await this.repo.find({ where });
    return {
      rows: this.sumKeyedRows(reports.map((r) => r.rows)),
      phanLoai: this.sumKeyedRows(reports.map((r) => r.phanLoaiRows)),
    };
  }

  // ===== Màn hình Doanh nghiệp =====

  async findMy(userId: string) {
    const business = await this.resolveBusiness(userId);
    const reports = await this.repo.find({
      where: { enterpriseId: business.id },
      order: { createdAt: 'DESC' },
    });
    // Năm báo cáo nằm ở report_configs.nam (gắn qua config_id) — nạp 1 lượt để
    // gắn nam vào từng record cho FE lọc theo năm.
    const configIds = [...new Set(reports.map((r) => r.configId))];
    const configs = configIds.length
      ? await this.configRepo.find({ where: { id: In(configIds) } })
      : [];
    const namByConfig = new Map(configs.map((c) => [c.id, c.nam]));
    return reports.map((r) =>
      this.toDnRecord(r, namByConfig.get(r.configId) ?? null),
    );
  }

  async findMyOne(userId: string, id: number) {
    const business = await this.resolveBusiness(userId);
    const report = await this.repo.findOne({ where: { id } });
    if (!report) throw new NotFoundException('Không tìm thấy báo cáo');
    if (report.enterpriseId !== business.id)
      throw new ForbiddenException('Không có quyền xem báo cáo này');

    return {
      ...this.toDnRecord(report),
      form: {
        configId: report.configId,
        tongSoRows: report.rows,
        chiTietRows: report.chiTietRows,
        phanLoaiRows: report.phanLoaiRows ?? {},
        tongHop: {
          soLaoDong: report.soLaoDong,
          soLDCoBaoHiem: report.soLDCoBaoHiem,
          soLDNu: report.soLDNu,
          soVu: report.soVu,
          soVuCoNguoiChet: report.soVuCoNguoiChet,
          soVuCo2NguoiBiNan: report.soVuCo2NguoiBiNan,
          soNguoiBiNan: report.soNguoiBiNan,
          soNguoiBiChet: report.soNguoiBiChet,
          soNguoiBiThuongNang: report.soNguoiBiThuongNang,
          soNgayNghi: report.soNgayNghi,
          tongSoTien: report.tongSoTien,
          chiPhiYTe: report.chiPhiYTe,
          chiPhiTraLuong: report.chiPhiTraLuong,
          boiThuongTroCap: report.boiThuongTroCap,
          thiethaiTaiSan: report.thiethaiTaiSan,
        },
      },
    };
  }

  async create(userId: string, dto: CreateEnterpriseReportDto) {
    const business = await this.resolveBusiness(userId);
    let config = null;
    if (dto.configId) {
      config = await this.configRepo.findOne({
        where: { id: dto.configId },
      });
    } else if (dto.nam && dto.ky) {
      config = await this.configRepo.findOne({
        where: { nam: dto.nam, ky: dto.ky },
      });
      if (!config) {
        const batDau =
          dto.ky === '6 tháng' ? `01/07/${dto.nam}` : `15/12/${dto.nam}`;
        const ketThuc =
          dto.ky === '6 tháng'
            ? `05/07/${dto.nam}`
            : `10/01/${Number(dto.nam) + 1}`;
        config = this.configRepo.create({
          nam: dto.nam,
          ky: dto.ky,
          ten: `Báo cáo TNLĐ ${dto.nam} (${dto.ky})`,
          batDau,
          ketThuc,
          active: true,
        });
        config = await this.configRepo.save(config);
      }
    }
    if (!config)
      throw new NotFoundException('Không tìm thấy kỳ báo cáo tương ứng');

    const status = dto.status ?? STATUS_SUBMITTED;
    const report = this.repo.create({
      enterpriseId: business.id,
      configId: config.id,
      ten: business.businessName,
      mst: business.taxCode,
      ky: config.ky,
      status,
      rows: dto.tongSoRows,
      chiTietRows: dto.chiTietRows as AccidentReport['chiTietRows'],
      phanLoaiRows: dto.phanLoaiRows ?? {},
      province: business.registeredProvince,
      ward: business.registeredWard,
      loaiHinh: business.businessType,
      submittedAt: status === STATUS_DRAFT ? null : new Date(),
    });
    this.applyTongHop(report, dto);
    const saved = await this.repo.save(report);
    return this.toDnRecord(saved);
  }

  async update(userId: string, id: number, dto: UpdateEnterpriseReportDto) {
    const business = await this.resolveBusiness(userId);
    const report = await this.repo.findOne({ where: { id } });
    if (!report) throw new NotFoundException('Không tìm thấy báo cáo');
    if (report.enterpriseId !== business.id)
      throw new ForbiddenException('Không có quyền sửa báo cáo này');

    if (dto.configId !== undefined) report.configId = dto.configId;
    if (dto.tongSoRows !== undefined) report.rows = dto.tongSoRows;
    if (dto.chiTietRows !== undefined)
      report.chiTietRows = dto.chiTietRows as AccidentReport['chiTietRows'];
    if (dto.phanLoaiRows !== undefined) report.phanLoaiRows = dto.phanLoaiRows;
    if (dto.status !== undefined) {
      report.status = dto.status;
      if (dto.status !== STATUS_DRAFT && !report.submittedAt)
        report.submittedAt = new Date();
    }
    this.applyTongHop(report, dto);

    const saved = await this.repo.save(report);
    return this.toDnRecord(saved);
  }

  // ===== Helpers =====

  // Gán các trường số liệu tổng hợp (chỉ field nào được gửi lên).
  private applyTongHop(
    report: AccidentReport,
    dto: UpdateEnterpriseReportDto,
  ): void {
    if (dto.soLaoDong !== undefined) report.soLaoDong = dto.soLaoDong;
    if (dto.soLDCoBaoHiem !== undefined)
      report.soLDCoBaoHiem = dto.soLDCoBaoHiem;
    if (dto.soLDNu !== undefined) report.soLDNu = dto.soLDNu;
    if (dto.soVu !== undefined) report.soVu = dto.soVu;
    if (dto.soVuCoNguoiChet !== undefined)
      report.soVuCoNguoiChet = dto.soVuCoNguoiChet;
    if (dto.soVuCo2NguoiBiNan !== undefined)
      report.soVuCo2NguoiBiNan = dto.soVuCo2NguoiBiNan;
    if (dto.soNguoiBiNan !== undefined) report.soNguoiBiNan = dto.soNguoiBiNan;
    if (dto.soNguoiBiChet !== undefined)
      report.soNguoiBiChet = dto.soNguoiBiChet;
    if (dto.soNguoiBiThuongNang !== undefined)
      report.soNguoiBiThuongNang = dto.soNguoiBiThuongNang;
    if (dto.soNgayNghi !== undefined) report.soNgayNghi = dto.soNgayNghi;
    if (dto.tongSoTien !== undefined) report.tongSoTien = dto.tongSoTien;
    if (dto.chiPhiYTe !== undefined) report.chiPhiYTe = dto.chiPhiYTe;
    if (dto.chiPhiTraLuong !== undefined)
      report.chiPhiTraLuong = dto.chiPhiTraLuong;
    if (dto.boiThuongTroCap !== undefined)
      report.boiThuongTroCap = dto.boiThuongTroCap;
    if (dto.thiethaiTaiSan !== undefined)
      report.thiethaiTaiSan = dto.thiethaiTaiSan;
    if (dto.fileUrl !== undefined) report.fileUrl = dto.fileUrl;
  }

  private async lookupFullName(userId: string): Promise<string | null> {
    const user = await this.userRepo.findOne({
      where: { id: userId as any },
      select: { fullName: true },
    });
    return user?.fullName ?? null;
  }

  private async resolveBusiness(userId: string): Promise<Business> {
    const business = await this.businessRepo.findOne({
      where: { accountId: userId },
    });
    if (!business)
      throw new ForbiddenException('Tài khoản không gắn với doanh nghiệp nào');
    return business;
  }

  private toListItem(r: AccidentReport, nam: string | null = null) {
    return {
      id: r.id,
      enterpriseId: r.enterpriseId,
      ten: r.ten,
      mst: r.mst,
      ky: r.ky,
      nam,
      tt: r.status,
      province: r.province,
      ward: r.ward,
      loaiHinh: r.loaiHinh,
      rows: r.rows ?? {},
      phanLoaiRows: r.phanLoaiRows ?? {},
      soLaoDong: r.soLaoDong,
      soLDCoBaoHiem: r.soLDCoBaoHiem,
      soVu: r.soVu,
      soVuCoNguoiChet: r.soVuCoNguoiChet,
      soVuCo2NguoiBiNan: r.soVuCo2NguoiBiNan,
      soNguoiBiNan: r.soNguoiBiNan,
      soLDNu: r.soLDNu,
      soNguoiBiChet: r.soNguoiBiChet,
      soNguoiBiThuongNang: r.soNguoiBiThuongNang,
      soNgayNghi: r.soNgayNghi,
      tongSoTien: r.tongSoTien,
      chiPhiYTe: r.chiPhiYTe,
      chiPhiTraLuong: r.chiPhiTraLuong,
      boiThuongTroCap: r.boiThuongTroCap,
      thiethaiTaiSan: r.thiethaiTaiSan,
      rejectionReason: r.rejectionReason,
      acceptedAt: r.acceptedAt,
      acceptedBy: r.acceptedBy,
      rejectedAt: r.rejectedAt,
      rejectedBy: r.rejectedBy,
      submittedAt: r.submittedAt,
      fileUrl: r.fileUrl,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    };
  }

  private toDnRecord(r: AccidentReport, nam: string | null = null) {
    return {
      id: r.id,
      ten: r.ten,
      mst: r.mst,
      ky: r.ky,
      nam,
      tt: r.status,
      configId: r.configId,
      rejectionReason: r.rejectionReason,
      acceptedAt: r.acceptedAt,
      acceptedBy: r.acceptedBy,
      rejectedAt: r.rejectedAt,
      rejectedBy: r.rejectedBy,
      submittedAt: r.submittedAt,
      fileUrl: r.fileUrl,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    };
  }

  // Cộng dồn nhiều map keyed-by-string → number[] theo từng vị trí cột.
  private sumKeyedRows(
    maps: (Record<string, number[]> | null | undefined)[],
  ): Record<string, number[]> {
    const totals: Record<string, number[]> = {};
    for (const map of maps) {
      if (!map) continue;
      for (const [key, values] of Object.entries(map)) {
        if (!Array.isArray(values)) continue;
        if (!totals[key]) totals[key] = values.map(() => 0);
        values.forEach((v, i) => {
          totals[key][i] = (totals[key][i] ?? 0) + (Number(v) || 0);
        });
      }
    }
    return totals;
  }
}
