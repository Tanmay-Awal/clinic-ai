import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
} from 'typeorm';

@Entity('clinic_config')
@Index(['key'], { unique: true })
export class ClinicConfig {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ type: 'varchar', length: 255, unique: true, nullable: false })
  key: string;

  @Column({ type: 'text', nullable: false })
  value: string;
}
