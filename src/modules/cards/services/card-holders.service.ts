import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomUUID } from 'crypto';
import { CardholderEntity } from '../entities/cardholder.entity';
import { CreatePersonalHolderDto } from '../dto/create-personal-holder.dto';
import { CreateBusinessHolderDto } from '../dto/create-business-holder.dto';
import { CardholderStatus } from '../enums/holder-status.enum';
import { HolderAccountType, HolderVersion } from '../enums/card-type.enum';
import { HolderStatusMapper } from '../mappers/holder-status.mapper';
import { ApiResponse, ok } from '../dto/api-response';
import { WasabiApiService } from '../../wasabi-client/services/wasabi-api.service';
import { AuditService } from '../../audit/audit.service';
import type {
  CreatePersonalHolderRequest,
  CreatePersonalHolderV2Request,
  CreateBusinessHolderRequest,
} from '../../wasabi-client/interfaces/wasabi-api.types';

export interface CardholderDto {
  id: string;
  userId: string;
  wasabiHolderId: string | null;
  status: CardholderStatus;
  statusReason: string | null;
  accountType: HolderAccountType;
  version: HolderVersion;
  programId: string;
  createdAt: Date;
}

interface RequestMeta {
  ip?: string;
  userAgent?: string;
}

function toDto(e: CardholderEntity): CardholderDto {
  return {
    id: e.id,
    userId: e.userId,
    wasabiHolderId: e.wasabiHolderId,
    status: e.status,
    statusReason: e.statusReason,
    accountType: e.accountType,
    version: e.version,
    programId: e.programId,
    createdAt: e.createdAt,
  };
}

@Injectable()
export class CardHoldersService {
  private readonly logger = new Logger(CardHoldersService.name);

  constructor(
    @InjectRepository(CardholderEntity)
    private readonly holderRepo: Repository<CardholderEntity>,
    private readonly wasabiApi: WasabiApiService,
    private readonly auditService: AuditService,
  ) {}

