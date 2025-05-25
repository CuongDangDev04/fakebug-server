import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { Strategy } from 'passport-google-oauth20';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor() {
    super({
      clientID: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      callbackURL: 'http://localhost:5000/api/auth/google/redirect',
      scope: ['email', 'profile'],
    });
  }
  authorizationParams() {
    return {
      prompt: 'select_account', // Bắt buộc chọn tài khoản
    };
  }
  async validate(accessToken: string, refreshToken: string, profile: any) {
    const { name, emails, photos } = profile;

    return {
      email: emails?.[0]?.value,
      first_name: name?.givenName,
      last_name: name?.familyName,
      avatar_url: photos?.[0]?.value,
      provider: profile.provider,
    };
  }

}
