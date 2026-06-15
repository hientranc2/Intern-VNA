import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike, In } from 'typeorm';
import { AccidentReport } from '../entities/accident-report.entity';
import { Business } from '../entities/business.entity';
import { ReportConfig } from '../entities/report-config.entity';
import {
  AccidentReportQueryDto,
  SummaryQueryDto,
  CreateEnterpriseReportDto,
  UpdateEnterpriseReportDto,
} from '../../libs/shared/models/accident-report.dto';

const STATUS_SUBMITTED = 'Đã nộp';
const STATUS_APPROVED = 'Đã tiếp nhận';

@Injectable()
export class AccidentReportService {
  constructor(
    @InjectRepository(AccidentReport)
    private readonly repo: Repository<AccidentReport>,
    @InjectRepository(Business)
    private readonly businessRepo: Repository<Business>,
    @InjectRepository(ReportConfig)
    private readonly configRepo: Repository<ReportConfig>,
  ) {}

  // ===== Màn hình Sở =====

  async findAll(query: AccidentReportQueryDto) {
    const { page = 1, pageSize = 10, ten, mst, ky, tt } = query;

    const where: Record<string, unknown> = {};
    if (ten) where.ten = ILike(`%${ten}%`);
    if (mst) where.mst = ILike(`%${mst}%`);
    if (ky) where.ky = ky;
    if (tt) where.status = tt;

    const [data, total] = await this.repo.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    return {
      data: data.map((r) => this.toListItem(r)),
      total,
      page,
      pageSize,
    };
  }

  async findOne(id: number) {
    const report = await this.repo.findOne({ where: { id } });
    if (!report) throw new NotFoundException('Không tìm thấy báo cáo');

    return {
      id: report.id,
      enterpriseId: report.enterpriseId,
      configId: report.configId,
      rows: report.rows,
      submittedAt: report.submittedAt,
      status: report.status,
    };
  }

  async approve(id: number): Promise<{ message: string }> {
    const report = await this.repo.findOne({ where: { id } });
    if (!report) throw new NotFoundException('Không tìm thấy báo cáo');

    report.status = STATUS_APPROVED;
    await this.repo.save(report);
    return { message: 'Đã tiếp nhận báo cáo' };
  }

  async getSummary(query: SummaryQueryDto): Promise<{
    rows: Record<string, number[]>;
  }> {
    const { nam, ky } = query;

    const where: Record<string, unknown> = {};
    if (ky) where.ky = ky;
    if (nam) {
      const configs = await this.configRepo.find({ where: { nam } });
      where.configId = In(configs.map((c) => c.id));
      if (configs.length === 0) return { rows: {} };
    }

    const reports = await this.repo.find({ where });
    return { rows: this.aggregateRows(reports) };
  }

  // ===== Màn hình Doanh nghiệp =====

  async findMy(userId: string) {
    const business = await this.resolveBusiness(userId);
    const reports = await this.repo.find({
      where: { enterpriseId: business.id },
      order: { createdAt: 'DESC' },
    });
    return reports.map((r) => this.toDnRecord(r));
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
      },
    };
  }

  async create(userId: string, dto: CreateEnterpriseReportDto) {
    const business = await this.resolveBusiness(userId);
    const config = await this.configRepo.findOne({
      where: { id: dto.configId },
    });
    if (!config)
      throw new NotFoundException('Không tìm thấy kỳ báo cáo tương ứng');

    const report = this.repo.create({
      enterpriseId: business.id,
      configId: dto.configId,
      ten: business.businessName,
      mst: business.taxCode,
      ky: config.ky,
      status: STATUS_SUBMITTED,
      rows: dto.tongSoRows,
      chiTietRows: dto.chiTietRows as AccidentReport['chiTietRows'],
      province: business.registeredProvince,
      ward: business.registeredWard,
      loaiHinh: business.businessType,
      submittedAt: new Date(),
    });
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

    const saved = await this.repo.save(report);
    return this.toDnRecord(saved);
  }

  // ===== Helpers =====

  private async resolveBusiness(userId: string): Promise<Business> {
    const business = await this.businessRepo.findOne({
      where: { accountId: userId },
    });
    if (!business)
      throw new ForbiddenException('Tài khoản không gắn với doanh nghiệp nào');
    return business;
  }

  private toListItem(r: AccidentReport) {
    return {
      id: r.id,
      ten: r.ten,
      mst: r.mst,
      ky: r.ky,
      tt: r.status,
      province: r.province,
      ward: r.ward,
      loaiHinh: r.loaiHinh,
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
    };
  }

  private toDnRecord(r: AccidentReport) {
    return {
      id: r.id,
      ten: r.ten,
      mst: r.mst,
      ky: r.ky,
      tt: r.status,
      configId: r.configId,
    };
  }

  private aggregateRows(reports: AccidentReport[]): Record<string, number[]> {
    const totals: Record<string, number[]> = {};
    for (const report of reports) {
      const rows = report.rows ?? {};
      for (const [key, values] of Object.entries(rows)) {
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
