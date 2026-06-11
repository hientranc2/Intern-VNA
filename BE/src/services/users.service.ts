import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../entities/user.entity';
import { GetUsersFilterDto, CreateUserAdminDto, UpdateUserAdminDto, ResetPasswordAdminDto } from '../dtos/user-admin.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private userRepository: Repository<User>,
  ) {}

  // 1. LẤY DANH SÁCH & TÌM KIẾM CÓ PHÂN TRANG
  async getUsers(filterDto: GetUsersFilterDto) {
    const { fullName, username, email, role, jobTitle, isActive, page = 1, limit = 10 } = filterDto;
    const query = this.userRepository.createQueryBuilder('user');

    if (fullName) query.andWhere('user.fullName ILIKE :fullName', { fullName: `%${fullName}%` });
    if (username) query.andWhere('user.username ILIKE :username', { username: `%${username}%` });
    if (email) query.andWhere('user.email ILIKE :email', { email: `%${email}%` });
    if (role) query.andWhere('user.role = :role', { role }); 
    if (jobTitle) query.andWhere('user.jobTitle ILIKE :jobTitle', { jobTitle: `%${jobTitle}%` });
    if (isActive !== undefined) query.andWhere('user.isActive = :isActive', { isActive });

    query.orderBy('user.createdAt', 'DESC');

    const skip = (page - 1) * limit;
    query.skip(skip).take(limit);

    const [users, total] = await query.getManyAndCount();

    const sanitizedUsers = users.map(user => {
      const { password, otpCode, otpExpiresAt, ...result } = user;
      return result;
    });

    return {
      data: sanitizedUsers,
      meta: {
        totalItems: total,
        currentPage: page,
        itemsPerPage: limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // 2. TẠO MỚI NGƯỜI DÙNG (ADMIN QUYỀN)
  async createUser(dto: CreateUserAdminDto) {
    const existingUser = await this.userRepository.findOne({
      where: [{ username: dto.username }, { email: dto.email }],
    });
    
    if (existingUser) {
      throw new ConflictException('Tài khoản hoặc Email đã tồn tại!');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);
    const newUser = this.userRepository.create({
      ...dto,
      password: hashedPassword,
    });

    await this.userRepository.save(newUser);
    const { password, otpCode, otpExpiresAt, ...result } = newUser;
    return { message: 'Tạo tài khoản thành công', user: result };
  }

  // 3. CẬP NHẬT THÔNG TIN NGƯỜI DÙNG
  async updateUser(id: string, dto: UpdateUserAdminDto) {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) throw new NotFoundException('Không tìm thấy người dùng');

    if (dto.email && dto.email !== user.email) {
      const emailExist = await this.userRepository.findOne({ where: { email: dto.email } });
      if (emailExist) throw new ConflictException('Email này đã được người khác sử dụng!');
    }

    await this.userRepository.update(id, dto);
    
    const updatedUser = await this.userRepository.findOne({ where: { id } });
    const { password, otpCode, otpExpiresAt, ...result } = updatedUser;
    return { message: 'Cập nhật thông tin thành công', user: result };
  }

  // 4. BẬT/TẮT TRẠNG THÁI HOẠT ĐỘNG
  async toggleUserStatus(id: string) {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) throw new NotFoundException('Không tìm thấy người dùng');

    user.isActive = !user.isActive; 
    await this.userRepository.save(user);

    return { 
      message: user.isActive ? 'Đã mở khóa tài khoản' : 'Đã khóa tài khoản', 
      isActive: user.isActive 
    };
  }
  async adminResetPassword(id: string, dto: ResetPasswordAdminDto) {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) throw new NotFoundException('Không tìm thấy người dùng');

    // Băm mật khẩu mới
    const hashedPassword = await bcrypt.hash(dto.newPassword, 10);
    user.password = hashedPassword;
    
    await this.userRepository.save(user);
    return { message: 'Đặt lại mật khẩu người dùng thành công!' };
  }
}