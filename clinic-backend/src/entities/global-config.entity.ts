import { Entity, PrimaryGeneratedColumn, Column, Index } from 'typeorm';

@Entity('global_config')
@Index(['key'], { unique: true })
export class GlobalConfig {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 255, unique: true, nullable: false })
  key: string;

  @Column({ type: 'timestamp with time zone', nullable: true })
  last_fetch_timestamp: Date;

  @Column({
    type: 'timestamp with time zone',
    default: () => 'CURRENT_TIMESTAMP',
  })
  created_at: Date;

  @Column({
    type: 'timestamp with time zone',
    nullable: true,
    onUpdate: 'CURRENT_TIMESTAMP',
  })
  updated_at: Date;
}
