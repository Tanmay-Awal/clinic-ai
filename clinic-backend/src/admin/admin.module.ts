import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { OrganisationSettings } from '../entities/organisation-settings.entity';
import { User } from '../entities/user.entity';

import { Location } from '../entities/location.entity';
import { UserLocation } from '../entities/user-location.entity';
import { UserAgent } from '../entities/user-agent.entity';
import { UserInteraction } from '../entities/user-interaction.entity';

@Module({
    imports: [TypeOrmModule.forFeature([OrganisationSettings, User, Location, UserLocation, UserAgent, UserInteraction])],
    controllers: [AdminController],
    providers: [AdminService],
})
export class AdminModule { }
