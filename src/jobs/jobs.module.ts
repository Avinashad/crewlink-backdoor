import { Module } from '@nestjs/common';
import { JobsController } from './jobs.controller';
import { JobsService } from './jobs.service';
import { AuthModule } from '../auth/auth.module';
import { RoleResponsibilitiesModule } from '../role-responsibilities/role-responsibilities.module';

@Module({
  imports: [AuthModule, RoleResponsibilitiesModule],
  controllers: [JobsController],
  providers: [JobsService],
  exports: [JobsService],
})
export class JobsModule {}
