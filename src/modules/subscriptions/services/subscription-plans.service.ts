import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SubscriptionPlanEntity } from '../entities/subscription-plan.entity';
import { SubscriptionEntity } from '../entities/subscription.entity';
import { SubscriptionStatus } from '../enums/subscription-status.enum';
import { CreatePlanDto } from '../dto/create-plan.dto';

export interface PlanDto {
  id: string;
  code: string;
  name: string;
  description: string | null;
  price: {
    amount: number | null;
    currency: string | null;
    period: string | null;
  };
  features: SubscriptionPlanEntity['featuresJson'];
  isActive: boolean;
  sortOrder: number;
}

export function toPlanDto(plan: SubscriptionPlanEntity): PlanDto {
  return {
    id: plan.id,
    code: plan.code,
    name: plan.name,
    description: plan.description,
    price: {
      amount: plan.priceAmount,
      currency: plan.priceCurrency,
      period: plan.billingPeriod,
    },
    features: plan.featuresJson,
    isActive: plan.isActive,
    sortOrder: plan.sortOrder,
  };
}

@Injectable()
export class SubscriptionPlansService {
  constructor(
    @InjectRepository(SubscriptionPlanEntity)
    private readonly planRepo: Repository<SubscriptionPlanEntity>,
    @InjectRepository(SubscriptionEntity)
    private readonly subRepo: Repository<SubscriptionEntity>,
  ) {}

  async listActive(): Promise<SubscriptionPlanEntity[]> {
    return this.planRepo.find({
      where: { isActive: true },
      order: { sortOrder: 'ASC' },
    });
  }

  async listAll(): Promise<SubscriptionPlanEntity[]> {
    return this.planRepo.find({ order: { sortOrder: 'ASC' } });
  }

  async findByCode(code: string): Promise<SubscriptionPlanEntity> {
    const plan = await this.planRepo.findOneBy({ code, isActive: true });
    if (!plan)
      throw new NotFoundException(`Plan '${code}' not found or not active`);
    return plan;
  }

  async findById(id: string): Promise<SubscriptionPlanEntity> {
    const plan = await this.planRepo.findOneBy({ id });
    if (!plan) throw new NotFoundException('Plan not found');
    return plan;
  }

  async create(dto: CreatePlanDto): Promise<SubscriptionPlanEntity> {
    const existing = await this.planRepo.findOneBy({ code: dto.code });
    if (existing)
      throw new BadRequestException(`Plan code '${dto.code}' already exists`);
    return this.planRepo.save(this.planRepo.create(dto));
  }

  async update(
    id: string,
    dto: Partial<CreatePlanDto>,
  ): Promise<SubscriptionPlanEntity> {
    const plan = await this.findById(id);
    Object.assign(plan, dto);
    return this.planRepo.save(plan);
  }

  async deactivate(id: string): Promise<SubscriptionPlanEntity> {
    const plan = await this.findById(id);
    const activeCount = await this.subRepo.count({
      where: { planId: id, status: SubscriptionStatus.Active },
    });
    if (activeCount > 0) {
      throw new BadRequestException(
        `Cannot deactivate plan: ${activeCount} active subscriber(s)`,
      );
    }
    plan.isActive = false;
    return this.planRepo.save(plan);
  }
}
