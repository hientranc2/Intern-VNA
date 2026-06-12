import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BusinessSector } from '../entities/business-sector.entity';
import {
  CreateBusinessSectorDto,
  UpdateBusinessSectorDto,
} from '../../libs/shared/models/business-sector.dto';

@Injectable()
export class BusinessSectorService {
  constructor(
    @InjectRepository(BusinessSector)
    private readonly repo: Repository<BusinessSector>,
  ) {}

  findAll(): Promise<BusinessSector[]> {
    return this.repo.find({ order: { id: 'ASC' } });
  }

  async findOne(id: number): Promise<BusinessSector> {
    const item = await this.repo.findOne({ where: { id } });
    if (!item) throw new NotFoundException('Không tìm thấy ngành nghề kinh doanh');
    return item;
  }

  async create(dto: CreateBusinessSectorDto): Promise<BusinessSector> {
    const existing = await this.repo.findOne({ where: { ma: dto.ma } });
    if (existing) throw new ConflictException('Mã ngành đã tồn tại');
    const item = this.repo.create({ ...dto, cha: dto.cha ?? '' });
    return this.repo.save(item);
  }

  async update(id: number, dto: UpdateBusinessSectorDto): Promise<BusinessSector> {
    const item = await this.findOne(id);
    if (dto.ten !== undefined) item.ten = dto.ten;
    return this.repo.save(item);
  }

  async remove(id: number): Promise<{ message: string }> {
    const item = await this.findOne(id);
    await this.repo.remove(item);
    return { message: 'Xóa thành công' };
  }
}
