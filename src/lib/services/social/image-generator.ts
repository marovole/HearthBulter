/**
 * 分享图片生成服务
 * 使用html2canvas生成分享卡片图片
 */

import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
import QRCode from "qrcode";
import {
  ShareTemplate,
  ImageGenerationConfig,
  SHARE_TEMPLATE_CONFIGS,
} from "@/types/social-sharing";

/**
 * 图片生成器类
 */
export class ShareImageGenerator {
  private static instance: ShareImageGenerator;

  static getInstance(): ShareImageGenerator {
    if (!ShareImageGenerator.instance) {
      ShareImageGenerator.instance = new ShareImageGenerator();
    }
    return ShareImageGenerator.instance;
  }

  /**
   * 生成分享图片
   */
  async generateShareImage(
    template: ShareTemplate,
    data: any,
    config?: Partial<ImageGenerationConfig>,
  ): Promise<string> {
    const finalConfig = { ...SHARE_TEMPLATE_CONFIGS[template], ...config };

    switch (template) {
    case ShareTemplate.HEALTH_REPORT:
      return this.generateHealthReportImage(data, finalConfig);
    case ShareTemplate.GOAL_ACHIEVED:
      return this.generateGoalAchievedImage(data, finalConfig);
    case ShareTemplate.ACHIEVEMENT_UNLOCKED:
      return this.generateAchievementUnlockedImage(data, finalConfig);
    case ShareTemplate.WEIGHT_LOSS:
      return this.generateWeightLossImage(data, finalConfig);
    case ShareTemplate.STREAK_CELEBRATION:
      return this.generateStreakCelebrationImage(data, finalConfig);
    case ShareTemplate.RECIPE_CARD:
      return this.generateRecipeCardImage(data, finalConfig);
    case ShareTemplate.PERSONAL_RECORD:
      return this.generatePersonalRecordImage(data, finalConfig);
    case ShareTemplate.COMMUNITY_POST:
      return this.generateCommunityPostImage(data, finalConfig);
    default:
      throw new Error(`不支持的分享模板: ${template}`);
    }
  }

  /**
   * 生成健康报告图片
   */
  private async generateHealthReportImage(
    data: any,
    config: ImageGenerationConfig,
  ): Promise<string> {
    const html = this.createHealthReportHTML(data, config);
    return this.generateImageFromHTML(html, config);
  }

  /**
   * 生成目标达成图片
   */
  private async generateGoalAchievedImage(
    data: any,
    config: ImageGenerationConfig,
  ): Promise<string> {
    const html = this.createGoalAchievedHTML(data, config);
    return this.generateImageFromHTML(html, config);
  }

  /**
   * 生成成就解锁图片
   */
  private async generateAchievementUnlockedImage(
    data: any,
    config: ImageGenerationConfig,
  ): Promise<string> {
    const html = this.createAchievementUnlockedHTML(data, config);
    return this.generateImageFromHTML(html, config);
  }

  /**
   * 生成减重图片
   */
  private async generateWeightLossImage(
    data: any,
    config: ImageGenerationConfig,
  ): Promise<string> {
    const html = this.createWeightLossHTML(data, config);
    return this.generateImageFromHTML(html, config);
  }

  /**
   * 生成连续打卡庆祝图片
   */
  private async generateStreakCelebrationImage(
    data: any,
    config: ImageGenerationConfig,
  ): Promise<string> {
    const html = this.createStreakCelebrationHTML(data, config);
    return this.generateImageFromHTML(html, config);
  }

  /**
   * 生成食谱卡片图片
   */
  private async generateRecipeCardImage(
    data: any,
    config: ImageGenerationConfig,
  ): Promise<string> {
    const html = this.createRecipeCardHTML(data, config);
    return this.generateImageFromHTML(html, config);
  }

  /**
   * 生成个人记录图片
   */
  private async generatePersonalRecordImage(
    data: any,
    config: ImageGenerationConfig,
  ): Promise<string> {
    const html = this.createPersonalRecordHTML(data, config);
    return this.generateImageFromHTML(html, config);
  }

