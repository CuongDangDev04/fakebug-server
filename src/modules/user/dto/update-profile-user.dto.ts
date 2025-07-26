// src/user/dto/update-user-profile.dto.ts
import { IsOptional, IsString, Length } from 'class-validator';

export class UpdateUserProfileDto {
    @IsOptional()
    @IsString()
    @Length(1, 50)
    first_name?: string;

    @IsOptional()
    @IsString()
    @Length(1, 50)
    last_name?: string;

    @IsOptional()
    @IsString()
    @Length(3, 30)
    username?: string;

    @IsOptional()
    @IsString()
    @Length(0, 160)
    bio?: string;
}
