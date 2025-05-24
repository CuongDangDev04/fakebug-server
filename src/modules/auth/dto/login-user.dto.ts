import { IsNotEmpty, IsString } from 'class-validator';

export class LoginUserDto {
  @IsNotEmpty()
  @IsString()
  emailOrUsername: string;  

  @IsNotEmpty()
  @IsString()
  password: string;
}
