import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InjuryFactor } from '../entities/injury-factor.entity';
import { InjuryType } from '../entities/injury-type.entity';
import { Occupation } from '../entities/occupation.entity';
import {
  CreateInjuryFactorDto,
  UpdateInjuryFactorDto,
  CreateTreeNodeDto,
  UpdateTreeNodeDto,
} from '../../libs/shared/models/category.dto';

@Injectable()
export class CategoryService {
  constructor(
    @InjectRepository(InjuryFactor)
    private readonly injuryFactorRepo: Repository<InjuryFactor>,
    @InjectRepository(InjuryType)
    private readonly injuryTypeRepo: Repository<InjuryType>,
    @InjectRepository(Occupation)
    private readonly occupationRepo: Repository<Occupation>,
  ) {}

  // --- Yếu tố gây chấn thương ---

  findAllInjuryFactors(): Promise<InjuryFactor[]> {
    return this.injuryFactorRepo.find({ order: { id: 'ASC' } });
  }

  private async findInjuryFactor(id: number): Promise<InjuryFactor> {
    const item = await this.injuryFactorRepo.findOne({ where: { id } });
    if (!item)
      throw new NotFoundException('Không tìm thấy yếu tố gây chấn thương');
    return item;
  }

  async createInjuryFactor(dto: CreateInjuryFactorDto): Promise<InjuryFactor> {
    const existing = await this.injuryFactorRepo.findOne({
      where: { ma: dto.ma },
    });
    if (existing) throw new ConflictException('Mã đã tồn tại');
    const item = this.injuryFactorRepo.create({
      ...dto,
      active: dto.active ?? true,
    });
    return this.injuryFactorRepo.save(item);
  }

  async updateInjuryFactor(
    id: number,
    dto: UpdateInjuryFactorDto,
  ): Promise<InjuryFactor> {
    const item = await this.findInjuryFactor(id);
    if (dto.ten !== undefined) item.ten = dto.ten;
    if (dto.active !== undefined) item.active = dto.active;
    return this.injuryFactorRepo.save(item);
  }

  async toggleInjuryFactorActive(
    id: number,
    active: boolean,
  ): Promise<InjuryFactor> {
    const item = await this.findInjuryFactor(id);
    item.active = active;
    return this.injuryFactorRepo.save(item);
  }

  async removeInjuryFactor(id: number): Promise<{ message: string }> {
    const item = await this.findInjuryFactor(id);
    await this.injuryFactorRepo.remove(item);
    return { message: 'Xóa thành công' };
  }

  // --- Loại chấn thương ---

  findAllInjuryTypes(): Promise<InjuryType[]> {
    return this.injuryTypeRepo.find({ order: { ma: 'ASC' } });
  }

  async createInjuryType(dto: CreateTreeNodeDto): Promise<InjuryType> {
    const existing = await this.injuryTypeRepo.findOne({
      where: { ma: dto.ma },
    });
    if (existing) throw new ConflictException('Mã đã tồn tại');
    const item = this.injuryTypeRepo.create({ ...dto, cha: dto.cha ?? '' });
    return this.injuryTypeRepo.save(item);
  }

  async updateInjuryType(
    id: number,
    dto: UpdateTreeNodeDto,
  ): Promise<InjuryType> {
    const item = await this.injuryTypeRepo.findOne({ where: { id } });
    if (!item) throw new NotFoundException('Không tìm thấy loại chấn thương');

    if (dto.ten !== undefined) {
      item.ten = dto.ten;
    }

    if (dto.cha !== undefined) {
      const newCha = dto.cha ? dto.cha.trim() : '';
      if (newCha === item.ma) {
        throw new ConflictException('Mục cha không được trùng với mã hiện tại');
      }

      // Check circular reference
      if (newCha) {
        let currentCha = newCha;
        while (currentCha) {
          const parentNode = await this.injuryTypeRepo.findOne({ where: { ma: currentCha } });
          if (!parentNode) {
            throw new NotFoundException('Không tìm thấy loại chấn thương cha');
          }
          if (parentNode.ma === item.ma) {
            throw new ConflictException('Mục cha không thể là mục con cháu của mục hiện tại');
          }
          currentCha = parentNode.cha;
        }
      }

      const oldCha = item.cha;
      if (oldCha !== newCha) {
        item.cha = newCha;
        const parentNode = newCha ? await this.injuryTypeRepo.findOne({ where: { ma: newCha } }) : null;
        const newCap = parentNode ? Math.min(parentNode.cap + 1, 4) : 1;
        const diffCap = newCap - item.cap;
        item.cap = newCap;

        if (diffCap !== 0) {
          await this.updateInjuryTypeDescendants(item.ma, diffCap);
        }
      }
    }

    return this.injuryTypeRepo.save(item);
  }

