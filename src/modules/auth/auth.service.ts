import { Injectable, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserService } from '../user/user.service';
import { RegisterUserDto } from './dto/register-user.dto';
import * as bcrypt from 'bcrypt';
import { LoginUserDto } from './dto/login-user.dto';
@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly userService: UserService,
  ) { }

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

    const payload = { sub: user.id, email: user.email, role: user.role };
    const jwtAccessToken = this.jwtService.sign(payload);

    // Cập nhật access_token vào DB
    user.access_token = jwtAccessToken;
    await this.userService.update(user);

    return {
      message: 'Login successful',
      access_token: jwtAccessToken,
      user,
    }
  }

  // Hàm đăng ký tài khoản local
  async registerLocal(registerUserDto: RegisterUserDto) {
    const { email, password, username, avatar_url, bio } = registerUserDto;

    // Kiểm tra email đã tồn tại chưa
    const existingUser = await this.userService.findByEmail(email);
    if (existingUser) {
      throw new BadRequestException('Email already registered');
    }

    // Mã hóa mật khẩu
    const password_hash = await bcrypt.hash(password, 10);

    // Tạo user mới
    const user = await this.userService.create({
      email,
      username: username || 'User',
      password_hash,
      avatar_url,
      bio,
      role: 'user',
      provider: 'local',
    });

    // Tạo JWT token
    const payload = { sub: user.id, email: user.email, role: user.role };
    const jwtAccessToken = this.jwtService.sign(payload);

    // Cập nhật access_token vào DB
    user.access_token = jwtAccessToken;
    await this.userService.update(user);

    return {
      message: 'Registration successful',
      access_token: jwtAccessToken,
      user,
    };
  }

  // Hàm đăng nhập bằng email/password
  async loginLocal(loginUserDto: LoginUserDto) {
    const { email, password } = loginUserDto;

    // Tìm user theo email
    const user = await this.userService.findByEmail(email);

    if (!user || !user.password_hash) {
      throw new BadRequestException('Invalid email or password');
    }

    // So sánh mật khẩu
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      throw new BadRequestException('Invalid email or password');
    }

    // Tạo payload và token
    const payload = { sub: user.id, email: user.email };
    const jwtAccessToken = this.jwtService.sign(payload);

    // Cập nhật token vào DB
    user.access_token = jwtAccessToken;
    await this.userService.update(user);

    return {
      message: 'Login successful',
      access_token: jwtAccessToken,
      user,
    };
  }


  async logout(userId: number) {
    // Tìm user theo id
    const user = await this.userService.findById(userId);
    if (!user) {
      throw new BadRequestException('User not found');
    }

    // Xóa access_token khỏi DB
    user.access_token = '';
    await this.userService.update(user);

    return {
      message: 'Logout successful',
    };
  }
}