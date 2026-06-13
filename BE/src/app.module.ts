import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { UsersController } from './controllers/users.controller';
import { User } from './entities/user.entity';
import { AuthController } from './controllers/auth.controller';
import { AuthService } from './services/auth.service';
import { JwtStrategy } from './services/jwt.strategy';
import { UsersService } from './services/users.service';
import { Business } from './entities/business.entity';
import { Account } from './entities/business_account.entity';
import { BusinessController } from './controllers/business.controller';
import { BusinessService } from './services/business.service';
import { EnterpriseType } from './entities/enterprise-type.entity';
import { EnterpriseTypeController } from './controllers/enterprise-type.controller';
import { EnterpriseTypeService } from './services/enterprise-type.service';
import { BusinessSector } from './entities/business-sector.entity';
import { BusinessSectorController } from './controllers/business-sector.controller';
import { BusinessSectorService } from './services/business-sector.service';

@Module({
  imports: [
    ConfigModule.forRoot(),
    TypeOrmModule.forRoot({
      type: 'postgres',
      url: process.env.DATABASE_URL,
      entities: [User, Business, Account, EnterpriseType, BusinessSector],
      synchronize: false,
      ssl: {
        rejectUnauthorized: false,
      },
    }),
    TypeOrmModule.forFeature([
      User,
      Business,
      Account,
      EnterpriseType,
      BusinessSector,
    ]),
    JwtModule.register({
      secret: 'thu_thap_bi_mat_vna_123',
      signOptions: { expiresIn: '1h' },
    }),
  ],
  controllers: [
    AuthController,
    UsersController,
    BusinessController,
    EnterpriseTypeController,
    BusinessSectorController,
  ],
  providers: [
    AuthService,
    JwtStrategy,
    UsersService,
    BusinessService,
    EnterpriseTypeService,
    BusinessSectorService,
  ],
})
export class AppModule {}
