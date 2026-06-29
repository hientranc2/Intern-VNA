import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository, Like, FindOptionsWhere } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { createClient } from '@supabase/supabase-js';
import * as WebSocket from 'ws';
(global as any).WebSocket = WebSocket;

import { Business } from '../entities/business.entity';
import { Account } from '../entities/business_account.entity';
import {
  BusinessCreateDto,
  BusinessUpdateDto,
  BusinessQueryDto,
  BusinessToggleStatusDto,
  BusinessListDto,
  AccountPopupDto,
} from '../../libs/shared/models/business.dto';
import {
  parseExcelToRows,
  pickCell,
  excelRowNumber,
} from '../utils/excel-import.util';

const DEFAULT_PASSWORD = '12345678';

// Regex MST Việt Nam: 10 số (hoặc 10 số + dấu gạch + tối đa 5 số cho chi nhánh).
const TAX_CODE_REGEX = /^\d{10}(-\d{1,5})?$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// SĐT Việt Nam (đơn giản hoá cho import: 10-11 số bắt đầu bằng 0).
const PHONE_REGEX = /^0\d{9,10}$/;

// Header (có thể nhiều tên) cho mỗi trường trong file mẫu import doanh nghiệp.
const BUSINESS_HEADER_MAP = {
  businessName: ['Tên doanh nghiệp', 'Tên công ty'],
  taxCode: ['Mã số thuế', 'MST'],
  businessType: ['Loại hình kinh doanh', 'Loại hình KD'],
  mainIndustry: ['Ngành nghề kinh doanh', 'Ngành nghề KD'],
  licenseDate: ['Ngày cấp GPKD'],
  registeredProvince: ['Tỉnh ĐKKD', 'Tỉnh/Thành ĐKKD'],
  registeredWard: ['Phường ĐKKD', 'Phường/Xã ĐKKD'],
  address: ['Địa chỉ'],
  foreignName: ['Tên tiếng nước ngoài'],
  email: ['Email', 'E-mail'],
  officePhone: ['SĐT văn phòng', 'Điện thoại văn phòng'],
  operatingProvince: ['Tỉnh hoạt động', 'Tỉnh/Thành hoạt động'],
  operatingWard: ['Phường hoạt động', 'Phường/Xã hoạt động'],
  operatingAddress: ['Địa chỉ hoạt động'],
  representative: ['Người đại diện'],
  representativePhone: ['SĐT đại diện', 'Điện thoại đại diện'],
} as const;

