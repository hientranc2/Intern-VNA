import { IsString, IsNotEmpty, IsOptional, IsArray } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateRoleDto {
  @IsString()
  @IsNotEmpty({ message: 'Mã vai trò không được để trống' })
  @Transform(({ value }) => value?.trim())
  ma: string;

  @IsString()
  @IsNotEmpty({ message: 'Tên vai trò không được để trống' })
  @Transform(({ value }) => value?.trim())
  ten: string;

  @IsArray()
  @IsString({ each: true })
  perms: string[];
}

export class UpdateRoleDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: 'Tên vai trò không được để trống' })
  @Transform(({ value }) => value?.trim())
  ten?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  perms?: string[];
}
