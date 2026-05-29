export class ProfileDto {
  id: number;
  email: string;
  first_name?: string;
  last_name?: string;
  created_at: Date;
  updated_at: Date;
}

export class UpdateProfileDto {
  first_name?: string;
  last_name?: string;
}
