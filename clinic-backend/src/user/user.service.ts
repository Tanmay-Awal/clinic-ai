import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { User } from '../entities/user.entity';
import { Role } from '../entities/role.entity';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { UpdateProfileDto } from './dto/profile.dto';

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
    private readonly jwtService: JwtService,
  ) {}

  public static calculateIsAdmin(roleName: string | null): boolean {
    const normalizedRole = (roleName || '').toLowerCase().replace(/\s+/g, '');
    return normalizedRole === 'admin' || normalizedRole === 'systemadmin';
  }

  async register(
    registerDto: RegisterDto,
  ): Promise<{ user: any; access_token: string }> {
    // Check if user already exists
    const existingUser = await this.userRepository.findOne({
      where: { email: registerDto.email },
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Hash password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(registerDto.password, saltRounds);

    // Create user
    const user = this.userRepository.create({
      email: registerDto.email,
      password: hashedPassword,
      first_name: registerDto.first_name,
      last_name: registerDto.last_name,
    });

    const savedUser = await this.userRepository.save(user);

    // Fetch role name from roles table if role_id exists
    let roleName: string | null = null;
    if (savedUser.role_id) {
      const role = await this.roleRepository.findOne({
        where: { id: savedUser.role_id },
      });
      roleName = role?.name || null;
    }

    // Generate JWT token with user info
    const payload = {
      sub: savedUser.id.toString(),
      email: savedUser.email,
      role_id: savedUser.role_id || null,
      role: roleName || savedUser.role || null, // Include role name from roles table, fallback to enum
    };
    const access_token = this.jwtService.sign(payload);

    // Remove password from response and add role name from table
    const { password, role: enumRole, ...userWithoutPassword } = savedUser;
    const finalRoleName = roleName || enumRole || null;
    const userResponse = {
      ...userWithoutPassword,
      role: finalRoleName,
      is_admin: UserService.calculateIsAdmin(finalRoleName),
    };

    return {
      user: userResponse,
      access_token,
    };
  }

  async login(
    loginDto: LoginDto,
  ): Promise<{ user: any; access_token: string }> {
    // Find user by email
    const user = await this.userRepository.findOne({
      where: { email: loginDto.email },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (user.status !== 'active') {
      throw new UnauthorizedException(
        'Account is Disabled. Please Contact Admin',
      );
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(
      loginDto.password,
      user.password,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // Update last login timestamp
    user.last_login_at = new Date();
    await this.userRepository.save(user);

    // Fetch role name from roles table if role_id exists
    let roleName: string | null = null;
    if (user.role_id) {
      const role = await this.roleRepository.findOne({
        where: { id: user.role_id },
      });
      roleName = role?.name || null;
    }

    // Generate JWT token with user info
    const payload = {
      sub: user.id.toString(),
      email: user.email,
      role_id: user.role_id || null,
      role: roleName || user.role || null, // Include role name from roles table, fallback to enum
    };
    const access_token = this.jwtService.sign(payload);

    // Remove password from response and add role name from table
    const { password, role: enumRole, ...userWithoutPassword } = user;
    const finalRoleName = roleName || enumRole || null;
    const userResponse = {
      ...userWithoutPassword,
      role: finalRoleName,
      is_admin: UserService.calculateIsAdmin(finalRoleName),
    };

    return {
      user: userResponse,
      access_token,
    };
  }

  async getProfile(userId: number): Promise<any> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Fetch role name from roles table if role_id exists
    let roleName: string | null = null;
    if (user.role_id) {
      const role = await this.roleRepository.findOne({
        where: { id: user.role_id },
      });
      roleName = role?.name || null;
    }

    const { password, role: enumRole, ...userWithoutPassword } = user;
    const finalRoleName = roleName || enumRole || null;
    return {
      ...userWithoutPassword,
      role: finalRoleName,
      is_admin: UserService.calculateIsAdmin(finalRoleName),
    };
  }

  async updateProfile(
    userId: number,
    updateProfileDto: UpdateProfileDto,
  ): Promise<any> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Update user fields
    if (updateProfileDto.first_name !== undefined) {
      user.first_name = updateProfileDto.first_name;
    }
    if (updateProfileDto.last_name !== undefined) {
      user.last_name = updateProfileDto.last_name;
    }

    const updatedUser = await this.userRepository.save(user);

    // Fetch role name from roles table if role_id exists
    let roleName: string | null = null;
    if (updatedUser.role_id) {
      const role = await this.roleRepository.findOne({
        where: { id: updatedUser.role_id },
      });
      roleName = role?.name || null;
    }

    const { password, role: enumRole, ...userWithoutPassword } = updatedUser;
    const finalRoleName = roleName || enumRole || null;
    return {
      ...userWithoutPassword,
      role: finalRoleName,
      is_admin: UserService.calculateIsAdmin(finalRoleName),
    };
  }


}
