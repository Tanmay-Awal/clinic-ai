import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    Index,
    CreateDateColumn,
    ManyToOne,
    JoinColumn,
} from 'typeorm';
import { Call } from './call.entity';

@Entity('general_issues')
@Index(['call_id'], { unique: true })
export class GeneralIssue {
    @PrimaryGeneratedColumn({ type: 'bigint' })
    id: number;

    @Column({ type: 'bigint', nullable: false, unique: true })
    call_id: number;

    @ManyToOne(() => Call, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'call_id' })
    call: Call;

    @Column({ type: 'varchar', length: 255, nullable: true })
    guest_name: string;

    @Column({ type: 'varchar', length: 50, nullable: true })
    type: string; // 'General Issue', 'Enquiry', etc.

    @Column({ type: 'text', nullable: true })
    issue_summary: string;

    @Column({ type: 'text', nullable: true })
    description: string;

    @Column({ type: 'varchar', length: 255, nullable: true })
    purpose: string;

    @Column({ type: 'varchar', length: 100, nullable: true })
    request_type: string;

    @Column({ type: 'varchar', length: 100, nullable: true })
    time: string;

    @Column({ type: 'text', nullable: true })
    notes: string;

    @Column({ type: 'jsonb', nullable: true })
    items: any; // e.g. [{ name: "wallet", color: "brown" }]

    @Column({ type: 'varchar', length: 100, nullable: true })
    quantity: string;

    @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
    sentiment: number;

    @Column({ type: 'varchar', length: 100, nullable: true })
    sentiment_label: string;

    @Column({ type: 'text', nullable: true })
    sentiment_reason: string;

    @Column({ type: 'boolean', default: false })
    is_important: boolean;

    @Column({ type: 'varchar', length: 50, nullable: true })
    enquiry_type: string;

    @Column({ type: 'varchar', length: 50, nullable: true })
    enquiry_date: string;

    @Column({ type: 'varchar', length: 50, nullable: true })
    number_of_guests: string;

    @CreateDateColumn({ type: 'timestamp with time zone', nullable: false })
    created_at: Date;
}
