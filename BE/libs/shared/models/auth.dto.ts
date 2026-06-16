import {
  IsEmail,
  IsNotEmpty,
  MinLength,
  IsString,
  IsOptional,
  IsBoolean,
} from 'class-validator';

export class RegisterDto {
  @IsNotEmpty({ message: 'Tên đăng nhập không được để trống' })
  @IsString()
  username: string;

  @IsNotEmpty({ message: 'Họ và tên không được để trống' })
  @IsString()
  fullName: string;

  @IsEmail({}, { message: 'Email không hợp lệ' })
  email: string;

  @MinLength(6, { message: 'Mật khẩu ít nhất 6 ký tự' })
  password: string;

  @IsString()
  @IsOptional()
  gender?: string;
}

export class LoginDto {
  @IsNotEmpty({ message: 'Vui lòng nhập đầy đủ thông tin' })
  username: string;

  @IsNotEmpty({ message: 'Vui lòng nhập đầy đủ thông tin' })
  password: string;

  @IsBoolean()
  @IsOptional()
  rememberMe?: boolean;
}

export class ForgotPasswordDto {
  @IsEmail({}, { message: 'Email không hợp lệ' })
  email: string;
}

export class ResetPasswordDto {
  @IsEmail({}, { message: 'Email không hợp lệ' })
  email: string;

  @IsNotEmpty({ message: 'Vui lòng nhập mã OTP' })
  otpCode: string;

  @MinLength(6, { message: 'Mật khẩu mới phải từ 6 ký tự' })
  newPassword: string;
}

export class ChangePasswordDto {
  @IsNotEmpty({ message: 'Vui lòng nhập mật khẩu cũ' })
  oldPassword: string;

  @MinLength(6, { message: 'Mật khẩu mới phải từ 6 ký tự' })
  newPassword: string;

  @IsNotEmpty({ message: 'Vui lòng xác nhận mật khẩu mới' })
  confirmPassword: string;
}

export class ChangeEmailDto {
  @IsNotEmpty({ message: 'Vui lòng nhập mã OTP' })
  otpCode: string;

  @IsEmail({}, { message: 'Email mới không hợp lệ' })
  newEmail: string;
}

export class UpdateProfileDto {
  @IsOptional() @IsString() fullName?: string;
  @IsOptional() dob?: Date;
  @IsOptional() @IsString() gender?: string;
  @IsOptional() @IsString() jobTitle?: string;
  @IsOptional() @IsString() avatarUrl?: string;
  @IsOptional() @IsString() province?: string;
  @IsOptional() @IsString() ward?: string;
  @IsOptional() @IsString() address?: string;
}

export class SendRegisterOtpDto {
  @IsEmail({}, { message: 'Email không hợp lệ' })
  email: string;
}

export class VerifyRegisterOtpDto {
  @IsEmail({}, { message: 'Email không hợp lệ' })
  email: string;

  @IsNotEmpty({ message: 'Vui lòng nhập mã OTP' })
  otpCode: string;
}
