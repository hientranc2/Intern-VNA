import { Injectable, UnauthorizedException, ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import * as nodemailer from 'nodemailer';

import { User } from '../entities/user.entity';
import { RegisterDto, LoginDto, ForgotPasswordDto, ResetPasswordDto, UpdateProfileDto, ChangePasswordDto, ChangeEmailDto } from '../../libs/shared/models/auth.dto';

@Injectable()
export class AuthService {
  private transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.MAIL_USER, 
      pass: process.env.MAIL_PASS,
    },
  });

  constructor(
    @InjectRepository(User) private userRepository: Repository<User>,
    private jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const existingUser = await this.userRepository.findOne({
      where: [{ username: dto.username }, { email: dto.email }],
    });

    if (existingUser) {
      throw new ConflictException('Tên đăng nhập hoặc Email đã tồn tại!');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    const newUser = this.userRepository.create({
      ...dto,
      password: hashedPassword,
    });

    await this.userRepository.save(newUser);
    const { password, ...result } = newUser;
    return { message: 'Đăng ký thành công', user: result };
  }

  async login(dto: LoginDto) {
    const user = await this.userRepository.findOne({ where: { username: dto.username } });
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Tài khoản hoặc mật khẩu không đúng. Xin vui lòng thử lại');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Tài khoản hoặc mật khẩu không đúng. Xin vui lòng thử lại');
    }

    const expiresIn = dto.rememberMe ? '7d' : '1h'; 
    const payload = { sub: user.id, username: user.username, role: user.role };
    
    const accessToken = this.jwtService.sign(payload, { expiresIn });
    const { password, otpCode, otpExpiresAt, ...userInfo } = user;

    return { message: 'Đăng nhập thành công', accessToken, user: userInfo };
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.userRepository.findOne({ where: { email: dto.email } });
    if (!user) throw new NotFoundException('Không tìm thấy tài khoản với email này');

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 1);

    user.otpCode = otp;
    user.otpExpiresAt = expiresAt;
    await this.userRepository.save(user);

    console.log(`[MÃ OTP CỦA ${user.email} LÀ]: ${otp}`); 

    try {
      await this.transporter.sendMail({
        from: '"Hệ thống VNA" <hientran30012004@gmail.com>',
        to: user.email,
        subject: 'Mã OTP khôi phục mật khẩu',
        text: `Mã OTP của bạn là: ${otp}. Mã này có hiệu lực trong 1 phút.`,
      });
    } catch (error) {
       console.error('--- LỖI GỬI MAIL THỰC TẾ TỪ GOOGLE ---');
      console.error(error);   }

    return { message: 'Mã OTP đã được gửi đến email của bạn!' };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const user = await this.userRepository.findOne({ where: { email: dto.email, otpCode: dto.otpCode } });
    
    if (!user) throw new BadRequestException('Mã OTP không chính xác');
    if (new Date() > user.otpExpiresAt) throw new BadRequestException('Mã OTP đã hết hạn');

    user.password = await bcrypt.hash(dto.newPassword, 10);
    user.otpCode = null;
    user.otpExpiresAt = null;

    await this.userRepository.save(user);
    return { message: 'Đặt lại mật khẩu thành công!' };
  }

  async getProfile(userId: string) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    const { password, otpCode, otpExpiresAt, ...result } = user;
    return result;
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('Không tìm thấy tài khoản');

    await this.userRepository.update(userId, dto);
    return this.getProfile(userId);
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    if (dto.newPassword !== dto.confirmPassword) {
      throw new BadRequestException('Mật khẩu xác nhận không khớp!');
    }

    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('Không tìm thấy tài khoản');
    const isOldPassValid = await bcrypt.compare(dto.oldPassword, user.password);
    if (!isOldPassValid) throw new BadRequestException('Mật khẩu cũ không chính xác');

    user.password = await bcrypt.hash(dto.newPassword, 10);
    await this.userRepository.save(user);
    return { message: 'Đổi mật khẩu thành công' };
  }

  async requestChangeEmailOtp(userId: string) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('Không tìm thấy tài khoản');
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 1);

    user.otpCode = otp;
    user.otpExpiresAt = expiresAt;
    await this.userRepository.save(user);

    console.log(`[MÃ OTP ĐỂ ĐỔI EMAIL CỦA ${user.email} LÀ]: ${otp}`);
    try {
      await this.transporter.sendMail({
        from: '"Hệ thống VNA" <hientran30012004@gmail.com>',
        to: user.email,
        subject: 'Mã OTP xác nhận thay đổi Email',
        text: `Mã OTP của bạn là: ${otp}. Mã này có hiệu lực trong 1 phút.`,
      });
    } catch (error) {
      console.log('Chưa kết nối Mail Server, lấy mã OTP ở dòng log phía trên để test.');
    }
    return { message: 'Đã gửi mã OTP đến email HIỆN TẠI của bạn' };
  }

  async verifyAndChangeEmail(userId: string, dto: ChangeEmailDto) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('Không tìm thấy tài khoản');
    if (user.otpCode !== dto.otpCode) throw new BadRequestException('Mã OTP không chính xác');
    if (new Date() > user.otpExpiresAt) throw new BadRequestException('Mã OTP đã hết hạn');

    const emailExist = await this.userRepository.findOne({ where: { email: dto.newEmail } });
    if (emailExist) throw new ConflictException('Email mới này đã được sử dụng bởi người khác!');

    user.email = dto.newEmail;
    user.otpCode = null;
    user.otpExpiresAt = null;
    await this.userRepository.save(user);

    return { message: 'Thay đổi Email thành công!' };
  }
}