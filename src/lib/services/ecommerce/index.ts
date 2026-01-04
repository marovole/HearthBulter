// 导出所有类型
export * from "./types";

// 导出适配器类
export { BasePlatformAdapter } from "./base-adapter";
export { SamsClubAdapter } from "./sams-adapter";
export { HemaAdapter } from "./hema-adapter";
export { DingdongAdapter } from "./dingdong-adapter";

// 导出工厂类和便捷函数
export {
  PlatformAdapterFactory,
  platformAdapterFactory,
  createPlatformAdapter,
  getSupportedPlatforms,
  getPlatformName,
  isPlatformSupported,
} from "./adapter-factory";

// 导出常量
export const ECOMMERCE_PLATFORMS = {
  SAMS_CLUB: "SAMS_CLUB" as const,
  HEMA: "HEMA" as const,
  DINGDONG: "DINGDONG" as const,
} as const;

export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

export const TOKEN_REFRESH_THRESHOLD = 60 * 60 * 1000; // 1小时
export const REQUEST_TIMEOUT = 10000; // 10秒

export const SHIPPING_FEE_DEFAULTS = {
  SAMS_CLUB: 6,
  HEMA: 0,
  DINGDONG: 3,
} as const;