  async createPersonal(
    userId: string,
    dto: CreatePersonalHolderDto,
    meta: RequestMeta = {},
  ): Promise<ApiResponse<CardholderDto>> {
    const existing = await this.holderRepo.findOne({
      where: { userId, accountType: HolderAccountType.Personal },
    });

    if (existing && HolderStatusMapper.isApproved(existing.status)) {
      this.logger.log(
        `Holder ${existing.id} already approved for user ${userId}`,
      );
      return ok(toDto(existing));
    }

    const merchantOrderNo = randomUUID();
    const version = dto.version ?? HolderVersion.V1;

    const wasabiResult = await this.callCreateOrUpdatePersonal(
      existing,
      dto,
      merchantOrderNo,
      version,
    );
    const status = HolderStatusMapper.fromWasabi(wasabiResult.status);

    const holder = await this.holderRepo.save(
      this.holderRepo.create({
        ...(existing ?? {}),
        id: existing?.id,
        userId,
        wasabiHolderId: wasabiResult.holderId,
        wasabiMerchantOrderNo: existing
          ? existing.wasabiMerchantOrderNo
          : merchantOrderNo,
        status,
        statusReason: null,
        accountType: HolderAccountType.Personal,
        version,
        programId: dto.programId,
      }),
    );

    this.auditService.log({
      actorId: userId,
      actorType: 'user',
      action: 'cardholder.create',
      entityType: 'cardholder',
      entityId: holder.id,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return ok(toDto(holder));
  }

  async createBusiness(
    userId: string,
    dto: CreateBusinessHolderDto,
    meta: RequestMeta = {},
  ): Promise<ApiResponse<CardholderDto>> {
    const existing = await this.holderRepo.findOne({
      where: { userId, accountType: HolderAccountType.Business },
    });

    if (existing && HolderStatusMapper.isApproved(existing.status)) {
      return ok(toDto(existing));
    }

    const merchantOrderNo = randomUUID();
    const version = dto.version ?? HolderVersion.V1;

    const wasabiReq: CreateBusinessHolderRequest = {
      programId: dto.programId,
      companyName: dto.companyName,
      registrationNo: dto.registrationNumber,
      registrationCountry: dto.registrationCountry,
      address: dto.address,
      city: dto.city,
      state: dto.state,
      postalCode: dto.postalCode,
      contactName: dto.contactName,
      contactMobile: dto.contactMobile,
      contactEmail: dto.contactEmail,
    };

    const wasabiResult = existing?.wasabiHolderId
      ? await this.wasabiApi.updateBusinessHolder({
          holderId: existing.wasabiHolderId,
          ...wasabiReq,
        })
      : version === HolderVersion.V2
        ? await this.wasabiApi.createBusinessHolderV2(wasabiReq)
        : await this.wasabiApi.createBusinessHolder(wasabiReq);

    const status = HolderStatusMapper.fromWasabi(wasabiResult.status);

    const holder = await this.holderRepo.save(
      this.holderRepo.create({
        ...(existing ?? {}),
        id: existing?.id,
        userId,
        wasabiHolderId: wasabiResult.holderId,
        wasabiMerchantOrderNo: existing
          ? existing.wasabiMerchantOrderNo
          : merchantOrderNo,
        status,
        statusReason: null,
        accountType: HolderAccountType.Business,
        version,
        programId: dto.programId,
      }),
    );

    this.auditService.log({
      actorId: userId,
      actorType: 'user',
      action: 'cardholder.create',
      entityType: 'cardholder',
      entityId: holder.id,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return ok(toDto(holder));
  }

  async getStatus(
    userId: string,
    holderId: string,
    refresh = false,
  ): Promise<
    ApiResponse<{ status: CardholderStatus; statusReason: string | null }>
  > {
    const holder = await this.holderRepo.findOne({ where: { id: holderId } });
    if (!holder) throw new NotFoundException('Cardholder not found');
    if (holder.userId !== userId) throw new ForbiddenException('Access denied');

    if (refresh && holder.wasabiHolderId) {
      const result = await this.wasabiApi.queryHolder({
        holderId: holder.wasabiHolderId,
      });
      const first = result.records?.[0];
      if (first) {
        holder.status = HolderStatusMapper.fromWasabi(first.status);
        await this.holderRepo.save(holder);
      }
    }

    return ok({ status: holder.status, statusReason: holder.statusReason });
  }

  private async callCreateOrUpdatePersonal(
    existing: CardholderEntity | null,
    dto: CreatePersonalHolderDto,
    merchantOrderNo: string,
    version: HolderVersion,
  ) {
    const base: CreatePersonalHolderRequest = {
      programId: dto.programId,
      firstName: dto.firstName,
      lastName: dto.lastName,
      mobile: `${dto.areaCode}${dto.mobile}`,
      email: dto.email,
      birthday: dto.dateOfBirth,
      idType: dto.documentType,
      idNo: dto.documentId,
      nationality: dto.nationality,
      country: dto.country,
      address: dto.address.line1,
      city: dto.address.city,
      state: dto.address.state,
      postalCode: dto.address.postalCode,
    };

    if (existing?.wasabiHolderId) {
      return version === HolderVersion.V2
        ? this.wasabiApi.updatePersonalHolderV2({
            holderId: existing.wasabiHolderId,
            ...base,
          })
        : this.wasabiApi.updatePersonalHolder({
            holderId: existing.wasabiHolderId,
            ...base,
          });
    }

    const v2Req: CreatePersonalHolderV2Request = {
      ...base,
      occupation: dto.occupation,
      sourceOfFunds: dto.accountPurpose,
    };

    return version === HolderVersion.V2
      ? this.wasabiApi.createPersonalHolderV2(v2Req)
      : this.wasabiApi.createPersonalHolder(base);
  }
}
