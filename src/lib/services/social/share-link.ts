/**
 * 分享链接生成服务
 * 负责生成唯一的分享token和邀请码
 */

import { randomBytes } from 'crypto';

/**
 * 生成分享token
 */
export async function generateShareToken(length: number = 16): Promise<string> {
  const bytes = randomBytes(Math.ceil(length / 2));
  const token = bytes.toString('hex').slice(0, length);
  return token;
}

/**
 * 生成邀请码
 */
export async function generateInviteCode(length: number = 8): Promise<string> {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * chars.length);
    result += chars.charAt(randomIndex);
  }
  
  return result;
}

/**
 * 生成分享链接
 */
export function generateShareUrl(token: string, baseUrl?: string): string {
  const base = baseUrl || process.env.NEXTAUTH_URL || 'http://localhost:3000';
  return `${base}/share/${token}`;
}

/**
 * 生成邀请链接
 */
export function generateInviteUrl(inviteCode: string, baseUrl?: string): string {
  const base = baseUrl || process.env.NEXTAUTH_URL || 'http://localhost:3000';
  return `${base}/invite/${inviteCode}`;
}

/**
 * 验证分享token格式
 */
export function isValidShareToken(token: string): boolean {
  // 检查长度和字符
  return /^[a-f0-9]{16}$/i.test(token);
}

/**
 * 验证邀请码格式
 */
export function isValidInviteCode(code: string): boolean {
  // 检查长度和字符
  return /^[A-Z0-9]{8}$/.test(code);
}

/**
 * 生成带参数的分享链接
 */
export function generateParametrizedShareUrl(
  token: string,
  params: Record<string, string>,
  baseUrl?: string
): string {
  const base = generateShareUrl(token, baseUrl);
  const url = new URL(base);
  
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });
  
  return url.toString();
}

/**
 * 从分享链接中提取token
 */
export function extractTokenFromShareUrl(url: string): string | null {
  try {
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split('/');
    const token = pathParts[pathParts.length - 1];
    
    return isValidShareToken(token) ? token : null;
  } catch {
    return null;
  }
}

/**
 * 从邀请链接中提取邀请码
 */
export function extractInviteCodeFromUrl(url: string): string | null {
  try {
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split('/');
    const code = pathParts[pathParts.length - 1];
    
    return isValidInviteCode(code) ? code : null;
  } catch {
    return null;
  }
}

/**
 * 生成短链接（可选功能）
 */
export async function generateShortUrl(
  longUrl: string,
  customAlias?: string
): Promise<string> {
  // 这里可以集成短链接服务，如 bit.ly、tinyurl 等
  // 暂时返回原链接
  return longUrl;
}

/**
 * 生成二维码数据（需要配合二维码生成库）
 */
export function generateQRCodeData(url: string): string {
  // 返回可用于生成二维码的数据
  return url;
}

/**
 * 生成社交媒体分享链接
 */
export function generateSocialShareUrls(
  shareUrl: string,
  title: string,
  description: string
): Record<string, string> {
  const encodedUrl = encodeURIComponent(shareUrl);
  const encodedTitle = encodeURIComponent(title);
  const encodedDescription = encodeURIComponent(description);
  
  return {
    // 微信分享（需要特殊处理，通常生成二维码）
    wechat: shareUrl,
    
    // 微信朋友圈
    wechatMoments: shareUrl,
    
    // 微博
    weibo: `https://service.weibo.com/share/share.php?url=${encodedUrl}&title=${encodedTitle}&content=${encodedDescription}`,
    
    // QQ
    qq: `https://connect.qq.com/widget/shareqq/index.html?url=${encodedUrl}&title=${encodedTitle}&summary=${encodedDescription}`,
    
    // QQ空间
    qzone: `https://sns.qzone.qq.com/cgi-bin/qzshare/cgi_qzshare_onekey?url=${encodedUrl}&title=${encodedTitle}&summary=${encodedDescription}`,
    
    // 通用复制链接
    copy: shareUrl
  };
}

/**
 * 生成Open Graph元数据
 */
export function generateOpenGraphMetadata(
  title: string,
  description: string,
  imageUrl?: string,
  url?: string
): Record<string, string> {
  return {
    'og:title': title,
    'og:description': description,
    'og:image': imageUrl || '',
    'og:url': url || '',
    'og:type': 'website',
    'og:site_name': '健康管家',
    'twitter:card': 'summary_large_image',
    'twitter:title': title,
    'twitter:description': description,
    'twitter:image': imageUrl || ''
  };
}
