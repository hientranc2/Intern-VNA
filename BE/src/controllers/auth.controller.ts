import { Controller, Post, Body, Get, Put, HttpCode, HttpStatus, UseGuards, UseInterceptors, UploadedFile, Request  } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from '../services/auth.service';
import { RegisterDto, LoginDto, ForgotPasswordDto, ResetPasswordDto, UpdateProfileDto, ChangePasswordDto, ChangeEmailDto } from '../../libs/shared/models/auth.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import 'multer';
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  register(@Body() dto: RegisterDto) { return this.authService.register(dto); }

  @HttpCode(HttpStatus.OK)
  @Post('login')
  login(@Body() dto: LoginDto) { return this.authService.login(dto); }

  @Post('forgot-password')
  forgotPassword(@Body() dto: ForgotPasswordDto) { return this.authService.forgotPassword(dto); }

  @Post('reset-password')
  resetPassword(@Body() dto: ResetPasswordDto) { return this.authService.resetPassword(dto); }

  // --- CÁC API KHÓA BẢO MẬT (PHẢI CÓ TOKEN) ---

  @UseGuards(AuthGuard('jwt'))
  @Get('profile')
  getProfile(@Request() req) { return this.authService.getProfile(req.user.userId); }

  @UseGuards(AuthGuard('jwt'))
  @Put('profile')
  updateProfile(@Request() req, @Body() dto: UpdateProfileDto) { return this.authService.updateProfile(req.user.userId, dto); }

  @UseGuards(AuthGuard('jwt'))
  @Post('change-password')
  changePassword(@Request() req, @Body() dto: ChangePasswordDto) { return this.authService.changePassword(req.user.userId, dto); }

  @UseGuards(AuthGuard('jwt'))
  @Post('request-change-email')
  requestChangeEmailOtp(@Request() req) { return this.authService.requestChangeEmailOtp(req.user.userId); }

  @UseGuards(AuthGuard('jwt'))
  @Post('change-email')
  changeEmail(@Request() req, @Body() dto: ChangeEmailDto) { return this.authService.verifyAndChangeEmail(req.user.userId, dto); }
  @Post('profile/avatar')
  @UseGuards(AuthGuard('jwt')) 
  @UseInterceptors(FileInterceptor('file')) 
  async uploadAvatar(
    @Request() req, 
    @UploadedFile() file: Express.Multer.File
  ) {`  `
    return this.authService.uploadAvatar(req.user.id, file);
  }
}