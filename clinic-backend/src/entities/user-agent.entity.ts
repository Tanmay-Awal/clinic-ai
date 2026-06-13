import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { User } from './user.entity';
import { Agent } from './agent.entity';

@Entity('user_agents')
@Index(['user_id', 'agent_id'], { unique: true })
export class UserAgent {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ type: 'bigint', nullable: false })
  user_id: number;

  @Column({ type: 'bigint', nullable: false })
  agent_id: number;

  @ManyToOne(() => User, (user) => user.userAgents)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => Agent, (agent) => agent.userAgents)
  @JoinColumn({ name: 'agent_id' })
  agent: Agent;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  created_at: Date;
}
