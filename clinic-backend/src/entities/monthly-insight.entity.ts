import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('monthly_insights')
@Index(['month', 'year'], { unique: true })
export class MonthlyInsight {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ type: 'int', nullable: false })
  month: number;

  @Column({ type: 'int', nullable: false })
  year: number;

  @Column({ type: 'text', nullable: true })
  executive_summary: string;

  @Column({ type: 'jsonb', nullable: true })
  critical_findings: any;

  @Column({ type: 'jsonb', nullable: true })
  recommendations: any;

  @Column({ type: 'jsonb', nullable: true })
  call_patterns: any;

  @Column({ type: 'text', nullable: true })
  revenue_impact: string;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  created_at: Date;
}
