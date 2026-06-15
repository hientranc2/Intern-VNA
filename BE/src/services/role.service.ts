import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Role } from '../entities/role.entity';
import {
  CreateRoleDto,
  UpdateRoleDto,
} from '../../libs/shared/models/role.dto';

@Injectable()
export class RoleService {
  constructor(
    @InjectRepository(Role)
    private readonly repo: Repository<Role>,
  ) {}

  findAll(): Promise<Role[]> {
    return this.repo.find({ order: { id: 'ASC' } });
  }

  async findOne(id: number): Promise<Role> {
    const item = await this.repo.findOne({ where: { id } });
    if (!item) throw new NotFoundException('Không tìm thấy vai trò');
    return item;
  }

  async create(dto: CreateRoleDto): Promise<Role> {
    const existing = await this.repo.findOne({ where: { ma: dto.ma } });
    if (existing) throw new ConflictException('Mã vai trò đã tồn tại');
    const item = this.repo.create(dto);
    return this.repo.save(item);
  }

  async update(id: number, dto: UpdateRoleDto): Promise<Role> {
    const item = await this.findOne(id);
    if (dto.ten !== undefined) item.ten = dto.ten;
    if (dto.perms !== undefined) item.perms = dto.perms;
    return this.repo.save(item);
  }

  async remove(id: number): Promise<{ message: string }> {
    const item = await this.findOne(id);
    await this.repo.remove(item);
    return { message: 'Xóa vai trò thành công' };
  }
}
