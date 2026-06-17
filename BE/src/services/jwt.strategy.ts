import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { Account } from '../entities/business_account.entity';
import { Business } from '../entities/business.entity';

const LOCKED_MESSAGE = 'Tài khoản của bạn đã bị khóa. Vui lòng liên hệ Admin!';

interface JwtPayload {
  sub: string;
  username: string;
  role: string;
  iat?: number; // thời điểm phát hành token (giây)
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(Account)
    private readonly accountRepo: Repository<Account>,
    @InjectRepository(Business)
    private readonly businessRepo: Repository<Business>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: 'thu_thap_bi_mat_vna_123',
    });
  }

  async validate(payload: JwtPayload) {
    // Tra DB mỗi request: tài khoản bị khóa giữa phiên → chặn ngay (văng ra ở thao tác kế tiếp).
    await this.assertActive(payload);

    const changedAt = await this.getPasswordChangedAt(payload);
    // Token phát hành trước thời điểm đổi mật khẩu => buộc đăng nhập lại.
    if (
      changedAt &&
      payload.iat &&
      payload.iat < Math.floor(changedAt.getTime() / 1000)
    ) {
      throw new UnauthorizedException(
        'Mật khẩu đã được thay đổi, vui lòng đăng nhập lại',
      );
    }
    return {
      userId: payload.sub,
      username: payload.username,
      role: payload.role,
    };
  }

  private async assertActive(payload: JwtPayload): Promise<void> {
    if (payload.role === 'DoanhNghiep') {
      const account = await this.accountRepo.findOne({
        where: { id: payload.sub },
      });
      if (!account) throw new UnauthorizedException(LOCKED_MESSAGE);
      const business = await this.businessRepo.findOne({
        where: { accountId: account.id },
      });
      if (!business || !business.isActive) {
        throw new UnauthorizedException(LOCKED_MESSAGE);
      }
      return;
    }
    const user = await this.userRepo.findOne({ where: { id: payload.sub } });
    if (!user || !user.isActive) throw new UnauthorizedException(LOCKED_MESSAGE);
  }

  private async getPasswordChangedAt(
    payload: JwtPayload,
  ): Promise<Date | null> {
    if (payload.role === 'DoanhNghiep') {
      const account = await this.accountRepo.findOne({
        where: { id: payload.sub },
      });
      return account?.passwordChangedAt ?? null;
    }
    const user = await this.userRepo.findOne({ where: { id: payload.sub } });
    return user?.passwordChangedAt ?? null;
  }
}
