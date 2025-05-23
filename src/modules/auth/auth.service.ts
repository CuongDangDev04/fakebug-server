import { Injectable, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserService } from '../user/user.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly userService: UserService,
  ) {}

  async loginWithGoogle(profile: any) {
  const { emails, name, photos } = profile;

  if (!emails || emails.length === 0) {
    throw new BadRequestException('Email not found in Google profile');
  }

  const email = emails[0].value;
  const username = name?.givenName || 'User';
  const avatar_url = photos?.[0]?.value || null;

  let user = await this.userService.findByEmail(email);

  if (!user) {
    user = await this.userService.create({
      email,
      username,
      avatar_url,
      role: 'user',
      provider: 'google',
    });
  }

  const payload = { sub: user.id, email: user.email };
  const jwtAccessToken = this.jwtService.sign(payload);

  // Cập nhật access_token vào DB
  user.access_token = jwtAccessToken;
  await this.userService.update(user);

  return {
    message: 'Login successful',
    access_token: jwtAccessToken,
    user,
  }
  }}