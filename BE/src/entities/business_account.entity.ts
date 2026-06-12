import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
  CreateDateColumn,
} from 'typeorm';
import { Business } from './business.entity';

@Entity('accounts')
export class Account {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  username: string;

  @Column()
  password: string;

  @Column({ name: 'business_id' })
  businessId: string;

  @Column({ default: 'DoanhNghiep' })
  role: string;

  @OneToOne(() => Business, (b) => b.account)
  business: Business;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}