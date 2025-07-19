import { IsOptional, IsBoolean, IsString, IsNumber, IsEnum } from 'class-validator';

export class CreatePostDto {
  @IsOptional()
  @IsNumber()
  userId?: number;

  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsBoolean()
  removeImage?: boolean;

  @IsOptional()
  @IsEnum(['private', 'friends', 'public'])
  privacy?: 'private' | 'friends' | 'public';
}
