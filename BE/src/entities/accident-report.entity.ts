import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export type AccidentDetailRow = {
  id: number;
  hoTen: string;
  ngaySinh: string;
  gioiTinh: string;
  ngheNghiep: string;
  loaiHopDong: string;
  mucDo: string;
  ngayXayRa: string;
  diaDiem: string;
  yeuTo: string;
};

@Entity('accident_reports')
export class AccidentReport {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'enterprise_id', type: 'uuid', nullable: true })
  enterpriseId: string | null;

  @Column({ name: 'config_id', type: 'integer' })
  configId: number;

  @Column()
  ten: string;

  @Column()
  mst: string;

  @Column()
  ky: string;

  // 'Đang báo cáo' | 'Đã nộp' | 'Đã tiếp nhận'
  @Column({ default: 'Đang báo cáo' })
  status: string;

  // Record<string, number[]> — tổng số liệu theo mã dòng báo cáo
  @Column({ type: 'jsonb', default: () => "'{}'" })
  rows: Record<string, number[]>;

  @Column({ name: 'chi_tiet_rows', type: 'jsonb', default: () => "'[]'" })
  chiTietRows: AccidentDetailRow[];

  // Record<string, number[13]> — phân loại TNLĐ phần II, key = mã hạng mục "1".."24"
  @Column({ name: 'phan_loai_rows', type: 'jsonb', default: () => "'{}'" })
  phanLoaiRows: Record<string, number[]>;

  // --- Thông tin tổng hợp cho màn hình Sở ---
  @Column({ nullable: true })
  province: string;

  @Column({ nullable: true })
  ward: string;

  @Column({ name: 'loai_hinh', nullable: true })
  loaiHinh: string;

  @Column({ name: 'so_lao_dong', type: 'integer', default: 0 })
  soLaoDong: number;

  @Column({ name: 'so_ld_co_bao_hiem', type: 'integer', default: 0 })
  soLDCoBaoHiem: number;

  @Column({ name: 'so_vu', type: 'integer', default: 0 })
  soVu: number;

  @Column({ name: 'so_vu_co_nguoi_chet', type: 'integer', default: 0 })
  soVuCoNguoiChet: number;

  @Column({ name: 'so_vu_co_2_nguoi_bi_nan', type: 'integer', default: 0 })
  soVuCo2NguoiBiNan: number;

  @Column({ name: 'so_nguoi_bi_nan', type: 'integer', default: 0 })
  soNguoiBiNan: number;

  @Column({ name: 'so_ld_nu', type: 'integer', default: 0 })
  soLDNu: number;

  @Column({ name: 'so_nguoi_bi_chet', type: 'integer', default: 0 })
  soNguoiBiChet: number;

  @Column({ name: 'so_nguoi_bi_thuong_nang', type: 'integer', default: 0 })
  soNguoiBiThuongNang: number;

  @Column({ name: 'so_ngay_nghi', type: 'integer', default: 0 })
  soNgayNghi: number;

  @Column({ name: 'tong_so_tien', type: 'integer', default: 0 })
  tongSoTien: number;

  @Column({ name: 'chi_phi_y_te', type: 'integer', default: 0 })
  chiPhiYTe: number;

  @Column({ name: 'chi_phi_tra_luong', type: 'integer', default: 0 })
  chiPhiTraLuong: number;

  @Column({ name: 'boi_thuong_tro_cap', type: 'integer', default: 0 })
  boiThuongTroCap: number;

  @Column({ name: 'thiet_hai_tai_san', type: 'integer', default: 0 })
  thiethaiTaiSan: number;

  // Lý do từ chối báo cáo (null nếu chưa bị từ chối).
  @Column({ name: 'rejection_reason', type: 'text', nullable: true })
  rejectionReason: string | null;

  // Timeline: duyệt
  @Column({ name: 'accepted_at', type: 'timestamp', nullable: true })
  acceptedAt: Date | null;

  @Column({ name: 'accepted_by', type: 'text', nullable: true })
  acceptedBy: string | null;

  // Timeline: từ chối
  @Column({ name: 'rejected_at', type: 'timestamp', nullable: true })
  rejectedAt: Date | null;

  @Column({ name: 'rejected_by', type: 'text', nullable: true })
  rejectedBy: string | null;

  @Column({ name: 'submitted_at', type: 'timestamp', nullable: true })
  submittedAt: Date | null;

  @Column({ name: 'file_url', type: 'text', nullable: true })
  fileUrl: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
