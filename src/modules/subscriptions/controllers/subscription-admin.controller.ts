import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import {
  SubscriptionPlansService,
  toPlanDto,
} from '../services/subscription-plans.service';
import { AuditService } from '../../audit/audit.service';
import { AuditAction } from '../../audit/enums/audit-action.enum';
import { ActorType } from '../../audit/enums/actor-type.enum';
import { CreatePlanDto } from '../dto/create-plan.dto';
import { SubscriptionEntity } from '../entities/subscription.entity';
import { SubscriptionStatus } from '../enums/subscription-status.enum';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';

class UsersQueryDto {
  @ApiPropertyOptional({ description: 'Filter by plan code' })
  @IsOptional()
  planCode?: string;

  @ApiPropertyOptional({ enum: SubscriptionStatus })
  @IsOptional()
  @IsEnum(SubscriptionStatus)
  status?: SubscriptionStatus;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number = 20;
}

@ApiTags('Admin — Subscriptions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@Controller('internal/subscriptions')
export class SubscriptionAdminController {
  constructor(
    private readonly plansService: SubscriptionPlansService,
    private readonly auditService: AuditService,
    @InjectRepository(SubscriptionEntity)
    private readonly subRepo: Repository<SubscriptionEntity>,
  ) {}

  @Get('plans')
  @ApiOperation({ summary: 'List all plans including inactive (admin)' })
  async listAll() {
    const plans = await this.plansService.listAll();
    return { data: plans.map(toPlanDto) };
  }

  @Post('plans')
  @ApiOperation({ summary: 'Create a new subscription plan' })
  async create(
    @CurrentUser('sub') adminId: string,
    @Body() dto: CreatePlanDto,
  ) {
    const plan = await this.plansService.create(dto);
    this.auditService.log({
      action: AuditAction.AdminCredentialUpdated,
      actorType: ActorType.Admin,
      actorId: adminId,
      entityType: 'subscription_plan',
      entityId: plan.id,
      after: { code: plan.code, name: plan.name },
    });
    return { data: toPlanDto(plan) };
  }

  @Put('plans/:id')
  @ApiOperation({
    summary: 'Update plan details (features, price, description)',
  })
  async update(
    @CurrentUser('sub') adminId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: Partial<CreatePlanDto>,
  ) {
    const before = await this.plansService.findById(id);
    const plan = await this.plansService.update(id, dto);
    this.auditService.log({
      action: AuditAction.AdminCredentialUpdated,
      actorType: ActorType.Admin,
      actorId: adminId,
      entityType: 'subscription_plan',
      entityId: plan.id,
      before: { code: before.code, priceAmount: before.priceAmount },
      after: { code: plan.code, priceAmount: plan.priceAmount },
    });
    return { data: toPlanDto(plan) };
  }

  @Put('plans/:id/deactivate')
  @ApiOperation({
    summary: 'Deactivate a plan (fails if active subscribers exist)',
  })
  async deactivate(
    @CurrentUser('sub') adminId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const plan = await this.plansService.deactivate(id);
    this.auditService.log({
      action: AuditAction.AdminCredentialUpdated,
      actorType: ActorType.Admin,
      actorId: adminId,
      entityType: 'subscription_plan',
      entityId: plan.id,
      after: { isActive: false },
    });
    return { data: toPlanDto(plan) };
  }

  @Get('users')
  @ApiOperation({ summary: 'List users with their subscriptions' })
  async listUsers(@Query() query: UsersQueryDto) {
    const { page = 1, pageSize = 20, status, planCode } = query;

    const qb = this.subRepo
      .createQueryBuilder('s')
      .leftJoinAndSelect('s.plan', 'plan')
      .orderBy('s.createdAt', 'DESC');

    if (status) qb.andWhere('s.status = :status', { status });
    if (planCode) qb.andWhere('plan.code = :planCode', { planCode });

    const total = await qb.getCount();
    const records = await qb
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getMany();

    return {
      data: records.map((s) => ({
        userId: s.userId,
        subscriptionId: s.id,
        status: s.status,
        planCode: s.plan.code,
        planName: s.plan.name,
        startedAt: s.startedAt,
        endsAt: s.endsAt,
      })),
      meta: { total, page, pageSize, pages: Math.ceil(total / pageSize) },
    };
  }
}
