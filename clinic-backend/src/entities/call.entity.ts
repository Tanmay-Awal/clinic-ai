import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { Appointment } from './appointment.entity';

@Entity('calls')
export class Call {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ type: 'varchar', length: 255, unique: true, nullable: true })
  call_id: string; // from bot

  @Column({ type: 'varchar', length: 20, nullable: true })
  caller_phone: string;

  @Column({ type: 'varchar', length: 20, default: 'inbound' })
  direction: string;

  @Column({ type: 'timestamp with time zone', nullable: true })
  start_time: Date;

  @Column({ type: 'timestamp with time zone', nullable: true })
  end_time: Date;

  @Column({ type: 'int', nullable: true })
  duration_seconds: number;

  @Column({ type: 'jsonb', nullable: true })
  transcript: any;

  @Column({ type: 'text', nullable: true })
  recording_url: string;

  // Analysis fields (filled by Groq after ingest)
  @Column({ type: 'varchar', length: 100, nullable: true })
  category: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  sub_category: string;

  @Column({ type: 'text', nullable: true })
  summary: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  sentiment: string;

  @Column({ type: 'jsonb', nullable: true })
  key_insights: any;

  @Column({ type: 'jsonb', nullable: true })
  top_queries: any;

  // Bot metadata
  @Column({ type: 'boolean', default: false })
  appointment_created: boolean;

  @Column({ type: 'bigint', nullable: true })
  appointment_id: number;

  @OneToOne(() => Appointment, { nullable: true })
  @JoinColumn({ name: 'appointment_id' })
  appointment: Appointment;

  @Column({ type: 'jsonb', nullable: true })
  tool_calls_made: any;

  @Column({ type: 'boolean', default: false })
  transfer_to_human: boolean;

  @Column({ type: 'text', nullable: true })
  transfer_reason: string;

  @Column({ type: 'timestamp with time zone', nullable: true })
  analyzed_at: Date;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  created_at: Date;
}
