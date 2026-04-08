import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WasabiRequestLogEntity } from './entities/wasabi-request-log.entity';
import { WasabiSigningService } from './services/wasabi-signing.service';
import { WasabiCredentialService } from './services/wasabi-credential.service';
import { WasabiHttpService } from './services/wasabi-http.service';
import { WasabiApiService } from './services/wasabi-api.service';

@Module({
  imports: [
    HttpModule,
    TypeOrmModule.forFeature([WasabiRequestLogEntity]),
  ],
  providers: [
    WasabiSigningService,
    WasabiCredentialService,
    WasabiHttpService,
    WasabiApiService,
  ],
  exports: [WasabiApiService, WasabiSigningService, WasabiCredentialService],
})
export class WasabiClientModule {}