@Injectable()
export class BusinessService {
  private supabaseAdmin = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    },
  );

  constructor(
    @InjectRepository(Business)
    private businessRepository: Repository<Business>,

    @InjectRepository(Account)
    private accountRepository: Repository<Account>,

    private dataSource: DataSource,
  ) {}

  private async uploadFile(
    file: Express.Multer.File,
    taxCode: string,
    prefix: string,
  ): Promise<string> {
    const ext = file.originalname.split('.').pop();
    const fileName = `${prefix}-${taxCode}-${Date.now()}.${ext}`;
    const fileBlob = new Blob([new Uint8Array(file.buffer)], {
      type: file.mimetype,
    });

    const { error } = await this.supabaseAdmin.storage
      .from('businesses')
      .upload(fileName, fileBlob, { contentType: file.mimetype, upsert: true });

    if (error) throw new BadRequestException('Lỗi khi tải file lên hệ thống!');

    const { data } = this.supabaseAdmin.storage
      .from('businesses')
      .getPublicUrl(fileName);

    return data.publicUrl;
  }

  private async deleteFile(fileUrl: string | null): Promise<void> {
    if (!fileUrl) return;
    const fileName = fileUrl.split('/').pop();
    await this.supabaseAdmin.storage.from('businesses').remove([fileName]);
  }

  private toListDto(entity: Business): BusinessListDto {
    return {
      id: entity.id,
      businessName: entity.businessName,
      taxCode: entity.taxCode,
      businessType: entity.businessType,
      mainIndustry: entity.mainIndustry,
      registeredProvince: entity.registeredProvince,
      registeredWard: entity.registeredWard,
      isActive: entity.isActive,
    };
  }

  // --- Pre-registration checks (public) ---

  async checkEmailExists(email: string): Promise<{ exists: boolean }> {
    if (!email) return { exists: false };
    const found = await this.businessRepository.findOne({
      where: { email: email.trim().toLowerCase() },
      select: { id: true },
    });
    return { exists: Boolean(found) };
  }

  async checkTaxCodeExists(taxCode: string): Promise<{ exists: boolean }> {
    if (!taxCode) return { exists: false };
    const found = await this.businessRepository.findOne({
      where: { taxCode: taxCode.trim() },
      select: { id: true },
    });
    return { exists: Boolean(found) };
  }

  async findAll(query: BusinessQueryDto) {
    const {
      businessName,
      taxCode,
      businessType,
      mainIndustry,
      registeredWard,
      isActive,
      page = 1,
      limit = 10,
    } = query;

    const where: FindOptionsWhere<Business> = {};
    if (businessName) where.businessName = Like(`%${businessName}%`);
    if (taxCode) where.taxCode = Like(`%${taxCode}%`);
    if (businessType) where.businessType = businessType;
    if (mainIndustry) where.mainIndustry = mainIndustry;
    if (registeredWard) where.registeredWard = Like(`%${registeredWard}%`);
    if (isActive !== undefined) where.isActive = isActive;

    const [data, total] = await this.businessRepository.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { data: data.map((e) => this.toListDto(e)), total, page, limit };
  }

  async findOne(id: string) {
    const business = await this.businessRepository.findOne({
      where: { id },
      relations: { account: true },
    });
    if (!business) throw new NotFoundException('Không tìm thấy doanh nghiệp');
    return business;
  }

  async create(
    dto: BusinessCreateDto,
    licenseFile?: Express.Multer.File,
    otherFile?: Express.Multer.File,
  ) {
    const existing = await this.businessRepository.findOne({
      where: { taxCode: dto.taxCode },
    });
    if (existing) throw new ConflictException('Mã số thuế đã tồn tại');

    const existingEmail = await this.businessRepository.findOne({
      where: { email: dto.email },
    });
    if (existingEmail)
      throw new ConflictException(
        'Email đã được sử dụng cho doanh nghiệp khác',
      );

    const licenseFileUrl = licenseFile
      ? await this.uploadFile(licenseFile, dto.taxCode, 'license')
      : null;
    const otherFileUrl = otherFile
      ? await this.uploadFile(otherFile, dto.taxCode, 'other')
      : null;

    const business = this.businessRepository.create({
      ...dto,
      licenseDate: dto.licenseDate ? new Date(dto.licenseDate) : null,
      licenseFile: licenseFileUrl,
      otherFile: otherFileUrl,
    });
    const savedBusiness = await this.businessRepository.save(business);

    const hashedPassword = await bcrypt.hash(DEFAULT_PASSWORD, 10);
    const account = this.accountRepository.create({
      username: dto.taxCode,
      password: hashedPassword,
      role: 'DoanhNghiep',
    });
    const savedAccount = await this.accountRepository.save(account);

    await this.businessRepository.update(savedBusiness.id, {
      accountId: savedAccount.id,
    });

    const accountPopup: AccountPopupDto = {
      username: dto.taxCode,
      password: DEFAULT_PASSWORD,
    };

    return {
      message: 'Tạo doanh nghiệp thành công',
      business: await this.findOne(savedBusiness.id),
      account: accountPopup,
    };
  }

  async update(
    id: string,
    dto: BusinessUpdateDto,
    licenseFile?: Express.Multer.File,
    otherFile?: Express.Multer.File,
  ) {
    const business = await this.businessRepository.findOne({ where: { id } });
    if (!business) throw new NotFoundException('Không tìm thấy doanh nghiệp');

    if (dto.email && dto.email !== business.email) {
      const existingEmail = await this.businessRepository.findOne({
        where: { email: dto.email },
      });
      if (existingEmail)
        throw new ConflictException(
          'Email đã được sử dụng cho doanh nghiệp khác',
        );
    }

    if (dto.deleteLicenseFile) {
      await this.deleteFile(business.licenseFile);
      business.licenseFile = null;
    } else if (licenseFile) {
      await this.deleteFile(business.licenseFile);
      business.licenseFile = await this.uploadFile(
        licenseFile,
        business.taxCode,
        'license',
      );
    }

    if (dto.deleteOtherFile) {
      await this.deleteFile(business.otherFile);
      business.otherFile = null;
    } else if (otherFile) {
      await this.deleteFile(business.otherFile);
      business.otherFile = await this.uploadFile(
        otherFile,
        business.taxCode,
        'other',
      );
    }

    Object.assign(business, dto);
    if (dto.licenseDate) business.licenseDate = new Date(dto.licenseDate);

    await this.businessRepository.save(business);
    return this.findOne(id);
  }

  async toggleStatus(id: string, dto: BusinessToggleStatusDto) {
    const business = await this.businessRepository.findOne({ where: { id } });
    if (!business) throw new NotFoundException('Không tìm thấy doanh nghiệp');

    await this.businessRepository.update(id, { isActive: dto.isActive });
    return { id, isActive: dto.isActive };
  }

  async remove(id: string) {
    const business = await this.businessRepository.findOne({ where: { id } });
    if (!business) throw new NotFoundException('Không tìm thấy doanh nghiệp');

    await this.deleteFile(business.licenseFile);
    await this.deleteFile(business.otherFile);

    await this.businessRepository.remove(business);
    return { message: 'Xoá doanh nghiệp thành công' };
  }

  async getAccount(id: string) {
    const business = await this.businessRepository.findOne({
      where: { id },
      relations: { account: true },
    });
    if (!business) throw new NotFoundException('Không tìm thấy doanh nghiệp');
    if (!business.account)
      throw new NotFoundException('Doanh nghiệp chưa có tài khoản');

    return { username: business.account.username };
  }

  // Admin đặt lại mật khẩu tài khoản DN. Chặn trùng mật khẩu cũ + vô hiệu phiên cũ.
  async resetAccountPassword(id: string, newPassword: string) {
    const business = await this.businessRepository.findOne({
      where: { id },
      relations: { account: true },
    });
    if (!business) throw new NotFoundException('Không tìm thấy doanh nghiệp');
    if (!business.account)
      throw new NotFoundException('Doanh nghiệp chưa có tài khoản');

    const isSame = await bcrypt.compare(newPassword, business.account.password);
    if (isSame)
      throw new BadRequestException(
        'Mật khẩu mới không được trùng mật khẩu cũ',
      );

    business.account.password = await bcrypt.hash(newPassword, 10);
    business.account.passwordChangedAt = new Date();
    await this.accountRepository.save(business.account);
    return { message: 'Đặt lại mật khẩu tài khoản doanh nghiệp thành công' };
  }

  // IMPORT HÀNG LOẠT TỪ FILE EXCEL/CSV
  // All-or-nothing: nếu BẤT KỲ dòng nào lỗi → rollback toàn bộ, không insert dòng nào.
  // Giống create(): mỗi doanh nghiệp tạo kèm 1 account (username = taxCode, password default).
  async importBusinesses(file?: Express.Multer.File) {
    if (!file?.buffer) {
      throw new BadRequestException('Vui lòng chọn file để import');
    }

    const rows = parseExcelToRows(file.buffer);

    // Validate + chuẩn hoá từng dòng trước khi mở transaction.
    type ImportRecord = {
      business: Partial<Business>;
      taxCode: string;
      email: string;
    };
    const records: ImportRecord[] = [];
    const seenTaxCodes = new Set<string>();
    const seenEmails = new Set<string>();

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = excelRowNumber(i);

      const businessName = pickCell(row, [...BUSINESS_HEADER_MAP.businessName]);
      const taxCode = pickCell(row, [...BUSINESS_HEADER_MAP.taxCode]);
      const businessType = pickCell(row, [...BUSINESS_HEADER_MAP.businessType]);
      const mainIndustry = pickCell(row, [...BUSINESS_HEADER_MAP.mainIndustry]);
      const licenseDate = pickCell(row, [...BUSINESS_HEADER_MAP.licenseDate]);
      const registeredProvince = pickCell(row, [
        ...BUSINESS_HEADER_MAP.registeredProvince,
      ]);
      const registeredWard = pickCell(row, [
        ...BUSINESS_HEADER_MAP.registeredWard,
      ]);
      const address = pickCell(row, [...BUSINESS_HEADER_MAP.address]);
      const foreignName = pickCell(row, [...BUSINESS_HEADER_MAP.foreignName]);
      const email = pickCell(row, [...BUSINESS_HEADER_MAP.email]).toLowerCase();
      const officePhone = pickCell(row, [...BUSINESS_HEADER_MAP.officePhone]);
      const operatingProvince = pickCell(row, [
        ...BUSINESS_HEADER_MAP.operatingProvince,
      ]);
      const operatingWard = pickCell(row, [
        ...BUSINESS_HEADER_MAP.operatingWard,
      ]);
      const operatingAddress = pickCell(row, [
        ...BUSINESS_HEADER_MAP.operatingAddress,
      ]);
      const representative = pickCell(row, [
        ...BUSINESS_HEADER_MAP.representative,
      ]);
      const representativePhone = pickCell(row, [
        ...BUSINESS_HEADER_MAP.representativePhone,
      ]);

      if (!businessName) {
        throw new BadRequestException(
          `Dòng ${rowNum}: thiếu "Tên doanh nghiệp"`,
        );
      }
      if (!taxCode) {
        throw new BadRequestException(`Dòng ${rowNum}: thiếu "Mã số thuế"`);
      }
      if (!TAX_CODE_REGEX.test(taxCode)) {
        throw new BadRequestException(
          `Dòng ${rowNum}: "Mã số thuế" "${taxCode}" không hợp lệ (cần 10 chữ số)`,
        );
      }
      if (!businessType) {
        throw new BadRequestException(
          `Dòng ${rowNum}: thiếu "Loại hình kinh doanh"`,
        );
      }
      if (!mainIndustry) {
        throw new BadRequestException(
          `Dòng ${rowNum}: thiếu "Ngành nghề kinh doanh"`,
        );
      }
      if (!registeredProvince) {
        throw new BadRequestException(`Dòng ${rowNum}: thiếu "Tỉnh ĐKKD"`);
      }
      if (!registeredWard) {
        throw new BadRequestException(`Dòng ${rowNum}: thiếu "Phường ĐKKD"`);
      }
      if (!email) {
        throw new BadRequestException(`Dòng ${rowNum}: thiếu "Email"`);
      }
      if (!EMAIL_REGEX.test(email)) {
        throw new BadRequestException(`Dòng ${rowNum}: Email không hợp lệ`);
      }
      if (officePhone && !PHONE_REGEX.test(officePhone)) {
        throw new BadRequestException(
          `Dòng ${rowNum}: "SĐT văn phòng" không hợp lệ`,
        );
      }
      if (representativePhone && !PHONE_REGEX.test(representativePhone)) {
        throw new BadRequestException(
          `Dòng ${rowNum}: "SĐT đại diện" không hợp lệ`,
        );
      }
      if (seenTaxCodes.has(taxCode)) {
        throw new BadRequestException(
          `Dòng ${rowNum}: "Mã số thuế" "${taxCode}" bị trùng trong file`,
        );
      }
      if (seenEmails.has(email)) {
        throw new BadRequestException(
          `Dòng ${rowNum}: "Email" "${email}" bị trùng trong file`,
        );
      }

      seenTaxCodes.add(taxCode);
      seenEmails.add(email);

      records.push({
        taxCode,
        email,
        business: {
          businessName,
          taxCode,
          businessType,
          mainIndustry,
          ...(licenseDate && { licenseDate: new Date(licenseDate) }),
          registeredProvince,
          registeredWard,
          ...(address && { address }),
          ...(foreignName && { foreignName }),
          email,
          ...(officePhone && { officePhone }),
          ...(operatingProvince && { operatingProvince }),
          ...(operatingWard && { operatingWard }),
          ...(operatingAddress && { operatingAddress }),
          ...(representative && { representative }),
          ...(representativePhone && { representativePhone }),
          isActive: true,
          licenseFile: null,
          otherFile: null,
        },
      });
    }

    // Kiểm tra trùng MST/email với DB (1 truy vấn).
    const existing = await this.businessRepository.find({
      where: records.flatMap((r) => [
        { taxCode: r.taxCode },
        { email: r.email },
      ]),
      select: { taxCode: true, email: true },
    });
    const errors: string[] = [];
    if (existing.length > 0) {
      const takenTaxCodes = new Set(existing.map((b) => b.taxCode));
      const takenEmails = new Set(existing.map((b) => b.email));
      for (let i = 0; i < records.length; i++) {
        const r = records[i];
        if (takenTaxCodes.has(r.taxCode)) {
          errors.push(
            `Dòng ${i + 1}: "Mã số thuế" "${r.taxCode}" đã tồn tại trong hệ thống`,
          );
        }
        if (takenEmails.has(r.email)) {
          errors.push(
            `Dòng ${i + 1}: "Email" "${r.email}" đã tồn tại trong hệ thống`,
          );
        }
      }
    }
    if (errors.length > 0) {
      throw new ConflictException(errors.join('\n'));
    }

    // Mọi dòng hợp lệ → insert business + account trong 1 transaction.
    const hashedPassword = await bcrypt.hash(DEFAULT_PASSWORD, 10);
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      for (const rec of records) {
        const business = queryRunner.manager.create(Business, rec.business);
        const savedBusiness = await queryRunner.manager.save(business);

        const account = queryRunner.manager.create(Account, {
          username: rec.taxCode,
          password: hashedPassword,
          role: 'DoanhNghiep',
        });
        const savedAccount = await queryRunner.manager.save(account);

        savedBusiness.accountId = savedAccount.id;
        await queryRunner.manager.save(savedBusiness);
      }
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
      message: `Đã import thành công ${records.length} doanh nghiệp`,
      imported: records.length,
    };
  }
}
