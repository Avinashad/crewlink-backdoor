import { Module } from '@nestjs/common';
import { ExpertiseController } from './expertise.controller';
import { ExpertiseService } from './expertise.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [ExpertiseController],
  providers: [ExpertiseService],
  exports: [ExpertiseService],
})
export class ExpertiseModule {}
