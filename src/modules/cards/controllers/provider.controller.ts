import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { AuditService } from '../../audit/audit.service';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { WasabiApiService } from '../../wasabi-client/services/wasabi-api.service';
import { ConfigService } from '@nestjs/config';
import {
  ApiProviderTag,
  ApiGetProviderBalance,
} from '../docs/provider.controller.docs';

@ApiProviderTag()
@Controller('provider')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ProviderController {
  constructor(
    private readonly wasabiApi: WasabiApiService,
    private readonly auditService: AuditService,
    private readonly configService: ConfigService,
  ) {}

  @ApiGetProviderBalance()
  @Get('balance')
  @Roles('admin', 'internal')
  async getProviderBalance(@CurrentUser('sub') userId: string) {
    const programId = this.configService.get<string>('WASABI_PROGRAM_ID');

    const result = await this.wasabiApi.getProviderBalance({ programId });

    this.auditService.log({
      actorId: userId,
      actorType: 'user',
      action: 'provider.balance_checked',
    });

    return { data: result };
  }
}
