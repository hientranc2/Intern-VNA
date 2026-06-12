import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
} from 'typeorm';

import { Account } from './business_account.entity';

@Entity('businesses')
export class Business {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'business_name' })
  businessName: string;

  @Column({ name: 'tax_code', unique: true })
  taxCode: string;

  @Column({ name: 'business_type' })
  businessType: string;

  @Column({ name: 'main_industry' })
  mainIndustry: string;

  @Column({ name: 'license_date', type: 'timestamp', nullable: true })
  licenseDate: Date;

  @Column({ name: 'registered_province' })
  registeredProvince: string;

  @Column({ name: 'registered_ward' })
  registeredWard: string;

  @Column({ nullable: true })
  address: string;

  @Column({ name: 'foreign_name', nullable: true })
  foreignName: string;

  @Column({ unique: true })
  email: string;

  @Column({ name: 'office_phone', nullable: true })
  officePhone: string;

  @Column({ name: 'operating_province', nullable: true })
  operatingProvince: string;

  @Column({ name: 'operating_ward', nullable: true })
  operatingWard: string;

  @Column({ name: 'operating_address', nullable: true })
  operatingAddress: string;

  @Column({ nullable: true })
  representative: string;

  @Column({ name: 'representative_phone', nullable: true })
  representativePhone: string;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'account_id', nullable: true })
  accountId: string;

  @OneToOne(() => Account, (a) => a.business, { nullable: true })
  @JoinColumn({ name: 'account_id' })
  account: Account;

  @Column({ name: 'license_file', nullable: true })
  licenseFile: string;

  @Column({ name: 'other_file', nullable: true })
  otherFile: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}