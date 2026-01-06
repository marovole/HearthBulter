/**
 * 社交平台OAuth服务
 * 管理微信、微博等平台的授权和分享
 */

import { createHash, randomBytes } from "crypto";
import type { SocialPlatform } from "@/types/social-sharing";

/**
 * OAuth配置接口
 */
export interface SocialOAuthConfig {
  appId: string;
  appSecret: string;
  redirectUri: string;
  scope: string[];
  tokenEndpoint: string;
  userInfoEndpoint: string;
}

/**
 * 访问令牌接口
 */
export interface SocialAccessToken {
  accessToken: string;
  refreshToken?: string;
  expiresIn: number;
  scope: string;
  tokenType: string;
  platform: SocialPlatform;
}

/**
 * 用户信息接口
 */
export interface SocialUserInfo {
  id: string;
  nickname: string;
  avatar?: string;
  gender?: "male" | "female" | "unknown";
  location?: string;
  platform: SocialPlatform;
}

/**
 * 分享内容接口
 */
export interface SocialShareContent {
  title: string;
  description: string;
  imageUrl?: string;
  url?: string;
  hashtags?: string[];
  mentionUsers?: string[];
}

/**
 * 分享结果接口
 */
export interface SocialShareResult {
  success: boolean;
  platform: SocialPlatform;
  postId?: string;
  shareUrl?: string;
  error?: string;
}

/**
 * 社交OAuth服务类
 */
export class SocialOAuthService {
  private static instance: SocialOAuthService;
  private configs: Map<SocialPlatform, SocialOAuthConfig> = new Map();
  private tokens: Map<string, SocialAccessToken> = new Map();
  private stateStore: Map<
    string,
    { platform: SocialPlatform; timestamp: number }
  > = new Map();

  static getInstance(): SocialOAuthService {
    if (!SocialOAuthService.instance) {
      SocialOAuthService.instance = new SocialOAuthService();
      SocialOAuthService.instance.initializeConfigs();
    }
    return SocialOAuthService.instance;
  }

  /**
   * 初始化平台配置
   */
  private initializeConfigs(): void {
    // 微信配置
    if (process.env.WECHAT_APP_ID && process.env.WECHAT_APP_SECRET) {
      this.configs.set(SocialPlatform.WECHAT, {
        appId: process.env.WECHAT_APP_ID,
        appSecret: process.env.WECHAT_APP_SECRET,
        redirectUri:
          process.env.WECHAT_REDIRECT_URI ||
          "https://health-butler.com/auth/wechat/callback",
        scope: ["snsapi_userinfo"],
        tokenEndpoint: "https://api.weixin.qq.com/sns/oauth2/access_token",
        userInfoEndpoint: "https://api.weixin.qq.com/sns/userinfo",
      });
    }

    // 微博配置
    if (process.env.WEIBO_APP_KEY && process.env.WEIBO_APP_SECRET) {
      this.configs.set(SocialPlatform.WEIBO, {
        appId: process.env.WEIBO_APP_KEY,
        appSecret: process.env.WEIBO_APP_SECRET,
        redirectUri:
          process.env.WEIBO_REDIRECT_URI ||
          "https://health-butler.com/auth/weibo/callback",
        scope: ["all"],
        tokenEndpoint: "https://api.weibo.com/oauth2/access_token",
        userInfoEndpoint: "https://api.weibo.com/2/users/show.json",
      });
    }

    // Twitter配置（示例）
    if (process.env.TWITTER_API_KEY && process.env.TWITTER_API_SECRET) {
      this.configs.set(SocialPlatform.TWITTER, {
        appId: process.env.TWITTER_API_KEY,
        appSecret: process.env.TWITTER_API_SECRET,
        redirectUri:
          process.env.TWITTER_REDIRECT_URI ||
          "https://health-butler.com/auth/twitter/callback",
        scope: ["read", "write"],
        tokenEndpoint: "https://api.twitter.com/oauth/access_token",
        userInfoEndpoint: "https://api.twitter.com/2/users/me",
      });
    }

    // Facebook配置（示例）
    if (process.env.FACEBOOK_APP_ID && process.env.FACEBOOK_APP_SECRET) {
      this.configs.set(SocialPlatform.FACEBOOK, {
        appId: process.env.FACEBOOK_APP_ID,
        appSecret: process.env.FACEBOOK_APP_SECRET,
        redirectUri:
          process.env.FACEBOOK_REDIRECT_URI ||
          "https://health-butler.com/auth/facebook/callback",
        scope: ["email", "public_profile"],
        tokenEndpoint: "https://graph.facebook.com/oauth/access_token",
        userInfoEndpoint: "https://graph.facebook.com/me",
      });
    }
  }

