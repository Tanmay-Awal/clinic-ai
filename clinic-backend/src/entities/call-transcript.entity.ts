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

@Entity('call_transcripts')
@Index(['call_id'])
export class CallTranscript {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ type: 'bigint', nullable: false })
  call_id: number;

  @ManyToOne(() => Call, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'call_id' })
  call: Call;

  @Column({ type: 'varchar', length: 50, nullable: true })
  role: string;

  @Column({ type: 'text', nullable: true })
  transcript: string;

  @CreateDateColumn({ type: 'timestamp with time zone', nullable: false })
  created_at: Date;
}
