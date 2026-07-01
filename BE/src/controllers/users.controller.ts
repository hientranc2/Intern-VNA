import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Request,
  UseGuards,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor } from '@nestjs/platform-express';
import { UsersService } from '../services/users.service';
import { avatarMulterOptions } from '../config/avatar-upload.config';
import { importFileOptions } from '../config/import-upload.config';
import {
  PermissionsGuard,
  RequirePermissions,
} from '../guards/permissions.guard';
import {
  GetUsersFilterDto,
  CreateUserAdminDto,
  UpdateUserAdminDto,
  ResetPasswordAdminDto,
} from '../dtos/user-admin.dto';

interface AuthRequest {
  user: { userId: string; username: string; role: string };
}

@Controller('admin/users')
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @RequirePermissions('SO_C_USER_VIEW')
  getUsers(@Query() filterDto: GetUsersFilterDto) {
    return this.usersService.getUsers(filterDto);
  }

  @Post('import')
  @RequirePermissions('SO_C_USER_CREATE')
  @UseInterceptors(FileInterceptor('file', importFileOptions))
  importUsers(@UploadedFile() file: Express.Multer.File) {
    return this.usersService.importUsers(file);
  }

  @Post()
  @RequirePermissions('SO_C_USER_CREATE')
  @UseInterceptors(FileInterceptor('avatar', avatarMulterOptions))
  createUser(
    @Body() dto: CreateUserAdminDto,
    @UploadedFile() avatar?: Express.Multer.File,
  ) {
    return this.usersService.createUser(dto, avatar);
  }

  @Put(':id')
  @RequirePermissions('SO_C_USER_UPDATE')
  @UseInterceptors(FileInterceptor('avatar', avatarMulterOptions))
  updateUser(
    @Param('id') id: string,
    @Body() dto: UpdateUserAdminDto,
    @UploadedFile() avatar?: Express.Multer.File,
  ) {
    return this.usersService.updateUser(id, dto, avatar);
  }

  @Patch(':id/status')
  @RequirePermissions('SO_C_USER_UPDATE')
  toggleStatus(@Param('id') id: string) {
    return this.usersService.toggleUserStatus(id);
  }
  @Patch(':id/reset-password')
  @RequirePermissions('SO_C_USER_UPDATE')
  adminResetPassword(
    @Param('id') id: string,
    @Body() dto: ResetPasswordAdminDto,
  ) {
    return this.usersService.adminResetPassword(id, dto);
  }

  @Delete(':id')
  @RequirePermissions('SO_C_USER_DELETE')
  removeUser(@Param('id') id: string, @Request() req: AuthRequest) {
    return this.usersService.deleteUser(id, req.user);
  }
}
