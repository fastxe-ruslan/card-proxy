
export interface WasabiWebhookEnvelope {
  eventId: string;
  eventType: WasabiWebhookEventType;
  programId: string;
  createdAt: string;
  data: unknown;
}

export enum WasabiWebhookEventType {
  CardTransaction = 'card_transaction',
  CardAuthTransaction = 'card_auth_transaction',
  CardFeePatch = 'card_fee_patch',
  Card3ds = 'card_3ds',
  CardHolder = 'card_holder',
  PhysicalCard = 'physical_card',
  Work = 'work',
  WalletTransaction = 'wallet_transaction',
}


export interface WasabiCardTransactionEvent {
  orderNo: string;
  merchantOrderNo: string;
  cardNo: string;
  amount: string;
  fee?: string;
  receivedAmount?: string;
  currency: string;
  type: string; 
  status: string; 
  transactionTime: number; 
}


export interface MerchantData {
  name: string;
  category?: string;
  country?: string;
  city?: string;
}

export interface WasabiCardAuthTransactionEvent {
  cardNo: string;
  tradeNo: string;
  originTradeNo?: string;
  amount: string;
  authorizedAmount?: string;
  fee?: string;
  crossBoardFee?: string;
  settleAmount?: string;
  merchantName?: string;
  merchantData?: MerchantData;
  type: string;
  status: string;
  transactionTime: number;
  settleDate?: string;
  currency: string;
}


export interface WasabiCardFeePatchEvent {
  cardNo: string;
  tradeNo: string;
  originTradeNo: string;
  amount: string;
  currency: string;
  type: string;
  deductionSourceFunds?: string;
  status: string;
  transactionTime: number;
}


export interface WasabiCard3dsEvent {
  cardNo: string;
  tradeNo: string;
  merchantName?: string;
  values: string;
  type: string;
  amount?: string;
  transactionTime: number;
  expirationTime: number;
  currency?: string;
}


export interface WasabiCardHolderEvent {
  holderId: string;
  cardTypeId?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  status: string;
  description?: string;
  respMsg?: string;
  programId?: string;
  updatedAt?: string;
}


export interface WasabiPhysicalCardEvent {
  merchantOrderNo: string;
  cardNo: string;
  type: string;
  status: string;
  description?: string;
  remark?: string;
}


export interface WasabiWorkOrderEvent {
  merchantOrderNo: string;
  orderNo: string;
  title?: string;
  target?: string;
  content?: string;
  tradeType: string;
  tradeStatus: string;
  description?: string;
  remark?: string;
  createTime?: number;
  updateTime?: number;
}


export interface WasabiWalletTransactionEvent {
  orderNo: string;
  txId?: string;
  chain?: string;
  fromAddress?: string;
  toAddress?: string;
  txAmount: string;
  fee?: string;
  receivedAmount?: string;
  currency: string;
  type: string;
  status: string;
  block?: number;
  confirmTime?: number;
  createTime?: number;
  updateTime?: number;
}
