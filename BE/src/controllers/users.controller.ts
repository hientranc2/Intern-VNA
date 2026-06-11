import { Controller, Get, Post, Put, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { UsersService } from '../services/users.service';
import { GetUsersFilterDto, CreateUserAdminDto, UpdateUserAdminDto, ResetPasswordAdminDto } from '../dtos/user-admin.dto';
@Controller('admin/users')
@UseGuards(AuthGuard('jwt')) 
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  getUsers(@Query() filterDto: GetUsersFilterDto) {
    return this.usersService.getUsers(filterDto);
  }

  @Post()
  createUser(@Body() dto: CreateUserAdminDto) {
    return this.usersService.createUser(dto);
  }

  @Put(':id')
  updateUser(@Param('id') id: string, @Body() dto: UpdateUserAdminDto) {
    return this.usersService.updateUser(id, dto);
  }

  @Patch(':id/status')
  toggleStatus(@Param('id') id: string) {
    return this.usersService.toggleUserStatus(id);
  }
  @Patch(':id/reset-password')
  adminResetPassword(@Param('id') id: string, @Body() dto: ResetPasswordAdminDto) {
    return this.usersService.adminResetPassword(id, dto);
  }
}