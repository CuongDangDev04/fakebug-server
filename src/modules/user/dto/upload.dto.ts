import { IsNotEmpty } from 'class-validator';

export class UploadAvatarDto {
  @IsNotEmpty()
  userId: number;
}

export class UploadCoverDto {
  @IsNotEmpty()
  userId: number;
}
