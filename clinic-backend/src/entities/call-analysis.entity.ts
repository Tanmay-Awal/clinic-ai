import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { Call } from './call.entity';

@Entity('call_analyses')
@Index(['call_id'])
export class CallAnalysis {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ type: 'bigint', nullable: false })
  call_id: number;

  @ManyToOne(() => Call, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'call_id' })
  call: Call;

  @Column({ type: 'text', nullable: true })
  call_summary: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  user_sentiment: string | null;

  @Column({ type: 'boolean', nullable: true })
  call_successful: boolean | null;

  @Column({ type: 'varchar', nullable: true })
  name: string | null;

  @Column({ type: 'varchar', nullable: true })
  location: string | null;

  @Column({ type: 'varchar', nullable: true })
  contact_number: string | null;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  sentiment_percentage: number | null;

  @CreateDateColumn({ type: 'timestamp with time zone', nullable: false })
  created_at: Date;
}
