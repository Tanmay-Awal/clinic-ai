import {
  Injectable,
  CanActivate,
  ExecutionContext,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserRole } from '../../enums/user-role.enum';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { Role } from '../../entities/role.entity';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    @InjectRepository(Role)
    private readonly roleRepo: Repository<Role>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!requiredRoles) {
      return true;
    }
    const { user } = context.switchToHttp().getRequest();

    // Check if user exists
    if (!user) {
      return false;
    }

    // Prefer role name from JWT if present
    let userRole = user.role || user.roleName;

    // Fallback: look up role name from role_id
    if (!userRole && user.role_id) {
      const roleRecord = await this.roleRepo.findOne({
        where: { id: user.role_id },
      });
      userRole = roleRecord?.name || null;
    }

    if (!userRole) return false;

    return requiredRoles.includes(userRole as UserRole);
  }
}