  /**
   * 生成授权URL
   */
  generateAuthUrl(platform: SocialPlatform, state?: string): string {
    const config = this.configs.get(platform);
    if (!config) {
      throw new Error(`平台 ${platform} 未配置`);
    }

    const authState = state || this.generateState();
    this.stateStore.set(authState, {
      platform,
      timestamp: Date.now(),
    });

    switch (platform) {
      case SocialPlatform.WECHAT:
        return this.generateWechatAuthUrl(config, authState);
      case SocialPlatform.WEIBO:
        return this.generateWeiboAuthUrl(config, authState);
      case SocialPlatform.TWITTER:
        return this.generateTwitterAuthUrl(config, authState);
      case SocialPlatform.FACEBOOK:
        return this.generateFacebookAuthUrl(config, authState);
      default:
        throw new Error(`不支持的平台: ${platform}`);
    }
  }

  /**
   * 处理OAuth回调
   */
  async handleOAuthCallback(
    platform: SocialPlatform,
    code: string,
    state: string,
  ): Promise<SocialAccessToken> {
    // 验证state
    const storedState = this.stateStore.get(state);
    if (!storedState || storedState.platform !== platform) {
      throw new Error("Invalid state parameter");
    }

    // 清理state
    this.stateStore.delete(state);

    // 获取配置
    const config = this.configs.get(platform);
    if (!config) {
      throw new Error(`平台 ${platform} 未配置`);
    }

    // 获取访问令牌
    const accessToken = await this.exchangeCodeForToken(platform, config, code);

    // 缓存令牌
    const tokenKey = `${platform}_${accessToken.accessToken.substring(0, 20)}`;
    this.tokens.set(tokenKey, accessToken);

    return accessToken;
  }

