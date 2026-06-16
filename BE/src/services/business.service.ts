import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, FindOptionsWhere } from 'typeorm';
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

const DEFAULT_PASSWORD = '12345678';

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
      registeredWard: entity.registeredWard,
      isActive: entity.isActive,
    };
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
    if (registeredWard) where.registeredWard = registeredWard;
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

    if (licenseFile) {
      await this.deleteFile(business.licenseFile);
      business.licenseFile = await this.uploadFile(
        licenseFile,
        business.taxCode,
        'license',
      );
    }
    if (otherFile) {
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
}
