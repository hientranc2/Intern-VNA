import { IsString, IsNotEmpty, IsOptional, IsInt, Min, Max } from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class CreateBusinessSectorDto {
  @IsString()
  @IsNotEmpty({ message: 'Mã ngành không được để trống' })
  @Transform(({ value }) => value?.trim())
  ma: string;

  @IsString()
  @IsNotEmpty({ message: 'Tên ngành không được để trống' })
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

export class UpdateBusinessSectorDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: 'Tên ngành không được để trống' })
  @Transform(({ value }) => value?.trim())
  ten?: string;
}
