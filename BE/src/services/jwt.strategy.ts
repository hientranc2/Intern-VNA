import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { Account } from '../entities/business_account.entity';

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
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: 'thu_thap_bi_mat_vna_123',
    });
  }

  async validate(payload: JwtPayload) {
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
