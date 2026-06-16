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
import { Role } from './entities/role.entity';
import { RoleController } from './controllers/role.controller';
import { RoleService } from './services/role.service';
import { Permission } from './entities/permission.entity';
import { PermissionController } from './controllers/permission.controller';
import { PermissionService } from './services/permission.service';
import { ReportConfig } from './entities/report-config.entity';
import { ReportConfigController } from './controllers/report-config.controller';
import { ReportConfigService } from './services/report-config.service';
import { InjuryFactor } from './entities/injury-factor.entity';
import { InjuryType } from './entities/injury-type.entity';
import { Occupation } from './entities/occupation.entity';
import { CategoryController } from './controllers/category.controller';
import { CategoryService } from './services/category.service';
import { AccidentReport } from './entities/accident-report.entity';
import { AccidentReportController } from './controllers/accident-report.controller';
import { EnterpriseReportController } from './controllers/enterprise-report.controller';
import { AccidentReportService } from './services/accident-report.service';
import { AtvsldReport } from './entities/atvsld-report.entity';
import { AtvsldReportController } from './controllers/atvsld-report.controller';
import { AtvsldReportService } from './services/atvsld-report.service';

@Module({
  imports: [
    ConfigModule.forRoot(),
    TypeOrmModule.forRoot({
      type: 'postgres',
      url: process.env.DATABASE_URL,
      entities: [
        User,
        Business,
        Account,
        EnterpriseType,
        BusinessSector,
        Role,
        Permission,
        ReportConfig,
        InjuryFactor,
        InjuryType,
        Occupation,
        AccidentReport,
        AtvsldReport,
      ],
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
      Role,
      Permission,
      ReportConfig,
      InjuryFactor,
      InjuryType,
      Occupation,
      AccidentReport,
      AtvsldReport,
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
    RoleController,
    PermissionController,
    ReportConfigController,
    CategoryController,
    AccidentReportController,
    EnterpriseReportController,
    AtvsldReportController,
  ],
  providers: [
    AuthService,
    JwtStrategy,
    UsersService,
    BusinessService,
    EnterpriseTypeService,
    BusinessSectorService,
    RoleService,
    PermissionService,
    ReportConfigService,
    CategoryService,
    AccidentReportService,
    AtvsldReportService,
  ],
})
export class AppModule {}
