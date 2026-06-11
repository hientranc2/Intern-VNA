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

@Module({
  imports: [
    ConfigModule.forRoot(), 
    TypeOrmModule.forRoot({
      type: 'postgres',
      url: process.env.DATABASE_URL,
      entities: [User],
      synchronize: false,
      ssl: {
        rejectUnauthorized: false,
      },
    }),
    TypeOrmModule.forFeature([User]),
    JwtModule.register({
      secret: 'thu_thap_bi_mat_vna_123',
      signOptions: { expiresIn: '1h' },
    }),
  ],
 controllers: [
    AuthController, 
    UsersController 
  ],
  providers: [
    AuthService, 
    JwtStrategy, 
    UsersService    
  ],
})
export class AppModule {}