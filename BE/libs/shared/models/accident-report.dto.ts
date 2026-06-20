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

  @IsOptional()
  @IsString()
  nam?: string;
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

// Các trường số liệu tổng hợp (phần I) + phân loại (phần II) — đều optional, dùng chung.
class ReportTongHopFieldsDto {
  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional() @Type(() => Number) @IsInt() @Min(0) soLaoDong?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) soLDCoBaoHiem?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) soLDNu?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) soVu?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) soVuCoNguoiChet?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) soVuCo2NguoiBiNan?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) soNguoiBiNan?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) soNguoiBiChet?: number;
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  soNguoiBiThuongNang?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) soNgayNghi?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) tongSoTien?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) chiPhiYTe?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) chiPhiTraLuong?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) boiThuongTroCap?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) thiethaiTaiSan?: number;

  // Record<string, number[13]> — phân loại phần II theo mã hạng mục "1".."24"
  @IsOptional()
  @IsObject()
  phanLoaiRows?: Record<string, number[]>;
}

export class CreateEnterpriseReportDto extends ReportTongHopFieldsDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  configId?: number;

  @IsOptional()
  @IsString()
  nam?: string;

  @IsOptional()
  @IsString()
  ky?: string;

  @IsObject()
  tongSoRows: Record<string, number[]>;

  @IsArray()
  chiTietRows: Record<string, unknown>[];
}

export class UpdateEnterpriseReportDto extends ReportTongHopFieldsDto {
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
