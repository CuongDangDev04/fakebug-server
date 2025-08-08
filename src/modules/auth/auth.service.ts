import { Injectable, BadRequestException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserService } from '../user/user.service';
import { RegisterUserDto } from './dto/register-user.dto';
import * as bcrypt from 'bcrypt';
import { LoginUserDto } from './dto/login-user.dto';
import { MailerService } from '@nestjs-modules/mailer';
import { InjectRepository } from '@nestjs/typeorm';
import { PasswordReset } from 'src/entities/password-reset.entity';
import { MoreThan, Repository } from 'typeorm';
import { User } from 'src/entities/user.entity';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { NotFoundError } from 'rxjs';
@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(PasswordReset)
    private passwordResetRepo: Repository<PasswordReset>,
    @InjectRepository(User)
    private userRepo: Repository<User>,
    private mailerService: MailerService,

    private readonly jwtService: JwtService,
    private readonly userService: UserService,
  ) { }

  async loginWithGoogle(profile: any) {
    const { email, first_name, last_name, avatar_url, provider } = profile;

    if (!email) {
      throw new BadRequestException('Email not found in Google profile');
    }

    let user = await this.userService.findByEmail(email);

    if (!user) {
      user = await this.userService.create({
        email,
        first_name,
        last_name,
        avatar_url,
        role: 'user',
        provider,
      });
    }

    // Kiểm tra disable
    if (user.is_disabled) {
      throw new UnauthorizedException('Tài khoản của bạn đã bị vô hiệu hóa');
    }

    // Kiểm tra thời hạn ban
    if (user.banned_until && user.banned_until > new Date()) {
      throw new UnauthorizedException(
        `Tài khoản của bạn bị khóa đến ${user.banned_until.toLocaleString()} nên không thể đăng nhập`
      );
    }

    const payload = { sub: user.id, email: user.email, role: user.role };

    const access_token = this.jwtService.sign(payload, {
      expiresIn: '3h',
    });

    const refresh_token_raw = this.jwtService.sign(payload, {
      expiresIn: '7d',
      secret: process.env.JWT_REFRESH_SECRET || 'refresh_secret',
    });

    const refresh_token_hashed = await bcrypt.hash(refresh_token_raw, 10);

    user.access_token = access_token;
    user.refresh_token = refresh_token_hashed;
    await this.userService.update(user);

    return {
      message: 'Login successful',
      access_token,
      refresh_token: refresh_token_raw,
      user,
    };
  }

  async loginLocal(loginUserDto: LoginUserDto) {
    const { emailOrUsername, password } = loginUserDto;

    const user = await this.userService.findByEmailOrUsername(emailOrUsername);

    if (!user || !user.password_hash) {
      throw new BadRequestException('Email/username hoặc mật khẩu không chính xác');
    }

    // Kiểm tra disable
    if (user.is_disabled) {
      throw new UnauthorizedException('Tài khoản của bạn đã bị vô hiệu hóa');
    }

    // Kiểm tra thời hạn ban
    if (user.banned_until && user.banned_until > new Date()) {
      throw new UnauthorizedException(
        `Tài khoản của bạn bị khóa đến ${user.banned_until.toLocaleString()} nên không thể đăng nhập`
      );
    }

    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      throw new BadRequestException('Email/username hoặc mật khẩu không chính xác');
    }

    const payload = { sub: user.id, email: user.email, role: user.role };

    const access_token = this.jwtService.sign(payload, {
      expiresIn: '1h',
    });

    const refresh_token_raw = this.jwtService.sign(payload, {
      expiresIn: '7d',
      secret: process.env.JWT_REFRESH_SECRET || 'refresh_secret',
    });

    const refresh_token_hashed = await bcrypt.hash(refresh_token_raw, 10);

    user.access_token = access_token;
    user.refresh_token = refresh_token_hashed;
    await this.userService.update(user);

    return {
      message: 'Login successful',
      access_token,
      refresh_token: refresh_token_raw,
      user,
    };
  }

  // Hàm đăng ký tài khoản local
  async registerLocal(registerUserDto: RegisterUserDto) {
    const {
      email,
      password,
      username,
      first_name,
      last_name,
      avatar_url,
      bio,
    } = registerUserDto;

    const existingUser = await this.userService.findByEmail(email);
    if (existingUser) {
      throw new BadRequestException('Email already registered');
    }

    const password_hash = await bcrypt.hash(password, 10);

    const user = await this.userService.create({
      email,
      password_hash,
      username: username || `${first_name || ''} ${last_name || ''}`.trim() || 'User',
      first_name,
      last_name,
      avatar_url,
      bio,
      role: 'user',
      provider: 'local',
    });

    const payload = { sub: user.id, email: user.email, role: user.role };
    const jwtAccessToken = this.jwtService.sign(payload);

    user.access_token = jwtAccessToken;
    await this.userService.update(user);

    return {
      message: 'Registration successful',
      access_token: jwtAccessToken,
      user,
    };
  }


  async logout(userId: number) {
    // Tìm user theo ID
    const user = await this.userService.findById(userId);
    if (!user) {
      throw new NotFoundException('Không tìm thấy người dùng');
    }

    // Xoá refresh token trong DB để chặn việc refresh sau này
    user.refresh_token = '';
    await this.userService.update(user);

    return {
      message: 'Logout successful',
    };
  }
  async forgotPassword(dto: ForgotPasswordDto) {
    // Tìm user theo email
    const user = await this.userRepo.findOne({ where: { email: dto.email } });
    if (!user) throw new NotFoundException('Email không tồn tại');

    // Tìm OTP chưa hết hạn của email này trong database
    const existingOtp = await this.passwordResetRepo.findOne({
      where: {
        email: dto.email,
        expiresAt: MoreThan(new Date()), // còn hiệu lực
      },
    });

    if (existingOtp) {
      // Nếu đã có OTP còn hiệu lực thì không gửi lại
      throw new BadRequestException('Vui lòng chờ 2 phút trước khi yêu cầu gửi lại mã OTP.');
    }

    // Tạo OTP mới
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 2 * 60 * 1000); // 2 phút

    // Lưu OTP mới
    await this.passwordResetRepo.save({
      email: dto.email,
      otp,
      expiresAt,
    });

    // Gửi mail
    await this.mailerService.sendMail({
      to: dto.email,
      subject: 'Mã OTP đặt lại mật khẩu',
      html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.5;">
        <h2 style="color: #007bff;">Xin chào,</h2>
        <p>Bạn vừa yêu cầu đặt lại mật khẩu.</p>
        <p>Mã OTP của bạn là:</p>
        <div style="font-size: 24px; font-weight: bold; color: #ff0000; margin: 12px 0;">
          ${otp}
        </div>
        <p>Mã OTP có hiệu lực trong <strong>2 phút</strong>. Vui lòng không chia sẻ mã này cho bất kỳ ai.</p>
        <br />
        <p>Trân trọng,</p>
        <p><strong>Đội ngũ hỗ trợ</strong></p>
      </div>
    `,
    });

    return { message: 'Đã gửi mã OTP qua email' };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const record = await this.passwordResetRepo.findOne({
      where: { email: dto.email, otp: dto.otp },
      order: { createdAt: 'DESC' },
    });

    if (!record) throw new BadRequestException('Mã OTP không đúng');
    if (new Date() > record.expiresAt) throw new BadRequestException('Mã OTP đã hết hạn');

    const user = await this.userRepo.findOne({ where: { email: dto.email } });
    if (!user) throw new NotFoundException('Người dùng không tồn tại');

    user.password_hash = await bcrypt.hash(dto.newPassword, 10);
    await this.userRepo.save(user);

    await this.passwordResetRepo.delete({ id: record.id });

    return { message: 'Đổi mật khẩu thành công' };
  }
  async refreshAccessToken(refreshToken: string) {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET || 'refresh_secret',
      });

      const user = await this.userService.findById(payload.sub);
      if (!user || !user.refresh_token) {
        throw new BadRequestException('Không tìm thấy người dùng hoặc token không hợp lệ');
      }

      const isTokenMatch = await bcrypt.compare(refreshToken, user.refresh_token);
      if (!isTokenMatch) {
        throw new BadRequestException('Refresh token không khớp');
      }

      const newAccessToken = this.jwtService.sign(
        {
          sub: user.id,
          email: user.email,
          role: user.role,
        },
        { expiresIn: '3h' },
      );

      user.access_token = newAccessToken;
      await this.userService.update(user);

      return {
        message: 'Cấp lại access token thành công',
        access_token: newAccessToken,
      };
    } catch (err) {
      throw new UnauthorizedException('Refresh token không hợp lệ hoặc đã hết hạn');
    }
  }

}