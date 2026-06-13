import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Call } from './call.entity';

@Entity('feedback_details')
@Index(['call_id'], { unique: true })
@Index(['feedback_type'])
@Index(['guest_name'])
export class FeedbackDetails {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ type: 'bigint', nullable: false, unique: true })
  call_id: number;

  @ManyToOne(() => Call, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'call_id' })
  call: Call;

  @Column({ type: 'varchar', length: 255, nullable: true })
  guest_name: string; // Extract guest/customer name from conversation if mentioned

  @Column({ type: 'varchar', length: 100, nullable: true })
  feedback_type: string; // "Complaint", "Compliment", "Suggestion", "Review", "Rating"

  @Column({ type: 'varchar', length: 255, nullable: true })
  feedback_topic: string; // "Food Quality", "Service", "Room Cleanliness", "Staff Behavior", "Overall Experience"

  @Column({ type: 'int', nullable: true })
  rating: number; // Numeric rating (1-5 or 1-10 scale)

  @Column({ type: 'jsonb', nullable: true })
  positives: string[]; // Array of positive feedback points

  @Column({ type: 'jsonb', nullable: true })
  negatives: string[]; // Array of negative feedback points

  @Column({ type: 'jsonb', nullable: true })
  aspects: any; // Can store formatted string or legacy numeric object

  @Column({ type: 'boolean', nullable: true })
  recommended: boolean; // Whether customer would recommend

  @Column({ type: 'jsonb', nullable: true })
  summary: string[]; // Array of summary bullet points

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  sentiment_meter: number; // Sentiment score (0-1)

  @Column({ type: 'varchar', length: 100, nullable: true })
  call_outcome: string; // "positive_with_booking", "negative_escalated", etc.

  @Column({ type: 'varchar', length: 50, nullable: true })
  guest_engagement: string; // "high", "moderate", "low"

  @Column({ type: 'varchar', length: 50, nullable: true })
  visit_type: string; // "first_visit", "returning", "unknown"

  @Column({ type: 'jsonb', nullable: true })
  rebooking: any; // { offered: boolean, accepted: boolean, date: string, party_size: number, declined_reason: string }

  @Column({ type: 'boolean', nullable: true, default: false })
  requires_action: boolean;

  @Column({ type: 'varchar', length: 100, nullable: true })
  action_type: string;

  @Column({ type: 'jsonb', nullable: true })
  key_entities: Array<{ type: string; value: string }>; // Key entities extracted from conversation

  @Column({ type: 'text', nullable: true })
  notes: string; // Detailed notes about the feedback

  @CreateDateColumn({ type: 'timestamp with time zone', nullable: false })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone', nullable: false })
  updated_at: Date;
}
