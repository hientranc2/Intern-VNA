import { IsString, IsNotEmpty, IsOptional, IsBoolean } from 'class-validator';
import { Transform } from 'class-transformer';

const toBoolean = ({ value }: { value: unknown }) => {
  if (value === 'true' || value === true) return true;
  if (value === 'false' || value === false) return false;
  return value;
};

export class CreateReportConfigDto {
  @IsString()
  @IsNotEmpty({ message: 'Năm không được để trống' })
  @Transform(({ value }) => value?.trim())
  nam: string;

  @IsString()
  @IsNotEmpty({ message: 'Tên báo cáo không được để trống' })
  @Transform(({ value }) => value?.trim())
  ten: string;

  @IsString()
  @IsNotEmpty({ message: 'Kỳ báo cáo không được để trống' })
  @Transform(({ value }) => value?.trim())
  ky: string;

  @IsString()
  @IsNotEmpty({ message: 'Ngày bắt đầu không được để trống' })
  @Transform(({ value }) => value?.trim())
  batDau: string;

  @IsString()
  @IsNotEmpty({ message: 'Ngày kết thúc không được để trống' })
  @Transform(({ value }) => value?.trim())
  ketThuc: string;

  @IsOptional()
  @IsBoolean()
  @Transform(toBoolean)
  active?: boolean;
}

export class UpdateReportConfigDto {
  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  nam?: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  ten?: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  ky?: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  batDau?: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  ketThuc?: string;

  @IsOptional()
  @IsBoolean()
  @Transform(toBoolean)
  active?: boolean;
}

export class ToggleReportConfigActiveDto {
  @IsBoolean()
  @Transform(toBoolean)
  active: boolean;
}
