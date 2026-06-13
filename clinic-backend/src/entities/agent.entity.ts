import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { UserAgent } from './user-agent.entity';

@Entity('agents')
@Index(['agent_id'], { unique: true })
export class Agent {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ type: 'varchar', length: 255, unique: true, nullable: false })
  agent_id: string;

  @Column({ type: 'varchar', length: 255, nullable: false })
  agent_name: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  category_purpose: string; // 'Reservation', 'Feedback', or null

  @OneToMany(() => UserAgent, (userAgent) => userAgent.agent)
  userAgents: UserAgent[];

  @CreateDateColumn({ type: 'timestamp with time zone' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updated_at: Date;
}
