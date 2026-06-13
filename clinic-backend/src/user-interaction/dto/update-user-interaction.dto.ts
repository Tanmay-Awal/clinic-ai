import { IsOptional, IsInt, IsString } from 'class-validator';

export class UpdateUserInteractionDto {
  @IsInt()
  @IsOptional()
  interaction_type_id?: number;

  @IsString()
  @IsOptional()
  status?: string;
}
