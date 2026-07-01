import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('roles')
export class Role {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  ma: string;

  @Column()
  ten: string;

  @Column({ type: 'jsonb', default: () => "'[]'" })
  perms: string[];

  // Vai trò hệ thống cấp cao — không được phép xóa (kể cả khi có quyền xóa).
  @Column({ name: 'is_protected', default: false })
  isProtected: boolean;

  // Cờ legacy cho vai trò cấp cao; chỉ role mã SUPER_ADMIN mới tự động toàn quyền.
  @Column({ name: 'is_super', default: false })
  isSuper: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
