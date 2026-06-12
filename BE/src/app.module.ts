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


@Module({
  imports: [
    ConfigModule.forRoot(), 
    TypeOrmModule.forRoot({
      type: 'postgres',
      url: process.env.DATABASE_URL,
      entities: [User, Business, Account],
      synchronize: false, // Chổ này chỉnh true có thể để TypeORM tự động tạo Database
      ssl: {
        rejectUnauthorized: false,
      },
    }),
    TypeOrmModule.forFeature([User, Business, Account]),
    JwtModule.register({
      secret: 'thu_thap_bi_mat_vna_123',
      signOptions: { expiresIn: '1h' },
    }),
  ],
 controllers: [
    AuthController, 
    UsersController,
    BusinessController, 
  ],
  providers: [
    AuthService, 
    JwtStrategy, 
    UsersService,
    BusinessService,    
  ],
})
export class AppModule {}