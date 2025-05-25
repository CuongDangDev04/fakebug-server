import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { GoogleStrategy } from './strategies/google.strategy';
import { UserModule } from '../user/user.module';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PasswordReset } from 'src/entities/password-reset.entity';
import { User } from 'src/entities/user.entity';
import { MailerModule } from '@nestjs-modules/mailer';
import { mailConfig } from 'src/config/mail.config';

@Module({
  imports: [
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'default_secret',
      signOptions: { expiresIn: '7d' },
    }),
    UserModule,
    TypeOrmModule.forFeature([PasswordReset, User]),
    MailerModule.forRoot(mailConfig)
  ],
  controllers: [AuthController],
  providers: [AuthService, GoogleStrategy, JwtStrategy, JwtAuthGuard],
})
export class AuthModule { }
