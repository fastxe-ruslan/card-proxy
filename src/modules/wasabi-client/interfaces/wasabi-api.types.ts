
export interface WasabiResponse<T> {
  code: string;
  msg: string;
  data: T;
}

// ─── Holder ──────────────────────────────────────────────────────────────────

export interface CreatePersonalHolderRequest {
  programId: string;
  firstName: string;
  lastName: string;
  mobile: string;
  email: string;
  birthday: string; // YYYY-MM-DD
  idType: string;
  idNo: string;
  nationality: string;
  country: string;
  address: string;
  city?: string;
  state?: string;
  postalCode?: string;
}

export interface CreatePersonalHolderV2Request extends CreatePersonalHolderRequest {
  middleName?: string;
  occupation?: string;
  sourceOfFunds?: string;
}

export interface CreateBusinessHolderRequest {
  programId: string;
  companyName: string;
  registrationNo: string;
  registrationCountry: string;
  address: string;
  city?: string;
  state?: string;
  postalCode?: string;
  contactName: string;
  contactMobile: string;
  contactEmail: string;
}

export interface UpdatePersonalHolderRequest {
  holderId: string;
  mobile?: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  postalCode?: string;
}

export interface UpdateBusinessHolderRequest {
  holderId: string;
  address?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  contactName?: string;
  contactMobile?: string;
  contactEmail?: string;
}

export interface QueryHolderRequest {
  holderId?: string;
  programId?: string;
  email?: string;
  idNo?: string;
  pageNum?: number;
  pageSize?: number;
}

export interface HolderInfo {
  holderId: string;
  programId: string;
  holderType: 'personal' | 'business';
  status: string;
  firstName?: string;
  lastName?: string;
  companyName?: string;
  email: string;
  mobile: string;
  createdAt: string;
  updatedAt: string;
}

export interface HolderListResponse {
  total: number;
  records: HolderInfo[];
}

// ─── Card ─────────────────────────────────────────────────────────────────────

export interface OpenCardRequest {
  programId: string;
  holderId: string;
  cardType?: string;
  currency?: string;
  cardAlias?: string;
}

export interface CardInfo {
  cardId: string;
  holderId: string;
  programId: string;
  last4: string;
  cardType: string;
  status: string;
  currency: string;
  balance: string;
  createdAt: string;
  expireDate?: string;
}

export interface ActivatePhysicalCardRequest {
  cardId: string;
  last4: string;
}

export interface GetCardSensitiveRequest {
  cardId: string;
}

export interface CardSensitiveDetails {
  cardId: string;
  cardNumber: string; // PAN — must be masked in logs
  cvv: string; // must be masked in logs
  expireDate: string;
  holderName: string;
}

export interface GetCardInfoRequest {
  cardId: string;
}

// ─── Operations ──────────────────────────────────────────────────────────────

export interface DepositRequest {
  cardId: string;
  amount: string;
  currency: string;
  remark?: string;
}

export interface DepositResponse {
  orderId: string;
  cardId: string;
  amount: string;
  currency: string;
  status: string;
}

export interface FreezeCardRequest {
  cardId: string;
  reason?: string;
}

export interface UnfreezeCardRequest {
  cardId: string;
}

export interface SetPinRequest {
  cardId: string;
  pin: string; // must be masked in logs
}

export interface GetAuthTransactionsRequest {
  cardId?: string;
  startDate?: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD
  pageNum?: number;
  pageSize?: number;
}

export interface AuthTransaction {
  transactionId: string;
  cardId: string;
  amount: string;
  currency: string;
  merchantName?: string;
  merchantCategory?: string;
  status: string;
  transactionType: string;
  createdAt: string;
}

export interface AuthTransactionListResponse {
  total: number;
  records: AuthTransaction[];
}

// ─── Files ────────────────────────────────────────────────────────────────────

export interface UploadDocumentRequest {
  holderId: string;
  documentType: string;
  file: Buffer;
  fileName: string;
  mimeType: string;
}

export interface UploadDocumentResponse {
  fileId: string;
  holderId: string;
  documentType: string;
  status: string;
}

// ─── Account ─────────────────────────────────────────────────────────────────

export interface GetProviderBalanceRequest {
  programId: string;
}

export interface ProviderBalanceInfo {
  programId: string;
  currency: string;
  availableBalance: string;
  totalBalance: string;
  frozenBalance: string;
  updatedAt: string;
}
