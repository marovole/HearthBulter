/**
 * 社交分享图片生成服务
 * 使用 HTML Canvas 或 Puppeteer 生成分享卡片图片
 */

import { Browser, Page } from 'puppeteer';
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { imageCache } from './image-cache';

// 使用 stealth 插件避免被检测
puppeteer.use(StealthPlugin());

export interface ImageGenerationOptions {
  width?: number;
  height?: number;
  quality?: number;
  format?: 'png' | 'jpeg' | 'webp';
  backgroundColor?: string;
  brandColor?: string;
}

export interface ShareCardData {
  memberName: string;
  title?: string;
  description?: string;
  customMessage?: string;
  date?: Date;
  avatar?: string;
  inviteCode?: string;
  qrCode?: string;
}

const DEFAULT_OPTIONS: ImageGenerationOptions = {
  width: 800,
  height: 600,
  quality: 90,
  format: 'png',
  backgroundColor: '#ffffff',
  brandColor: '#10b981'
};

/**
 * 生成分享卡片图片
 */
export async function generateShareCard(
  template: string,
  data: ShareCardData,
  options: ImageGenerationOptions = {}
): Promise<string> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  
  // 先检查缓存
  const cachedUrl = imageCache.get(template, { ...data, ...opts });
  if (cachedUrl) {
    console.log('使用缓存的分享图片');
    return cachedUrl;
  }
  
  let browser: Browser | null = null;
  
  try {
    // 启动浏览器
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--single-process',
        '--disable-gpu'
      ]
    });

    const page = await browser.newPage();
    
    // 设置视口
    await page.setViewport({
      width: opts.width!,
      height: opts.height!,
      deviceScaleFactor: 2
    });

    // 生成 HTML 模板
    const html = generateCardHTML(template, data, opts);
    
    // 设置页面内容
    await page.setContent(html, { waitUntil: 'networkidle0' });
    
    // 等待图片加载
    await page.waitForTimeout(1000);
    
    // 截图
    const screenshot = await page.screenshot({
      type: opts.format,
      quality: opts.format === 'jpeg' ? opts.quality : undefined,
      fullPage: false
    });
    
    if (!screenshot) {
      throw new Error('生成图片失败');
    }
    
    // 这里应该上传到 CDN 或存储服务
    // 暂时返回 base64 数据URL
    const base64 = screenshot.toString('base64');
    const imageUrl = `data:image/${opts.format};base64,${base64}`;
    
    // 缓存生成的图片
    imageCache.set(template, { ...data, ...opts }, imageUrl);
    
    return imageUrl;
    
  } catch (error) {
    console.error('图片生成失败:', error);
    throw error;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

/**
 * 生成卡片 HTML
 */
function generateCardHTML(
  template: string,
  data: ShareCardData,
  options: ImageGenerationOptions
): string {
  const { width, height, backgroundColor, brandColor } = options;
  
  return `
    <!DOCTYPE html>
    <html lang="zh-CN">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>分享卡片</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', 'Helvetica Neue', Helvetica, Arial, sans-serif;
          background: ${backgroundColor};
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 100vh;
        }
        
        .card {
          width: ${width}px;
          height: ${height}px;
          background: linear-gradient(135deg, ${brandColor}22 0%, ${brandColor}44 100%);
          border-radius: 20px;
          padding: 40px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          position: relative;
          overflow: hidden;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
        }
        
        .card::before {
          content: '';
          position: absolute;
          top: -50%;
          right: -50%;
          width: 200%;
          height: 200%;
          background: radial-gradient(circle, ${brandColor}11 0%, transparent 70%);
          animation: float 6s ease-in-out infinite;
        }
        
        @keyframes float {
          0%, 100% { transform: translate(0, 0) rotate(0deg); }
          50% { transform: translate(-30px, -30px) rotate(180deg); }
        }
        
        .header {
          display: flex;
          align-items: center;
          margin-bottom: 20px;
          z-index: 1;
        }
        
        .avatar {
          width: 60px;
          height: 60px;
          border-radius: 50%;
          background: linear-gradient(135deg, ${brandColor}, ${brandColor}dd);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 24px;
          font-weight: bold;
          margin-right: 16px;
        }
        
        .user-info h1 {
          font-size: 24px;
          color: #1f2937;
          margin-bottom: 4px;
        }
        
        .user-info .date {
          font-size: 14px;
          color: #6b7280;
        }
        
        .content {
          flex: 1;
          display: flex;
          flex-direction: column;
          justify-content: center;
          z-index: 1;
        }
        
        .title {
          font-size: 32px;
          font-weight: bold;
          color: #1f2937;
          margin-bottom: 16px;
          line-height: 1.2;
        }
        
        .description {
          font-size: 18px;
          color: #4b5563;
          line-height: 1.5;
          margin-bottom: 20px;
        }
        
        .stats {
          display: flex;
          gap: 20px;
          margin-bottom: 20px;
        }
        
        .stat {
          background: rgba(255, 255, 255, 0.9);
          padding: 12px 20px;
          border-radius: 12px;
          text-align: center;
          flex: 1;
        }
        
        .stat-value {
          font-size: 24px;
          font-weight: bold;
          color: ${brandColor};
        }
        
        .stat-label {
          font-size: 12px;
          color: #6b7280;
          margin-top: 4px;
        }
        
        .footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          z-index: 1;
        }
        
        .brand {
          display: flex;
          align-items: center;
          color: ${brandColor};
          font-weight: bold;
          font-size: 16px;
        }
        
        .brand-icon {
          width: 24px;
          height: 24px;
          margin-right: 8px;
          background: ${brandColor};
          border-radius: 50%;
        }
        
        .qr-placeholder {
          width: 80px;
          height: 80px;
          background: #f3f4f6;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 10px;
          color: #6b7280;
          text-align: center;
          position: relative;
        }
        
        .invite-code {
          position: absolute;
          bottom: -20px;
          left: 50%;
          transform: translateX(-50%);
          background: ${brandColor};
          color: white;
          padding: 2px 8px;
          border-radius: 10px;
          font-size: 10px;
          font-weight: bold;
        }
        
        ${getTemplateStyles(template)}
      </style>
    </head>
    <body>
      <div class="card">
        <div class="header">
          <div class="avatar">${data.memberName.charAt(0)}</div>
          <div class="user-info">
            <h1>${data.memberName}</h1>
            <div class="date">${data.date ? data.date.toLocaleDateString('zh-CN') : new Date().toLocaleDateString('zh-CN')}</div>
          </div>
        </div>
        
        <div class="content">
          ${getTemplateContent(template, data)}
        </div>
        
        <div class="footer">
          <div class="brand">
            <div class="brand-icon"></div>
            健康管家
          </div>
          <div class="qr-placeholder">
            扫码查看<br>详情
            ${data.inviteCode ? `<div class="invite-code">${data.inviteCode}</div>` : ''}
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * 获取模板特定样式
 */
function getTemplateStyles(template: string): string {
  switch (template) {
    case 'health-report':
      return `
        .health-score {
          font-size: 64px;
          font-weight: bold;
          color: #10b981;
          text-align: center;
          margin: 20px 0;
        }
        .health-grade {
          text-align: center;
          font-size: 18px;
          color: #6b7280;
        }
      `;
    case 'achievement':
      return `
        .achievement-icon {
          font-size: 64px;
          text-align: center;
          margin: 20px 0;
        }
        .achievement-rarity {
          display: inline-block;
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: bold;
          margin-bottom: 16px;
        }
        .rarity-bronze { background: #cd7f32; color: white; }
        .rarity-silver { background: #c0c0c0; color: white; }
        .rarity-gold { background: #ffd700; color: #333; }
        .rarity-platinum { background: #e5e4e2; color: #333; }
        .rarity-diamond { background: #b9f2ff; color: #333; }
      `;
    case 'meal-log':
      return `
        .meal-icon {
          font-size: 48px;
          text-align: center;
          margin: 16px 0;
        }
        .nutrition-info {
          background: rgba(255, 255, 255, 0.9);
          padding: 16px;
          border-radius: 12px;
          margin-top: 16px;
        }
        .nutrition-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 8px;
        }
        .nutrition-label {
          color: #6b7280;
        }
        .nutrition-value {
          font-weight: bold;
          color: #1f2937;
        }
      `;
    default:
      return '';
  }
}

/**
 * 获取模板特定内容
 */
function getTemplateContent(template: string, data: ShareCardData): string {
  switch (template) {
    case 'health-report':
      return `
        <div class="title">${data.title || '健康报告'}</div>
        <div class="description">${data.description || '健康状况良好，继续保持'}</div>
        <div class="health-score">85<span style="font-size: 24px;">分</span></div>
        <div class="health-grade">健康状况：优秀</div>
        ${data.customMessage ? `<div class="description" style="font-style: italic;">"${data.customMessage}"</div>` : ''}
      `;
    case 'achievement':
      return `
        <div class="achievement-icon">🏆</div>
        <div class="title">${data.title || '新成就解锁'}</div>
        <div class="achievement-rarity rarity-gold">黄金成就</div>
        <div class="description">${data.description || '恭喜获得新成就'}</div>
        ${data.customMessage ? `<div class="description" style="font-style: italic;">"${data.customMessage}"</div>` : ''}
      `;
    case 'meal-log':
      return `
        <div class="meal-icon">🍽️</div>
        <div class="title">${data.title || '营养早餐'}</div>
        <div class="description">${data.description || '营养均衡，健康美味'}</div>
        <div class="nutrition-info">
          <div class="nutrition-row">
            <span class="nutrition-label">热量</span>
            <span class="nutrition-value">450 千卡</span>
          </div>
          <div class="nutrition-row">
            <span class="nutrition-label">蛋白质</span>
            <span class="nutrition-value">25g</span>
          </div>
          <div class="nutrition-row">
            <span class="nutrition-label">碳水</span>
            <span class="nutrition-value">50g</span>
          </div>
          <div class="nutrition-row">
            <span class="nutrition-label">脂肪</span>
            <span class="nutrition-value">15g</span>
          </div>
        </div>
        ${data.customMessage ? `<div class="description" style="font-style: italic;">"${data.customMessage}"</div>` : ''}
      `;
    default:
      return `
        <div class="title">${data.title || '健康生活'}</div>
        <div class="description">${data.description || '分享健康，分享快乐'}</div>
        ${data.customMessage ? `<div class="description" style="font-style: italic;">"${data.customMessage}"</div>` : ''}
      `;
  }
}

/**
 * 生成健康报告卡片
 */
export async function generateHealthReportCard(data: any): Promise<string> {
  return generateShareCard('health-report', {
    memberName: data.memberName,
    title: `${data.reportType}健康报告`,
    description: data.summary || '健康状况良好',
    date: new Date(),
    customMessage: data.customMessage,
    inviteCode: data.inviteCode
  });
}

/**
 * 生成成就卡片
 */
export async function generateAchievementCard(data: any): Promise<string> {
  return generateShareCard('achievement', {
    memberName: data.memberName,
    title: data.achievementTitle,
    description: data.achievementDescription,
    date: data.unlockedAt || new Date(),
    customMessage: data.customMessage,
    inviteCode: data.inviteCode
  });
}

/**
 * 生成餐饮打卡卡片
 */
export async function generateMealLogCard(data: any): Promise<string> {
  return generateShareCard('meal-log', {
    memberName: data.memberName,
    title: `${data.mealType}打卡`,
    description: `营养均衡 ${data.calories}千卡`,
    date: data.date,
    customMessage: data.customMessage,
    inviteCode: data.inviteCode
  });
}

/**
 * 生成目标达成卡片
 */
export async function generateGoalAchievementCard(data: any): Promise<string> {
  return generateShareCard('achievement', {
    memberName: data.memberName,
    title: '🎉 目标达成',
    description: `完成了${data.goalType}，进度${data.progress}%`,
    date: new Date(),
    customMessage: data.customMessage,
    inviteCode: data.inviteCode
  });
}

/**
 * 生成食谱卡片
 */
export async function generateRecipeCard(data: any): Promise<string> {
  return generateShareCard('meal-log', {
    memberName: data.memberName,
    title: data.recipeName,
    description: data.description,
    date: new Date(),
    customMessage: data.customMessage,
    inviteCode: data.inviteCode
  });
}

/**
 * 生成连续打卡卡片
 */
export async function generateCheckInStreakCard(data: any): Promise<string> {
  return generateShareCard('achievement', {
    memberName: data.memberName,
    title: '🔥 连续打卡',
    description: `已连续打卡${data.currentStreak}天，总计${data.totalDays}天`,
    date: data.lastCheckIn || new Date(),
    customMessage: data.customMessage,
    inviteCode: data.inviteCode
  });
}

/**
 * 生成体重里程碑卡片
 */
export async function generateWeightMilestoneCard(data: any): Promise<string> {
  return generateShareCard('health-report', {
    memberName: data.memberName,
    title: '⚖️ 体重里程碑',
    description: `当前体重：${data.currentWeight}kg`,
    date: data.measuredAt,
    customMessage: data.customMessage,
    inviteCode: data.inviteCode
  });
}
