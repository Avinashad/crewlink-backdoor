import { Module } from '@nestjs/common';
import { DocumentConfigController } from './document-config.controller';
import { DocumentConfigService } from './document-config.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [DocumentConfigController],
  providers: [DocumentConfigService],
  exports: [DocumentConfigService],
})
export class DocumentConfigModule {}
