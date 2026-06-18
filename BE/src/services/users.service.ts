import {
  Injectable,
  ConflictException,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../entities/user.entity';
import { Role } from '../entities/role.entity';
import { AVATAR_URL_PREFIX } from '../config/avatar-upload.config';
import {
  GetUsersFilterDto,
  CreateUserAdminDto,
  UpdateUserAdminDto,
  ResetPasswordAdminDto,
} from '../dtos/user-admin.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private userRepository: Repository<User>,
    @InjectRepository(Role) private roleRepository: Repository<Role>,
  ) {}

  // 1. LẤY DANH SÁCH & TÌM KIẾM CÓ PHÂN TRANG
  async getUsers(filterDto: GetUsersFilterDto) {
    const {
      fullName,
      username,
      email,
      role,
      roleId,
      jobTitle,
      isActive,
      province,
      page = 1,
      limit = 10,
    } = filterDto;
    const query = this.userRepository.createQueryBuilder('user');

    if (fullName)
      query.andWhere('user.fullName ILIKE :fullName', {
        fullName: `%${fullName}%`,
      });
    if (username)
      query.andWhere('user.username ILIKE :username', {
        username: `%${username}%`,
      });
    if (email)
      query.andWhere('user.email ILIKE :email', { email: `%${email}%` });
    if (role) query.andWhere('user.role = :role', { role });
    if (roleId !== undefined)
      query.andWhere('user.roleId = :roleId', { roleId });
    if (jobTitle)
      query.andWhere('user.jobTitle ILIKE :jobTitle', {
        jobTitle: `%${jobTitle}%`,
      });
    if (province) query.andWhere('user.province = :province', { province });
    if (isActive !== undefined)
      query.andWhere('user.isActive = :isActive', { isActive });

    query.orderBy('user.createdAt', 'DESC');

    const skip = (page - 1) * limit;
    query.skip(skip).take(limit);

    const [users, total] = await query.getManyAndCount();

    const sanitizedUsers = users.map((user) => {
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
  async createUser(dto: CreateUserAdminDto, avatar?: Express.Multer.File) {
    const existingUser = await this.userRepository.findOne({
      where: [{ username: dto.username }, { email: dto.email }],
    });

    if (existingUser) {
      throw new ConflictException('Tài khoản hoặc Email đã tồn tại!');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);
    // dob từ DTO là chuỗi yyyy-MM-dd; cột entity là Date → ép kiểu.
    const { dob, ...rest } = dto;
    const newUser = this.userRepository.create({
      ...rest,
      ...(dob && { dob: new Date(dob) }),
      password: hashedPassword,
      ...(avatar && { avatarUrl: `${AVATAR_URL_PREFIX}/${avatar.filename}` }),
    });

    await this.userRepository.save(newUser);
    const { password, otpCode, otpExpiresAt, ...result } = newUser;
    return { message: 'Tạo tài khoản thành công', user: result };
  }

  // 3. CẬP NHẬT THÔNG TIN NGƯỜI DÙNG
  async updateUser(
    id: string,
    dto: UpdateUserAdminDto,
    avatar?: Express.Multer.File,
  ) {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) throw new NotFoundException('Không tìm thấy người dùng');

    if (dto.email && dto.email !== user.email) {
      const emailExist = await this.userRepository.findOne({
        where: { email: dto.email },
      });
      if (emailExist)
        throw new ConflictException('Email này đã được người khác sử dụng!');
    }

    // dob từ DTO là chuỗi yyyy-MM-dd; cột entity là Date → ép kiểu.
    const { dob, ...rest } = dto;
    const updatePayload: Partial<User> = { ...rest };
    if (dob !== undefined) updatePayload.dob = new Date(dob);
    if (avatar)
      updatePayload.avatarUrl = `${AVATAR_URL_PREFIX}/${avatar.filename}`;
    await this.userRepository.update(id, updatePayload);

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
      isActive: user.isActive,
    };
  }
  async adminResetPassword(id: string, dto: ResetPasswordAdminDto) {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) throw new NotFoundException('Không tìm thấy người dùng');

    // Không cho đặt lại trùng mật khẩu hiện tại.
    const isSame = await bcrypt.compare(dto.newPassword, user.password);
    if (isSame)
      throw new BadRequestException(
        'Mật khẩu mới không được trùng mật khẩu cũ',
      );

    user.password = await bcrypt.hash(dto.newPassword, 10);
    // Vô hiệu phiên cũ — buộc người dùng đăng nhập lại bằng mật khẩu mới.
    user.passwordChangedAt = new Date();

    await this.userRepository.save(user);
    return { message: 'Đặt lại mật khẩu người dùng thành công!' };
  }

  // 5. XÓA NGƯỜI DÙNG
  async deleteUser(
    id: string,
    requester?: { userId: string; role: string },
  ) {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) throw new NotFoundException('Không tìm thấy người dùng');

    // Tài khoản Super Admin (vai trò SUPER_ADMIN) — bất khả xâm phạm, không ai được xóa.
    if (await this.isSuperAdminUser(user)) {
      throw new ForbiddenException(
        'Không thể xóa tài khoản Super Admin',
      );
    }

    // Người dùng cấp cao (isSuper) — chỉ Super Admin mới xóa được, admin cùng cấp không được.
    if (await this.isHighRoleUser(user)) {
      const callerIsSuperAdmin = requester
        ? await this.isSuperAdminUser(
            (await this.userRepository.findOne({
              where: { id: requester.userId },
            }))!,
          )
        : false;
      if (!callerIsSuperAdmin) {
        throw new ForbiddenException(
          'Chỉ Super Admin mới được xóa người dùng cấp cao.',
        );
      }
    }

    await this.userRepository.remove(user);
    return { message: 'Xóa người dùng thành công' };
  }

  // User cấp cao: role string ADMIN, hoặc đang giữ một vai trò is_super (vd CEO, Quản trị viên hệ thống).
  private async isHighRoleUser(user: User): Promise<boolean> {
    if (user.role === 'ADMIN') return true;
    if (!user.roleId) return false;
    const role = await this.roleRepository.findOne({
      where: { id: user.roleId },
    });
    return Boolean(role?.isSuper);
  }

  // User giữ vai trò SUPER_ADMIN cụ thể — quyền cao nhất, bất khả xâm phạm.
  private async isSuperAdminUser(user: User): Promise<boolean> {
    if (!user.roleId) return false;
    const role = await this.roleRepository.findOne({
      where: { id: user.roleId },
    });
    return role?.ma === 'SUPER_ADMIN';
  }
}
