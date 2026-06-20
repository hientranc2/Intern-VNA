import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
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
import {
  parseExcelToRows,
  pickCell,
  excelRowNumber,
} from '../utils/excel-import.util';

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

  async importInjuryFactors(file?: Express.Multer.File) {
    if (!file?.buffer) {
      throw new BadRequestException('Vui lòng chọn file để import');
    }

    const rows = parseExcelToRows(file.buffer);

    const FACTOR_HEADER_MAP = {
      ma: ['Mã yếu tố', 'Mã'],
      ten: ['Tên yếu tố gây chấn thương', 'Tên yếu tố chấn thương', 'Tên yếu tố', 'Tên'],
      active: ['Trạng thái', 'Kích hoạt', 'Active'],
    } as const;

    const records: Partial<InjuryFactor>[] = [];
    const seenMas = new Set<string>();
    const seenTens = new Set<string>();

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = excelRowNumber(i);

      const ma = pickCell(row, [...FACTOR_HEADER_MAP.ma]);
      const ten = pickCell(row, [...FACTOR_HEADER_MAP.ten]);
      const activeStr = pickCell(row, [...FACTOR_HEADER_MAP.active]);

      if (!ma) {
        throw new BadRequestException(`Dòng ${rowNum}: thiếu "Mã yếu tố"`);
      }
      if (!ten) {
        throw new BadRequestException(`Dòng ${rowNum}: thiếu "Tên yếu tố gây chấn thương"`);
      }
      if (seenMas.has(ma)) {
        throw new BadRequestException(
          `Dòng ${rowNum}: "Mã yếu tố" "${ma}" bị trùng trong file`,
        );
      }
      seenMas.add(ma);

      const normTen = ten.toLowerCase().trim();
      if (seenTens.has(normTen)) {
        throw new BadRequestException(
          `Dòng ${rowNum}: "Tên yếu tố gây chấn thương" "${ten}" bị trùng trong file`,
        );
      }
      seenTens.add(normTen);

      let active = true;
      if (activeStr) {
        const normActive = activeStr.toLowerCase();
        if (
          normActive === '0' ||
          normActive === 'false' ||
          normActive === 'ngừng' ||
          normActive === 'ngừng hoạt động' ||
          normActive === 'ngừng sử dụng'
        ) {
          active = false;
        }
      }

      records.push({ ma, ten, active });
    }

    const existing = await this.injuryFactorRepo.find({
      where: records.map((r) => ({ ma: r.ma })),
      select: { ma: true },
    });
    const errors: string[] = [];

    if (existing.length > 0) {
      const takenMas = new Set(existing.map((e) => e.ma));
      for (let i = 0; i < records.length; i++) {
        const r = records[i];
        if (r.ma && takenMas.has(r.ma)) {
          errors.push(`Dòng ${i + 1}: "Mã yếu tố" "${r.ma}" đã tồn tại trong hệ thống`);
        }
      }
    }

    const existingNames = await this.injuryFactorRepo.find({
      where: records.map((r) => ({ ten: r.ten })),
      select: { ten: true },
    });
    if (existingNames.length > 0) {
      const takenTens = new Set(existingNames.map((e) => e.ten.toLowerCase().trim()));
      for (let i = 0; i < records.length; i++) {
        const r = records[i];
        if (r.ten && takenTens.has(r.ten.toLowerCase().trim())) {
          errors.push(`Dòng ${i + 1}: "Tên yếu tố gây chấn thương" "${r.ten}" đã tồn tại trong hệ thống`);
        }
      }
    }

    if (errors.length > 0) {
      throw new ConflictException(errors.join('\n'));
    }

    const queryRunner = this.injuryFactorRepo.manager.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      const toInsert = this.injuryFactorRepo.create(records);
      await queryRunner.manager.insert(InjuryFactor, toInsert);
      await queryRunner.commitTransaction();
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw new BadRequestException(
        `Lỗi khi ghi dữ liệu: ${err instanceof Error ? err.message : 'unknown'}`,
      );
    } finally {
      await queryRunner.release();
    }

    return {
      message: `Đã import thành công ${records.length} yếu tố gây chấn thương`,
      imported: records.length,
    };
  }

  async importInjuryTypes(file?: Express.Multer.File) {
    if (!file?.buffer) {
      throw new BadRequestException('Vui lòng chọn file để import');
    }

    const rows = parseExcelToRows(file.buffer);

    const TYPE_HEADER_MAP = {
      ma: ['Mã số', 'Mã'],
      ten: ['Tên loại chấn thương', 'Tên loại chấn thương gây chấn thương', 'Tên loại', 'Tên'],
      cap: ['Cấp', 'Cấp độ'],
      cha: ['Mã cha', 'Cha'],
    } as const;

    const records: Partial<InjuryType>[] = [];
    const seenMas = new Set<string>();

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = excelRowNumber(i);

      const ma = pickCell(row, [...TYPE_HEADER_MAP.ma]);
      const ten = pickCell(row, [...TYPE_HEADER_MAP.ten]);
      const capStr = pickCell(row, [...TYPE_HEADER_MAP.cap]);
      const cha = pickCell(row, [...TYPE_HEADER_MAP.cha]);

      if (!ma) {
        throw new BadRequestException(`Dòng ${rowNum}: thiếu "Mã số"`);
      }
      if (!ten) {
        throw new BadRequestException(`Dòng ${rowNum}: thiếu "Tên loại chấn thương"`);
      }
      if (!capStr) {
        throw new BadRequestException(`Dòng ${rowNum}: thiếu "Cấp"`);
      }

      const cap = parseInt(capStr, 10);
      if (isNaN(cap) || cap < 1 || cap > 4) {
        throw new BadRequestException(
          `Dòng ${rowNum}: "Cấp" phải là số từ 1 đến 4`,
        );
      }

      if (seenMas.has(ma)) {
        throw new BadRequestException(
          `Dòng ${rowNum}: "Mã số" "${ma}" bị trùng trong file`,
        );
      }
      seenMas.add(ma);

      records.push({ ma, ten, cap, cha: cha ?? '' });
    }

    const existing = await this.injuryTypeRepo.find({
      where: records.map((r) => ({ ma: r.ma })),
      select: { ma: true },
    });
    const errors: string[] = [];

    if (existing.length > 0) {
      const takenMas = new Set(existing.map((e) => e.ma));
      for (let i = 0; i < records.length; i++) {
        const r = records[i];
        if (r.ma && takenMas.has(r.ma)) {
          errors.push(`Dòng ${i + 1}: "Mã số" "${r.ma}" đã tồn tại trong hệ thống`);
        }
      }
    }

    if (errors.length > 0) {
      throw new ConflictException(errors.join('\n'));
    }

    const queryRunner = this.injuryTypeRepo.manager.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      const toInsert = this.injuryTypeRepo.create(records);
      await queryRunner.manager.insert(InjuryType, toInsert);
      await queryRunner.commitTransaction();
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw new BadRequestException(
        `Lỗi khi ghi dữ liệu: ${err instanceof Error ? err.message : 'unknown'}`,
      );
    } finally {
      await queryRunner.release();
    }

    return {
      message: `Đã import thành công ${records.length} loại chấn thương`,
      imported: records.length,
    };
  }

  async importOccupations(file?: Express.Multer.File) {
    if (!file?.buffer) {
      throw new BadRequestException('Vui lòng chọn file để import');
    }

    const rows = parseExcelToRows(file.buffer);

    const OCCUPATION_HEADER_MAP = {
      ma: ['Mã nghề', 'Mã số', 'Mã'],
      ten: ['Tên nghề nghiệp', 'Tên', 'Tên ngành nghề'],
      cap: ['Cấp', 'Cấp độ'],
      cha: ['Mã cha', 'Cha'],
    } as const;

    const records: Partial<Occupation>[] = [];
    const seenMas = new Set<string>();

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = excelRowNumber(i);

      const ma = pickCell(row, [...OCCUPATION_HEADER_MAP.ma]);
      const ten = pickCell(row, [...OCCUPATION_HEADER_MAP.ten]);
      const capStr = pickCell(row, [...OCCUPATION_HEADER_MAP.cap]);
      const cha = pickCell(row, [...OCCUPATION_HEADER_MAP.cha]);

      if (!ma) {
        throw new BadRequestException(`Dòng ${rowNum}: thiếu "Mã nghề"`);
      }
      if (!ten) {
        throw new BadRequestException(`Dòng ${rowNum}: thiếu "Tên nghề nghiệp"`);
      }
      if (!capStr) {
        throw new BadRequestException(`Dòng ${rowNum}: thiếu "Cấp"`);
      }

      const cap = parseInt(capStr, 10);
      if (isNaN(cap) || cap < 1 || cap > 4) {
        throw new BadRequestException(
          `Dòng ${rowNum}: "Cấp" phải là số từ 1 đến 4`,
        );
      }

      if (seenMas.has(ma)) {
        throw new BadRequestException(
          `Dòng ${rowNum}: "Mã nghề" "${ma}" bị trùng trong file`,
        );
      }
      seenMas.add(ma);

      records.push({ ma, ten, cap, cha: cha ?? '' });
    }

    const existing = await this.occupationRepo.find({
      where: records.map((r) => ({ ma: r.ma })),
      select: { ma: true },
    });
    const errors: string[] = [];

    if (existing.length > 0) {
      const takenMas = new Set(existing.map((e) => e.ma));
      for (let i = 0; i < records.length; i++) {
        const r = records[i];
        if (r.ma && takenMas.has(r.ma)) {
          errors.push(`Dòng ${i + 1}: "Mã nghề" "${r.ma}" đã tồn tại trong hệ thống`);
        }
      }
    }

    if (errors.length > 0) {
      throw new ConflictException(errors.join('\n'));
    }

    const queryRunner = this.occupationRepo.manager.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      const toInsert = this.occupationRepo.create(records);
      await queryRunner.manager.insert(Occupation, toInsert);
      await queryRunner.commitTransaction();
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw new BadRequestException(
        `Lỗi khi ghi dữ liệu: ${err instanceof Error ? err.message : 'unknown'}`,
      );
    } finally {
      await queryRunner.release();
    }

    return {
      message: `Đã import thành công ${records.length} nghề nghiệp`,
      imported: records.length,
    };
  }
}
