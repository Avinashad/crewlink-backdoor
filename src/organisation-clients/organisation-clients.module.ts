import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { OrganisationClientsService } from './organisation-clients.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [ConfigModule, forwardRef(() => AuthModule)],
  providers: [OrganisationClientsService],
  exports: [OrganisationClientsService],
})
export class OrganisationClientsModule {}
