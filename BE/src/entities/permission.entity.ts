import { Entity, PrimaryColumn, Column } from 'typeorm';

@Entity('permissions')
export class Permission {
  @PrimaryColumn()
  id: string;

  @Column()
  type: string;

  @Column({ unique: true })
  code: string;

  @Column()
  name: string;

  @Column({ name: 'parent_id', type: 'varchar', nullable: true })
  parentId: string | null;

  @Column()
  stt: string;

  @Column({ name: 'sort_order', type: 'integer', default: 0 })
  sortOrder: number;
}
