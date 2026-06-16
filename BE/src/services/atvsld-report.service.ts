import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike, In } from 'typeorm';
import { AtvsldReport } from '../entities/atvsld-report.entity';
import { Business } from '../entities/business.entity';
import {
  AtvsldReportQueryDto,
  MyAtvsldReportQueryDto,
  CreateAtvsldReportDto,
  UpdateAtvsldReportDto,
} from '../../libs/shared/models/atvsld-report.dto';

const STATUS_DRAFT = 'Nhập liệu';
const STATUS_SUBMITTED = 'Chờ tiếp nhận';
const STATUS_REJECTED = 'Từ chối';
const STATUS_DONE = 'Hoàn thành';

@Injectable()
export class AtvsldReportService {
  constructor(
    @InjectRepository(AtvsldReport)
    private readonly repo: Repository<AtvsldReport>,
    @InjectRepository(Business)
    private readonly businessRepo: Repository<Business>,
  ) {}

  // ===== Role Sở =====

  async findAll(query: AtvsldReportQueryDto) {
    const { page = 1, pageSize = 10, nam, ten, mst, ward, status } = query;

    const where: Record<string, unknown> = {};
    if (nam) where.nam = nam;
    if (ten) where.ten = ILike(`%${ten}%`);
    if (mst) where.mst = ILike(`%${mst}%`);
    if (ward) where.ward = ILike(`%${ward}%`);
    if (status) where.status = status;

    const [data, total] = await this.repo.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    return {
      data: data.map((r) => this.toRecord(r)),
      total,
      page,
      pageSize,
    };
  }

  async findOne(id: number) {
    const report = await this.repo.findOne({ where: { id } });
    if (!report) throw new NotFoundException('Không tìm thấy báo cáo');
    return { ...this.toRecord(report), declaration: report.declaration ?? {} };
  }

  async approve(id: number): Promise<{ message: string }> {
    const report = await this.repo.findOne({ where: { id } });
    if (!report) throw new NotFoundException('Không tìm thấy báo cáo');

    report.status = STATUS_DONE;
    report.lyDoTuChoi = null;
    await this.repo.save(report);
    return { message: 'Đã duyệt báo cáo' };
  }

  async reject(id: number, lyDoTuChoi: string): Promise<{ message: string }> {
    const report = await this.repo.findOne({ where: { id } });
    if (!report) throw new NotFoundException('Không tìm thấy báo cáo');

    report.status = STATUS_REJECTED;
    report.lyDoTuChoi = lyDoTuChoi;
    await this.repo.save(report);
    return { message: 'Đã từ chối báo cáo' };
  }

  async approveMany(ids: number[]): Promise<{ message: string }> {
    if (ids.length === 0) throw new BadRequestException('Danh sách trống');
    await this.repo.update(
      { id: In(ids) },
      { status: STATUS_DONE, lyDoTuChoi: null },
    );
    return { message: `Đã duyệt ${ids.length} báo cáo` };
  }

  async rejectMany(
    ids: number[],
    lyDoTuChoi: string,
  ): Promise<{ message: string }> {
    if (ids.length === 0) throw new BadRequestException('Danh sách trống');
    await this.repo.update(
      { id: In(ids) },
      { status: STATUS_REJECTED, lyDoTuChoi },
    );
    return { message: `Đã từ chối ${ids.length} báo cáo` };
  }

  // ===== Role Doanh nghiệp =====

  async findMy(userId: string, query: MyAtvsldReportQueryDto) {
    const business = await this.resolveBusiness(userId);

    const where: Record<string, unknown> = { enterpriseId: business.id };
    if (query.nam) where.nam = query.nam;
    if (query.status) where.status = query.status;
    if (query.ky) where.ky = query.ky;

    const reports = await this.repo.find({
      where,
      order: { createdAt: 'DESC' },
    });
    return reports.map((r) => this.toRecord(r));
  }

  async findMyOne(userId: string, id: number) {
    const business = await this.resolveBusiness(userId);
    const report = await this.assertOwnReport(business.id, id);
    return { ...this.toRecord(report), declaration: report.declaration ?? {} };
  }

