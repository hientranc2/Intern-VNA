import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  SetMetadata,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { Role } from '../entities/role.entity';

export const PERMISSIONS_KEY = 'required_permissions';

// Gắn mã quyền bắt buộc cho route, vd @RequirePermissions('SO_C_ROLE_UPDATE').
export const RequirePermissions = (...perms: string[]) =>
  SetMetadata(PERMISSIONS_KEY, perms);

interface RequestUser {
  userId: string;
  username: string;
  role: string;
}

// Ép quyền ở BE: ADMIN / vai trò is_super = toàn quyền; còn lại phải có đủ mã quyền.
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Role)
    private readonly roleRepo: Repository<Role>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!required || required.length === 0) return true;

    const request = context.switchToHttp().getRequest<{ user?: RequestUser }>();
    const current = request.user;
    if (!current) throw new UnauthorizedException('Chưa đăng nhập');
    if (current.role === 'ADMIN') return true;

    const user = await this.userRepo.findOne({
      where: { id: current.userId },
    });
    const role = user?.roleId
      ? await this.roleRepo.findOne({ where: { id: user.roleId } })
      : null;
    if (role?.isSuper) return true;

    const granted = role?.perms ?? [];
    const ok = required.every((code) => granted.includes(code));
    if (!ok)
      throw new ForbiddenException('Bạn không có quyền thực hiện thao tác này');
    return true;
  }
}
