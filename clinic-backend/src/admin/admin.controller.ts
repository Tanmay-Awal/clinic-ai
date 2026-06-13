import {
    Controller,
    Get,
    Put,
    Post,
    Patch,
    Delete,
    Body,
    Param,
    Request,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { UpdateOrganisationSettingsDto } from './dto/update-settings.dto';
import { InviteUserDto } from './dto/invite-user.dto';

@Controller('admin')
export class AdminController {
    constructor(private readonly adminService: AdminService) { }

    @Get('settings')
    getSettings(@Request() req) {
        return this.adminService.getSettings(req.user.userId);
    }

    @Put('settings')
    updateSettings(@Request() req, @Body() dto: UpdateOrganisationSettingsDto) {
        return this.adminService.updateSettings(req.user.userId, dto);
    }

    @Get('users')
    getUsers(@Request() req) {
        return this.adminService.getUsers(req.user.userId);
    }

    @Post('users/invite')
    inviteUser(@Request() req, @Body() dto: InviteUserDto) {
        return this.adminService.inviteUser(req.user.userId, dto.email, dto.role, dto.name, dto.password);
    }

    @Patch('users/:id/status')
    updateUserStatus(
        @Request() req,
        @Param('id') id: string,
        @Body('status') status: string,
    ) {
        return this.adminService.updateUserStatus(
            req.user.userId,
            parseInt(id),
            status,
        );
    }

    @Patch('users/:id/role')
    updateUserRole(
        @Request() req,
        @Param('id') id: string,
        @Body('role') role: string,
    ) {
        return this.adminService.updateUserRole(
            req.user.userId,
            parseInt(id),
            role,
        );
    }

    @Delete('users/:id')
    removeUser(@Request() req, @Param('id') id: string) {
        return this.adminService.removeUser(req.user.userId, parseInt(id));
    }
}
