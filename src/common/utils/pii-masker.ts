const MASKED_KEYS = new Set([
  'password',
  'passwordhash',
  'pin',
  'activationcode',
  'cardnumber',
  'cardno',
  'pan',
  'fullpan',
  'cvv',
  'cvv2',
  'cvc',
  'expiry',
  'expirydate',
  'privatekey',
  'privatekeypem',
  'apikey',
  'secretkey',
  'keyref',
  'sign',
  'signature',
  'values',
  'idfrontid',
  'idbackid',
  'idholdid',
  'ssn',
  'idno',
  'birthday',
  'dateofbirth',
  'sensitivedata',
]);

const PARTIAL_EMAIL_KEYS = new Set(['email']);
const PARTIAL_MOBILE_KEYS = new Set(['mobile', 'phone', 'phonenumber']);

const WHITELIST_KEYS = new Set([
  'orderid',
  'orderno',
  'status',
  'amount',
  'currency',
  'createdat',
  'updatedat',
  'id',
  'cardid',
  'holderid',
  'userid',
  'correlationid',
  'requestid',
  'traceid',
]);

function maskEmail(value: string): string {
  const atIdx = value.indexOf('@');
  if (atIdx <= 0) return '***MASKED***';
  const local = value.slice(0, atIdx);
  const domain = value.slice(atIdx);
  if (local.length <= 2) return `${local[0]}*${domain}`;
  return `${local[0]}${'*'.repeat(Math.min(local.length - 1, 5))}${domain}`;
}

function maskMobile(value: string): string {
  if (value.length < 6) return '***MASKED***';
  return `${value.slice(0, Math.min(4, value.length - 4))}${'*'.repeat(4)}${value.slice(-4)}`;
}

function maskValue(key: string, value: unknown): unknown {
  const normalKey = key.toLowerCase().replace(/[_-]/g, '');

  if (WHITELIST_KEYS.has(normalKey)) return value;

  if (MASKED_KEYS.has(normalKey)) return '***MASKED***';

  if (PARTIAL_EMAIL_KEYS.has(normalKey) && typeof value === 'string') {
    return maskEmail(value);
  }

  if (PARTIAL_MOBILE_KEYS.has(normalKey) && typeof value === 'string') {
    return maskMobile(value);
  }

  return undefined;
}

function maskObject(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    const masked = maskValue(k, v);
    if (masked !== undefined) {
      result[k] = masked;
    } else {
      result[k] = maskRecursive(v);
    }
  }
  return result;
}

function maskRecursive(value: unknown): unknown {
  if (value === null || value === undefined) return value;
  if (Array.isArray(value)) return value.map(maskRecursive);
  if (typeof value === 'object')
    return maskObject(value as Record<string, unknown>);
  return value;
}

export class PiiMasker {
  static mask(obj: unknown): unknown {
    return maskRecursive(obj);
  }

  static maskRecord(obj: Record<string, unknown>): Record<string, unknown> {
    return maskObject(obj);
  }
}
