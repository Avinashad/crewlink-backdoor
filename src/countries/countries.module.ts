import { Module } from '@nestjs/common';
import { CountriesController } from './countries.controller';
import { CountriesService } from './countries.service';
import { AuthModule } from '../auth/auth.module';
import { GeoIpModule } from '../geoip/geoip.module';

@Module({
  imports: [AuthModule, GeoIpModule],
  controllers: [CountriesController],
  providers: [CountriesService],
  exports: [CountriesService],
})
export class CountriesModule {}
