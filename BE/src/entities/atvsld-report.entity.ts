import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

// Báo cáo công tác ATVSLĐ định kỳ (Phụ lục II – TT 07/2016/TT-BLĐTBXH).
// Dùng chung cho Role Doanh nghiệp (khai báo + nộp) và Role Sở (tiếp nhận + duyệt/từ chối).
@Entity('atvsld_reports')
export class AtvsldReport {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'enterprise_id', type: 'uuid', nullable: true })
  enterpriseId: string | null;

  @Column()
  ten: string;

  @Column()
  mst: string;

  @Column({ type: 'integer' })
  nam: number;

  // '6 tháng' | 'Cả năm'
  @Column()
  ky: string;

  @Column({ name: 'ngay_bat_dau', default: '' })
  ngayBatDau: string;

  @Column({ name: 'ngay_ket_thuc', default: '' })
  ngayKetThuc: string;

  @Column({ name: 'ngay_nop', default: '' })
  ngayNop: string;

  @Column({ name: 'nguoi_chinh_sua', default: '' })
  nguoiChinhSua: string;

  @Column({ nullable: true })
  province: string;

  @Column({ nullable: true })
  ward: string;

  // 'Chờ báo cáo' | 'Nhập liệu' | 'Chờ tiếp nhận' | 'Từ chối' | 'Hoàn thành'
  @Column({ default: 'Nhập liệu' })
  status: string;

  @Column({ name: 'ly_do_tu_choi', nullable: true })
  lyDoTuChoi: string | null;

  // Record<string, string> — nội dung khai báo Phụ lục II, key theo DECLARATION_KEYS của FE.
  @Column({ type: 'jsonb', default: () => "'{}'" })
  declaration: Record<string, string>;

  @Column({ type: 'jsonb', default: () => "'[]'" })
  history: Array<{
    timestamp: string;
    actor: string;
    action: string;
    lyDo?: string;
  }>;

  @Column({ name: 'submitted_at', type: 'timestamp', nullable: true })
  submittedAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
