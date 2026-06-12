import { IsString, IsNotEmpty, IsOptional, IsBoolean } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateEnterpriseTypeDto {
  @IsString()
  @IsNotEmpty({ message: 'Mã loại hình không được để trống' })
  @Transform(({ value }) => value?.trim())
  ma: string;

  @IsString()
  @IsNotEmpty({ message: 'Tên loại hình không được để trống' })
  @Transform(({ value }) => value?.trim())
  ten: string;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => {
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return undefined;
  })
  active?: boolean;
}

export class UpdateEnterpriseTypeDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: 'Tên loại hình không được để trống' })
  @Transform(({ value }) => value?.trim())
  ten?: string;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => {
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return undefined;
  })
  active?: boolean;
}

export class ToggleEnterpriseTypeActiveDto {
  @IsBoolean()
  @Transform(({ value }) => {
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return value;
  })
  active: boolean;
}
