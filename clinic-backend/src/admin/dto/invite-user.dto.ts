import { IsEmail, IsEnum, IsString, IsOptional } from 'class-validator';
import { UserRole } from '../../enums/user-role.enum';

export class InviteUserDto {
    @IsEmail()
    email: string;

    @IsString()
    role: string;

    @IsString()
    name: string;

    @IsString()
    password: string;
}
