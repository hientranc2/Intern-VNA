import {
  IsOptional,
  IsString,
  IsEnum,
  IsInt,
  Min,
  IsNotEmpty,
  IsEmail,
  MinLength,
  IsBoolean,
  IsDateString,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';

const emptyToUndefined = ({ value }: { value: unknown }) =>
  typeof value === 'string' && value.trim() === '' ? undefined : value;

// 1. DTO hứng bộ lọc tìm kiếm và phân trang
export class GetUsersFilterDto {
  @IsOptional()
  @IsString()
  fullName?: string;

  @IsOptional()
  @IsString()
  username?: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  role?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  roleId?: number;

  @IsOptional()
  @IsString()
  jobTitle?: string;

  @IsOptional()
  @IsString()
  province?: string;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  isActive?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 10;
}

// 2. DTO cho API Thêm Mới User
export class CreateUserAdminDto {
  @IsNotEmpty({ message: 'Tài khoản không được để trống' })
  @IsString()
  username: string;

  @IsNotEmpty({ message: 'Mật khẩu không được để trống' })
  @MinLength(6, { message: 'Mật khẩu phải từ 6 ký tự' })
  password: string;

  @IsNotEmpty({ message: 'Email không được để trống' })
  @IsEmail({}, { message: 'Email không hợp lệ' })
  email: string;

  @IsNotEmpty({ message: 'Họ và tên không được để trống' })
  @IsString()
  fullName: string;

  @IsOptional()
  @IsString()
  role?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  roleId?: number;

  @IsOptional()
  @IsString()
  jobTitle?: string;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) => {
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return value;
  })
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @Transform(emptyToUndefined)
  @IsDateString({}, { message: 'Ngày sinh không hợp lệ' })
  dob?: string;

  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString()
  gender?: string;

  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString()
  province?: string;

  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString()
  ward?: string;

  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString()
  address?: string;
}

// 3. DTO cho API Cập Nhật User
export class UpdateUserAdminDto {
  @IsOptional()
  @IsString()
  fullName?: string;

  @IsOptional()
  @IsEmail({}, { message: 'Email không hợp lệ' })
  email?: string;

  @IsOptional()
  @IsString()
  role?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  roleId?: number;

  @IsOptional()
  @IsString()
  jobTitle?: string;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) => {
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return value;
  })
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @Transform(emptyToUndefined)
  @IsDateString({}, { message: 'Ngày sinh không hợp lệ' })
  dob?: string;

  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString()
  gender?: string;

  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString()
  province?: string;

  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString()
  ward?: string;

  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString()
  address?: string;
}
export class ResetPasswordAdminDto {
  @IsNotEmpty({ message: 'Mật khẩu mới không được để trống' })
  @MinLength(6, { message: 'Mật khẩu mới phải từ 6 ký tự' })
  newPassword: string;
}
