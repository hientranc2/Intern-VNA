import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true, name: 'username' })
  username: string;

  @Column()
  password: string;

  @Column({ unique: true })
  email: string;

  @Column({ name: 'full_name' })
  fullName: string;

  @Column({ type: 'date', nullable: true })
  dob: Date;

  @Column({ nullable: true })
  gender: string;

  @Column({ name: 'job_title', nullable: true })
  jobTitle: string;

  @Column({ default: 'USER' })
  role: string;

  // Liên kết tới vai trò (bảng roles) để suy ra danh sách quyền. Null = chưa gán.
  @Column({ name: 'role_id', type: 'integer', nullable: true })
  roleId: number | null;

  @Column({ name: 'avatar_url', nullable: true })
  avatarUrl: string;

  @Column({ nullable: true })
  province: string;

  @Column({ nullable: true })
  ward: string;

  @Column({ nullable: true })
  address: string;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'otp_code', nullable: true })
  otpCode: string;

  @Column({ type: 'timestamp', name: 'otp_expires_at', nullable: true })
  otpExpiresAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
