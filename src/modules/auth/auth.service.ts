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

    const payload = { sub: user.id, email: user.email, role: user.role };
    const access_token = this.jwtService.sign(payload);
    // Cập nhật access_token vào DB
    user.access_token = access_token;
    await this.userService.update(user);

    return {
      message: 'Login successful',
      access_token,
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


  // Hàm đăng nhập bằng email/password
  async loginLocal(loginUserDto: LoginUserDto) {
    const { emailOrUsername, password } = loginUserDto;

    // Tìm theo email hoặc username
    const user = await this.userService.findByEmailOrUsername(emailOrUsername);

    if (!user || !user.password_hash) {
      throw new BadRequestException('Invalid email/username or password');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      throw new BadRequestException('Invalid email/username or password');
    }

    const payload = { sub: user.id, email: user.email, role: user.role };
    const jwtAccessToken = this.jwtService.sign(payload);

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