import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';

const toBoolean = ({ value }: { value: unknown }) => {
  if (value === 'true' || value === true) return true;
  if (value === 'false' || value === false) return false;
  return value;
};

// --- Yếu tố gây chấn thương ---

export class CreateInjuryFactorDto {
  @IsString()
  @IsNotEmpty({ message: 'Mã không được để trống' })
  @Transform(({ value }) => value?.trim())
  ma: string;

  @IsString()
  @IsNotEmpty({ message: 'Tên không được để trống' })
  @Transform(({ value }) => value?.trim())
  ten: string;

  @IsOptional()
  @IsBoolean()
  @Transform(toBoolean)
  active?: boolean;
}

export class UpdateInjuryFactorDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: 'Tên không được để trống' })
  @Transform(({ value }) => value?.trim())
  ten?: string;

  @IsOptional()
  @IsBoolean()
  @Transform(toBoolean)
  active?: boolean;
}

export class ToggleInjuryFactorActiveDto {
  @IsBoolean()
  @Transform(toBoolean)
  active: boolean;
}

// --- Loại chấn thương / Nghề nghiệp (dạng cây phân cấp) ---

export class CreateTreeNodeDto {
  @IsString()
  @IsNotEmpty({ message: 'Mã không được để trống' })
  @Transform(({ value }) => value?.trim())
  ma: string;

  @IsString()
  @IsNotEmpty({ message: 'Tên không được để trống' })
  @Transform(({ value }) => value?.trim())
  ten: string;

  @IsInt()
  @Min(1)
  @Max(4)
  @Type(() => Number)
  cap: number;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => {
    if (value === null || value === undefined) return undefined;
    const trimmed = String(value).trim();
    return trimmed === '' ? undefined : trimmed;
  })
  cha?: string;
}

export class UpdateTreeNodeDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: 'Tên không được để trống' })
  @Transform(({ value }) => value?.trim())
  ten?: string;
}
