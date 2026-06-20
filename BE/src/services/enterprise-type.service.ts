import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EnterpriseType } from '../entities/enterprise-type.entity';
import {
  CreateEnterpriseTypeDto,
  UpdateEnterpriseTypeDto,
} from '../../libs/shared/models/enterprise-type.dto';
import {
  parseExcelToRows,
  pickCell,
  excelRowNumber,
} from '../utils/excel-import.util';

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
    if (!item)
      throw new NotFoundException('Không tìm thấy loại hình kinh doanh');
    return item;
  }

  async create(dto: CreateEnterpriseTypeDto): Promise<EnterpriseType> {
    const existing = await this.repo.findOne({ where: { ma: dto.ma } });
    if (existing) throw new ConflictException('Mã loại hình đã tồn tại');
    const item = this.repo.create({ ...dto, active: dto.active ?? true });
    return this.repo.save(item);
  }

  async update(
    id: number,
    dto: UpdateEnterpriseTypeDto,
  ): Promise<EnterpriseType> {
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

  async importEnterpriseTypes(file?: Express.Multer.File) {
    if (!file?.buffer) {
      throw new BadRequestException('Vui lòng chọn file để import');
    }

    const rows = parseExcelToRows(file.buffer);

    const ENTERPRISE_TYPE_HEADER_MAP = {
      ma: ['Mã loại hình', 'Mã'],
      ten: ['Tên loại hình', 'Tên'],
      active: ['Trạng thái', 'Kích hoạt', 'Active'],
    } as const;

    const records: Partial<EnterpriseType>[] = [];
    const seenMas = new Set<string>();
    const seenTens = new Set<string>();

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = excelRowNumber(i);

      const ma = pickCell(row, [...ENTERPRISE_TYPE_HEADER_MAP.ma]);
      const ten = pickCell(row, [...ENTERPRISE_TYPE_HEADER_MAP.ten]);
      const activeStr = pickCell(row, [...ENTERPRISE_TYPE_HEADER_MAP.active]);

      if (!ma) {
        throw new BadRequestException(`Dòng ${rowNum}: thiếu "Mã loại hình"`);
      }
      if (!ten) {
        throw new BadRequestException(`Dòng ${rowNum}: thiếu "Tên loại hình"`);
      }
      if (seenMas.has(ma)) {
        throw new BadRequestException(
          `Dòng ${rowNum}: "Mã loại hình" "${ma}" bị trùng trong file`,
        );
      }
      seenMas.add(ma);

      const normTen = ten.toLowerCase().trim();
      if (seenTens.has(normTen)) {
        throw new BadRequestException(
          `Dòng ${rowNum}: "Tên loại hình" "${ten}" bị trùng trong file`,
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
          normActive === 'ngừng hoạt động'
        ) {
          active = false;
        }
      }

      records.push({ ma, ten, active });
    }

    const existing = await this.repo.find({
      where: records.map((r) => ({ ma: r.ma })),
      select: { ma: true },
    });
    const errors: string[] = [];

    if (existing.length > 0) {
      const takenMas = new Set(existing.map((e) => e.ma));
      for (let i = 0; i < records.length; i++) {
        const r = records[i];
        if (r.ma && takenMas.has(r.ma)) {
          errors.push(`Dòng ${i + 1}: "Mã loại hình" "${r.ma}" đã tồn tại trong hệ thống`);
        }
      }
    }

    const existingNames = await this.repo.find({
      where: records.map((r) => ({ ten: r.ten })),
      select: { ten: true },
    });
    if (existingNames.length > 0) {
      const takenTens = new Set(existingNames.map((e) => e.ten.toLowerCase().trim()));
      for (let i = 0; i < records.length; i++) {
        const r = records[i];
        if (r.ten && takenTens.has(r.ten.toLowerCase().trim())) {
          errors.push(`Dòng ${i + 1}: "Tên loại hình" "${r.ten}" đã tồn tại trong hệ thống`);
        }
      }
    }

    if (errors.length > 0) {
      throw new ConflictException(errors.join('\n'));
    }

    const queryRunner = this.repo.manager.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      const toInsert = this.repo.create(records);
      await queryRunner.manager.insert(EnterpriseType, toInsert);
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
      message: `Đã import thành công ${records.length} loại hình doanh nghiệp`,
      imported: records.length,
    };
  }
}