  /**
   * 获取用户信息
   */
  async getUserInfo(accessToken: SocialAccessToken): Promise<SocialUserInfo> {
    const config = this.configs.get(accessToken.platform);
    if (!config) {
      throw new Error(`平台 ${accessToken.platform} 未配置`);
    }

    try {
      const response = await fetch(config.userInfoEndpoint, {
        headers: {
          Authorization: `Bearer ${accessToken.accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch user info");
      }

      const userData = await response.json();
      return this.parseUserInfo(userData, accessToken.platform);
    } catch (error) {
      console.error(`获取${accessToken.platform}用户信息失败:`, error);
      throw new Error("Failed to fetch user info");
    }
  }

  /**
   * 分享内容到社交平台
   */
  async shareToSocialPlatform(
    accessToken: SocialAccessToken,
    content: SocialShareContent,
  ): Promise<SocialShareResult> {
    const config = this.configs.get(accessToken.platform);
    if (!config) {
      throw new Error(`平台 ${accessToken.platform} 未配置`);
    }

    try {
      switch (accessToken.platform) {
        case SocialPlatform.WECHAT:
          return await this.shareToWechat(accessToken, content);
        case SocialPlatform.WEIBO:
          return await this.shareToWeibo(accessToken, content);
        case SocialPlatform.TWITTER:
          return await this.shareToTwitter(accessToken, content);
        case SocialPlatform.FACEBOOK:
          return await this.shareToFacebook(accessToken, content);
        default:
          throw new Error(`不支持的平台: ${accessToken.platform}`);
      }
    } catch (error) {
      console.error(`分享到${accessToken.platform}失败:`, error);
      return {
        success: false,
        platform: accessToken.platform,
        error: error instanceof Error ? error.message : "分享失败",
      };
    }
  }

  /**
   * 生成微信授权URL
   */
  private generateWechatAuthUrl(
    config: SocialOAuthConfig,
    state: string,
  ): string {
    const params = new URLSearchParams({
      appid: config.appId,
      redirect_uri: config.redirectUri,
      response_type: "code",
      scope: config.scope.join(" "),
      state,
    });

    return `https://open.weixin.qq.com/connect/oauth2/authorize?${params}`;
  }

  /**
   * 生成微博授权URL
   */
  private generateWeiboAuthUrl(
    config: SocialOAuthConfig,
    state: string,
  ): string {
    const params = new URLSearchParams({
      client_id: config.appId,
      redirect_uri: config.redirectUri,
      response_type: "code",
      scope: config.scope.join(" "),
      state,
      display: "default",
    });

    return `https://api.weibo.com/oauth2/authorize?${params}`;
  }

  /**
   * 生成Twitter授权URL
   */
  private generateTwitterAuthUrl(
    config: SocialOAuthConfig,
    state: string,
  ): string {
    const params = new URLSearchParams({
      client_id: config.appId,
      redirect_uri: config.redirectUri,
      response_type: "code",
      scope: config.scope.join(" "),
      state,
      code_challenge: this.generateCodeChallenge(),
      code_challenge_method: "S256",
    });

    return `https://twitter.com/i/oauth2/authorize?${params}`;
  }

  /**
   * 生成Facebook授权URL
   */
  private generateFacebookAuthUrl(
    config: SocialOAuthConfig,
    state: string,
  ): string {
    const params = new URLSearchParams({
      client_id: config.appId,
      redirect_uri: config.redirectUri,
      response_type: "code",
      scope: config.scope.join(" "),
      state,
    });

    return `https://www.facebook.com/v18.0/dialog/oauth?${params}`;
  }

  /**
   * 交换代码获取令牌
   */
  private async exchangeCodeForToken(
    platform: SocialPlatform,
    config: SocialOAuthConfig,
    code: string,
  ): Promise<SocialAccessToken> {
    let tokenUrl = config.tokenEndpoint;
    let body: any;

    switch (platform) {
      case SocialPlatform.WECHAT:
        tokenUrl = "https://api.weixin.qq.com/sns/oauth2/access_token";
        body = {
          appid: config.appId,
          secret: config.appSecret,
          code,
          grant_type: "authorization_code",
        };
        break;

      case SocialPlatform.WEIBO:
        body = {
          client_id: config.appId,
          client_secret: config.appSecret,
          grant_type: "authorization_code",
          redirect_uri: config.redirectUri,
          code,
        };
        break;

      case SocialPlatform.TWITTER:
        body = {
          grant_type: "authorization_code",
          client_id: config.appId,
          code,
          redirect_uri: config.redirectUri,
          code_verifier: this.generateCodeVerifier(),
        };
        break;

      case SocialPlatform.FACEBOOK:
        body = {
          client_id: config.appId,
          client_secret: config.appSecret,
          redirect_uri: config.redirectUri,
          code,
        };
        break;

      default:
        throw new Error(`不支持的平台: ${platform}`);
    }

    const response = await fetch(tokenUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams(body).toString(),
    });

    if (!response.ok) {
      throw new Error("Failed to exchange code for token");
    }

    const tokenData = await response.json();
    return this.parseAccessToken(tokenData, platform);
  }

  /**
   * 解析访问令牌
   */
  private parseAccessToken(
    tokenData: any,
    platform: SocialPlatform,
  ): SocialAccessToken {
    switch (platform) {
      case SocialPlatform.WECHAT:
        return {
          accessToken: tokenData.access_token,
          refreshToken: tokenData.refresh_token,
          expiresIn: tokenData.expires_in,
          scope: tokenData.scope,
          tokenType: tokenData.token_type || "Bearer",
          platform,
        };

      case SocialPlatform.WEIBO:
        return {
          accessToken: tokenData.access_token,
          refreshToken: tokenData.refresh_token,
          expiresIn: tokenData.expires_in,
          scope: tokenData.scope || "",
          tokenType: "Bearer",
          platform,
        };

      case SocialPlatform.TWITTER:
        return {
          accessToken: tokenData.access_token,
          expiresIn: tokenData.expires_in,
          scope: tokenData.scope || "",
          tokenType: tokenData.token_type || "Bearer",
          platform,
        };

      case SocialPlatform.FACEBOOK:
        return {
          accessToken: tokenData.access_token,
          expiresIn: tokenData.expires_in,
          scope: tokenData.scope || "",
          tokenType: tokenData.token_type || "Bearer",
          platform,
        };

      default:
        throw new Error(`不支持的平台: ${platform}`);
    }
  }

  /**
   * 解析用户信息
   */
  private parseUserInfo(
    userData: any,
    platform: SocialPlatform,
  ): SocialUserInfo {
    switch (platform) {
      case SocialPlatform.WECHAT:
        return {
          id: userData.openid,
          nickname: userData.nickname,
          avatar: userData.headimgurl,
          gender:
            userData.sex === 1
              ? "male"
              : userData.sex === 2
                ? "female"
                : "unknown",
          location: `${userData.province} ${userData.city}`,
          platform,
        };

      case SocialPlatform.WEIBO:
        return {
          id: userData.idstr,
          nickname: userData.screen_name,
          avatar: userData.profile_image_url,
          gender:
            userData.gender === "m"
              ? "male"
              : userData.gender === "f"
                ? "female"
                : "unknown",
          location: userData.location,
          platform,
        };

      case SocialPlatform.TWITTER:
        return {
          id: userData.id.toString(),
          nickname: userData.name,
          avatar: userData.profile_image_url,
          gender: "unknown",
          location: userData.location,
          platform,
        };

      case SocialPlatform.FACEBOOK:
        return {
          id: userData.id,
          nickname: userData.name,
          avatar: userData.picture?.data?.url,
          gender:
            userData.gender === "male"
              ? "male"
              : userData.gender === "female"
                ? "female"
                : "unknown",
          location: userData.location?.name,
          platform,
        };

      default:
        throw new Error(`不支持的平台: ${platform}`);
    }
  }

  /**
   * 分享到微信
   */
  private async shareToWechat(
    accessToken: SocialAccessToken,
    content: SocialShareContent,
  ): Promise<SocialShareResult> {
    // 微信朋友圈分享需要通过微信JS-SDK在客户端完成
    // 这里只能模拟服务端处理

    return {
      success: true,
      platform: SocialPlatform.WECHAT,
      shareUrl: content.url,
      error: "请在微信客户端中完成分享",
    };
  }

  /**
   * 分享到微博
   */
  private async shareToWeibo(
    accessToken: SocialAccessToken,
    content: SocialShareContent,
  ): Promise<SocialShareResult> {
    try {
      const status = `${content.title}\n${content.description}`;
      const params = new URLSearchParams({
        access_token: accessToken.accessToken,
        status,
      });

      if (content.imageUrl) {
        params.append("pic", content.imageUrl);
      }

      const response = await fetch(
        "https://api.weibo.com/2/statuses/update.json",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: params.toString(),
        },
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "分享失败");
      }

      const result = await response.json();
      return {
        success: true,
        platform: SocialPlatform.WEIBO,
        postId: result.id.toString(),
        shareUrl: result.mid ? `https://weibo.com/${result.mid}` : undefined,
      };
    } catch (error) {
      return {
        success: false,
        platform: SocialPlatform.WEIBO,
        error: error instanceof Error ? error.message : "分享失败",
      };
    }
  }

  /**
   * 分享到Twitter
   */
  private async shareToTwitter(
    accessToken: SocialAccessToken,
    content: SocialShareContent,
  ): Promise<SocialShareResult> {
    try {
      const tweet = `${content.title}\n${content.description}`;
      const body: any = {
        text: tweet,
      };

      if (content.imageUrl) {
        const mediaResponse = await fetch(
          "https://upload.twitter.com/1.1/media/upload.json",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${accessToken.accessToken}`,
              "Content-Type": "application/x-www-form-urlencoded",
            },
            body: new URLSearchParams({
              media_data: content.imageUrl,
            }).toString(),
          },
        );

        if (mediaResponse.ok) {
          const mediaData = await mediaResponse.json();
          body.media = { media_ids: [mediaData.media_id_string] };
        }
      }

      const response = await fetch("https://api.twitter.com/2/tweets", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        throw new Error("Twitter分享失败");
      }

      const result = await response.json();
      return {
        success: true,
        platform: SocialPlatform.TWITTER,
        postId: result.data.id,
        shareUrl: `https://twitter.com/user/status/${result.data.id}`,
      };
    } catch (error) {
      return {
        success: false,
        platform: SocialPlatform.TWITTER,
        error: error instanceof Error ? error.message : "分享失败",
      };
    }
  }

  /**
   * 分享到Facebook
   */
  private async shareToFacebook(
    accessToken: SocialAccessToken,
    content: SocialShareContent,
  ): Promise<SocialShareResult> {
    try {
      const body: any = {
        message: `${content.title}\n${content.description}`,
        access_token: accessToken.accessToken,
      };

      if (content.imageUrl) {
        body.url = content.imageUrl;
      }

      const response = await fetch("https://graph.facebook.com/me/feed", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams(body).toString(),
      });

      if (!response.ok) {
        throw new Error("Facebook分享失败");
      }

      const result = await response.json();
      return {
        success: true,
        platform: SocialPlatform.FACEBOOK,
        postId: result.id,
        shareUrl: `https://facebook.com/${result.id}`,
      };
    } catch (error) {
      return {
        success: false,
        platform: SocialPlatform.FACEBOOK,
        error: error instanceof Error ? error.message : "分享失败",
      };
    }
  }

  /**
   * 生成state参数
   */
  private generateState(): string {
    return randomBytes(16).toString("hex");
  }

  /**
   * 生成代码挑战
   */
  private generateCodeChallenge(): string {
    const verifier = this.generateCodeVerifier();
    return createHash("sha256").update(verifier).digest("base64url");
  }

  /**
   * 生成代码验证器
   */
  private generateCodeVerifier(): string {
    return randomBytes(32).toString("base64url");
  }

  /**
   * 检查平台是否支持
   */
  isPlatformSupported(platform: SocialPlatform): boolean {
    return this.configs.has(platform);
  }

  /**
   * 获取支持的平台列表
   */
  getSupportedPlatforms(): SocialPlatform[] {
    return Array.from(this.configs.keys());
  }

  /**
   * 令牌刷新
   */
  async refreshToken(
    platform: SocialPlatform,
    refreshToken: string,
  ): Promise<SocialAccessToken> {
    const config = this.configs.get(platform);
    if (!config) {
      throw new Error(`平台 ${platform} 未配置`);
    }

    let body: any;

    switch (platform) {
      case SocialPlatform.WECHAT:
        body = {
          appid: config.appId,
          grant_type: "refresh_token",
          refresh_token: refreshToken,
        };
        break;

      case SocialPlatform.WEIBO:
        body = {
          client_id: config.appId,
          client_secret: config.appSecret,
          grant_type: "refresh_token",
          refresh_token: refreshToken,
        };
        break;

      default:
        throw new Error(`平台 ${platform} 不支持令牌刷新`);
    }

    const response = await fetch(config.tokenEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams(body).toString(),
    });

    if (!response.ok) {
      throw new Error("令牌刷新失败");
    }

    const tokenData = await response.json();
    return this.parseAccessToken(tokenData, platform);
  }

