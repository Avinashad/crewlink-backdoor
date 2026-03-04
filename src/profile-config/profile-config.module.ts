import { Module } from '@nestjs/common';
import { ProfileConfigController } from './profile-config.controller';
import { ProfileConfigService } from './profile-config.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [ProfileConfigController],
  providers: [ProfileConfigService],
  exports: [ProfileConfigService],
})
export class ProfileConfigModule {}
