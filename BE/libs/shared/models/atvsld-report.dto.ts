import {
  IsString,
  IsOptional,
  IsInt,
  Min,
  IsObject,
  IsArray,
  IsNotEmpty,
} from 'class-validator';
import { Type } from 'class-transformer';

// --- Role Sở: danh sách tiếp nhận (phân trang) ---

export class AtvsldReportQueryDto {
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
  @Type(() => Number)
  @IsInt()
  nam?: number;

  @IsOptional()
  @IsString()
  ten?: string;

  @IsOptional()
  @IsString()
  mst?: string;

  @IsOptional()
  @IsString()
  ward?: string;

  @IsOptional()
  @IsString()
  status?: string;
}

// --- Role Doanh nghiệp: danh sách báo cáo của mình ---

export class MyAtvsldReportQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  nam?: number;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  ky?: string;
}

// --- Role Doanh nghiệp: tạo / cập nhật bản khai ---

export class CreateAtvsldReportDto {
  @IsString()
  @IsNotEmpty()
  ky: string;

  @Type(() => Number)
  @IsInt()
  nam: number;

  @IsObject()
  declaration: Record<string, string>;
}

export class UpdateAtvsldReportDto {
  @IsOptional()
  @IsString()
  ky?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  nam?: number;

  @IsOptional()
  @IsObject()
  declaration?: Record<string, string>;
}

// --- Role Sở: từ chối (đơn lẻ) ---

export class RejectAtvsldReportDto {
  @IsString()
  @IsNotEmpty()
  lyDoTuChoi: string;
}

// --- Role Sở: thao tác hàng loạt ---

export class BulkApproveAtvsldDto {
  @IsArray()
  @Type(() => Number)
  @IsInt({ each: true })
  ids: number[];
}

export class BulkRejectAtvsldDto {
  @IsArray()
  @Type(() => Number)
  @IsInt({ each: true })
  ids: number[];

  @IsString()
  @IsNotEmpty()
  lyDoTuChoi: string;
}
