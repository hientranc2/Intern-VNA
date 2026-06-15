import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ReportConfig } from '../entities/report-config.entity';
import {
  CreateReportConfigDto,
  UpdateReportConfigDto,
} from '../../libs/shared/models/report-config.dto';

@Injectable()
export class ReportConfigService {
  constructor(
    @InjectRepository(ReportConfig)
    private readonly repo: Repository<ReportConfig>,
  ) {}

  findAll(): Promise<ReportConfig[]> {
    return this.repo.find({ order: { id: 'ASC' } });
  }

  async findOne(id: number): Promise<ReportConfig> {
    const item = await this.repo.findOne({ where: { id } });
    if (!item) throw new NotFoundException('Không tìm thấy cấu hình báo cáo');
    return item;
  }

  async create(dto: CreateReportConfigDto): Promise<ReportConfig> {
    const item = this.repo.create({ ...dto, active: dto.active ?? true });
    return this.repo.save(item);
  }

  async update(id: number, dto: UpdateReportConfigDto): Promise<ReportConfig> {
    const item = await this.findOne(id);
    Object.assign(item, dto);
    return this.repo.save(item);
  }

  async toggleActive(id: number, active: boolean): Promise<ReportConfig> {
    const item = await this.findOne(id);
    item.active = active;
    return this.repo.save(item);
  }

  async remove(id: number): Promise<{ message: string }> {
    const item = await this.findOne(id);
    await this.repo.remove(item);
    return { message: 'Xóa cấu hình báo cáo thành công' };
  }
}
