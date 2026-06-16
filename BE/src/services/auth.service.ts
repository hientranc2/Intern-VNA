import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import * as nodemailer from 'nodemailer';
import { createClient } from '@supabase/supabase-js';
import * as WebSocket from 'ws';
(global as any).WebSocket = WebSocket;
import { User } from '../entities/user.entity';
import { Account } from '../entities/business_account.entity';
import { Business } from '../entities/business.entity';
import { Role } from '../entities/role.entity';
import { Permission } from '../entities/permission.entity';
import {
  RegisterDto,
  LoginDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  UpdateProfileDto,
  ChangePasswordDto,
  ChangeEmailDto,
  SendRegisterOtpDto,
  VerifyRegisterOtpDto,
} from '../../libs/shared/models/auth.dto';
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
    },
  );

  // Service role key bypass RLS — chỉ dùng cho storage admin operations
  private supabaseAdmin = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    },
  );

  private registerOtpStore = new Map<
    string,
    { code: string; expiresAt: Date }
  >();

  constructor(
    @InjectRepository(User) private userRepository: Repository<User>,
    @InjectRepository(Account) private accountRepository: Repository<Account>,
    @InjectRepository(Business)
    private businessRepository: Repository<Business>,
    @InjectRepository(Role) private roleRepository: Repository<Role>,
    @InjectRepository(Permission)
    private permissionRepository: Repository<Permission>,
    private jwtService: JwtService,
  ) {}

  // Suy ra quyền + tên vai trò hiển thị của user (nạp vai trò 1 lần).
  // role ADMIN = toàn quyền (mọi Component); ngược lại lấy theo vai trò đã gán.
  // roleName ưu tiên tên vai trò (roleId), fallback role string (vd ADMIN).
  private async getAccessInfo(
    user: User,
  ): Promise<{ permissions: string[]; roleName: string }> {
    const role = user.roleId
      ? await this.roleRepository.findOne({ where: { id: user.roleId } })
      : null;

    let permissions: string[];
    if (user.role === 'ADMIN') {
      const all = await this.permissionRepository.find({
        where: { type: 'Component' },
      });
      permissions = all.map((p) => p.code);
    } else {
      permissions = role?.perms ?? [];
    }

    return { permissions, roleName: role?.ten ?? user.role };
  }

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
    const user = await this.userRepository.findOne({
      where: { username: dto.username },
    });
    if (!user) {
      throw new UnauthorizedException(
        'Tài khoản hoặc mật khẩu không đúng. Xin vui lòng thử lại',
      );
    }
    if (!user.isActive) {
      throw new UnauthorizedException(
        'Tài khoản đã bị vô hiệu hóa. Vui lòng liên hệ quản trị viên.',
      );
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException(
        'Tài khoản hoặc mật khẩu không đúng. Xin vui lòng thử lại',
      );
    }

    const expiresIn = dto.rememberMe ? '7d' : '1h';
    const payload = { sub: user.id, username: user.username, role: user.role };

    const accessToken = this.jwtService.sign(payload, { expiresIn });
    const { password, otpCode, otpExpiresAt, ...userInfo } = user;
    const { permissions, roleName } = await this.getAccessInfo(user);

    return {
      message: 'Đăng nhập thành công',
      accessToken,
      user: { ...userInfo, permissions, roleName },
    };
  }

  async loginBusiness(dto: LoginDto) {
    const account = await this.accountRepository.findOne({
      where: { username: dto.username },
    });

    if (!account) {
      throw new UnauthorizedException(
        'Tài khoản hoặc mật khẩu không đúng. Xin vui lòng thử lại',
      );
    }

    const isPasswordValid = await bcrypt.compare(
      dto.password,
      account.password,
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException(
        'Tài khoản hoặc mật khẩu không đúng. Xin vui lòng thử lại',
      );
    }

    const business = await this.businessRepository.findOne({
      where: { accountId: account.id },
    });

    if (!business?.isActive) {
      throw new UnauthorizedException(
        'Tài khoản doanh nghiệp đã bị vô hiệu hóa. Vui lòng liên hệ cơ quan quản lý.',
      );
    }

    const expiresIn = dto.rememberMe ? '7d' : '1h';
    const payload = {
      sub: account.id,
      username: account.username,
      role: account.role,
    };
    const accessToken = this.jwtService.sign(payload, { expiresIn });

    return {
      message: 'Đăng nhập thành công',
      accessToken,
      account: {
        id: account.id,
        username: account.username,
        role: account.role,
        businessId: business.id,
        businessName: business.businessName,
      },
    };
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.userRepository.findOne({
      where: { email: dto.email },
    });
    if (!user)
      throw new NotFoundException('Không tìm thấy tài khoản với email này');

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
    const user = await this.userRepository.findOne({
      where: { email: dto.email, otpCode: dto.otpCode },
    });

    if (!user) throw new BadRequestException('Mã OTP không chính xác');
    if (new Date() > user.otpExpiresAt)
      throw new BadRequestException('Mã OTP đã hết hạn');

    user.password = await bcrypt.hash(dto.newPassword, 10);
    user.otpCode = null;
    user.otpExpiresAt = null;

    await this.userRepository.save(user);
    return { message: 'Đặt lại mật khẩu thành công!' };
  }

  async getProfile(userId: string) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    const { password, otpCode, otpExpiresAt, ...result } = user;
    const { permissions, roleName } = await this.getAccessInfo(user);
    return { ...result, permissions, roleName };
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
    if (!isOldPassValid)
      throw new BadRequestException('Mật khẩu cũ không chính xác');

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
      console.log(
        'Chưa kết nối Mail Server, lấy mã OTP ở dòng log phía trên để test.',
      );
    }
    return { message: 'Đã gửi mã OTP đến email HIỆN TẠI của bạn' };
  }

  async verifyAndChangeEmail(userId: string, dto: ChangeEmailDto) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('Không tìm thấy tài khoản');
    if (user.otpCode !== dto.otpCode)
      throw new BadRequestException('Mã OTP không chính xác');
    if (new Date() > user.otpExpiresAt)
      throw new BadRequestException('Mã OTP đã hết hạn');

    const emailExist = await this.userRepository.findOne({
      where: { email: dto.newEmail },
    });
    if (emailExist)
      throw new ConflictException(
        'Email mới này đã được sử dụng bởi người khác!',
      );

    user.email = dto.newEmail;
    user.otpCode = null;
    user.otpExpiresAt = null;
    await this.userRepository.save(user);

    return { message: 'Thay đổi Email thành công!' };
  }

  async sendRegisterOtp(dto: SendRegisterOtpDto) {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 5);
    this.registerOtpStore.set(dto.email, { code: otp, expiresAt });

    console.log(`[OTP ĐĂNG KÝ DN cho ${dto.email}]: ${otp}`);

    const htmlTemplate = `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #eaeaea; padding: 20px; border-radius: 8px;">
  <div style="text-align: center; border-bottom: 2px solid #f4f4f4; padding-bottom: 20px;">
    <img src="https://ziroujfjpyvswzjjsorf.supabase.co/storage/v1/object/public/assets/khong%20nen%20_%20sang.png" alt="VNA Logo" style="max-width: 120px; height: auto; margin-bottom: 12px;" />
  </div>
  <div style="padding: 20px 0; color: #333; line-height: 1.6;">
    <h2 style="color: #002b5e;">Xác thực email đăng ký doanh nghiệp</h2>
    <p>Bạn vừa yêu cầu đăng ký tài khoản doanh nghiệp. Dưới đây là mã OTP xác thực:</p>
    <div style="font-size: 32px; font-weight: bold; color: #000; margin: 20px 0;">${otp}</div>
    <p><strong>Lưu ý:</strong> Mã OTP có hiệu lực trong <strong>5 phút</strong></p>
    <p>Nếu bạn không thực hiện yêu cầu này, vui lòng bỏ qua email này.</p>
  </div>
  <div style="border-top: 2px solid #f4f4f4; padding-top: 20px; font-size: 13px; color: #777;">
    <p style="margin: 0;">© 2026 VNA GROUP. Tất cả các quyền được bảo lưu.</p>
  </div>
</div>`;

    try {
      await this.transporter.sendMail({
        from: '"Hệ thống VNA" <hientran30012004@gmail.com>',
        to: dto.email,
        subject: 'Mã OTP xác thực đăng ký doanh nghiệp - VNA GROUP',
        html: htmlTemplate,
      });
    } catch (error) {
      console.log(
        'Chưa kết nối Mail Server, lấy mã OTP ở dòng log phía trên để test.',
      );
    }

    return { message: 'Mã OTP đã được gửi đến email của bạn!' };
  }

  async verifyRegisterOtp(dto: VerifyRegisterOtpDto) {
    const stored = this.registerOtpStore.get(dto.email);
    if (!stored)
      throw new BadRequestException('Mã OTP không hợp lệ hoặc đã hết hạn');
    if (new Date() > stored.expiresAt) {
      this.registerOtpStore.delete(dto.email);
      throw new BadRequestException(
        'Mã OTP đã hết hạn. Vui lòng yêu cầu gửi lại',
      );
    }
    if (stored.code !== dto.otpCode)
      throw new BadRequestException('Mã OTP không đúng');
    this.registerOtpStore.delete(dto.email);
    return { message: 'Xác thực OTP thành công' };
  }

  async uploadAvatar(userId: string, file: Express.Multer.File) {
    if (!file) throw new BadRequestException('Vui lòng chọn file ảnh!');

    // 1. Tạo tên file duy nhất (tránh việc 2 user up trùng tên ảnh)
    const fileExt = file.originalname.split('.').pop();
    const fileName = `user-${userId}-${Date.now()}.${fileExt}`;

    // 2. Đẩy file vật lý lên Supabase Storage — dùng admin client để bypass RLS
    // Convert Buffer → Blob vì native fetch (Node 18+) không handle Buffer trực tiếp
    const fileBlob = new Blob([new Uint8Array(file.buffer)], {
      type: file.mimetype,
    });
    const { data, error } = await this.supabaseAdmin.storage
      .from('avatars')
      .upload(fileName, fileBlob, {
        contentType: file.mimetype,
        upsert: true,
      });

    if (error) {
      console.log(error);
      throw new BadRequestException('Lỗi khi tải ảnh lên hệ thống!');
    }

    // 3. Xin Supabase cái đường link URL công khai của bức ảnh
    const { data: publicUrlData } = this.supabaseAdmin.storage
      .from('avatars')
      .getPublicUrl(fileName);

    const avatarUrl = publicUrlData.publicUrl;

    // 4. Lưu cái link đó vào CSDL Postgres của chúng ta
    await this.userRepository.update(userId, { avatarUrl: avatarUrl });

    return {
      message: 'Cập nhật ảnh đại diện thành công',
      avatarUrl: avatarUrl,
    };
  }
}
