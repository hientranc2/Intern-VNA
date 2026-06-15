import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('report_configs')
export class ReportConfig {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  nam: string;

  @Column()
  ten: string;

  @Column()
  ky: string;

  @Column({ name: 'bat_dau' })
  batDau: string;

  @Column({ name: 'ket_thuc' })
  ketThuc: string;

  @Column({ default: true })
  active: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
