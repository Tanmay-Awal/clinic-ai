import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    ManyToOne,
    JoinColumn,
    Index,
} from 'typeorm';
import { User } from './user.entity';

@Entity('weekly_insights')
@Index(['user_id', 'category', 'created_at'])
export class WeeklyInsight {
    @PrimaryGeneratedColumn({ type: 'bigint' })
    id: number;

    @Column({ type: 'bigint', nullable: false })
    user_id: number;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'user_id' })
    user: User;

    @Column({ type: 'varchar', length: 50, nullable: false })
    category: string; // 'Reservation' | 'Feedback'

    @Column({ type: 'jsonb', nullable: false })
    insights: string[]; // Array of exactly 5 strings

    @CreateDateColumn({ type: 'timestamp with time zone', nullable: false })
    created_at: Date;
}
