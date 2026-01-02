/**
 * 安全 Token 生成器
 * 使用 Web Crypto API 和 jose 库生成安全的分享 Token
 */

import { webcrypto as nodeCrypto } from 'crypto';
import type { JWTPayload } from 'jose';
import { logger } from '@/lib/logger';

// Prefer the runtime-provided Web Crypto (Cloudflare Workers / Node 20+).
// Do NOT overwrite `globalThis.crypto` in Node 20+, as it may be non-writable.
// In some test environments (e.g. JSDOM), `globalThis.crypto` can exist without `subtle`.
const cryptoApi: Crypto = (() => {
  const globalCrypto = globalThis.crypto;
  if (
    globalCrypto &&
    typeof globalCrypto.getRandomValues === 'function' &&
    globalCrypto.subtle
  ) {
    return globalCrypto;
  }
  return nodeCrypto;
})();

const TOKEN_ISSUER = 'health-butler';
const TOKEN_AUDIENCE = 'share-token';

export interface ShareTokenPayload extends JWTPayload {
  resourceId: string;
  resourceType: string;
  ownerId: string;
  permissions: string[];
}

export interface TokenVerificationResult {
  valid: boolean;
  payload?: ShareTokenPayload;
  error?: string;
}

/**
 * 获取签名密钥
 */
function getSecretKey(): Uint8Array {
  const secret = process.env.TOKEN_SECRET_KEY;

  if (!secret) {
    throw new Error('TOKEN_SECRET_KEY 环境变量未设置');
  }

  const keyBytes =
    typeof Buffer !== 'undefined'
      ? Buffer.from(secret)
      : new TextEncoder().encode(secret);
  if (keyBytes.byteLength < 32) {
    throw new Error('TOKEN_SECRET_KEY 长度不足，至少需要 32 字节');
  }

  return keyBytes;
}

function base64UrlEncode(input: Uint8Array | string): string {
  const bytes =
    typeof input === 'string' ? new TextEncoder().encode(input) : input;
  const base64 =
    typeof Buffer !== 'undefined'
      ? Buffer.from(bytes).toString('base64')
      : btoa(String.fromCharCode(...bytes));

  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function base64UrlDecode(input: string): Uint8Array {
  const normalized = input.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized + '==='.slice((normalized.length + 3) % 4);
  if (typeof Buffer !== 'undefined') {
    const buf = Buffer.from(padded, 'base64');
    return new Uint8Array(
      buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength),
    );
  }
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function signJwt(
  payload: Record<string, unknown>,
  secretKey: Uint8Array,
  options: { expiresAt: Date; audience: string; issuer: string; jti: string },
): Promise<string> {
  const header = { alg: 'HS256', typ: 'JWT' };
  const fullPayload = {
    ...payload,
    aud: options.audience,
    iss: options.issuer,
    exp: Math.floor(options.expiresAt.getTime() / 1000),
    iat: Math.floor(Date.now() / 1000),
    jti: options.jti,
  } satisfies Record<string, unknown>;

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(fullPayload));
  const signingInput = `${encodedHeader}.${encodedPayload}`;

  const key = await cryptoApi.subtle.importKey(
    'raw',
    secretKey,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );

  const signatureBuffer = await cryptoApi.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(signingInput),
  );

  const signature = base64UrlEncode(new Uint8Array(signatureBuffer));
  return `${signingInput}.${signature}`;
}

async function verifyJwt(
  token: string,
  secretKey: Uint8Array,
  options: { audience: string; issuer: string },
): Promise<JWTPayload & Record<string, unknown>> {
  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new Error('Token格式无效');
  }

  const [encodedHeader, encodedPayload, signature] = parts;
  const signingInput = `${encodedHeader}.${encodedPayload}`;

  const key = await cryptoApi.subtle.importKey(
    'raw',
    secretKey,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );

  const expectedSignature = await cryptoApi.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(signingInput),
  );

  const expected = base64UrlEncode(new Uint8Array(expectedSignature));
  if (!timingSafeEqualString(expected, signature)) {
    throw new Error('Token签名无效');
  }

  const payloadBytes = base64UrlDecode(encodedPayload);
  const payloadJson = new TextDecoder().decode(payloadBytes);
  const payload = JSON.parse(payloadJson) as JWTPayload &
    Record<string, unknown>;

  if (payload.iss !== options.issuer || payload.aud !== options.audience) {
    throw new Error('Token颁发者或受众无效');
  }

  if (payload.exp && payload.exp * 1000 < Date.now()) {
    throw new Error('Token 已过期');
  }

  return payload;
}

