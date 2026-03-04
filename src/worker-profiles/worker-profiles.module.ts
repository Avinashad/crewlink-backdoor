import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { WorkerProfilesService } from './worker-profiles.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [ConfigModule, AuthModule],
  providers: [WorkerProfilesService],
  exports: [WorkerProfilesService],
})
export class WorkerProfilesModule {}
