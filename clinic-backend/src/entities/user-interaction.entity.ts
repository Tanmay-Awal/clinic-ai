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
import { User } from './user.entity';
import { InteractionType } from './interaction-type.entity';

@Entity('user_interactions')
@Index(['user_id'])
@Index(['interaction_type_id'])
@Index(['user_id', 'interaction_type_id'])
@Index(['created_at'])
export class UserInteraction {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ type: 'bigint', nullable: false })
  user_id: number;

  @Column({ type: 'bigint', nullable: false })
  interaction_type_id: number;

  @Column({ type: 'varchar', length: 50, nullable: true, default: 'active' })
  status: string; // 'active' | 'completed' | 'cancelled' | etc.

  @ManyToOne(() => User, (user) => user.interactions)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(
    () => InteractionType,
    (interactionType) => interactionType.user_interactions,
  )
  @JoinColumn({ name: 'interaction_type_id' })
  interaction_type: InteractionType;

  @CreateDateColumn({ type: 'timestamp with time zone', nullable: false })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone', nullable: false })
  updated_at: Date;
}
