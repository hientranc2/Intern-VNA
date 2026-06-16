import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('enterprise_types')
export class EnterpriseType {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  ma: string;

  @Column()
  ten: string;

  @Column({ default: true })
  active: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
