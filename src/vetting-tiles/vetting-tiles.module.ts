import { Module } from '@nestjs/common';
import { VettingTilesController } from './vetting-tiles.controller';
import { VettingTilesService } from './vetting-tiles.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [VettingTilesController],
  providers: [VettingTilesService],
  exports: [VettingTilesService],
})
export class VettingTilesModule {}
