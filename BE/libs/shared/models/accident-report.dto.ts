import {
  IsString,
  IsOptional,
  IsInt,
  Min,
  IsObject,
  IsArray,
} from 'class-validator';
import { Type } from 'class-transformer';

// --- Màn hình Sở: danh sách + tổng hợp ---

export class AccidentReportQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pageSize?: number = 10;

  @IsOptional()
  @IsString()
  ten?: string;

  @IsOptional()
  @IsString()
  mst?: string;

  @IsOptional()
  @IsString()
  ky?: string;

  @IsOptional()
  @IsString()
  tt?: string;
}

export class SummaryQueryDto {
  @IsOptional()
  @IsString()
  nam?: string;

  @IsOptional()
  @IsString()
  ky?: string;
}

// --- Màn hình Doanh nghiệp: nộp báo cáo ---

export class CreateEnterpriseReportDto {
  @Type(() => Number)
  @IsInt()
  configId: number;

  @IsObject()
  tongSoRows: Record<string, number[]>;

  @IsArray()
  chiTietRows: Record<string, unknown>[];
}

export class UpdateEnterpriseReportDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  configId?: number;

  @IsOptional()
  @IsObject()
  tongSoRows?: Record<string, number[]>;

  @IsOptional()
  @IsArray()
  chiTietRows?: Record<string, unknown>[];
}