function timingSafeEqualString(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

/**
 * 生成安全的分享 Token
 * @param resourceId 资源 ID
 * @param resourceType 资源类型 (report, recipe, meal_plan 等)
 * @param ownerId 资源所有者 ID
 * @param expiryDays Token 有效期（天数），默认 7 天
 * @param permissions 授权的操作权限
 */
export async function generateSecureShareToken(
  resourceId: string,
  resourceType: string,
  ownerId: string,
  expiryDays: number = 7,
  permissions: string[] = ['read'],
): Promise<string> {
  const secretKey = getSecretKey();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + expiryDays);

  const token = await signJwt(
    {
      resourceId,
      resourceType,
      ownerId,
      permissions,
    },
    secretKey,
    {
      expiresAt,
      audience: TOKEN_AUDIENCE,
      issuer: TOKEN_ISSUER,
      jti: generateRandomId(),
    },
  );

  logger.info('生成分享Token', {
    resourceId,
    resourceType,
    ownerId,
    expiryDays,
    permissions,
  });

  return token;
}

/**
 * 验证分享 Token
 * @param token 待验证的 Token
 */
export async function verifyShareToken(
  token: string,
): Promise<TokenVerificationResult> {
  try {
    const secretKey = getSecretKey();

    const payload = await verifyJwt(token, secretKey, {
      issuer: TOKEN_ISSUER,
      audience: TOKEN_AUDIENCE,
    });

    const sharePayload = payload as ShareTokenPayload;

    // 验证必要字段
    if (
      !sharePayload.resourceId ||
      !sharePayload.resourceType ||
      !sharePayload.ownerId
    ) {
      return {
        valid: false,
        error: 'Token 缺少必要字段',
      };
    }

    logger.info('验证分享Token成功', {
      resourceId: sharePayload.resourceId,
      resourceType: sharePayload.resourceType,
    });

    return {
      valid: true,
      payload: sharePayload,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Token验证失败';

    // 区分不同类型的错误
    if (errorMessage.includes('expired')) {
      logger.warn('分享Token已过期', { error: errorMessage });
      return {
        valid: false,
        error: 'Token 已过期',
      };
    }

    if (errorMessage.includes('signature')) {
      logger.warn('分享Token签名无效', { error: errorMessage });
      return {
        valid: false,
        error: 'Token 签名无效',
      };
    }

    logger.error('验证分享Token失败', { error });
    return {
      valid: false,
      error: errorMessage,
    };
  }
}

/**
 * 生成随机 ID（用于 Token 的 jti 声明）
 */
function generateRandomId(): string {
  const array = new Uint8Array(16);
  cryptoApi.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join(
    '',
  );
}

/**
 * 生成安全的随机 Token（不使用 JWT，纯随机字符串）
 * 用于一次性验证码、API 密钥等场景
 * @param length Token 长度（字节数），默认 32
 */
export function generateSecureRandomToken(length: number = 32): string {
  const array = new Uint8Array(length);
  cryptoApi.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join(
    '',
  );
}

/**
 * 生成 URL 安全的 Base64 Token
 * @param length Token 长度（字节数），默认 32
 */
export function generateUrlSafeToken(length: number = 32): string {
  const array = new Uint8Array(length);
  cryptoApi.getRandomValues(array);
  const base =
    typeof Buffer !== 'undefined'
      ? Buffer.from(array).toString('base64')
      : btoa(String.fromCharCode(...array));

  return base.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

/**
 * 创建带有过期时间的一次性 Token
 * @param data 关联数据
 * @param expiryMinutes 有效期（分钟），默认 30 分钟
 */
export async function createOneTimeToken(
  data: Record<string, unknown>,
  expiryMinutes: number = 30,
): Promise<string> {
  const secretKey = getSecretKey();
  const expiresAt = new Date();
  expiresAt.setMinutes(expiresAt.getMinutes() + expiryMinutes);

  return signJwt(
    {
      ...data,
      oneTime: true,
    },
    secretKey,
    {
      expiresAt,
      audience: TOKEN_AUDIENCE,
      issuer: TOKEN_ISSUER,
      jti: generateRandomId(),
    },
  );
}

/**
 * 验证一次性 Token
 * @param token 待验证的 Token
 */
export async function verifyOneTimeToken(
  token: string,
): Promise<{ valid: boolean; payload?: JWTPayload; error?: string }> {
  try {
    const secretKey = getSecretKey();

    const payload = await verifyJwt(token, secretKey, {
      issuer: TOKEN_ISSUER,
      audience: TOKEN_AUDIENCE,
    });

    return {
      valid: true,
      payload,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Token验证失败';
    return {
      valid: false,
      error: errorMessage,
    };
  }
}
