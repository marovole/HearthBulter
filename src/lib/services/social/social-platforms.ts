/**
 * 社交平台集成服务
 * 负责与各大社交平台的API集成
 */

import { generateSocialShareUrls } from './share-link';

export interface SocialPlatform {
  name: string;
  displayName: string;
  icon: string;
  color: string;
  shareUrl: (url: string, title: string, description: string) => string;
  isAvailable: boolean;
}

export interface ShareData {
  url: string;
  title: string;
  description: string;
  imageUrl?: string;
  hashtags?: string[];
}

/**
 * 支持的社交平台
 */
export const SOCIAL_PLATFORMS: Record<string, SocialPlatform> = {
  wechat: {
    name: 'wechat',
    displayName: '微信',
    icon: '💬',
    color: '#07C160',
    shareUrl: (url: string) => url, // 微信需要二维码
    isAvailable: true
  },
  
  wechatMoments: {
    name: 'wechatMoments',
    displayName: '朋友圈',
    icon: '📱',
    color: '#07C160',
    shareUrl: (url: string) => url, // 朋友圈需要二维码
    isAvailable: true
  },
  
  weibo: {
    name: 'weibo',
    displayName: '微博',
    icon: '🔥',
    color: '#E6162D',
    shareUrl: (url: string, title: string, description: string) => {
      const text = `${title} ${description || ''}`;
      return `https://service.weibo.com/share/share.php?url=${encodeURIComponent(url)}&title=${encodeURIComponent(text)}`;
    },
    isAvailable: true
  },
  
  qq: {
    name: 'qq',
    displayName: 'QQ',
    icon: '🐧',
    color: '#12B7F5',
    shareUrl: (url: string, title: string, description: string) => {
      return `https://connect.qq.com/widget/shareqq/index.html?url=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}&summary=${encodeURIComponent(description || '')}`;
    },
    isAvailable: true
  },
  
  qzone: {
    name: 'qzone',
    displayName: 'QQ空间',
    icon: '🌟',
    color: '#12B7F5',
    shareUrl: (url: string, title: string, description: string) => {
      return `https://sns.qzone.qq.com/cgi-bin/qzshare/cgi_qzshare_onekey?url=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}&summary=${encodeURIComponent(description || '')}`;
    },
    isAvailable: true
  },
  
  copy: {
    name: 'copy',
    displayName: '复制链接',
    icon: '📋',
    color: '#6B7280',
    shareUrl: (url: string) => url,
    isAvailable: true
  }
};

/**
 * 生成分享链接
 */
export function generateShareUrl(platform: string, data: ShareData): string {
  const socialPlatform = SOCIAL_PLATFORMS[platform];
  if (!socialPlatform || !socialPlatform.isAvailable) {
    throw new Error(`不支持的平台: ${platform}`);
  }
  
  return socialPlatform.shareUrl(data.url, data.title, data.description);
}

/**
 * 分享到指定平台
 */
export async function shareToPlatform(
  platform: string,
  data: ShareData
): Promise<boolean> {
  try {
    const shareUrl = generateShareUrl(platform, data);
    
    switch (platform) {
      case 'wechat':
      case 'wechatMoments':
        // 微信分享需要生成二维码
        return await shareToWechat(shareUrl, data);
      
      case 'copy':
        return await copyToClipboard(shareUrl);
      
      default:
        // 其他平台直接打开链接
        window.open(shareUrl, '_blank', 'width=600,height=400');
        return true;
    }
  } catch (error) {
    console.error(`分享到${platform}失败:`, error);
    return false;
  }
}

/**
 * 分享到微信
 */
async function shareToWechat(url: string, data: ShareData): Promise<boolean> {
  try {
    // 生成二维码
    const qrCodeUrl = await generateQRCode(url);
    
    // 显示二维码弹窗
    showWechatQRCode(qrCodeUrl, data);
    
    return true;
  } catch (error) {
    console.error('生成微信二维码失败:', error);
    return false;
  }
}

/**
 * 生成二维码
 */
async function generateQRCode(url: string): Promise<string> {
  // 这里可以使用二维码生成库，如 qrcode
  // 暂时返回一个模拟的二维码URL
  return `data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==`;
}

/**
 * 显示微信二维码
 */
