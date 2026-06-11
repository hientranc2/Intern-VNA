import { Injectable, UnauthorizedException, ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import * as nodemailer from 'nodemailer';
import { createClient } from '@supabase/supabase-js';
import * as WebSocket from 'ws';
(global as any).WebSocket = WebSocket;
import { User } from '../entities/user.entity';
import { RegisterDto, LoginDto, ForgotPasswordDto, ResetPasswordDto, UpdateProfileDto, ChangePasswordDto, ChangeEmailDto } from '../../libs/shared/models/auth.dto';
import 'multer';

@Injectable()
export class AuthService {
  private transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.MAIL_USER, 
      pass: process.env.MAIL_PASS,
    },
  });

  private supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_KEY,
    {
      auth: {
        persistSession: false, 
      },
    }
  );

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
    expiresAt.setMinutes(expiresAt.getMinutes() + 5);

    user.otpCode = otp;
    user.otpExpiresAt = expiresAt;
    await this.userRepository.save(user);

    console.log(`[MÃ OTP CỦA ${user.email} LÀ]: ${otp}`); 
    
    const htmlTemplate = `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #eaeaea; padding: 20px; border-radius: 8px;">
  
  <!-- Phần Logo / Header -->
  <div style="text-align: center; border-bottom: 2px solid #f4f4f4; padding-bottom: 20px;">
    <!-- Hình ảnh Logo -->
    <img src="https://ziroujfjpyvswzjjsorf.supabase.co/storage/v1/object/public/assets/khong%20nen%20_%20sang.png" alt="VNA Logo" style="max-width: 120px; height: auto; margin-bottom: 12px;" />
    <!-- Dòng chữ VNA GROUP -->
    <div style="color: #c49a45; font-size: 18px; font-weight: bold; letter-spacing: 2px;">
      
    </div>
  </div>

  <div style="padding: 20px 0; color: #333; line-height: 1.6;">
    <h2 style="color: #002b5e;">Xin chào, ${user.fullName}</h2>
    
    <p>Bạn vừa yêu cầu khôi phục mật khẩu cho tài khoản <strong>${user.username}</strong>. Dưới đây là mã OTP của bạn:</p>
    
    <div style="font-size: 32px; font-weight: bold; color: #000; margin: 20px 0;">
      ${otp}
    </div>
    
    <p><strong>Lưu ý quan trọng:</strong> Mã OTP có hiệu lực trong <strong>5 phút</strong></p>
    
    <p>Không chia sẻ mã này với bất kỳ ai, kể cả nhân viên hỗ trợ.</p>
    <p>Nếu bạn không yêu cầu khôi phục mật khẩu, vui lòng bỏ qua email này.</p>
  </div>

  <div style="border-top: 2px solid #f4f4f4; padding-top: 20px; font-size: 13px; color: #777; line-height: 1.5;">
    <p style="margin: 0;">Email này được gửi tự động. Vui lòng không trả lời email này.</p>
    <p style="margin: 0;">© 2026 VNA GROUP. Tất cả các quyền được bảo lưu.</p>
    
    <div style="text-align: center; margin-top: 20px; font-size: 12px; color: #999;">
      VNA GROUP | Hệ thống Phần Mềm Quản Lý ATVSLD<br>
      Bạn nhận được email này vì tài khoản của bạn đã yêu cầu đặt lại mật khẩu.
    </div>
  </div>
</div>
`;
    
    try {
      await this.transporter.sendMail({
        from: '"Hệ thống VNA" <hientran30012004@gmail.com>',
        to: user.email,
        subject: 'Mã OTP khôi phục mật khẩu - VNA GROUP',
        html: htmlTemplate,   
      });
    } catch (error) {
       console.error('--- LỖI GỬI MAIL THỰC TẾ TỪ GOOGLE ---');
       console.error(error);   
    }

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
    expiresAt.setMinutes(expiresAt.getMinutes() + 5);

    user.otpCode = otp;
    user.otpExpiresAt = expiresAt;
    await this.userRepository.save(user);

    console.log(`[MÃ OTP ĐỂ ĐỔI EMAIL CỦA ${user.email} LÀ]: ${otp}`);

    // --- TEMPLATE HTML CHO EMAIL ĐỔI EMAIL ---
    const htmlTemplate = `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #eaeaea; padding: 20px; border-radius: 8px;">
  
  <div style="text-align: center; border-bottom: 2px solid #f4f4f4; padding-bottom: 20px;">
    <img src="https://ziroujfjpyvswzjjsorf.supabase.co/storage/v1/object/public/assets/khong%20nen%20_%20sang.png" alt="VNA Logo" style="max-width: 120px; height: auto; margin-bottom: 12px;" />
    <div style="color: #c49a45; font-size: 18px; font-weight: bold; letter-spacing: 2px;">
    
    </div>
  </div>

  <div style="padding: 20px 0; color: #333; line-height: 1.6;">
    <h2 style="color: #002b5e;">Xin chào, ${user.fullName}</h2>
    
    <p>Bạn vừa yêu cầu <strong>thay đổi địa chỉ Email</strong> cho tài khoản <strong>${user.username}</strong>. Dưới đây là mã OTP của bạn:</p>
    
    <div style="font-size: 32px; font-weight: bold; color: #000; margin: 20px 0;">
      ${otp}
    </div>
    
    <p><strong>Lưu ý quan trọng:</strong> Mã OTP có hiệu lực trong <strong>5 phút</strong></p>
    
    <p>Không chia sẻ mã này với bất kỳ ai, kể cả nhân viên hỗ trợ.</p>
    <p>Nếu bạn không yêu cầu thay đổi Email, vui lòng bỏ qua email này.</p>
  </div>

  <div style="border-top: 2px solid #f4f4f4; padding-top: 20px; font-size: 13px; color: #777; line-height: 1.5;">
    <p style="margin: 0;">Email này được gửi tự động. Vui lòng không trả lời email này.</p>
    <p style="margin: 0;">© 2026 VNA GROUP. Tất cả các quyền được bảo lưu.</p>
    
    <div style="text-align: center; margin-top: 20px; font-size: 12px; color: #999;">
      VNA GROUP | Hệ thống Phần Mềm Quản Lý ATVSLD<br>
      Bạn nhận được email này vì tài khoản của bạn đã yêu cầu thay đổi email.
    </div>
  </div>
</div>
`;

    try {
      await this.transporter.sendMail({
        from: '"Hệ thống VNA" <hientran30012004@gmail.com>',
        to: user.email,
        subject: 'Mã OTP xác nhận thay đổi Email - VNA GROUP',
        html: htmlTemplate, // Đổi từ text sang html
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

  async uploadAvatar(userId: string, file: Express.Multer.File) {
    if (!file) throw new BadRequestException('Vui lòng chọn file ảnh!');

    // 1. Tạo tên file duy nhất (tránh việc 2 user up trùng tên ảnh)
    const fileExt = file.originalname.split('.').pop();
    const fileName = `user-${userId}-${Date.now()}.${fileExt}`;

    // 2. Đẩy file vật lý lên Supabase Storage (vào bucket 'avatars' vừa tạo)
    const { data, error } = await this.supabase.storage
      .from('avatars')
      .upload(fileName, file.buffer, {
        contentType: file.mimetype,
        upsert: true, // Nếu trùng tên thì ghi đè
      });

    if (error) {
      console.log(error);
      throw new BadRequestException('Lỗi khi tải ảnh lên hệ thống!');
    }

    // 3. Xin Supabase cái đường link URL công khai của bức ảnh
    const { data: publicUrlData } = this.supabase.storage
      .from('avatars')
      .getPublicUrl(fileName);

    const avatarUrl = publicUrlData.publicUrl;

    // 4. Lưu cái link đó vào CSDL Postgres của chúng ta
    await this.userRepository.update(userId, { avatarUrl: avatarUrl });

    return { 
      message: 'Cập nhật ảnh đại diện thành công', 
      avatarUrl: avatarUrl 
    };
  }
}