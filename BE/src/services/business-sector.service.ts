import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BusinessSector } from '../entities/business-sector.entity';
import {
  CreateBusinessSectorDto,
  UpdateBusinessSectorDto,
} from '../../libs/shared/models/business-sector.dto';
import {
  parseExcelToRows,
  pickCell,
  excelRowNumber,
} from '../utils/excel-import.util';

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
    if (!item)
      throw new NotFoundException('Không tìm thấy ngành nghề kinh doanh');
    return item;
  }

  async create(dto: CreateBusinessSectorDto): Promise<BusinessSector> {
    const existing = await this.repo.findOne({ where: { ma: dto.ma } });
    if (existing) throw new ConflictException('Mã ngành đã tồn tại');
    const item = this.repo.create({ ...dto, cha: dto.cha ?? '' });
    return this.repo.save(item);
  }

  async update(
    id: number,
    dto: UpdateBusinessSectorDto,
  ): Promise<BusinessSector> {
    const item = await this.findOne(id);
    if (dto.ten !== undefined) item.ten = dto.ten;
    return this.repo.save(item);
  }

  async remove(id: number): Promise<{ message: string }> {
    const item = await this.findOne(id);
    await this.repo.remove(item);
    return { message: 'Xóa thành công' };
  }

  async importBusinessSectors(file?: Express.Multer.File) {
    if (!file?.buffer) {
      throw new BadRequestException('Vui lòng chọn file để import');
    }

    const rows = parseExcelToRows(file.buffer);

    const SECTOR_HEADER_MAP = {
      ma: ['Mã ngành', 'Mã'],
      ten: ['Tên ngành', 'Tên'],
      cap: ['Cấp', 'Cấp độ'],
      cha: ['Mã cha', 'Cha'],
    } as const;

    const records: Partial<BusinessSector>[] = [];
    const seenMas = new Set<string>();

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = excelRowNumber(i);

      const ma = pickCell(row, [...SECTOR_HEADER_MAP.ma]);
      const ten = pickCell(row, [...SECTOR_HEADER_MAP.ten]);
      const capStr = pickCell(row, [...SECTOR_HEADER_MAP.cap]);
      const cha = pickCell(row, [...SECTOR_HEADER_MAP.cha]);

      if (!ma) {
        throw new BadRequestException(`Dòng ${rowNum}: thiếu "Mã ngành"`);
      }
      if (!ten) {
        throw new BadRequestException(`Dòng ${rowNum}: thiếu "Tên ngành"`);
      }
      if (!capStr) {
        throw new BadRequestException(`Dòng ${rowNum}: thiếu "Cấp độ ngành"`);
      }

      const cap = parseInt(capStr, 10);
      if (isNaN(cap) || cap < 1 || cap > 4) {
        throw new BadRequestException(
          `Dòng ${rowNum}: "Cấp độ ngành" phải là số từ 1 đến 4`,
        );
      }

      if (seenMas.has(ma)) {
        throw new BadRequestException(
          `Dòng ${rowNum}: "Mã ngành" "${ma}" bị trùng trong file`,
        );
      }
      seenMas.add(ma);

      records.push({ ma, ten, cap, cha: cha ?? '' });
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
          errors.push(`Dòng ${i + 1}: "Mã ngành" "${r.ma}" đã tồn tại trong hệ thống`);
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
      await queryRunner.manager.insert(BusinessSector, toInsert);
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
      message: `Đã import thành công ${records.length} ngành nghề kinh doanh`,
      imported: records.length,
    };
  }
}
