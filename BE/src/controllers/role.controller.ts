import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Request,
  ParseIntPipe,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RoleService } from '../services/role.service';
import {
  PermissionsGuard,
  RequirePermissions,
} from '../guards/permissions.guard';
import {
  CreateRoleDto,
  UpdateRoleDto,
} from '../../libs/shared/models/role.dto';

interface AuthRequest {
  user: { userId: string; username: string; role: string };
}

@Controller('roles')
export class RoleController {
  constructor(private readonly service: RoleService) {}

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @RequirePermissions('SO_C_ROLE_CREATE')
  create(@Body() dto: CreateRoleDto) {
    return this.service.create(dto);
  }

  @Put(':id')
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @RequirePermissions('SO_C_ROLE_UPDATE')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateRoleDto,
    @Request() req: AuthRequest,
  ) {
    return this.service.update(id, dto, req.user);
  }

  @Delete(':id')
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @RequirePermissions('SO_C_ROLE_DELETE')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}