  private async updateInjuryTypeDescendants(parentMa: string, diffCap: number): Promise<void> {
    const children = await this.injuryTypeRepo.find({ where: { cha: parentMa } });
    for (const child of children) {
      child.cap = Math.min(Math.max(child.cap + diffCap, 1), 4);
      await this.injuryTypeRepo.save(child);
      await this.updateInjuryTypeDescendants(child.ma, diffCap);
    }
  }

  async removeInjuryType(id: number): Promise<{ message: string }> {
    const item = await this.injuryTypeRepo.findOne({ where: { id } });
    if (!item) throw new NotFoundException('Không tìm thấy loại chấn thương');
    await this.injuryTypeRepo.remove(item);
    return { message: 'Xóa thành công' };
  }

  // --- Nghề nghiệp ---

  findAllOccupations(): Promise<Occupation[]> {
    return this.occupationRepo.find({ order: { ma: 'ASC' } });
  }

  async createOccupation(dto: CreateTreeNodeDto): Promise<Occupation> {
    const existing = await this.occupationRepo.findOne({
      where: { ma: dto.ma },
    });
    if (existing) throw new ConflictException('Mã đã tồn tại');
    const item = this.occupationRepo.create({ ...dto, cha: dto.cha ?? '' });
    return this.occupationRepo.save(item);
  }

  async updateOccupation(
    id: number,
    dto: UpdateTreeNodeDto,
  ): Promise<Occupation> {
    const item = await this.occupationRepo.findOne({ where: { id } });
    if (!item) throw new NotFoundException('Không tìm thấy nghề nghiệp');

    if (dto.ten !== undefined) {
      item.ten = dto.ten;
    }

    if (dto.cha !== undefined) {
      const newCha = dto.cha ? dto.cha.trim() : '';
      if (newCha === item.ma) {
        throw new ConflictException('Mục cha không được trùng với mã hiện tại');
      }

      // Check circular reference
      if (newCha) {
        let currentCha = newCha;
        while (currentCha) {
          const parentNode = await this.occupationRepo.findOne({ where: { ma: currentCha } });
          if (!parentNode) {
            throw new NotFoundException('Không tìm thấy nghề nghiệp cha');
          }
          if (parentNode.ma === item.ma) {
            throw new ConflictException('Mục cha không thể là mục con cháu của mục hiện tại');
          }
          currentCha = parentNode.cha;
        }
      }

      const oldCha = item.cha;
      if (oldCha !== newCha) {
        item.cha = newCha;
        const parentNode = newCha ? await this.occupationRepo.findOne({ where: { ma: newCha } }) : null;
        const newCap = parentNode ? Math.min(parentNode.cap + 1, 4) : 1;
        const diffCap = newCap - item.cap;
        item.cap = newCap;

        if (diffCap !== 0) {
          await this.updateOccupationDescendants(item.ma, diffCap);
        }
      }
    }

    return this.occupationRepo.save(item);
  }

  private async updateOccupationDescendants(parentMa: string, diffCap: number): Promise<void> {
    const children = await this.occupationRepo.find({ where: { cha: parentMa } });
    for (const child of children) {
      child.cap = Math.min(Math.max(child.cap + diffCap, 1), 4);
      await this.occupationRepo.save(child);
      await this.updateOccupationDescendants(child.ma, diffCap);
    }
  }

  async removeOccupation(id: number): Promise<{ message: string }> {
    const item = await this.occupationRepo.findOne({ where: { id } });
    if (!item) throw new NotFoundException('Không tìm thấy nghề nghiệp');
    await this.occupationRepo.remove(item);
    return { message: 'Xóa thành công' };
  }
}
