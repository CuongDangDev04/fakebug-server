import { IsOptional, IsBoolean, IsString, IsNumber } from 'class-validator';

export class CreatePostDto {
  @IsOptional()
  @IsNumber()
  userId?: number;

  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsBoolean()
  removeImage?: boolean; // <-- Thêm cờ xoá ảnh
}
