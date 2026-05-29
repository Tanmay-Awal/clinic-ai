import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Doctor } from './doctor.entity';
import { Call } from './call.entity';

@Entity('appointments')
export class Appointment {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ type: 'varchar', length: 255, nullable: false })
  patient_name: string;

  @Column({ type: 'varchar', length: 20, nullable: false })
  patient_phone: string;

  @Column({ type: 'bigint', nullable: true })
  doctor_id: number;

  @ManyToOne(() => Doctor)
  @JoinColumn({ name: 'doctor_id' })
  doctor: Doctor;

  @Column({ type: 'date', nullable: false })
  date: string;

  @Column({ type: 'time', nullable: false })
  time: string;

  @Column({ type: 'int', default: 30 })
  duration_minutes: number;

  @Column({ type: 'varchar', length: 50, default: 'booked' })
  status: string; // booked, cancelled, rescheduled, completed, no_show

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ type: 'bigint', nullable: true })
  created_from_call_id: number;

  @ManyToOne(() => Call, { nullable: true })
  @JoinColumn({ name: 'created_from_call_id' })
  created_from_call: Call;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updated_at: Date;
}
