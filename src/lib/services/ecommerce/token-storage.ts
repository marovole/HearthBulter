/**
 * 电商平台 Token 加密存储服务
 *
 * 使用 AES-256-GCM 加密存储 accessToken 和 refreshToken
 * 防止数据库泄露时 Token 被直接利用
 */

import { encrypt, decrypt } from "@/lib/security/encryption";
import { logger } from "@/lib/logger";
import { TokenInfo } from "./types";

// 加密标记前缀，用于识别已加密的 Token
const ENCRYPTED_PREFIX = "enc:v1:";

/**
 * 判断 Token 是否已加密
 */
export function isTokenEncrypted(token: string | null | undefined): boolean {
  if (!token) return false;
  return token.startsWith(ENCRYPTED_PREFIX);
}

/**
 * 加密单个 Token
 */
export async function encryptToken(plainToken: string): Promise<string> {
  if (!plainToken) {
    throw new Error("Token 不能为空");
  }

  // 如果已经加密，直接返回
  if (isTokenEncrypted(plainToken)) {
    return plainToken;
  }

  try {
    const encrypted = await encrypt(plainToken);
    return ENCRYPTED_PREFIX + encrypted;
  } catch (error) {
    logger.error("Token 加密失败", { error });
    throw new Error("Token 加密失败");
  }
}

/**
 * 解密单个 Token
 */
export async function decryptToken(encryptedToken: string): Promise<string> {
  if (!encryptedToken) {
    throw new Error("加密 Token 不能为空");
  }

  // 如果未加密（旧数据），直接返回
  if (!isTokenEncrypted(encryptedToken)) {
    logger.warn("检测到未加密的 Token，建议运行迁移脚本");
    return encryptedToken;
  }

  try {
    const cipherText = encryptedToken.slice(ENCRYPTED_PREFIX.length);
    return await decrypt(cipherText);
  } catch (error) {
    logger.error("Token 解密失败", { error });
    throw new Error("Token 解密失败");
  }
}

/**
 * 加密 TokenInfo 对象
 */
export async function encryptTokenInfo(
  tokenInfo: TokenInfo,
): Promise<TokenInfo> {
  const encrypted: TokenInfo = {
    ...tokenInfo,
    accessToken: await encryptToken(tokenInfo.accessToken),
  };

  if (tokenInfo.refreshToken) {
    encrypted.refreshToken = await encryptToken(tokenInfo.refreshToken);
  }

  return encrypted;
}

/**
 * 解密 TokenInfo 对象
 */
export async function decryptTokenInfo(
  tokenInfo: TokenInfo,
): Promise<TokenInfo> {
  const decrypted: TokenInfo = {
    ...tokenInfo,
    accessToken: await decryptToken(tokenInfo.accessToken),
  };

  if (tokenInfo.refreshToken) {
    decrypted.refreshToken = await decryptToken(tokenInfo.refreshToken);
  }

  return decrypted;
}

/**
 * 准备用于数据库存储的加密 Token 数据
 */
export async function prepareTokenForStorage(
  accessToken: string,
  refreshToken?: string | null,
): Promise<{
  accessToken: string;
  refreshToken: string | null;
}> {
  return {
    accessToken: await encryptToken(accessToken),
    refreshToken: refreshToken ? await encryptToken(refreshToken) : null,
  };
}

/**
 * 从数据库读取并解密 Token
 */
export async function readTokenFromStorage(
  encryptedAccessToken: string | null,
  encryptedRefreshToken?: string | null,
): Promise<{
  accessToken: string | null;
  refreshToken: string | null;
}> {
  return {
    accessToken: encryptedAccessToken
      ? await decryptToken(encryptedAccessToken)
      : null,
    refreshToken: encryptedRefreshToken
      ? await decryptToken(encryptedRefreshToken)
      : null,
  };
}

/**
 * 检查并迁移未加密的 Token（用于数据迁移）
 */
export async function migrateUnencryptedToken(
  token: string | null,
): Promise<string | null> {
  if (!token) return null;

  if (isTokenEncrypted(token)) {
    // 已加密，无需迁移
    return token;
  }

  // 加密未加密的 Token
  logger.info("迁移未加密的 Token");
  return await encryptToken(token);
}
