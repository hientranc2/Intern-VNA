import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('business_sectors')
export class BusinessSector {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  ma: string;

  @Column()
  ten: string;

  @Column({ type: 'integer' })
  cap: number;

  @Column({ default: '' })
  cha: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
