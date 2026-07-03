import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
  OneToOne,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { CallAnalysis } from './call-analysis.entity';
import { Appointment } from './appointment.entity';

@Entity('calls')
@Index(['from_number'])
@Index(['to_number'])
@Index(['call_status'])
@Index(['call_start_time'])
@Index(['created_at'])
@Index(['call_direction', 'call_start_time'])
export class Call {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ type: 'varchar', length: 255, unique: true, nullable: true })
  call_id: string; // The pipecat/bot call ID

  @Column({ type: 'varchar', length: 255, nullable: true })
  agent_id: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  agent_name: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  call_source: string; // 'pipecat'

  @Column({ type: 'varchar', length: 50, nullable: true })
  call_direction: string; // 'inbound' | 'outbound'

  @Column({ type: 'varchar', length: 50, nullable: true })
  from_number: string; // Equivalent to caller_phone

  @Column({ type: 'varchar', length: 50, nullable: true })
  to_number: string;

  @Column({ type: 'text', nullable: true, name: 'display_mobile_number' })
  display_mobile_number: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  disconnection_reason: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  transfer_destination: string;

  @Column({ type: 'boolean', default: false })
  transfer_to_human: boolean;

  @Column({ type: 'text', nullable: true })
  transfer_reason: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  call_status: string; // 'ended' | 'ongoing' | 'failed'

  @Column({ type: 'text', nullable: true })
  recording_url: string;

  @Column({ type: 'text', nullable: true })
  recording_multi_channel_url: string;

  @Column({ type: 'bigint', nullable: true })
  call_duration_ms: number;

  @Column({ type: 'timestamp with time zone', nullable: true })
  call_start_time: Date | null;

  @Column({ type: 'timestamp with time zone', nullable: true })
  call_end_time: Date | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  twilio_call_sid: string;

  @Column({ type: 'boolean', default: false })
  needs_ai_processing: boolean;

  @Column({ type: 'varchar', length: 50, nullable: true })
  category: string | null; // e.g. 'Appointment', 'Inquiry'

  @Column({ type: 'varchar', length: 50, nullable: true })
  sub_category: string | null;

  @Column({ type: 'boolean', default: false })
  get_data: boolean;

  @Column({ type: 'boolean', default: true })
  is_visible: boolean;

  @Column({
    type: 'timestamp with time zone',
    default: () => 'CURRENT_TIMESTAMP',
    nullable: false,
  })
  created_at: Date;

  @OneToOne(() => CallAnalysis, (analysis) => analysis.call)
  callAnalysis: CallAnalysis;

  // Clinic specific relationships
  @Column({ type: 'boolean', default: false })
  appointment_created: boolean;

  @Column({ type: 'bigint', nullable: true })
  appointment_id: number;

  @ManyToOne(() => Appointment, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'appointment_id' })
  appointment: Appointment;

  @Column({ type: 'jsonb', nullable: true })
  tool_calls_made: any;

  @Column({ type: 'jsonb', nullable: true })
  transcript: any; // Raw transcript
}
