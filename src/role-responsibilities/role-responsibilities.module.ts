import { Module } from '@nestjs/common';
import { RoleResponsibilitiesController } from './role-responsibilities.controller';
import { RoleResponsibilitiesService } from './role-responsibilities.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [RoleResponsibilitiesController],
  providers: [RoleResponsibilitiesService],
  exports: [RoleResponsibilitiesService],
})
export class RoleResponsibilitiesModule {}
