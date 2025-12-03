/**
 * 安全 Token 生成器
 * 使用 Web Crypto API 和 jose 库生成安全的分享 Token
 */

import { SignJWT, jwtVerify, JWTPayload } from 'jose';
import { logger } from '@/lib/logger';

const TOKEN_SECRET_KEY = process.env.TOKEN_SECRET_KEY || process.env.NEXTAUTH_SECRET;
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
  if (!TOKEN_SECRET_KEY) {
    throw new Error('TOKEN_SECRET_KEY 或 NEXTAUTH_SECRET 环境变量未设置');
  }
  return new TextEncoder().encode(TOKEN_SECRET_KEY);
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
  permissions: string[] = ['read']
): Promise<string> {
  try {
    const secretKey = getSecretKey();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiryDays);

    const token = await new SignJWT({
      resourceId,
      resourceType,
      ownerId,
      permissions,
    } as ShareTokenPayload)
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setIssuer(TOKEN_ISSUER)
      .setAudience(TOKEN_AUDIENCE)
      .setExpirationTime(expiresAt)
      .setJti(generateRandomId())
      .sign(secretKey);

    logger.info('生成分享Token', {
      resourceId,
      resourceType,
      ownerId,
      expiryDays,
      permissions,
    });

    return token;
  } catch (error) {
    logger.error('生成分享Token失败', { resourceId, resourceType, error });
    throw new Error('Token生成失败');
  }
}

/**
 * 验证分享 Token
 * @param token 待验证的 Token
 */
export async function verifyShareToken(token: string): Promise<TokenVerificationResult> {
  try {
    const secretKey = getSecretKey();

    const { payload } = await jwtVerify(token, secretKey, {
      issuer: TOKEN_ISSUER,
      audience: TOKEN_AUDIENCE,
    });

    const sharePayload = payload as ShareTokenPayload;

    // 验证必要字段
    if (!sharePayload.resourceId || !sharePayload.resourceType || !sharePayload.ownerId) {
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
    const errorMessage = error instanceof Error ? error.message : 'Token验证失败';

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
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * 生成安全的随机 Token（不使用 JWT，纯随机字符串）
 * 用于一次性验证码、API 密钥等场景
 * @param length Token 长度（字节数），默认 32
 */
export function generateSecureRandomToken(length: number = 32): string {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * 生成 URL 安全的 Base64 Token
 * @param length Token 长度（字节数），默认 32
 */
export function generateUrlSafeToken(length: number = 32): string {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  // 将 Uint8Array 转换为 Base64 URL 安全格式
  const base64 = btoa(String.fromCharCode(...array));
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

/**
 * 创建带有过期时间的一次性 Token
 * @param data 关联数据
 * @param expiryMinutes 有效期（分钟），默认 30 分钟
 */
export async function createOneTimeToken(
  data: Record<string, unknown>,
  expiryMinutes: number = 30
): Promise<string> {
  const secretKey = getSecretKey();
  const expiresAt = new Date();
  expiresAt.setMinutes(expiresAt.getMinutes() + expiryMinutes);

  const token = await new SignJWT({
    ...data,
    oneTime: true,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setIssuer(TOKEN_ISSUER)
    .setExpirationTime(expiresAt)
    .setJti(generateRandomId())
    .sign(secretKey);

  return token;
}

/**
 * 验证一次性 Token
 * @param token 待验证的 Token
 */
export async function verifyOneTimeToken(
  token: string
): Promise<{ valid: boolean; payload?: JWTPayload; error?: string }> {
  try {
    const secretKey = getSecretKey();

    const { payload } = await jwtVerify(token, secretKey, {
      issuer: TOKEN_ISSUER,
    });

    return {
      valid: true,
      payload,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Token验证失败';
    return {
      valid: false,
      error: errorMessage,
    };
  }
}
