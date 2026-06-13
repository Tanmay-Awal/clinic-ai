import { IsString, IsOptional, IsBoolean, IsArray } from 'class-validator';

export class UpdateOrganisationSettingsDto {
    @IsString()
    organisation_name: string;

    @IsString()
    @IsOptional()
    business_type?: string;

    @IsString()
    @IsOptional()
    default_timezone?: string;

    @IsString()
    @IsOptional()
    default_language?: string;

    @IsString()
    @IsOptional()
    currency?: string;

    @IsBoolean()
    @IsOptional()
    enable_outbound_calls?: boolean;

    @IsBoolean()
    @IsOptional()
    enable_ai_insights?: boolean;

    @IsBoolean()
    @IsOptional()
    enable_locations?: boolean;

    @IsArray()
    @IsOptional()
    @IsString({ each: true })
    locations?: string[];
}

