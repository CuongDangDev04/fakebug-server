import { Body, Controller, Get, Post, Req, Request, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { RegisterUserDto } from './dto/register-user.dto';
import { LoginUserDto } from './dto/login-user.dto';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) { }

  @Get('google')
  @UseGuards(AuthGuard('google'))
  async googleAuth() { }

  @Get('google/redirect')
  @UseGuards(AuthGuard('google'))
  async googleAuthRedirect(@Req() req) {
    // req.user chính là profile Google
    return this.authService.loginWithGoogle(req.user);
  }

  @Post('register')
  async registerLocal(@Body() registerUserDto: RegisterUserDto) {
    return this.authService.registerLocal(registerUserDto);
  }

  @Post('login')
  async loginLocal(@Body() loginUserDto: LoginUserDto) {
    return this.authService.loginLocal(loginUserDto);
  }
  @UseGuards(AuthGuard('jwt'))
  @Post('logout')
  async logout(@Request() req) {
    const userId = req.user.userId;
    return this.authService.logout(userId);
  }
  @Post('forgot-password')
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  @Post('reset-password')
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  //test phân quyền ////////////////////////////////
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admn')
  @Get('all')
  getAllUsers() {
    return 'Chỉ admin mới thấy được danh sách user';
  }
  /////////////////////////////////////////////////
}
