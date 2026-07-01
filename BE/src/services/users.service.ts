import {
  Injectable,
  ConflictException,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
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
import {
  parseExcelToRows,
  pickCell,
  excelRowNumber,
} from '../utils/excel-import.util';

// Mật khẩu mặc định khi import hàng loạt — giống pattern tạo doanh nghiệp.
// Admin có thể đặt lại sau qua endpoint reset-password.
const IMPORT_DEFAULT_PASSWORD = '12345678';
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Danh sách header (có thể nhiều tên) cho mỗi trường trong file mẫu import user.
const USER_HEADER_MAP = {
  username: ['Tên đăng nhập', 'Username', 'Tài khoản'],
  email: ['Email', 'E-mail'],
  fullName: ['Họ và tên', 'Họ tên', 'Tên đầy đủ'],
  role: ['Vai trò', 'Role'],
  jobTitle: ['Chức danh', 'Chức vụ'],
  province: ['Tỉnh/Thành', 'Tỉnh', 'Thành phố'],
  ward: ['Phường/Xã', 'Phường', 'Xã'],
  address: ['Địa chỉ'],
  dob: ['Ngày sinh'],
  gender: ['Giới tính'],
} as const;

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private userRepository: Repository<User>,
    @InjectRepository(Role) private roleRepository: Repository<Role>,
    private dataSource: DataSource,
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

    user.password = await bcrypt.hash(dto.newPassword, 10);
    // Vô hiệu phiên cũ — buộc người dùng đăng nhập lại bằng mật khẩu mới.
    user.passwordChangedAt = new Date();

    await this.userRepository.save(user);
    return { message: 'Đặt lại mật khẩu người dùng thành công!' };
  }

  // 5. XÓA NGƯỜI DÙNG
  async deleteUser(id: string, requester?: { userId: string; role: string }) {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) throw new NotFoundException('Không tìm thấy người dùng');

    // Tài khoản Super Admin (vai trò SUPER_ADMIN) — bất khả xâm phạm, không ai được xóa.
    if (await this.isSuperAdminUser(user)) {
      throw new ForbiddenException('Không thể xóa tài khoản Super Admin');
    }

    // Người dùng cấp cao (isSuper) — chỉ Super Admin mới xóa được, admin cùng cấp không được.
    if (await this.isHighRoleUser(user)) {
      const callerIsSuperAdmin = requester
        ? await this.isSuperAdminUser(
            await this.userRepository.findOne({
              where: { id: requester.userId },
            }),
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

  // User cấp cao: role hệ thống được bảo vệ hoặc legacy is_super.
  private async isHighRoleUser(user: User): Promise<boolean> {
    if (!user.roleId) return false;
    const role = await this.roleRepository.findOne({
      where: { id: user.roleId },
    });
    return Boolean(role?.isProtected || role?.isSuper);
  }

  // User giữ vai trò SUPER_ADMIN cụ thể — quyền cao nhất, bất khả xâm phạm.
  private async isSuperAdminUser(user: User): Promise<boolean> {
    if (!user.roleId) return false;
    const role = await this.roleRepository.findOne({
      where: { id: user.roleId },
    });
    return role?.ma === 'SUPER_ADMIN';
  }

  // 6. IMPORT HÀNG LOẠT TỪ FILE EXCEL/CSV
  // All-or-nothing: nếu BẤT KỲ dòng nào lỗi → rollback toàn bộ, không insert dòng nào.
  async importUsers(file?: Express.Multer.File) {
    if (!file?.buffer) {
      throw new BadRequestException('Vui lòng chọn file để import');
    }

    const rows = parseExcelToRows(file.buffer);

    // Tải trước toàn bộ vai trò (mã → id) để tra cứu nhanh.
    const roles = await this.roleRepository.find();
    const roleByMa = new Map(roles.map((r) => [r.ma, r]));

    // Validate + chuẩn hoá từng dòng trước khi mở transaction.
    const records: Partial<User>[] = [];
    const seenUsernames = new Set<string>();
    const seenEmails = new Set<string>();

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = excelRowNumber(i);
      const username = pickCell(row, [...USER_HEADER_MAP.username]);
      const email = pickCell(row, [...USER_HEADER_MAP.email]).toLowerCase();
      const fullName = pickCell(row, [...USER_HEADER_MAP.fullName]);
      const roleMa = pickCell(row, [...USER_HEADER_MAP.role]);
      const jobTitle = pickCell(row, [...USER_HEADER_MAP.jobTitle]);
      const province = pickCell(row, [...USER_HEADER_MAP.province]);
      const ward = pickCell(row, [...USER_HEADER_MAP.ward]);
      const address = pickCell(row, [...USER_HEADER_MAP.address]);
      const dob = pickCell(row, [...USER_HEADER_MAP.dob]);
      const gender = pickCell(row, [...USER_HEADER_MAP.gender]);

      if (!username) {
        throw new BadRequestException(`Dòng ${rowNum}: thiếu "Tên đăng nhập"`);
      }
      if (!email) {
        throw new BadRequestException(`Dòng ${rowNum}: thiếu "Email"`);
      }
      if (!EMAIL_REGEX.test(email)) {
        throw new BadRequestException(`Dòng ${rowNum}: Email không hợp lệ`);
      }
      if (!fullName) {
        throw new BadRequestException(`Dòng ${rowNum}: thiếu "Họ và tên"`);
      }
      if (seenUsernames.has(username)) {
        throw new BadRequestException(
          `Dòng ${rowNum}: "Tên đăng nhập" "${username}" bị trùng trong file`,
        );
      }
      if (seenEmails.has(email)) {
        throw new BadRequestException(
          `Dòng ${rowNum}: "Email" "${email}" bị trùng trong file`,
        );
      }

      // Tra vai trò: nếu có thì phải đúng mã, không thì bỏ qua (roleId = undefined).
      let roleId: number | undefined;
      if (roleMa) {
        const role = roleByMa.get(roleMa);
        if (!role) {
          throw new BadRequestException(
            `Dòng ${rowNum}: vai trò "${roleMa}" không tồn tại`,
          );
        }
        roleId = role.id;
      }

      seenUsernames.add(username);
      seenEmails.add(email);

      records.push({
        username,
        email,
        fullName,
        password: '', // gắn password hash sau khi đã validate xong
        roleId,
        role: roleId ? undefined : 'USER',
        ...(jobTitle && { jobTitle }),
        ...(province && { province }),
        ...(ward && { ward }),
        ...(address && { address }),
        ...(gender && { gender }),
        ...(dob && { dob: new Date(dob) }),
        isActive: true,
      });
    }

    // Kiểm tra trùng username/email với DB (1 truy vấn, tránh N lần query).
    const existing = await this.userRepository.find({
      where: records.flatMap((r) => [
        ...(r.username ? [{ username: r.username }] : []),
        ...(r.email ? [{ email: r.email }] : []),
      ]),
      select: { username: true, email: true },
    });
    const errors: string[] = [];
    if (existing.length > 0) {
      const takenUsernames = new Set(existing.map((u) => u.username));
      const takenEmails = new Set(existing.map((u) => u.email));
      for (let i = 0; i < records.length; i++) {
        const r = records[i];
        if (r.username && takenUsernames.has(r.username)) {
          errors.push(
            `Dòng ${i + 1}: "Tên đăng nhập" "${r.username}" đã tồn tại trong hệ thống`,
          );
        }
        if (r.email && takenEmails.has(r.email)) {
          errors.push(
            `Dòng ${i + 1}: "Email" "${r.email}" đã tồn tại trong hệ thống`,
          );
        }
      }
    }
    if (errors.length > 0) {
      throw new ConflictException(errors.join('\n'));
    }

    // Mọi dòng hợp lệ → hash password default 1 lần rồi insert trong 1 transaction.
    const hashedPassword = await bcrypt.hash(IMPORT_DEFAULT_PASSWORD, 10);
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      const toInsert = records.map((r) => ({
        ...r,
        password: hashedPassword,
      }));
      await queryRunner.manager.insert(User, toInsert);
      await queryRunner.commitTransaction();
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw new BadRequestException(
        `Lỗi khi ghi dữ liệu: ${err instanceof Error ? err.message : 'unknown'}`,
      );
    } finally {
      await queryRunner.release();
    }

    return {
      message: `Đã import thành công ${records.length} người dùng`,
      imported: records.length,
    };
  }
}
