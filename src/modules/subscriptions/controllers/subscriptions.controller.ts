import {
  Body,
  Controller,
  Get,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { SubscriptionsService } from '../services/subscriptions.service';
import {
  SubscriptionPlansService,
  toPlanDto,
} from '../services/subscription-plans.service';
import { SubscribeDto } from '../dto/subscribe.dto';
import { CancelSubscriptionDto } from '../dto/cancel-subscription.dto';
import { HistoryQueryDto } from '../dto/history-query.dto';

@ApiTags('Subscriptions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('subscriptions')
export class SubscriptionsController {
  constructor(
    private readonly subscriptionsService: SubscriptionsService,
    private readonly plansService: SubscriptionPlansService,
  ) {}

  @Get('plans')
  @ApiOperation({ summary: 'List all active plans with isCurrent flag' })
  async listPlans(@CurrentUser('sub') userId: string) {
    const [plans, current] = await Promise.all([
      this.plansService.listActive(),
      this.subscriptionsService.getActivePlan(userId).catch(() => null),
    ]);

    return {
      data: plans.map((p) => ({
        ...toPlanDto(p),
        isCurrent: current?.code === p.code,
      })),
    };
  }

  @Get('my')
  @ApiOperation({
    summary: 'Get current subscription (lazy creates free if none)',
  })
  getCurrent(@CurrentUser('sub') userId: string) {
    return this.subscriptionsService
      .getCurrent(userId)
      .then((data) => ({ data }));
  }

  @Post('subscribe')
  @ApiOperation({ summary: 'Subscribe or change to a new plan' })
  subscribe(@CurrentUser('sub') userId: string, @Body() dto: SubscribeDto) {
    return this.subscriptionsService
      .subscribe(userId, dto.planCode)
      .then((data) => ({ data }));
  }

  @Put('cancel')
  @ApiOperation({ summary: 'Cancel current subscription (reverts to free)' })
  cancel(
    @CurrentUser('sub') userId: string,
    @Body() dto: CancelSubscriptionDto,
  ) {
    return this.subscriptionsService
      .cancel(userId, dto.reason)
      .then((data) => ({ data }));
  }

  @Get('history')
  @ApiOperation({ summary: 'Subscription change history (newest first)' })
  async history(
    @CurrentUser('sub') userId: string,
    @Query() query: HistoryQueryDto,
  ) {
    const { data, total } = await this.subscriptionsService.getHistory(
      userId,
      query.page ?? 1,
      query.pageSize ?? 20,
    );
    return {
      data: data.map((e) => ({
        id: e.id,
        eventType: e.eventType,
        fromPlan: e.fromPlan
          ? { code: e.fromPlan.code, name: e.fromPlan.name }
          : null,
        toPlan: e.toPlan ? { code: e.toPlan.code, name: e.toPlan.name } : null,
        createdAt: e.createdAt,
      })),
      meta: {
        total,
        page: query.page ?? 1,
        pageSize: query.pageSize ?? 20,
        pages: Math.ceil(total / (query.pageSize ?? 20)),
      },
    };
  }
}
