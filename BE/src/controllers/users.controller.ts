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
  UseGuards,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor } from '@nestjs/platform-express';
import { UsersService } from '../services/users.service';
import { avatarMulterOptions } from '../config/avatar-upload.config';
import {
  GetUsersFilterDto,
  CreateUserAdminDto,
  UpdateUserAdminDto,
  ResetPasswordAdminDto,
} from '../dtos/user-admin.dto';
@Controller('admin/users')
@UseGuards(AuthGuard('jwt'))
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  getUsers(@Query() filterDto: GetUsersFilterDto) {
    return this.usersService.getUsers(filterDto);
  }

  @Post()
  @UseInterceptors(FileInterceptor('avatar', avatarMulterOptions))
  createUser(
    @Body() dto: CreateUserAdminDto,
    @UploadedFile() avatar?: Express.Multer.File,
  ) {
    return this.usersService.createUser(dto, avatar);
  }

  @Put(':id')
  @UseInterceptors(FileInterceptor('avatar', avatarMulterOptions))
  updateUser(
    @Param('id') id: string,
    @Body() dto: UpdateUserAdminDto,
    @UploadedFile() avatar?: Express.Multer.File,
  ) {
    return this.usersService.updateUser(id, dto, avatar);
  }

  @Patch(':id/status')
  toggleStatus(@Param('id') id: string) {
    return this.usersService.toggleUserStatus(id);
  }
  @Patch(':id/reset-password')
  adminResetPassword(
    @Param('id') id: string,
    @Body() dto: ResetPasswordAdminDto,
  ) {
    return this.usersService.adminResetPassword(id, dto);
  }

  @Delete(':id')
  removeUser(@Param('id') id: string) {
    return this.usersService.deleteUser(id);
  }
}