  /**
   * 生成社区帖子图片
   */
  private async generateCommunityPostImage(
    data: any,
    config: ImageGenerationConfig,
  ): Promise<string> {
    const html = this.createCommunityPostHTML(data, config);
    return this.generateImageFromHTML(html, config);
  }

  /**
   * 从HTML生成图片
   * 注意：仅支持浏览器环境，Cloudflare Workers 不支持服务端图片生成
   */
  private async generateImageFromHTML(
    html: string,
    config: ImageGenerationConfig,
  ): Promise<string> {
    // 仅在浏览器环境中使用html2canvas
    if (typeof window === "undefined") {
      throw new Error(
        "图片生成仅支持浏览器环境。Cloudflare Workers 不支持 Puppeteer/Chromium。" +
          "请在客户端调用此功能。",
      );
    }

    try {
      const { default: html2canvas } = await import("html2canvas");

      // 创建临时DOM元素
      const tempDiv = document.createElement("div");
      tempDiv.innerHTML = html;
      tempDiv.style.position = "absolute";
      tempDiv.style.left = "-9999px";
      tempDiv.style.top = "-9999px";
      tempDiv.style.width = `${config.width}px`;
      tempDiv.style.fontFamily = config.fontFamily;
      document.body.appendChild(tempDiv);

      // 生成图片
      const canvas = await html2canvas(tempDiv, {
        width: config.width,
        height: config.height,
        backgroundColor: config.backgroundColor,
        scale: 2, // 高清显示
      });

      // 清理临时元素
      document.body.removeChild(tempDiv);

      // 转换为blob并获取URL
      return new Promise((resolve, reject) => {
        canvas.toBlob(
          (blob) => {
            if (blob) {
              const url = URL.createObjectURL(blob);
              resolve(url);
            } else {
              reject(new Error("图片生成失败"));
            }
          },
          `image/${config.format}`,
          config.quality / 100,
        );
      });
    } catch (error) {
      console.error("HTML转图片失败:", error);
      throw new Error("图片生成失败");
    }
  }

  /**
   * 生成二维码
   */
  private async generateQRCode(url: string): Promise<string> {
    try {
      const qrDataUrl = await QRCode.toDataURL(url, {
        width: 200,
        margin: 1,
        color: {
          dark: "#000000",
          light: "#FFFFFF",
        },
      });
      return qrDataUrl;
    } catch (error) {
      console.error("二维码生成失败:", error);
      throw new Error("二维码生成失败");
    }
  }

