export const ROUTES = {
  AUTH: {
    BASE: 'auth',
    REGISTER: 'register',
    LOGIN_EMAIL: 'login/email',
    SOCIAL_GOOGLE: 'social/google',
    SOCIAL_APPLE: 'social/apple',
    TOKEN_REFRESH: 'token/refresh',
    LOGOUT: 'logout',
    VERIFY_EMAIL: 'verify-email',
    RESEND_VERIFICATION: 'resend-verification',
    ME: 'me',
  },
  WASABI: {
    BASE: 'wasabi',
    WEBHOOKS: 'webhooks',
  },
  SUBSCRIPTIONS: {
    BASE: 'subscriptions',
    ME: 'me',
  },
  HEALTH: {
    BASE: 'health',
    CHECK: 'check',
  },
  CARDS: {
    BASE: 'cards',
    LOCAL: 'local',
    SYNC: 'sync/:cardId',
  },
  TRANSACTIONS: {
    BASE: 'transactions',
    LIST: 'list',
    SYNC: 'sync',
  },
};
