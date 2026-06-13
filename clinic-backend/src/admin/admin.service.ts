import {
    Injectable,
    NotFoundException,
    BadRequestException,
    ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OrganisationSettings } from '../entities/organisation-settings.entity';
import { User } from '../entities/user.entity';
import { UserRole } from '../enums/user-role.enum';
import { Location } from '../entities/location.entity';
import { UserLocation } from '../entities/user-location.entity';
import { UserAgent } from '../entities/user-agent.entity';
import { UserInteraction } from '../entities/user-interaction.entity';
import { UpdateOrganisationSettingsDto } from './dto/update-settings.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AdminService {
    constructor(
        @InjectRepository(OrganisationSettings)
        private readonly orgSettingsRepo: Repository<OrganisationSettings>,
        @InjectRepository(User)
        private readonly userRepo: Repository<User>,
        @InjectRepository(Location)
        private readonly locationRepo: Repository<Location>,
        @InjectRepository(UserLocation)
        private readonly userLocationRepo: Repository<UserLocation>,
        @InjectRepository(UserAgent)
        private readonly userAgentRepo: Repository<UserAgent>,
        @InjectRepository(UserInteraction)
        private readonly userInteractionRepo: Repository<UserInteraction>,
    ) { }

    // --- Organisation Settings ---

    async getSettings(userId: number) {
        const user = await this.userRepo.findOne({ where: { id: userId } });
        if (!user || !user.organisation_id) {
            // If no org exists yet, create one for this Admin (Bootstrap logic)
            if (user?.role === UserRole.Admin) {
                return this.createDefaultOrganisation(user);
            }
            throw new NotFoundException('Organisation not found for this user');
        }

        const settings = await this.orgSettingsRepo.findOne({
            where: { id: parseInt(user.organisation_id.toString()) },
        });

        // Fetch locations for the user to return with settings
        // This ensures the UI properly displays the saved locations
        let locations: string[] = [];
        try {
            const userLocations = await this.locationRepo.find({
                where: { user_id: userId }
            });
            locations = userLocations.map(l => l.location);
        } catch (e) {
            console.warn("Could not fetch locations, maybe table missing?", e);
        }

        return {
            ...settings,
            locations
        };
    }

    async createDefaultOrganisation(admin: User) {
        const newOrg = this.orgSettingsRepo.create({
            organisation_name: 'My Organisation',
            business_type: 'Other',
            updated_by: admin.email,
        });
        const savedOrg = await this.orgSettingsRepo.save(newOrg);

        // Link Admin to this new Org
        admin.organisation_id = savedOrg.id;
        await this.userRepo.save(admin);

        return savedOrg;
    }

    async updateSettings(userId: number, dto: UpdateOrganisationSettingsDto) {
        console.log('UpdateSettings called for user:', userId);
        console.log('DTO received:', JSON.stringify(dto, null, 2));

        const user = await this.userRepo.findOne({ where: { id: userId } });
        if (!user) throw new NotFoundException('User not found');

        // IF user has no organization, CREATE one now
        if (!user.organisation_id) {
            const newOrg = this.orgSettingsRepo.create({
                ...dto,
                organisation_name: dto.organisation_name || 'My Organisation', // Fallback
                updated_by: user.email,
            });
            const savedOrg = await this.orgSettingsRepo.save(newOrg);

            // Link user to new org
            user.organisation_id = savedOrg.id;
            // Also ensure they are admin (if they are creating the org, they should be admin)
            if (user.role !== UserRole.Admin) {
                user.role = UserRole.Admin;
            }
            await this.userRepo.save(user);

            return savedOrg;
        }

        // Existing update logic
        const orgId = parseInt(user.organisation_id.toString());
        const settings = await this.orgSettingsRepo.findOne({
            where: { id: orgId },
        });

        if (!settings) {
            // Should not happen if FK is correct, but safe check: recreate or throw
            throw new NotFoundException('Organisation settings record missing but ID exists');
        }

        Object.assign(settings, dto);

        // Explicit mapping to be 100% sure
        if (dto.organisation_name) settings.organisation_name = dto.organisation_name;
        if (dto.business_type !== undefined) settings.business_type = dto.business_type;
        if (dto.default_timezone) settings.default_timezone = dto.default_timezone;
        if (dto.default_language) settings.default_language = dto.default_language;
        if (dto.currency) settings.currency = dto.currency;
        if (dto.enable_outbound_calls !== undefined) settings.enable_outbound_calls = dto.enable_outbound_calls;
        if (dto.enable_ai_insights !== undefined) settings.enable_ai_insights = dto.enable_ai_insights;
        if (dto.enable_locations !== undefined) settings.enable_locations = dto.enable_locations;

        settings.updated_by = user.email;
        settings.updated_at = new Date(); // Force update so that "last updated" changes even if only locations are modified

        console.log('Saving settings object:', JSON.stringify(settings, null, 2));
        const saved = await this.orgSettingsRepo.save(settings);

        // --- Handle Locations Logic ---
        if (dto.locations) {
            try {
                // Fetch all current locations for this user
                const existingLocations = await this.locationRepo.find({
                    where: { user_id: userId }
                });

                const incomingLocationsSet = new Set(dto.locations);
                const existingLocationsMap = new Map<string, Location>();
                existingLocations.forEach(l => existingLocationsMap.set(l.location, l));

                // 1. Add new locations
                for (const locName of dto.locations) {
                    if (!existingLocationsMap.has(locName)) {
                        const newLoc = this.locationRepo.create({
                            user_id: userId,
                            location: locName
                        });
                        const savedLoc = await this.locationRepo.save(newLoc);

                        // Also save to user_locations table
                        const newUserLoc = this.userLocationRepo.create({
                            user_id: userId,
                            location_id: savedLoc.id
                        });
                        await this.userLocationRepo.save(newUserLoc);
                    }
                }

                // 2. Remove deleted locations
                for (const existingLoc of existingLocations) {
                    if (!incomingLocationsSet.has(existingLoc.location)) {
                        // User has removed this location from the UI
                        // Explicitly remove from user_locations first (to avoid FK constraints if cascade is missing)
                        await this.userLocationRepo.delete({ location_id: existingLoc.id });

                        // Then remove from locations table
                        await this.locationRepo.delete({ id: existingLoc.id });
                    }
                }

            } catch (error) {
                console.error("Failed to sync locations.", error);
                // Swallow error so we don't block saving other settings
            }
        }
        // ------------------------------

        console.log('Saved result:', JSON.stringify(saved, null, 2));
        return {
            ...saved,
            // Return locations so UI sees them directly? 
            // The UI currently expects 'OrganisationSettings' which we extended in mock but not fully in backend response types maybe.
            // But for now, returning the settings object is standard.
            // We can attach locations if we want to be fancy, but let's stick to core requirement first.
        };
    }

    // --- User Management ---

    async getUsers(adminId: number) {
        const admin = await this.userRepo.findOne({ where: { id: adminId } });
        if (!admin?.organisation_id) return [];

        const users = await this.userRepo.find({
            where: { organisation_id: admin.organisation_id },
            relations: ['roleEntity'],
            order: { created_at: 'DESC' },
        });

        // Map to safe DTO (hide passwords)
        return users.map((u) => ({
            id: u.id.toString(),
            name: `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.email.split('@')[0],
            email: u.email,
            role: u.roleEntity?.name || u.role, // Use dynamic role name if available
            status: u.status,
            lastLogin: u.last_login_at instanceof Date ? u.last_login_at.toISOString() : u.last_login_at,
        }));
    }


    async inviteUser(adminId: number, email: string, role: string, name: string, passwordString: string) {
        const admin = await this.userRepo.findOne({ where: { id: adminId } });
        if (!admin?.organisation_id) {
            throw new BadRequestException('Admin must check their organisation configuration first');
        }

        const existingUser = await this.userRepo.findOne({ where: { email } });
        if (existingUser) {
            throw new BadRequestException('User with this email already exists');
        }

        // Map front-end role string to enum and ID
        const normalizedRole = (role || '').toLowerCase();
        let userRole: UserRole;
        let roleId: number;

        if (normalizedRole === 'admin') {
            userRole = UserRole.Admin;
            roleId = 1; // Admin
        } else {
            // Default to User/Viewer
            userRole = UserRole.User;
            roleId = 2; // User
        }

        // Parse name
        let firstName = name || '';
        let lastName = '';

        const nameParts = name.trim().split(/\s+/);
        if (nameParts.length > 1) {
            // "John Doe" -> First: "John", Last: "Doe"
            // "John Middle Doe" -> First: "John", Last: "Middle Doe"?? Or standard split.
            // Requirement: "if the name entered in that is in two parts then push it normally like first_name and last_name column as we have , otherwise if its a single word only push it in first name"
            // Let's assume standard behavior: first word is first name, rest is last name
            firstName = nameParts[0];
            lastName = nameParts.slice(1).join(' ');
        } else {
            firstName = nameParts[0] || '';
            lastName = ''; // Single word only
        }

        // Create new user with inheriting properties from admin
        const newUser = this.userRepo.create({
            email,
            role: userRole,
            role_id: roleId,
            status: 'active', // Direct active status
            organisation_id: admin.organisation_id,
            password: await bcrypt.hash(passwordString, 10),
            first_name: firstName,
            last_name: lastName,
            // Inherit settings from logged in admin/context
            timezone: admin.timezone,
            sites_enabled: admin.sites_enabled,
            plan_type: admin.plan_type,
            // Default counters
            total_call_minutes: 0,
            call_minutes_used: 0,
        });

        await this.userRepo.save(newUser);

        // --- Data Duplication (Inheritance) logic ---
        // Duplicate Locations
        const adminLocations = await this.locationRepo.find({ where: { user_id: adminId } });
        for (const loc of adminLocations) {
            const newLoc = this.locationRepo.create({
                user_id: newUser.id,
                location: loc.location
            });
            const savedLoc = await this.locationRepo.save(newLoc);

            const newUserLoc = this.userLocationRepo.create({
                user_id: newUser.id,
                location_id: savedLoc.id
            });
            await this.userLocationRepo.save(newUserLoc);
        }

        // Duplicate UserAgents (Access to Calls/Agents)
        const adminUserAgents = await this.userAgentRepo.find({ where: { user_id: adminId } });
        for (const ua of adminUserAgents) {
            try {
                const newUa = this.userAgentRepo.create({
                    user_id: newUser.id,
                    agent_id: ua.agent_id
                });
                await this.userAgentRepo.save(newUa);
            } catch (e) {
                console.warn('Duplicate user agent ignored', e);
            }
        }

        // Duplicate UserInteractions (Access to Categories)
        const adminUserInteractions = await this.userInteractionRepo.find({ where: { user_id: adminId } });
        for (const ui of adminUserInteractions) {
            try {
                const newUi = this.userInteractionRepo.create({
                    user_id: newUser.id,
                    interaction_type_id: ui.interaction_type_id,
                    status: ui.status
                });
                await this.userInteractionRepo.save(newUi);
            } catch (e) {
                console.warn('Duplicate user interaction ignored', e);
            }
        }
        // ---------------------------------------------

        return this.getUsers(adminId); // Return updated list
    }

    async updateUserStatus(adminId: number, targetUserId: number, status: string) {
        const admin = await this.userRepo.findOne({ where: { id: adminId } });
        if (!admin) throw new NotFoundException('Admin user not found');

        const targetUser = await this.userRepo.findOne({ where: { id: targetUserId } });

        if (!targetUser) throw new NotFoundException('User not found');
        if (targetUser.organisation_id != admin.organisation_id) {
            throw new ForbiddenException('Cannot modify users from another organisation');
        }

        targetUser.status = status;
        await this.userRepo.save(targetUser);
        return this.getUsers(adminId);
    }

    async updateUserRole(adminId: number, targetUserId: number, role: string) {
        const admin = await this.userRepo.findOne({ where: { id: adminId } });
        if (!admin) throw new NotFoundException('Admin user not found');

        const targetUser = await this.userRepo.findOne({ where: { id: targetUserId } });

        if (!targetUser) throw new NotFoundException('User not found');
        if (targetUser.organisation_id != admin.organisation_id) {
            throw new ForbiddenException('Cannot modify users from another organisation');
        }

        targetUser.role = role as UserRole;
        targetUser.role_id = null as any; // Clear dynamic role connection to ensure enum role is effective
        await this.userRepo.save(targetUser);
        return this.getUsers(adminId);
    }

    async removeUser(adminId: number, targetUserId: number) {
        const admin = await this.userRepo.findOne({ where: { id: adminId } });
        if (!admin) throw new NotFoundException('Admin user not found');

        const targetUser = await this.userRepo.findOne({ where: { id: targetUserId } });

        if (!targetUser) throw new NotFoundException('User not found');
        if (targetUser.organisation_id != admin.organisation_id) {
            throw new ForbiddenException('Cannot remove users from another organisation');
        }

        // Cleanup dependencies first (Manual Cascade)
        // 1. Locations and UserLocations
        await this.userLocationRepo.delete({ user_id: targetUserId });
        await this.locationRepo.delete({ user_id: targetUserId });

        // 2. User Agents
        await this.userAgentRepo.delete({ user_id: targetUserId });

        // 3. User Interactions
        await this.userInteractionRepo.delete({ user_id: targetUserId });

        // Finally remove the user
        await this.userRepo.remove(targetUser);
        return this.getUsers(adminId);
    }
}