  /**
   * 健康报告HTML模板
   */
  private createHealthReportHTML(
    data: any,
    config: ImageGenerationConfig,
  ): string {
    const {
      memberName,
      healthScore,
      weightChange,
      dataPoints,
      period,
      latestData,
    } = data;
    const currentDate = format(new Date(), "yyyy年MM月dd日", { locale: zhCN });

    return `
      <div style="
        width: ${config.width}px;
        height: ${config.height}px;
        background: linear-gradient(135deg, ${config.backgroundColor} 0%, #f0f9ff 100%);
        font-family: ${config.fontFamily};
        color: #1f2937;
        padding: 40px;
        box-sizing: border-box;
        position: relative;
        overflow: hidden;
        border-radius: 16px;
        box-shadow: 0 10px 25px rgba(0,0,0,0.1);
      ">
        ${
  config.branding
    ? `
          <div style="
            position: absolute;
            top: 20px;
            right: 20px;
            font-size: 12px;
            color: #6b7280;
            opacity: 0.7;
          ">Health Butler</div>
        `
    : ""
}
        
        <div style="margin-bottom: 30px;">
          <h1 style="font-size: 32px; font-weight: bold; margin: 0; color: #059669;">
            ${memberName}的健康报告
          </h1>
          <p style="font-size: 16px; color: #6b7280; margin: 8px 0 0 0;">
            ${currentDate} • ${period}
          </p>
        </div>

        <div style="
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
          margin-bottom: 30px;
        ">
          <div style="
            background: white;
            padding: 20px;
            border-radius: 12px;
            text-align: center;
            box-shadow: 0 4px 12px rgba(0,0,0,0.05);
          ">
            <div style="font-size: 48px; font-weight: bold; color: #059669; line-height: 1;">
              ${healthScore}分
            </div>
            <div style="font-size: 14px; color: #6b7280; margin-top: 4px;">
              健康评分
            </div>
          </div>

          <div style="
            background: white;
            padding: 20px;
            border-radius: 12px;
            text-align: center;
            box-shadow: 0 4px 12px rgba(0,0,0,0.05);
          ">
            <div style="font-size: 48px; font-weight: bold; color: #2563eb; line-height: 1;">
              ${dataPoints}次
            </div>
            <div style="font-size: 14px; color: #6b7280; margin-top: 4px;">
              数据记录
            </div>
          </div>
        </div>

        ${
  weightChange.lost > 0
    ? `
          <div style="
            background: linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%);
            padding: 16px 20px;
            border-radius: 8px;
            margin-bottom: 20px;
            text-align: center;
          ">
            <span style="font-size: 16px; font-weight: 600; color: #16a34a;">
              🎉 ${weightChange.period}减重${weightChange.lost.toFixed(1)}kg！
            </span>
          </div>
        `
    : ""
}
      </div>
    `;
  }

  /**
   * 目标达成HTML模板
   */
  private createGoalAchievedHTML(
    data: any,
    config: ImageGenerationConfig,
  ): string {
    const { memberName, goalTitle, progress, achievedDate, metric } = data;
    const dateStr = format(new Date(achievedDate), "yyyy年MM月dd日", {
      locale: zhCN,
    });

    return `
      <div style="
        width: ${config.width}px;
        height: ${config.height}px;
        background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
        font-family: ${config.fontFamily};
        color: #1f2937;
        padding: 40px;
        box-sizing: border-box;
        text-align: center;
        position: relative;
        overflow: hidden;
        border-radius: 16px;
        box-shadow: 0 10px 25px rgba(0,0,0,0.1);
      ">
        ${
  config.branding
    ? `
          <div style="
            position: absolute;
            top: 20px;
            right: 20px;
            font-size: 12px;
            color: #92400e;
            opacity: 0.7;
          ">Health Butler</div>
        `
    : ""
}

        <div style="margin-bottom: 40px;">
          <div style="font-size: 96px; margin-bottom: 20px;">🎯</div>
          <h1 style="font-size: 28px; font-weight: bold; margin: 0; color: #92400e;">
            目标达成！
          </h1>
        </div>

        <div style="
          background: white;
          padding: 30px;
          border-radius: 16px;
          box-shadow: 0 8px 20px rgba(0,0,0,0.1);
          margin-bottom: 30px;
        ">
          <h2 style="font-size: 24px; font-weight: 600; margin: 0 0 12px 0; color: #1f2937;">
            ${goalTitle}
          </h2>
          <div style="font-size: 18px; color: #6b7280; margin: 0 0 16px 0;">
            ${memberName}
          </div>
          <div style="
            background: #fbbf24;
            width: 100%;
            height: 8px;
            border-radius: 4px;
            position: relative;
            margin-bottom: 12px;
          ">
            <div style="
              background: #10b981;
              width: ${progress}%;
              height: 100%;
              border-radius: 4px;
            "></div>
          </div>
          <div style="font-size: 14px; color: #6b7280; font-weight: 600;">
            100% 完成 • ${dateStr}
          </div>
        </div>

        <div style="font-size: 16px; color: #92400e; font-weight: 600;">
          为${memberName}的坚持喝彩！🎉
        </div>
      </div>
    `;
  }

  /**
   * 成就解锁HTML模板
   */
  private createAchievementUnlockedHTML(
    data: any,
    config: ImageGenerationConfig,
  ): string {
    const {
      memberName,
      achievementTitle,
      achievementDescription,
      points,
      icon,
      color,
      unlockedAt,
    } = data;
    const dateStr = format(new Date(unlockedAt), "yyyy年MM月dd日", {
      locale: zhCN,
    });

    return `
      <div style="
        width: ${config.width}px;
        height: ${config.height}px;
        background: linear-gradient(135deg, ${config.backgroundColor} 0%, #e0f2fe 100%);
        font-family: ${config.fontFamily};
        color: #1f2937;
        padding: 40px;
        box-sizing: border-box;
        text-align: center;
        position: relative;
        overflow: hidden;
        border-radius: 16px;
        box-shadow: 0 10px 25px rgba(0,0,0,0.1);
      ">
        <div style="
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: ${color}22;
          opacity: 0.1;
        "></div>

        ${
  config.branding
    ? `
          <div style="
            position: absolute;
            top: 20px;
            right: 20px;
            font-size: 12px;
            color: #0369a1;
            opacity: 0.7;
            z-index: 10;
          ">Health Butler</div>
        `
    : ""
}

        <div style="margin-bottom: 30px; position: relative; z-index: 5;">
          <div style="
            width: 120px;
            height: 120px;
            background: white;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 20px;
            font-size: 60px;
            box-shadow: 0 8px 25px rgba(0,0,0,0.15);
            border: 4px solid ${color};
          ">
            ${icon}
          </div>
        </div>

        <div style="
          background: white;
          padding: 24px;
          border-radius: 12px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
          margin-bottom: 20px;
          position: relative;
          z-index: 5;
        ">
          <h1 style="font-size: 24px; font-weight: bold; margin: 0 0 8px 0; color: ${color};">
            解锁成就
          </h1>
          <h2 style="font-size: 20px; margin: 0 0 8px 0; color: #1f2937;">
            ${achievementTitle}
          </h2>
          <p style="font-size: 14px; color: #6b7280; margin: 0 0 12px 0; line-height: 1.5;">
            ${achievementDescription}
          </p>
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span style="font-size: 16px; font-weight: 600; color: #0369a1;">
              +${points} 积分
            </span>
            <span style="font-size: 12px; color: #6b7280;">
              ${dateStr}
            </span>
          </div>
        </div>

        <div style="font-size: 14px; color: #0369a1; font-weight: 600; position: relative; z-index: 5;">
          ${memberName}的成就收藏 • 继续加油！
        </div>
      </div>
    `;
  }

  /**
   * 减重HTML模板
   */
  private createWeightLossHTML(
    data: any,
    config: ImageGenerationConfig,
  ): string {
    const {
      memberName,
      initialWeight,
      currentWeight,
      weightLoss,
      weightLossPercent,
      period,
      icon,
    } = data;

    return `
      <div style="
        width: ${config.width}px;
        height: ${config.height}px;
        background: linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%);
        font-family: ${config.fontFamily};
        color: #1f2937;
        padding: 40px;
        box-sizing: border-box;
        text-align: center;
        position: relative;
        overflow: hidden;
        border-radius: 16px;
        box-shadow: 0 10px 25px rgba(0,0,0,0.1);
      ">
        ${
  config.branding
    ? `
          <div style="
            position: absolute;
            top: 20px;
            right: 20px;
            font-size: 12px;
            color: #15803d;
            opacity: 0.7;
          ">Health Butler</div>
        `
    : ""
}

        <div style="margin-bottom: 30px;">
          <div style="font-size: 64px; margin-bottom: 16px;">${icon}</div>
          <h1 style="font-size: 24px; font-weight: bold; margin: 0; color: #15803d;">
            ${memberName}的减重里程碑
          </h1>
        </div>

        <div style="
          background: white;
          padding: 30px;
          border-radius: 16px;
          box-shadow: 0 8px 20px rgba(0,0,0,0.1);
          margin-bottom: 30px;
        ">
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
            <div>
              <div style="font-size: 14px; color: #6b7280; margin-bottom: 4px;">初始体重</div>
              <div style="font-size: 28px; font-weight: bold; color: #1f2937;">
                ${initialWeight.toFixed(1)}kg
              </div>
            </div>
            <div>
              <div style="font-size: 14px; color: #6b7280; margin-bottom: 4px;">当前体重</div>
              <div style="font-size: 28px; font-weight: bold; color: #16a34a;">
                ${currentWeight.toFixed(1)}kg
              </div>
            </div>
          </div>

          <div style="
            background: linear-gradient(135deg, #16a34a 0%, #22c55e 100%);
            padding: 16px;
            border-radius: 8px;
            margin-bottom: 16px;
          ">
            <div style="font-size: 20px; font-weight: bold; color: white; margin: 0;">
              🎉 ${period}减重 ${weightLoss.toFixed(1)}kg
            </div>
            <div style="font-size: 14px; color: #d1fae5; margin-top: 4px;">
              减重幅度 ${weightLossPercent.toFixed(1)}%
            </div>
          </div>

          <div style="
            background: #f0fdf4;
            padding: 12px;
            border-radius: 6px;
            border-left: 4px solid #16a34a;
          ">
            <div style="font-size: 12px; color: #15803d; font-weight: 600; margin: 0;">
              健康管理，贵在坚持！
            </div>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * 连续打卡庆祝HTML模板
   */
  private createStreakCelebrationHTML(
    data: any,
    config: ImageGenerationConfig,
  ): string {
    const { memberName, streakDays, currentStreak, bestStreak, period, icon } =
      data;

    return `
      <div style="
        width: ${config.width}px;
        height: ${config.height}px;
        background: linear-gradient(135deg, #fce7f3 0%, #fda4af 100%);
        font-family: ${config.fontFamily};
        color: #1f2937;
        padding: 40px;
        box-sizing: border-box;
        text-align: center;
        position: relative;
        overflow: hidden;
        border-radius: 16px;
        box-shadow: 0 10px 25px rgba(0,0,0,0.1);
      ">
        ${
  config.branding
    ? `
          <div style="
            position: absolute;
            top: 20px;
            right: 20px;
            font-size: 12px;
            color: #dc2626;
            opacity: 0.7;
          ">Health Butler</div>
        `
    : ""
}

        <div style="margin-bottom: 30px;">
          <div style="
            width: 100px;
            height: 100px;
            background: white;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 20px;
            font-size: 50px;
            box-shadow: 0 8px 20px rgba(220,38,38,0.2);
            animation: pulse 2s infinite;
          ">${icon}</div>
          
          <h1 style="font-size: 28px; font-weight: bold; margin: 0; color: #dc2626;">
            连续打卡${streakDays}天！
          </h1>
          <p style="font-size: 16px; color: #7f1d1d; margin: 8px 0 0 0;">
            ${period}坚持
          </p>
        </div>

        <div style="
          background: white;
          padding: 24px;
          border-radius: 16px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        ">
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
            <div style="text-align: center;">
              <div style="font-size: 32px; font-weight: bold; color: #dc2626;">
                🔥 ${currentStreak}
              </div>
              <div style="font-size: 14px; color: #6b7280; margin-top: 4px;">
                当前连续
              </div>
            </div>
            <div style="text-align: center;">
              <div style="font-size: 32px; font-weight: bold; color: #ea580c;">
                🏆 ${bestStreak}
              </div>
              <div style="font-size: 14px; color: #6b7280; margin-top: 4px;">
                最佳记录
              </div>
            </div>
          </div>

          <div style="
            background: #fef2f2;
            padding: 16px;
            border-radius: 8px;
            margin-top: 20px;
            text-align: center;
          ">
            <div style="font-size: 16px; font-weight: 600; color: #dc2626; margin: 0;">
              ${memberName}的坚持令人敬佩！
            </div>
            <div style="font-size: 14px; color: #7f1d1d; margin-top: 8px;">
              继续保持，向着更健康的生活前进！
            </div>
          </div>
        </div>
      </div>

      <style>
        @keyframes pulse {
          0% { transform: scale(1); }
          50% { transform: scale(1.1); }
          100% { transform: scale(1); }
        }
      </style>
    `;
  }

  /**
   * 食谱卡片HTML模板
   */
  private createRecipeCardHTML(
    data: any,
    config: ImageGenerationConfig,
  ): string {
    const {
      recipeName,
      memberName,
      calories,
      protein,
      ingredients,
      createdAt,
    } = data;
    const dateStr = format(new Date(createdAt), "MM月dd日", { locale: zhCN });

    return `
      <div style="
        width: ${config.width}px;
        height: ${config.height}px;
        background: linear-gradient(135deg, #fff7ed 0%, #fed7aa 100%);
        font-family: ${config.fontFamily};
        color: #1f2937;
        padding: 40px;
        box-sizing: border-box;
        position: relative;
        overflow: hidden;
        border-radius: 16px;
        box-shadow: 0 10px 25px rgba(0,0,0,0.1);
      ">
        ${
  config.branding
    ? `
          <div style="
            position: absolute;
            top: 20px;
            right: 20px;
            font-size: 12px;
            color: #c2410c;
            opacity: 0.7;
          ">Health Butler</div>
        `
    : ""
}

        <div style="margin-bottom: 20px;">
          <h1 style="font-size: 28px; font-weight: bold; margin: 0 0 8px 0; color: #c2410c;">
            🍽️ ${recipeName}
          </h1>
          <p style="font-size: 14px; color: #7c2d12; margin: 0;">
            由${memberName}创建 • ${dateStr}
          </p>
        </div>

        <div style="
          background: white;
          padding: 20px;
          border-radius: 12px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
          margin-bottom: 20px;
        ">
          <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; margin-bottom: 16px;">
            <div style="text-align: center;">
              <div style="font-size: 24px; font-weight: bold; color: #ea580c;">
                ${Math.round(calories || 0)}
              </div>
              <div style="font-size: 12px; color: #6b7280; margin-top: 2px;">
                卡路里
              </div>
            </div>
            <div style="text-align: center;">
              <div style="font-size: 24px; font-weight: bold; color: #c2410c;">
                ${Math.round(protein || 0)}g
              </div>
              <div style="font-size: 12px; color: #6b7280; margin-top: 2px;">
                蛋白质
              </div>
            </div>
            <div style="text-align: center;">
              <div style="font-size: 24px; font-weight: bold; color: #16a34a;">
                ${ingredients.length}
              </div>
              <div style="font-size: 12px; color: #6b7280; margin-top: 2px;">
                食材
              </div>
            </div>
          </div>

          <div style="background: #fef3c7; padding: 12px; border-radius: 6px;">
            <div style="font-size: 12px; color: #78350f; font-weight: 600; margin: 0;">
              主要食材：${ingredients.slice(0, 4).join("、")}${ingredients.length > 4 ? "..." : ""}
            </div>
          </div>
        </div>

        <div style="
          background: #f0f9ff;
          padding: 12px;
          border-radius: 6px;
          text-align: center;
          border-left: 4px solid #0369a1;
        ">
          <div style="font-size: 14px; color: #0369a1; font-weight: 600; margin: 0;">
            营养美味，健康生活！
          </div>
        </div>
      </div>
    `;
  }

  /**
   * 个人记录HTML模板
   */
  private createPersonalRecordHTML(
    data: any,
    config: ImageGenerationConfig,
  ): string {
    const { memberName, title, description, recordDate, icon } = data;
    const dateStr = format(new Date(recordDate), "yyyy年MM月dd日 HH:mm", {
      locale: zhCN,
    });

    return `
      <div style="
        width: ${config.width}px;
        height: ${config.height}px;
        background: linear-gradient(135deg, #f3e8ff 0%, #e9d5ff 100%);
        font-family: ${config.fontFamily};
        color: #1f2937;
        padding: 40px;
        box-sizing: border-box;
        text-align: center;
        position: relative;
        overflow: hidden;
        border-radius: 16px;
        box-shadow: 0 10px 25px rgba(0,0,0,0.1);
      ">
        ${
  config.branding
    ? `
          <div style="
            position: absolute;
            top: 20px;
            right: 20px;
            font-size: 12px;
            color: #7c3aed;
            opacity: 0.7;
          ">Health Butler</div>
        `
    : ""
}

        <div style="margin-bottom: 30px;">
          <div style="
            width: 100px;
            height: 100px;
            background: white;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 20px;
            font-size: 50px;
            box-shadow: 0 8px 20px rgba(124,58,237,0.2);
          ">${icon}</div>
        </div>

        <div style="
          background: white;
          padding: 30px;
          border-radius: 16px;
          box-shadow: 0 8px 20px rgba(0,0,0,0.1);
        ">
          <h1 style="font-size: 24px; font-weight: bold; margin: 0 0 12px 0; color: #7c3aed;">
            ${title}
          </h1>
          <p style="font-size: 16px; color: #6b7280; margin: 0 0 16px 0; line-height: 1.5;">
            ${description}
          </p>
          <div style="font-size: 14px; color: #6b7280; margin: 0;">
            <span style="font-weight: 600;">时间：</span>${dateStr}
          </div>
        </div>

        <div style="font-size: 16px; color: #7c3aed; font-weight: 600; margin-top: 20px;">
          恭喜${memberName}创造新纪录！
        </div>
      </div>
    `;
  }

  /**
   * 社区帖子HTML模板
   */
  private createCommunityPostHTML(
    data: any,
    config: ImageGenerationConfig,
  ): string {
    const { title, content, imageUrl, authorName, createdAt } = data;
    const dateStr = format(new Date(createdAt), "yyyy年MM月dd日", {
      locale: zhCN,
    });

    return `
      <div style="
        width: ${config.width}px;
        height: ${config.height}px;
        background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
        font-family: ${config.fontFamily};
        color: #1f2937;
        padding: 40px;
        box-sizing: border-box;
        position: relative;
        overflow: hidden;
        border-radius: 16px;
        box-shadow: 0 10px 25px rgba(0,0,0,0.1);
      ">
        ${
  imageUrl
    ? `
          <div style="
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 200px;
            background: url('${imageUrl}') center/cover;
            border-radius: 16px 16px 0 0;
          "></div>
          <div style="height: 200px;"></div>
        `
    : ""
}

        <div style="${imageUrl ? "margin-top: 30px;" : ""}">
          <h1 style="font-size: 24px; font-weight: bold; margin: 0 0 12px 0; color: #15803d;">
            ${title || "社区分享"}
          </h1>
          <div style="font-size: 14px; color: #6b7280; margin-bottom: 20px;">
            ${authorName} • ${dateStr}
          </div>

          <div style="
            background: white;
            padding: 20px;
            border-radius: 12px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
            margin-bottom: 20px;
          ">
            <p style="font-size: 16px; color: #1f2937; margin: 0; line-height: 1.6;">
              ${content}
            </p>
          </div>

          <div style="
            background: #ecfdf5;
            padding: 12px;
            border-radius: 6px;
            text-align: center;
            border-left: 4px solid #16a34a;
          ">
            <div style="font-size: 14px; color: #15803d; font-weight: 600; margin: 0;">
              来自Health Butler社区 • 分享健康生活
            </div>
          </div>
        </div>
      </div>
    `;
  }
}

// 导出单例实例
export const shareImageGenerator = ShareImageGenerator.getInstance();

// 导出工具函数
export async function generateShareImage(
  template: ShareTemplate,
  data: any,
  config?: Partial<any>,
): Promise<string> {
  const generator = ShareImageGenerator.getInstance();
  return generator.generateShareImage(template, data, config);
}

export async function generateSharePreview(
  template: ShareTemplate,
  data: any,
): Promise<string> {
  const generator = ShareImageGenerator.getInstance();
  const config = SHARE_TEMPLATE_CONFIGS[template];
  return generator.generateShareImage(template, data, {
    ...config,
    quality: 70, // 预览质量稍低
    width: 600, // 预览尺寸较小
    height: 315,
  });
}
