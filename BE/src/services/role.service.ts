import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Role } from '../entities/role.entity';
import { User } from '../entities/user.entity';
import {
  CreateRoleDto,
  UpdateRoleDto,
} from '../../libs/shared/models/role.dto';

// Người gọi (lấy từ JWT) — dùng để kiểm tra đặc quyền admin/CEO.
export type RoleRequester = { userId: string; role: string };

@Injectable()
export class RoleService {
  constructor(
    @InjectRepository(Role)
    private readonly repo: Repository<Role>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  findAll(): Promise<Role[]> {
    return this.repo.find({ order: { id: 'ASC' } });
  }

  async findOne(id: number): Promise<Role> {
    const item = await this.repo.findOne({ where: { id } });
    if (!item) throw new NotFoundException('Không tìm thấy vai trò');
    return item;
  }

  async create(dto: CreateRoleDto): Promise<Role> {
    if (dto.ma.trim().toUpperCase() === 'SUPER_ADMIN')
      throw new ForbiddenException('Không thể tạo vai trò Super Admin');

    const existing = await this.repo.findOne({ where: { ma: dto.ma } });
    if (existing) throw new ConflictException('Mã vai trò đã tồn tại');
    const item = this.repo.create(dto);
    return this.repo.save(item);
  }

  async update(
    id: number,
    dto: UpdateRoleDto,
    requester: RoleRequester,
  ): Promise<Role> {
    const item = await this.findOne(id);
    if (item.ma === 'SUPER_ADMIN')
      throw new ForbiddenException('Không thể cập nhật vai trò Super Admin');

    // Thông tin vai trò cấp cao (ADMIN/CEO) chỉ ADMIN hoặc CEO mới được cập nhật.
    if (item.isSuper && !(await this.isAdminOrSuper(requester)))
      throw new ForbiddenException(
        'Chỉ ADMIN hoặc CEO mới được cập nhật vai trò cấp cao',
      );
    if (dto.ten !== undefined) item.ten = dto.ten;
    if (dto.perms !== undefined) item.perms = dto.perms;
    return this.repo.save(item);
  }

  async remove(
    id: number,
    requester: RoleRequester,
  ): Promise<{ message: string }> {
    const item = await this.findOne(id);

    if (item.ma === 'SUPER_ADMIN')
      throw new ForbiddenException('Không thể xóa vai trò Super Admin');

    // Vai trò hệ thống cấp cao chỉ Super Admin được xóa.
    if (item.isProtected && !(await this.isSuperAdmin(requester)))
      throw new ForbiddenException('Không thể xóa vai trò hệ thống cấp cao');

    // *** THÊM: Kiểm tra xem có user nào đang dùng role này không ***
    const userCount = await this.userRepo.count({
      where: { roleId: id },
    });

    if (userCount > 0) {
      throw new ConflictException(
        `Không thể xóa vai trò này vì đang có ${userCount} người dùng sử dụng. Vui lòng chuyển người dùng sang vai trò khác trước khi xóa.`,
      );
    }

    // Nếu không có user, tiến hành xóa
    await this.repo.remove(item);
    return { message: 'Xóa vai trò thành công' };
  }

  // Người gọi là ADMIN (role string) hoặc đang giữ một vai trò is_super (vd CEO)?
  private async isAdminOrSuper(requester: RoleRequester): Promise<boolean> {
    if (requester.role === 'ADMIN') return true;
    const user = await this.userRepo.findOne({
      where: { id: requester.userId },
    });
    if (!user?.roleId) return false;
    const role = await this.repo.findOne({ where: { id: user.roleId } });
    return Boolean(role?.isSuper);
  }

  private async isSuperAdmin(requester: RoleRequester): Promise<boolean> {
    const user = await this.userRepo.findOne({
      where: { id: requester.userId },
    });
    if (!user?.roleId) return false;
    const role = await this.repo.findOne({ where: { id: user.roleId } });
    return role?.ma === 'SUPER_ADMIN';
  }
}
