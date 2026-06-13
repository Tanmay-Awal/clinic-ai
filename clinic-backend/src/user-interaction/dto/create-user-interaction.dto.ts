import { IsNotEmpty, IsInt, IsString, IsOptional } from 'class-validator';

export class CreateUserInteractionDto {
  @IsInt()
  @IsNotEmpty()
  interaction_type_id: number;

  @IsString()
  @IsOptional()
  status?: string;
}
