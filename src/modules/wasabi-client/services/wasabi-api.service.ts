import { Injectable } from '@nestjs/common';
import { WasabiHttpService, WasabiRequestOptions } from './wasabi-http.service';
import {
  ActivatePhysicalCardRequest,
  AuthTransactionListResponse,
  CardInfo,
  CardSensitiveDetails,
  CreateBusinessHolderRequest,
  CreatePersonalHolderRequest,
  CreatePersonalHolderV2Request,
  DepositRequest,
  DepositResponse,
  FreezeCardRequest,
  GetAuthTransactionsRequest,
  GetCardInfoRequest,
  GetCardSensitiveRequest,
  HolderInfo,
  HolderListResponse,
  OpenCardRequest,
  WasabiAccountAsset,
  QueryHolderRequest,
  SetPinRequest,
  UnfreezeCardRequest,
  UpdateBusinessHolderRequest,
  UpdatePersonalHolderRequest,
  UploadDocumentRequest,
  UploadDocumentResponse,
} from '../interfaces/wasabi-api.types';

@Injectable()
export class WasabiApiService {
  constructor(private readonly http: WasabiHttpService) {}

  createPersonalHolder(
    dto: CreatePersonalHolderRequest,
    opts?: WasabiRequestOptions,
  ): Promise<HolderInfo> {
    return this.http.post(
      'createPersonalHolder',
      '/merchant/core/mcb/card/holder/create',
      dto,
      opts,
    );
  }

  createPersonalHolderV2(
    dto: CreatePersonalHolderV2Request,
    opts?: WasabiRequestOptions,
  ): Promise<HolderInfo> {
    return this.http.post(
      'createPersonalHolderV2',
      '/merchant/core/mcb/card/holder/v2/create',
      dto,
      opts,
    );
  }

  createBusinessHolder(
    dto: CreateBusinessHolderRequest,
    opts?: WasabiRequestOptions,
  ): Promise<HolderInfo> {
    return this.http.post(
      'createBusinessHolder',
      '/merchant/core/mcb/card/holder/create',
      dto,
      opts,
    );
  }

  createBusinessHolderV2(
    dto: CreateBusinessHolderRequest,
    opts?: WasabiRequestOptions,
  ): Promise<HolderInfo> {
    return this.http.post(
      'createBusinessHolderV2',
      '/merchant/core/mcb/card/holder/v2/create',
      dto,
      opts,
    );
  }

  updatePersonalHolder(
    dto: UpdatePersonalHolderRequest,
    opts?: WasabiRequestOptions,
  ): Promise<HolderInfo> {
    return this.http.post(
      'updatePersonalHolder',
      '/merchant/core/mcb/card/holder/update',
      dto,
      opts,
    );
  }

  updatePersonalHolderV2(
    dto: UpdatePersonalHolderRequest,
    opts?: WasabiRequestOptions,
  ): Promise<HolderInfo> {
    return this.http.post(
      'updatePersonalHolderV2',
      '/merchant/core/mcb/card/holder/v2/update',
      dto,
      opts,
    );
  }

  updateBusinessHolder(
    dto: UpdateBusinessHolderRequest,
    opts?: WasabiRequestOptions,
  ): Promise<HolderInfo> {
    return this.http.post(
      'updateBusinessHolder',
      '/merchant/core/mcb/card/holder/update',
      dto,
      opts,
    );
  }

  updateBusinessHolderV2(
    dto: UpdateBusinessHolderRequest,
    opts?: WasabiRequestOptions,
  ): Promise<HolderInfo> {
    return this.http.post(
      'updateBusinessHolderV2',
      '/merchant/core/mcb/card/holder/v2/update',
      dto,
      opts,
    );
  }

  queryHolder(
    dto: QueryHolderRequest,
    opts?: WasabiRequestOptions,
  ): Promise<HolderListResponse> {
    return this.http.post(
      'queryHolder',
      '/merchant/core/mcb/card/holder/query',
      dto,
      opts,
    );
  }

  openCard(
    dto: OpenCardRequest,
    opts?: WasabiRequestOptions,
  ): Promise<CardInfo> {
    return this.http.post(
      'openCard',
      '/merchant/core/mcb/card/openCard',
      dto,
      opts,
    );
  }

  activatePhysicalCard(
    dto: ActivatePhysicalCardRequest,
    opts?: WasabiRequestOptions,
  ): Promise<CardInfo> {
    return this.http.post(
      'activatePhysicalCard',
      '/merchant/core/mcb/card/physicalCard/activeCard',
      dto,
      opts,
    );
  }

  getCardSensitiveDetails(
    dto: GetCardSensitiveRequest,
    opts?: WasabiRequestOptions,
  ): Promise<CardSensitiveDetails> {
    return this.http.post(
      'getCardSensitiveDetails',
      '/merchant/core/mcb/card/sensitive',
      dto,
      opts,
    );
  }

  getCardInfo(
    dto: GetCardInfoRequest,
    opts?: WasabiRequestOptions,
  ): Promise<CardInfo> {
    return this.http.post(
      'getCardInfo',
      '/merchant/core/mcb/card/info',
      dto,
      opts,
    );
  }

  depositToCard(
    dto: DepositRequest,
    opts?: WasabiRequestOptions,
  ): Promise<DepositResponse> {
    return this.http.post(
      'depositToCard',
      '/merchant/core/mcb/card/deposit',
      dto,
      opts,
    );
  }

  freezeCard(
    dto: FreezeCardRequest,
    opts?: WasabiRequestOptions,
  ): Promise<CardInfo> {
    return this.http.post(
      'freezeCard',
      '/merchant/core/mcb/card/v2/freeze',
      dto,
      opts,
    );
  }

  unfreezeCard(
    dto: UnfreezeCardRequest,
    opts?: WasabiRequestOptions,
  ): Promise<CardInfo> {
    return this.http.post(
      'unfreezeCard',
      '/merchant/core/mcb/card/v2/unfreeze',
      dto,
      opts,
    );
  }

  setPin(dto: SetPinRequest, opts?: WasabiRequestOptions): Promise<void> {
    return this.http.post(
      'setPin',
      '/merchant/core/mcb/card/physicalCard/updatePin',
      dto,
      opts,
    );
  }

  getAuthTransactions(
    dto: GetAuthTransactionsRequest,
    opts?: WasabiRequestOptions,
  ): Promise<AuthTransactionListResponse> {
    return this.http.post(
      'getAuthTransactions',
      '/merchant/core/mcb/card/authTransaction',
      dto,
      opts,
    );
  }

  async uploadDocument(
    dto: UploadDocumentRequest,
    opts?: WasabiRequestOptions,
  ): Promise<UploadDocumentResponse> {
    const form = new FormData();
    form.append('category', dto.category ?? 'card');
    form.append(
      'file',
      new Blob([dto.file.buffer as ArrayBuffer], { type: dto.mimeType }),
      dto.fileName,
    );
    return this.http.postForm(
      'uploadDocument',
      '/merchant/core/mcb/common/file/upload',
      form,
      opts,
    );
  }

  getProviderBalance(
    opts?: WasabiRequestOptions,
  ): Promise<WasabiAccountAsset[]> {
    return this.http.post(
      'getProviderBalance',
      '/merchant/core/mcb/account/info',
      {},
      opts,
    );
  }
}
