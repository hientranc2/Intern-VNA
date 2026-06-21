import {
  IsString,
  IsEmail,
  IsOptional,
  IsBoolean,
  IsDateString,
  IsNotEmpty,
  Matches,
  Length,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';

// Biến chuỗi rỗng "", " " hoặc null thành undefined để @IsOptional() hoạt động đúng
const emptyToUndefined = ({ value }: { value: any }) => {
  if (value === null || value === undefined) return undefined;

  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed === '' ? undefined : trimmed;
  }

  return value;
};

// Chấp nhận cả ISO (yyyy-mm-dd) và dd/mm/yyyy (lúc test Postman)
const parseDateInput = ({ value }: { value: any }) => {
  if (value === '' || value === null || value === undefined) return undefined;
  if (typeof value === 'string') {
    const match = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (match) {
      const [, dd, mm, yyyy] = match;
      return `${dd}-${mm}-${yyyy}`;
    }
  }
  return value;
};

// SĐT Việt Nam:
// - Di động (10 số): 03x, 05[25689]x, 07[06789]x, 08[1-9]x, 09[0-46-9]x
// - Cố định (10-11 số): 02 + mã vùng + số (VD: 028, 024...)
const VN_PHONE_REGEX = /^(0(3[2-9]|5\d|7\d|8\d|9\d)\d{7}|02\d{8,9})$/;

export class BusinessCreateDto {
  @IsString()
  @IsNotEmpty({ message: 'Tên doanh nghiệp không được để trống' })
  businessName: string;

  // Mã số thuế doanh nghiệp Việt Nam: 10 số (hoặc 10 số-1~5 số cho chi nhánh).
  @IsString()
  @IsNotEmpty({ message: 'Mã số thuế không được để trống' })
  @Matches(/^\d{10}(-\d{1,5})?$/, {
    message:
      'Mã số thuế gồm 10 chữ số, hoặc 10 chữ số + dấu gạch + tối đa 5 số',
  })
  taxCode: string;

  @IsString()
  @IsNotEmpty({ message: 'Loại hình kinh doanh không được để trống' })
  businessType: string;

  @IsString()
  @IsNotEmpty({ message: 'Ngành nghề kinh doanh không được để trống' })
  mainIndustry: string;

  @IsOptional()
  @Transform(parseDateInput)
  @IsDateString({}, { message: 'Ngày cấp GPKD không hợp lệ' })
  licenseDate?: string;

  @IsString()
  @IsNotEmpty({ message: 'Tỉnh/Thành phố ĐKKD không được để trống' })
  registeredProvince: string;

  @IsString()
  @IsNotEmpty({ message: 'Phường/Xã ĐKKD không được để trống' })
  registeredWard: string;

  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString()
  address?: string;

  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString()
  foreignName?: string;

  @IsEmail({}, { message: 'Email không hợp lệ' })
  @IsNotEmpty({ message: 'Email không được để trống' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  email: string;

  @IsOptional()
  @Transform(emptyToUndefined)
  @Matches(VN_PHONE_REGEX, { message: 'Số điện thoại văn phòng không hợp lệ' })
  officePhone?: string;

  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString()
  operatingProvince?: string;

  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString()
  operatingWard?: string;

  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString()
  operatingAddress?: string;

  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString()
  representative?: string;

  @IsOptional()
  @Transform(emptyToUndefined)
  @Matches(VN_PHONE_REGEX, {
    message: 'Số điện thoại người đại diện không hợp lệ',
  })
  representativePhone?: string;
}

// Update KHÔNG có taxCode -> không cho sửa mã số thuế sau khi tạo
export class BusinessUpdateDto {
  @IsOptional() @Transform(emptyToUndefined) @IsString() businessName?: string;
  @IsOptional() @Transform(emptyToUndefined) @IsString() businessType?: string;
  @IsOptional() @Transform(emptyToUndefined) @IsString() mainIndustry?: string;

  @IsOptional()
  @Transform(parseDateInput)
  @IsDateString({}, { message: 'Ngày cấp GPKD không hợp lệ' })
  licenseDate?: string;

  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString()
  registeredProvince?: string;
  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString()
  registeredWard?: string;
  @IsOptional() @Transform(emptyToUndefined) @IsString() address?: string;
  @IsOptional() @Transform(emptyToUndefined) @IsString() foreignName?: string;

  @IsOptional()
  @Transform(emptyToUndefined)
  @IsEmail({}, { message: 'Email không hợp lệ' })
  email?: string;

  @IsOptional()
  @Transform(emptyToUndefined)
  @Matches(VN_PHONE_REGEX, { message: 'Số điện thoại văn phòng không hợp lệ' })
  officePhone?: string;

  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString()
  operatingProvince?: string;
  @IsOptional() @Transform(emptyToUndefined) @IsString() operatingWard?: string;
  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString()
  operatingAddress?: string;
  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString()
  representative?: string;

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  deleteLicenseFile?: boolean;

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  deleteOtherFile?: boolean;

  @IsOptional()
  @Transform(emptyToUndefined)
  @Matches(VN_PHONE_REGEX, {
    message: 'Số điện thoại người đại diện không hợp lệ',
  })
  representativePhone?: string;
}

export class BusinessQueryDto {
  @IsOptional() @Transform(emptyToUndefined) @IsString() businessName?: string;
  @IsOptional() @Transform(emptyToUndefined) @IsString() taxCode?: string;
  @IsOptional() @Transform(emptyToUndefined) @IsString() businessType?: string;
  @IsOptional() @Transform(emptyToUndefined) @IsString() mainIndustry?: string;
  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString()
  registeredWard?: string;
  @IsOptional()
  @Transform(({ value }) => {
    // Query string là chuỗi: Boolean("false") === true nên KHÔNG dùng @Type(() => Boolean).
    if (value === true || value === 'true') return true;
    if (value === false || value === 'false') return false;
    return undefined;
  })
  @IsBoolean()
  isActive?: boolean;
  @IsOptional() @Type(() => Number) page?: number = 1;
  @IsOptional() @Type(() => Number) limit?: number = 10;
}

export class BusinessToggleStatusDto {
  @IsBoolean()
  isActive: boolean;
}

export class BusinessListDto {
  id: string;
  businessName: string;
  taxCode: string;
  businessType: string;
  mainIndustry: string;
  registeredWard: string;
  isActive: boolean;
}

export class AccountPopupDto {
  username: string;
  password: string;
}
