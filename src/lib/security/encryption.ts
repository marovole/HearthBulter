/**
 * AES-256-GCM 加密工具
 * 使用 Web Crypto API 实现，兼容 Cloudflare Workers
 */

import { logger } from '@/lib/logger';

const ENCRYPTION_VERSION = 'v1';
const ALGORITHM = 'AES-GCM';
const KEY_LENGTH = 256;
const IV_LENGTH = 12; // GCM 推荐的 IV 长度
const TAG_LENGTH = 128; // 认证标签长度（bits）

export interface EncryptedData {
  version: string;
  iv: string;
  ciphertext: string;
  tag: string;
}

/**
 * 获取加密密钥
 */
async function getEncryptionKey(): Promise<CryptoKey> {
  const keyString = process.env.ENCRYPTION_KEY;

  if (!keyString) {
    throw new Error('ENCRYPTION_KEY 环境变量未设置');
  }

  // 将 Base64 编码的密钥转换为 ArrayBuffer
  const keyData = base64ToArrayBuffer(keyString);

  // 验证密钥长度（32 字节 = 256 位）
  if (keyData.byteLength !== 32) {
    throw new Error(`加密密钥长度无效: 期望 32 字节，实际 ${keyData.byteLength} 字节`);
  }

  return crypto.subtle.importKey(
    'raw',
    keyData,
    { name: ALGORITHM, length: KEY_LENGTH },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * 加密数据
 * @param plaintext 明文
 * @returns 加密后的数据（格式: version$iv$ciphertext$tag）
 */
export async function encrypt(plaintext: string): Promise<string> {
  try {
    const key = await getEncryptionKey();

    // 生成随机 IV
    const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));

    // 加密
    const encoder = new TextEncoder();
    const plaintextBuffer = encoder.encode(plaintext);

    const encryptedBuffer = await crypto.subtle.encrypt(
      {
        name: ALGORITHM,
        iv,
        tagLength: TAG_LENGTH,
      },
      key,
      plaintextBuffer
    );

    // GCM 模式下，加密结果包含密文 + 认证标签
    // 认证标签在最后 16 字节（128 bits）
    const encryptedArray = new Uint8Array(encryptedBuffer);
    const tagStart = encryptedArray.length - 16;
    const ciphertext = encryptedArray.slice(0, tagStart);
    const tag = encryptedArray.slice(tagStart);

    // 格式化输出
    const result: EncryptedData = {
      version: ENCRYPTION_VERSION,
      iv: arrayBufferToBase64(iv),
      ciphertext: arrayBufferToBase64(ciphertext),
      tag: arrayBufferToBase64(tag),
    };

    return `${result.version}$${result.iv}$${result.ciphertext}$${result.tag}`;
  } catch (error) {
    logger.error('数据加密失败', { error });
    throw new Error('加密失败');
  }
}

/**
 * 解密数据
 * @param encryptedString 加密字符串（格式: version$iv$ciphertext$tag）
 * @returns 解密后的明文
 */
export async function decrypt(encryptedString: string): Promise<string> {
  try {
    // 解析加密数据
    const parts = encryptedString.split('$');
    if (parts.length !== 4) {
      throw new Error('加密数据格式无效');
    }

    const [version, ivBase64, ciphertextBase64, tagBase64] = parts as [string, string, string, string];

    // 版本检查
    if (version !== ENCRYPTION_VERSION) {
      logger.warn('加密数据版本不匹配', { expected: ENCRYPTION_VERSION, actual: version });
    }

    const key = await getEncryptionKey();
    const iv = base64ToArrayBuffer(ivBase64);
    const ciphertext = base64ToArrayBuffer(ciphertextBase64);
    const tag = base64ToArrayBuffer(tagBase64);

    // GCM 需要将密文和标签合并
    const encryptedData = new Uint8Array(ciphertext.byteLength + tag.byteLength);
    encryptedData.set(new Uint8Array(ciphertext), 0);
    encryptedData.set(new Uint8Array(tag), ciphertext.byteLength);

    // 解密
    const decryptedBuffer = await crypto.subtle.decrypt(
      {
        name: ALGORITHM,
        iv: new Uint8Array(iv),
        tagLength: TAG_LENGTH,
      },
      key,
      encryptedData
    );

    const decoder = new TextDecoder();
    return decoder.decode(decryptedBuffer);
  } catch (error) {
    logger.error('数据解密失败', { error });
    throw new Error('解密失败：数据可能已被篡改或密钥不匹配');
  }
}

/**
 * 加密对象（自动序列化为 JSON）
 * @param data 要加密的对象
 */
export async function encryptObject<T extends object>(data: T): Promise<string> {
  const jsonString = JSON.stringify(data);
  return encrypt(jsonString);
}

/**
 * 解密对象（自动反序列化 JSON）
 * @param encryptedString 加密字符串
 */
export async function decryptObject<T>(encryptedString: string): Promise<T> {
  const jsonString = await decrypt(encryptedString);
  return JSON.parse(jsonString) as T;
}

/**
 * 生成新的加密密钥（用于密钥轮换）
 * @returns Base64 编码的密钥
 */
export async function generateEncryptionKey(): Promise<string> {
  const key = await crypto.subtle.generateKey(
    {
      name: ALGORITHM,
      length: KEY_LENGTH,
    },
    true,
    ['encrypt', 'decrypt']
  );

  const exportedKey = await crypto.subtle.exportKey('raw', key);
  return arrayBufferToBase64(exportedKey);
}

/**
 * 验证数据是否为有效的加密格式
 * @param data 待验证的数据
 */
export function isEncryptedFormat(data: string): boolean {
  if (!data || typeof data !== 'string') {
    return false;
  }

  const parts = data.split('$');
  if (parts.length !== 4) {
    return false;
  }

  const [version] = parts;
  return version === ENCRYPTION_VERSION;
}

/**
 * 计算数据哈希（用于完整性验证）
 * @param data 数据
 */
export async function hashData(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
  return arrayBufferToBase64(hashBuffer);
}

/**
 * 比较两个字符串（时间安全比较，防止时序攻击）
 * @param a 字符串 a
 * @param b 字符串 b
 */
export function secureCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }

  const encoder = new TextEncoder();
  const aBytes = encoder.encode(a);
  const bBytes = encoder.encode(b);

  let result = 0;
  const length = aBytes.length;
  for (let i = 0; i < length; i++) {
    const aByte = aBytes[i] ?? 0;
    const bByte = bBytes[i] ?? 0;
    result |= aByte ^ bByte;
  }

  return result === 0;
}

// 辅助函数

function arrayBufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let binary = '';
  const byteLength = bytes.byteLength;
  for (let i = 0; i < byteLength; i++) {
    const byte = bytes[i];
    if (byte !== undefined) {
      binary += String.fromCharCode(byte);
    }
  }
  return btoa(binary);
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const length = binary.length;
  const bytes = new Uint8Array(length);
  for (let i = 0; i < length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}
