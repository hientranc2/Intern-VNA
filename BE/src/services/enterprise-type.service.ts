import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EnterpriseType } from '../entities/enterprise-type.entity';
import {
  CreateEnterpriseTypeDto,
  UpdateEnterpriseTypeDto,
} from '../../libs/shared/models/enterprise-type.dto';

@Injectable()
export class EnterpriseTypeService {
  constructor(
    @InjectRepository(EnterpriseType)
    private readonly repo: Repository<EnterpriseType>,
  ) {}

  findAll(): Promise<EnterpriseType[]> {
    return this.repo.find({ order: { id: 'ASC' } });
  }

  async findOne(id: number): Promise<EnterpriseType> {
    const item = await this.repo.findOne({ where: { id } });
    if (!item) throw new NotFoundException('Không tìm thấy loại hình kinh doanh');
    return item;
  }

  async create(dto: CreateEnterpriseTypeDto): Promise<EnterpriseType> {
    const existing = await this.repo.findOne({ where: { ma: dto.ma } });
    if (existing) throw new ConflictException('Mã loại hình đã tồn tại');
    const item = this.repo.create({ ...dto, active: dto.active ?? true });
    return this.repo.save(item);
  }

  async update(id: number, dto: UpdateEnterpriseTypeDto): Promise<EnterpriseType> {
    const item = await this.findOne(id);
    if (dto.ten !== undefined) item.ten = dto.ten;
    if (dto.active !== undefined) item.active = dto.active;
    return this.repo.save(item);
  }

  async toggleActive(id: number, active: boolean): Promise<EnterpriseType> {
    const item = await this.findOne(id);
    item.active = active;
    return this.repo.save(item);
  }

  async remove(id: number): Promise<{ message: string }> {
    const item = await this.findOne(id);
    await this.repo.remove(item);
    return { message: 'Xóa thành công' };
  }
}