  /**
   * 撤销授权
   */
  async revokeAuthorization(
    platform: SocialPlatform,
    accessToken: string,
  ): Promise<boolean> {
    try {
      let revokeUrl: string;
      let body: any;

      switch (platform) {
        case SocialPlatform.WECHAT:
          revokeUrl = "https://api.weixin.qq.com/sns/auth";
          body = {
            access_token: accessToken,
            openid: "user_openid", // 需要用户的openid
          };
          break;

        default:
          // 其他平台可能需要不同的撤销端点
          return true;
      }

      const response = await fetch(revokeUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams(body).toString(),
      });

      return response.ok;
    } catch (error) {
      console.error(`撤销${platform}授权失败:`, error);
      return false;
    }
  }
}

// 导出单例实例
export const socialOAuthService = SocialOAuthService.getInstance();

// 导出工具函数
export function getSocialAuthUrl(
  platform: SocialPlatform,
  state?: string,
): string {
  const service = SocialOAuthService.getInstance();
  return service.generateAuthUrl(platform, state);
}

export async function handleSocialAuthCallback(
  platform: SocialPlatform,
  code: string,
  state: string,
): Promise<SocialAccessToken> {
  const service = SocialOAuthService.getInstance();
  return service.handleOAuthCallback(platform, code, state);
}

export async function getSocialUserInfo(
  accessToken: SocialAccessToken,
): Promise<SocialUserInfo> {
  const service = SocialOAuthService.getInstance();
  return service.getUserInfo(accessToken);
}

export async function shareToSocial(
  accessToken: SocialAccessToken,
  content: SocialShareContent,
): Promise<SocialShareResult> {
  const service = SocialOAuthService.getInstance();
  return service.shareToSocialPlatform(accessToken, content);
}

export function isSocialPlatformSupported(platform: SocialPlatform): boolean {
  const service = SocialOAuthService.getInstance();
  return service.isPlatformSupported(platform);
}

export function getSupportedSocialPlatforms(): SocialPlatform[] {
  const service = SocialOAuthService.getInstance();
  return service.getSupportedPlatforms();
}
