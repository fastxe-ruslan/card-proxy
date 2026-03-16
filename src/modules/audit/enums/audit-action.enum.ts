export enum AuditAction {
  // Auth
  UserRegister = 'user.register',
  UserLogin = 'user.login',
  UserLoginFailed = 'user.login_failed',
  UserSocialLogin = 'user.social_login',
  UserEmailVerified = 'user.email_verified',
  UserTokenRefreshed = 'user.token_refreshed',
  UserLogout = 'user.logout',
  UserLogoutAll = 'user.logout_all',
  UserTokenReuseDetected = 'user.token_reuse_detected',

  // Cardholder
  CardholderCreate = 'cardholder.create',
  CardholderUpdate = 'cardholder.update',
  CardholderStatusChanged = 'cardholder.status_changed',

  // Documents
  DocumentsUpload = 'documents.upload',
  DocumentsUploadPartialFail = 'documents.upload_partial_fail',

  // Card
  CardApply = 'card.apply',
  CardActivate = 'card.activate',
  CardSensitiveDetailsRequested = 'card.sensitive_details_requested',
  CardBalanceChecked = 'card.balance_checked',
  CardFreeze = 'card.freeze',
  CardUnfreeze = 'card.unfreeze',
  CardLock = 'card.lock',
  CardUnlock = 'card.unlock',
  CardTopup = 'card.topup',
  CardPinSet = 'card.pin_set',
  CardTransactionsFetched = 'card.transactions_fetched',

  // Webhooks
  WebhookReceived = 'webhook.received',
  WebhookCardTransaction = 'webhook.card_transaction',
  WebhookCardAuthTransaction = 'webhook.card_auth_transaction',
  WebhookCardFeePatch = 'webhook.card_fee_patch',
  WebhookCard3ds = 'webhook.card_3ds',
  WebhookCardHolder = 'webhook.card_holder',
  WebhookPhysicalCard = 'webhook.physical_card',
  WebhookWork = 'webhook.work',
  WebhookWalletTransaction = 'webhook.wallet_transaction',
  WebhookDuplicate = 'webhook.duplicate',
  WebhookFailed = 'webhook.failed',
  WebhookReplayed = 'webhook.replayed',

  // Provider
  ProviderBalanceChecked = 'provider.balance_checked',

  // Admin
  AdminWebhookReplayed = 'admin.webhook_replayed',
  AdminCredentialUpdated = 'admin.credential_updated',
}