function showWechatQRCode(qrCodeUrl: string, data: ShareData): void {
  // 创建弹窗显示二维码
  const modal = document.createElement('div');
  modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
  modal.innerHTML = `
    <div class="bg-white rounded-lg p-6 max-w-sm mx-4">
      <h3 class="text-lg font-semibold mb-4">分享到微信</h3>
      <div class="flex justify-center mb-4">
        <img src="${qrCodeUrl}" alt="二维码" class="w-48 h-48" />
      </div>
      <p class="text-sm text-gray-600 text-center mb-4">
        使用微信扫描二维码分享
      </p>
      <div class="flex justify-center space-x-2">
        <button class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600" onclick="this.closest('.fixed').remove()">
          关闭
        </button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  // 点击背景关闭
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.remove();
    }
  });
}

/**
 * 复制到剪贴板
 */
async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (error) {
    // 降级方案
    const textArea = document.createElement('textarea');
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.select();
    const success = document.execCommand('copy');
    document.body.removeChild(textArea);
    return success;
  }
}

/**
 * 检查平台可用性
 */
export function isPlatformAvailable(platform: string): boolean {
  const socialPlatform = SOCIAL_PLATFORMS[platform];
  return socialPlatform?.isAvailable || false;
}

/**
 * 获取可用平台列表
 */
export function getAvailablePlatforms(): SocialPlatform[] {
  return Object.values(SOCIAL_PLATFORMS).filter(platform => platform.isAvailable);
}

/**
 * 微信JS-SDK集成
 */
export class WechatSDK {
  private static instance: WechatSDK;
  private isInitialized = false;
  
  static getInstance(): WechatSDK {
    if (!WechatSDK.instance) {
      WechatSDK.instance = new WechatSDK();
    }
    return WechatSDK.instance;
  }
  
  /**
   * 初始化微信SDK
   */
  async initialize(config: {
    appId: string;
    timestamp: number;
    nonceStr: string;
    signature: string;
  }): Promise<boolean> {
    try {
      // 检查微信环境
      if (!this.isWechatBrowser()) {
        console.warn('当前不在微信浏览器环境中');
        return false;
      }
      
      // 加载微信JS-SDK
      await this.loadWechatSDK();
      
      // 初始化配置
      await new Promise<void>((resolve, reject) => {
        if (typeof window !== 'undefined' && (window as any).wx) {
          (window as any).wx.config({
            debug: false,
            appId: config.appId,
            timestamp: config.timestamp,
            nonceStr: config.nonceStr,
            signature: config.signature,
            jsApiList: [
              'updateAppMessageShareData',
              'updateTimelineShareData',
              'onMenuShareTimeline',
              'onMenuShareAppMessage'
            ]
          });
          
          (window as any).wx.ready(() => {
            this.isInitialized = true;
            resolve();
          });
          
          (window as any).wx.error((err: any) => {
            console.error('微信SDK初始化失败:', err);
            reject(err);
          });
        } else {
          reject(new Error('微信SDK未加载'));
        }
      });
      
      return true;
    } catch (error) {
      console.error('微信SDK初始化失败:', error);
      return false;
    }
  }
  
  /**
   * 分享到微信好友
   */
  shareToFriend(data: ShareData): void {
    if (!this.isInitialized || typeof window === 'undefined' || !(window as any).wx) {
      throw new Error('微信SDK未初始化');
    }
    
    (window as any).wx.updateAppMessageShareData({
      title: data.title,
      desc: data.description,
      link: data.url,
      imgUrl: data.imageUrl,
      success: () => {
        console.log('分享到微信好友成功');
      },
      fail: (err: any) => {
        console.error('分享到微信好友失败:', err);
      }
    });
  }
  
  /**
   * 分享到朋友圈
   */
  shareToTimeline(data: ShareData): void {
    if (!this.isInitialized || typeof window === 'undefined' || !(window as any).wx) {
      throw new Error('微信SDK未初始化');
    }
    
    (window as any).wx.updateTimelineShareData({
      title: data.title,
      link: data.url,
      imgUrl: data.imageUrl,
      success: () => {
        console.log('分享到朋友圈成功');
      },
      fail: (err: any) => {
        console.error('分享到朋友圈失败:', err);
      }
    });
  }
  
  /**
   * 检查是否在微信浏览器中
   */
  private isWechatBrowser(): boolean {
    if (typeof window === 'undefined') return false;
    const ua = window.navigator.userAgent.toLowerCase();
    return ua.includes('micromessenger');
  }
  
  /**
   * 加载微信JS-SDK
   */
  private loadWechatSDK(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (typeof window === 'undefined') {
        reject(new Error('不在浏览器环境中'));
        return;
      }
      
      if ((window as any).wx) {
        resolve();
        return;
      }
      
      const script = document.createElement('script');
      script.src = 'https://res.wx.qq.com/open/js/jweixin-1.6.0.js';
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('加载微信SDK失败'));
      document.head.appendChild(script);
    });
  }
}

/**
 * 分享统计追踪
 */
export class ShareAnalytics {
  /**
   * 记录分享事件
   */
  static async trackShare(
    shareToken: string,
    platform: string,
    action: 'share' | 'click' | 'conversion' = 'share'
  ): Promise<void> {
    try {
      await fetch(`/api/social/share/${shareToken}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action,
          platform,
          timestamp: new Date().toISOString()
        }),
      });
    } catch (error) {
      console.error('记录分享统计失败:', error);
    }
  }
  
  /**
   * 记录分享页面访问
   */
  static async trackPageView(shareToken: string): Promise<void> {
    try {
      await fetch(`/api/social/share/${shareToken}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'view',
          timestamp: new Date().toISOString()
        }),
      });
    } catch (error) {
      console.error('记录页面访问失败:', error);
    }
  }
}
