import { Module } from '@nestjs/common';
import { JobInquiriesController } from './job-inquiries.controller';
import { JobInquiriesService } from './job-inquiries.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [JobInquiriesController],
  providers: [JobInquiriesService],
  exports: [JobInquiriesService],
})
export class JobInquiriesModule {}
