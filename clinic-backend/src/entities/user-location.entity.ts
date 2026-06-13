import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    ManyToOne,
    JoinColumn,
} from 'typeorm';
import { User } from './user.entity';
import { Location } from './location.entity';

@Entity('user_locations')
export class UserLocation {
    @PrimaryGeneratedColumn({ type: 'bigint' })
    id: number;

    @Column({ type: 'bigint' })
    user_id: number;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'user_id' })
    user: User;

    @Column({ type: 'bigint' })
    location_id: number;

    @ManyToOne(() => Location)
    @JoinColumn({ name: 'location_id' })
    location: Location;
}
