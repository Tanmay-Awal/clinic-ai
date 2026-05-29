import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Call } from './call.entity';
import { User } from './user.entity';

@Entity('actions')
export class Action {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ type: 'bigint', nullable: true })
  call_id: number;

  @ManyToOne(() => Call, { nullable: true })
  @JoinColumn({ name: 'call_id' })
  call: Call;

  @Column({ type: 'varchar', length: 100, nullable: false })
  type: string;

  @Column({ type: 'varchar', length: 50, default: 'Medium' })
  priority: string;

  @Column({ type: 'varchar', length: 50, default: 'Open' })
  status: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  caller_phone: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ type: 'int', default: 1 })
  repeat_count: number;

  @Column({ type: 'timestamp with time zone', nullable: true })
  resolved_at: Date;

  @Column({ type: 'bigint', nullable: true })
  resolved_by_id: number;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'resolved_by_id' })
  resolved_by: User;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updated_at: Date;
}
