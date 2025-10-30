import { IPlatformAdapter, IPlatformAdapterFactory, PlatformError, PlatformErrorType } from './types'
import { EcommercePlatform } from '@prisma/client'
import { SamsClubAdapter } from './sams-adapter'
import { HemaAdapter } from './hema-adapter'
import { DingdongAdapter } from './dingdong-adapter'

export class PlatformAdapterFactory implements IPlatformAdapterFactory {
  private static instance: PlatformAdapterFactory
  private adapters: Map<EcommercePlatform, IPlatformAdapter> = new Map()

  private constructor() {
    this.initializeAdapters()
  }

  public static getInstance(): PlatformAdapterFactory {
    if (!PlatformAdapterFactory.instance) {
      PlatformAdapterFactory.instance = new PlatformAdapterFactory()
    }
    return PlatformAdapterFactory.instance
  }

  private initializeAdapters(): void {
    this.adapters.set(EcommercePlatform.SAMS_CLUB, new SamsClubAdapter())
    this.adapters.set(EcommercePlatform.HEMA, new HemaAdapter())
    this.adapters.set(EcommercePlatform.DINGDONG, new DingdongAdapter())
  }

  createAdapter(platform: EcommercePlatform): IPlatformAdapter {
    const adapter = this.adapters.get(platform)
    
    if (!adapter) {
      throw new PlatformError({
        type: PlatformErrorType.PLATFORM_ERROR,
        message: `Unsupported platform: ${platform}`,
        details: { platform }
      })
    }

    return adapter
  }

  getSupportedPlatforms(): EcommercePlatform[] {
    return Array.from(this.adapters.keys())
  }

  // 获取平台名称
  getPlatformName(platform: EcommercePlatform): string {
    const adapter = this.adapters.get(platform)
    return adapter?.platformName || platform
  }

  // 检查平台是否支持
  isPlatformSupported(platform: EcommercePlatform): boolean {
    return this.adapters.has(platform)
  }

  // 获取所有适配器信息
  getAllAdaptersInfo(): Array<{
    platform: EcommercePlatform
    platformName: string
    baseUrl: string
  }> {
    return Array.from(this.adapters.entries()).map(([platform, adapter]) => ({
      platform,
      platformName: adapter.platformName,
      baseUrl: adapter.baseUrl
    }))
  }
}

// 导出单例实例
export const platformAdapterFactory = PlatformAdapterFactory.getInstance()

// 便捷函数
export function createPlatformAdapter(platform: EcommercePlatform): IPlatformAdapter {
  return platformAdapterFactory.createAdapter(platform)
}

export function getSupportedPlatforms(): EcommercePlatform[] {
  return platformAdapterFactory.getSupportedPlatforms()
}

export function getPlatformName(platform: EcommercePlatform): string {
  return platformAdapterFactory.getPlatformName(platform)
}

export function isPlatformSupported(platform: EcommercePlatform): boolean {
  return platformAdapterFactory.isPlatformSupported(platform)
}
