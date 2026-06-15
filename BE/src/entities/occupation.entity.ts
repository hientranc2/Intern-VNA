import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('occupations')
export class Occupation {
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
