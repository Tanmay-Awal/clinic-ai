import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    UpdateDateColumn,
    CreateDateColumn,
} from 'typeorm';

@Entity('organisation_settings')
export class OrganisationSettings {
    @PrimaryGeneratedColumn({ type: 'bigint' })
    id: number;

    @Column({ type: 'varchar', length: 255 })
    organisation_name: string;

    @Column({ type: 'varchar', length: 100, nullable: true })
    business_type: string;

    @Column({ type: 'varchar', length: 100, default: 'UTC' })
    default_timezone: string;

    @Column({ type: 'varchar', length: 10, default: 'en' })
    default_language: string;

    @Column({ type: 'varchar', length: 10, default: 'USD' })
    currency: string;

    @Column({ type: 'boolean', default: false })
    enable_outbound_calls: boolean;

    @Column({ type: 'boolean', default: false })
    enable_ai_insights: boolean;

    @Column({ type: 'boolean', default: false })
    enable_locations: boolean;

    @Column({ type: 'varchar', length: 255, nullable: true })
    updated_by: string; // Storing the name or ID of the user who last updated

    @UpdateDateColumn({ type: 'timestamp with time zone' })
    updated_at: Date;

    @CreateDateColumn({ type: 'timestamp with time zone' })
    created_at: Date;
}
