import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { UserAgent } from './user-agent.entity';
import { UserRole } from '../enums/user-role.enum';
import { UserInteraction } from './user-interaction.entity';
import { Role } from './role.entity';
import { OrganisationSettings } from './organisation-settings.entity';
@Entity('users')
@Index(['email'], { unique: true })
export class User {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ type: 'varchar', length: 255, unique: true, nullable: false })
  email: string;

  @Column({ type: 'varchar', length: 255, nullable: false })
  password: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  first_name: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  last_name: string;

  @Column({ type: 'enum', enum: UserRole, default: UserRole.User })
  role: UserRole;

  @Column({ type: 'bigint', nullable: true })
  role_id: number;

  @ManyToOne(() => Role, { nullable: true })
  @JoinColumn({ name: 'role_id' })
  roleEntity: Role;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updated_at: Date;

  @Column({ type: 'int', default: 0 })
  total_call_minutes: number;

  @Column({ type: 'int', default: 0 })
  call_minutes_used: number;

  @Column({ type: 'varchar', length: 50, default: 'per_month' })
  plan_type: string;

  @Column({ type: 'varchar', length: 50, nullable: true, default: null })
  timezone: string; // User's timezone (e.g., 'America/New_York', 'Europe/London', 'UTC')

  @Column({ type: 'boolean', default: false })
  sites_enabled: boolean; // Flag to enable/disable sites feature

  @Column({ type: 'bigint', nullable: true })
  organisation_id: number;

  @ManyToOne(() => OrganisationSettings, { nullable: true })
  @JoinColumn({ name: 'organisation_id' })
  organisation: OrganisationSettings;

  @Column({ type: 'varchar', length: 20, default: 'active' })
  status: string; // 'active', 'disabled', 'invited'

  @Column({ type: 'timestamp with time zone', nullable: true })
  last_login_at: Date;

  @Column({ type: 'time', nullable: true })
  opening_hours: string;

  @Column({ type: 'time', nullable: true })
  closing_hours: string;

  @OneToMany(() => UserAgent, (userAgent) => userAgent.user)
  userAgents: UserAgent[];

  @OneToMany(() => UserInteraction, (interaction) => interaction.user)
  interactions: UserInteraction[];
}