  async create(userId: string, dto: CreateAtvsldReportDto) {
    const business = await this.resolveBusiness(userId);
    const { ngayBatDau, ngayKetThuc } = this.resolvePeriod(dto.ky, dto.nam);

    const report = this.repo.create({
      enterpriseId: business.id,
      ten: business.businessName,
      mst: business.taxCode,
      nam: dto.nam,
      ky: dto.ky,
      ngayBatDau,
      ngayKetThuc,
      nguoiChinhSua: business.representative ?? business.businessName,
      province: business.registeredProvince,
      ward: business.registeredWard,
      status: STATUS_DRAFT,
      declaration: dto.declaration ?? {},
    });
    const saved = await this.repo.save(report);
    return this.toRecord(saved);
  }

  // Lưu nháp / sửa lại khi bị từ chối → quay về 'Nhập liệu'.
  async update(userId: string, id: number, dto: UpdateAtvsldReportDto) {
    const business = await this.resolveBusiness(userId);
    const report = await this.assertOwnReport(business.id, id);

    if (dto.nam !== undefined) report.nam = dto.nam;
    if (dto.ky !== undefined || dto.nam !== undefined) {
      const period = this.resolvePeriod(dto.ky ?? report.ky, report.nam);
      report.ky = dto.ky ?? report.ky;
      report.ngayBatDau = period.ngayBatDau;
      report.ngayKetThuc = period.ngayKetThuc;
    }
    if (dto.declaration !== undefined) report.declaration = dto.declaration;

    report.status = STATUS_DRAFT;
    report.lyDoTuChoi = null;
    report.nguoiChinhSua = business.representative ?? business.businessName;

    const saved = await this.repo.save(report);
    return this.toRecord(saved);
  }

  // Gửi báo cáo: 'Nhập liệu' → 'Chờ tiếp nhận'.
  async submit(userId: string, id: number) {
    const business = await this.resolveBusiness(userId);
    const report = await this.assertOwnReport(business.id, id);

    if (!(report.declaration?.tongLaoDong ?? '').trim())
      throw new BadRequestException('Vui lòng nhập Tổng số lao động');

    report.status = STATUS_SUBMITTED;
    report.lyDoTuChoi = null;
    report.ngayNop = this.formatDate(new Date());
    report.submittedAt = new Date();

    const saved = await this.repo.save(report);
    return this.toRecord(saved);
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

  private async assertOwnReport(
    businessId: string,
    id: number,
  ): Promise<AtvsldReport> {
    const report = await this.repo.findOne({ where: { id } });
    if (!report) throw new NotFoundException('Không tìm thấy báo cáo');
    if (report.enterpriseId !== businessId)
      throw new ForbiddenException('Không có quyền thao tác báo cáo này');
    return report;
  }

  // Kỳ "6 tháng" → nửa đầu năm; "Cả năm" → trọn năm.
  private resolvePeriod(
    ky: string,
    nam: number,
  ): { ngayBatDau: string; ngayKetThuc: string } {
    const ngayBatDau = `01/01/${nam}`;
    const ngayKetThuc = ky === '6 tháng' ? `30/06/${nam}` : `31/12/${nam}`;
    return { ngayBatDau, ngayKetThuc };
  }

  private formatDate(d: Date): string {
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    return `${dd}/${mm}/${d.getFullYear()}`;
  }

  private toRecord(r: AtvsldReport) {
    return {
      id: r.id,
      enterpriseId: r.enterpriseId,
      ten: r.ten,
      mst: r.mst,
      nam: r.nam,
      ky: r.ky,
      ngayBatDau: r.ngayBatDau,
      ngayKetThuc: r.ngayKetThuc,
      ngayNop: r.ngayNop,
      ngayCapNhat: this.formatDate(r.updatedAt ?? r.createdAt),
      nguoiChinhSua: r.nguoiChinhSua,
      province: r.province,
      ward: r.ward,
      status: r.status,
      lyDoTuChoi: r.lyDoTuChoi ?? undefined,
    };
  }
}
