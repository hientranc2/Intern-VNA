import { Controller, Get } from '@nestjs/common';
import { PermissionService } from '../services/permission.service';

@Controller('permissions')
export class PermissionController {
  constructor(private readonly service: PermissionService) {}

  @Get()
  findAll() {
    return this.service.findAll();
  }
}
