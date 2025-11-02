/**
 * 社交分享功能相关类型定义
 */

import type {
  SharedContent,
  Achievement,
  LeaderboardEntry,
  SharePrivacyLevel,
  ShareTrackingEventType,
  CommunityPost,
  AchievementType,
  AchievementRarity,
  LeaderboardType,
  CommunityPostType,
  CommunityPostStatus
} from '@prisma/client'

/**
 * 分享内容输入类型
 */
export interface ShareContentInput {
  memberId: string
  type: ShareContentType
  title: string
  description?: string
  imageUrl?: string
  targetId?: string // 关联的目标ID（如health data ID, achievement ID等）
  privacyLevel: SharePrivacyLevel
  platforms: SocialPlatform[]
  customMessage?: string
}

/**
 * 分享内容类型
 */
export enum ShareContentType {
  HEALTH_REPORT = 'HEALTH_REPORT', // 健康报告
  GOAL_ACHIEVED = 'GOAL_ACHIEVED', // 目标达成
  RECIPE_CREATED = 'RECIPE_CREATED', // 食谱创建
  ACHIEVEMENT_UNLOCKED = 'ACHIEVEMENT_UNLOCKED', // 成就解锁
  MEAL_PLAN_COMPLETED = 'MEAL_PLAN_COMPLETED', // 餐食计划完成
  WEIGHT_MILESTONE = 'WEIGHT_MILESTONE', // 体重里程碑
  CHECKIN_STREAK = 'CHECKIN_STREAK', // 连续打卡
  PERSONAL_RECORD = 'PERSONAL_RECORD', // 个人记录
  COMMUNITY_POST = 'COMMUNITY_POST' // 社区帖子
}

/**
 * 社交平台类型
 */
export enum SocialPlatform {
  WECHAT = 'WECHAT', // 微信
  MOMENTS = 'MOMENTS', // 朋友圈
  WEIBO = 'WEIBO', // 微博
  QQ = 'QQ', // QQ
  LINKEDIN = 'LINKEDIN', // 领英
  TWITTER = 'TWITTER', // Twitter
  FACEBOOK = 'FACEBOOK', // Facebook
  INSTAGRAM = 'INSTAGRAM', // Instagram
  COPY_LINK = 'COPY_LINK', // 复制链接
  DOWNLOAD = 'DOWNLOAD' // 下载图片
}

/**
 * 分享内容生成结果
 */
export interface ShareContentResult {
  content: SharedContent
  imageUrl?: string
  shareUrl: string
  platforms: SocialPlatform[]
  metadata: ShareMetadata
}

/**
 * 分享元数据
 */
export interface ShareMetadata {
  openGraph?: OpenGraphMetadata
  twitterCard?: TwitterCardMetadata
  customParams?: Record<string, any>
}

/**
 * Open Graph 元数据
 */
export interface OpenGraphMetadata {
  title: string
  description: string
  image: string
  url: string
  type: string
  siteName: string
}

/**
 * Twitter Card 元数据
 */
export interface TwitterCardMetadata {
  card: 'summary_large_image' | 'summary'
  title: string
  description: string
  image: string
  site: string
}

/**
 * 图片生成配置
 */
export interface ImageGenerationConfig {
  template: ShareTemplate
  width: number
  height: number
  format: 'png' | 'jpeg' | 'webp'
  quality: number
  backgroundColor: string
  fontFamily: string
  branding: boolean
}

/**
 * 分享模板类型
 */
export enum ShareTemplate {
  HEALTH_REPORT = 'HEALTH_REPORT',
  GOAL_ACHIEVED = 'GOAL_ACHIEVED',
  ACHIEVEMENT_UNLOCKED = 'ACHIEVEMENT_UNLOCKED',
  WEIGHT_LOSS = 'WEIGHT_LOSS',
  STREAK_CELEBRATION = 'STREAK_CELEBRATION',
  RECIPE_CARD = 'RECIPE_CARD',
  PERSONAL_RECORD = 'PERSONAL_RECORD',
  COMMUNITY_POST = 'COMMUNITY_POST'
}

/**
 * 成就触发条件
 */
export interface AchievementTrigger {
  type: AchievementType
  conditions: AchievementCondition[]
  rewards: AchievementReward[]
  checkFunction: (memberId: string, data?: any) => boolean
}

/**
 * 成就条件
 */
export interface AchievementCondition {
  metric: string
  operator: 'gte' | 'lte' | 'eq' | 'gt' | 'lt'
  value: number
  timeframe?: 'daily' | 'weekly' | 'monthly' | 'all-time'
}

/**
 * 成就奖励
 */
export interface AchievementReward {
  type: 'points' | 'badge' | 'title' | 'vip_days'
  value: number | string
  description: string
}

/**
 * 排行榜条目数据
 */
export interface LeaderboardEntryData {
  memberId: string
  memberName: string
  value: number
  rank: number
  change: 'up' | 'down' | 'same' | 'new'
  changeValue?: number
  avatar?: string
  platform?: string
}

/**
 * 分享追踪数据
 */
export interface ShareTrackingData {
  shareToken: string
  eventType: ShareTrackingEventType
  platform?: string
  userAgent?: string
  ipAddress?: string
  referrer?: string
  metadata?: Record<string, any>
}

/**
 * 社区帖子输入类型
 */
export interface CommunityPostInput {
  memberId: string
  type: CommunityPostType
  title?: string
  content: string
  imageUrl?: string
  tags?: string[]
  mentions?: string[]
  privacyLevel: SharePrivacyLevel
  status?: CommunityPostStatus
}

/**
 * 邀请奖励配置
 */
export interface InvitationReward {
  inviteeReward: {
    vipDays: number
    points: number
    description: string
  }
  inviterReward: {
    vipDays: number
    points: number
    description: string
  }
  maxRewards?: number
}

/**
 * 分享统计信息
 */
export interface ShareStats {
  totalShares: number
  totalClicks: number
  totalConversions: number
  conversionRate: number
  platformBreakdown: Array<{
    platform: SocialPlatform
    shares: number
    clicks: number
    conversions: number
  }>
  topPerformingContent: Array<{
    shareToken: string
    title: string
    shares: number
    clicks: number
  }>
}

/**
 * 社交分享配置映射
 */
export const SHARE_CONTENT_TYPE_LABELS: Record<ShareContentType, string> = {
  [ShareContentType.HEALTH_REPORT]: '健康报告',
  [ShareContentType.GOAL_ACHIEVED]: '目标达成',
  [ShareContentType.RECIPE_CREATED]: '食谱创建',
  [ShareContentType.ACHIEVEMENT_UNLOCKED]: '成就解锁',
  [ShareContentType.MEAL_PLAN_COMPLETED]: '餐食计划完成',
  [ShareContentType.WEIGHT_MILESTONE]: '体重里程碑',
  [ShareContentType.CHECKIN_STREAK]: '连续打卡',
  [ShareContentType.PERSONAL_RECORD]: '个人记录',
  [ShareContentType.COMMUNITY_POST]: '社区帖子'
}

/**
 * 社交平台配置映射
 */
export const SOCIAL_PLATFORM_LABELS: Record<SocialPlatform, string> = {
  [SocialPlatform.WECHAT]: '微信',
  [SocialPlatform.MOMENTS]: '朋友圈',
  [SocialPlatform.WEIBO]: '微博',
  [SocialPlatform.QQ]: 'QQ',
  [SocialPlatform.LINKEDIN]: '领英',
  [SocialPlatform.TWITTER]: 'Twitter',
  [SocialPlatform.FACEBOOK]: 'Facebook',
  [SocialPlatform.INSTAGRAM]: 'Instagram',
  [SocialPlatform.COPY_LINK]: '复制链接',
  [SocialPlatform.DOWNLOAD]: '下载图片'
}

/**
 * 分享模板配置
 */
export const SHARE_TEMPLATE_CONFIGS: Record<ShareTemplate, ImageGenerationConfig> = {
  [ShareTemplate.HEALTH_REPORT]: {
    template: ShareTemplate.HEALTH_REPORT,
    width: 1200,
    height: 630,
    format: 'png',
    quality: 90,
    backgroundColor: '#f8fafc',
    fontFamily: 'Inter, sans-serif',
    branding: true
  },
  [ShareTemplate.GOAL_ACHIEVED]: {
    template: ShareTemplate.GOAL_ACHIEVED,
    width: 1200,
    height: 630,
    format: 'png',
    quality: 90,
    backgroundColor: '#fef3c7',
    fontFamily: 'Inter, sans-serif',
    branding: true
  },
  [ShareTemplate.ACHIEVEMENT_UNLOCKED]: {
    template: ShareTemplate.ACHIEVEMENT_UNLOCKED,
    width: 1200,
    height: 630,
    format: 'png',
    quality: 90,
    backgroundColor: '#dbeafe',
    fontFamily: 'Inter, sans-serif',
    branding: true
  },
  [ShareTemplate.WEIGHT_LOSS]: {
    template: ShareTemplate.WEIGHT_LOSS,
    width: 1200,
    height: 630,
    format: 'png',
    quality: 90,
    backgroundColor: '#dcfce7',
    fontFamily: 'Inter, sans-serif',
    branding: true
  },
  [ShareTemplate.STREAK_CELEBRATION]: {
    template: ShareTemplate.STREAK_CELEBRATION,
    width: 1200,
    height: 630,
    format: 'png',
    quality: 90,
    backgroundColor: '#fce7f3',
    fontFamily: 'Inter, sans-serif',
    branding: true
  },
  [ShareTemplate.RECIPE_CARD]: {
    template: ShareTemplate.RECIPE_CARD,
    width: 1200,
    height: 630,
    format: 'png',
    quality: 90,
    backgroundColor: '#fff7ed',
    fontFamily: 'Inter, sans-serif',
    branding: true
  },
  [ShareTemplate.PERSONAL_RECORD]: {
    template: ShareTemplate.PERSONAL_RECORD,
    width: 1200,
    height: 630,
    format: 'png',
    quality: 90,
    backgroundColor: '#f3e8ff',
    fontFamily: 'Inter, sans-serif',
    branding: true
  },
  [ShareTemplate.COMMUNITY_POST]: {
    template: ShareTemplate.COMMUNITY_POST,
    width: 1200,
    height: 630,
    format: 'png',
    quality: 90,
    backgroundColor: '#f0fdf4',
    fontFamily: 'Inter, sans-serif',
    branding: false
  }
}

/**
 * 成就类型配置
 */
export const ACHIEVEMENT_TYPE_CONFIGS: Record<AchievementType, {
  label: string
  description: string
  icon: string
  color: string
  rarity: AchievementRarity
  points: number
}> = {
  [AchievementType.FIRST_LOGIN]: {
    label: '首次登录',
    description: '完成首次登录',
    icon: '🎯',
    color: '#3b82f6',
    rarity: 'COMMON',
    points: 10
  },
  [AchievementType.SEVEN_DAY_STREAK]: {
    label: '连续打卡7天',
    description: '连续7天记录健康数据',
    icon: '🔥',
    color: '#ef4444',
    rarity: 'UNCOMMON',
    points: 50
  },
  [AchievementType.MONTHLY_CHAMPION]: {
    label: '月度健康达人',
    description: '一个月内健康评分最高',
    icon: '👑',
    color: '#f59e0b',
    rarity: 'RARE',
    points: 200
  },
  [AchievementType.WEIGHT_GOAL_ACHIEVED]: {
    label: '减重目标达成',
    description: '成功达到设定的减重目标',
    icon: '🎯',
    color: '#10b981',
    rarity: 'UNCOMMON',
    points: 100
  },
  [AchievementType.RECIPE_MASTER]: {
    label: '食谱达人',
    description: '创建10个以上食谱',
    icon: '👨‍🍳',
    color: '#8b5cf6',
    rarity: 'RARE',
    points: 150
  },
  [AchievementType.SOCIAL_BUTTERFLY]: {
    label: '社交达人',
    description: '分享健康内容超过20次',
    icon: '🦋',
    color: '#ec4899',
    rarity: 'EPIC',
    points: 300
  },
  [AchievementType.PERFECT_WEEK]: {
    label: '完美一周',
    description: '一周内所有健康指标达标',
    icon: '⭐',
    color: '#22c55e',
    rarity: 'RARE',
    points: 180
  },
  [AchievementType.EARLY_BIRD]: {
    label: '早起达人',
    description: '连续30天早上7点前记录早餐',
    icon: '🐦',
    color: '#06b6d4',
    rarity: 'UNCOMMON',
    points: 80
  },
  [AchievementType.CALORIE_CHAMPION]: {
    label: '卡路里管理大师',
    description: '连续30天每日卡路里摄入在目标范围内',
    icon: '🏃',
    color: '#84cc16',
    rarity: 'EPIC',
    points: 250
  },
  [AchievementType.INVITE_MASTER]: {
    label: '邀请达人',
    description: '成功邀请5位好友注册',
    icon: '👥',
    color: '#f97316',
    rarity: 'RARE',
    points: 200
  }
}

/**
 * 排行榜类型配置
 */
export const LEADERBOARD_TYPE_CONFIGS: Record<LeaderboardType, {
  label: string
  description: string
  unit: string
  sortDirection: 'asc' | 'desc'
  timeframe: 'daily' | 'weekly' | 'monthly' | 'all-time'
}> = {
  [LeaderboardType.HEALTH_SCORE]: {
    label: '健康评分',
    description: '综合健康指标评分',
    unit: '分',
    sortDirection: 'desc',
    timeframe: 'weekly'
  },
  [LeaderboardType.CHECKIN_STREAK]: {
    label: '连续打卡',
    description: '连续记录天数',
    unit: '天',
    sortDirection: 'desc',
    timeframe: 'all-time'
  },
  [LeaderboardType.WEIGHT_LOSS]: {
    label: '减重排行',
    description: '累计减重量',
    unit: 'kg',
    sortDirection: 'desc',
    timeframe: 'monthly'
  },
  [LeaderboardType.EXERCISE_MINUTES]: {
    label: '运动时长',
    description: '累计运动时间',
    unit: '分钟',
    sortDirection: 'desc',
    timeframe: 'weekly'
  },
  [LeaderboardType.CALORIES_MANAGEMENT]: {
    label: '卡路里管理',
    description: '卡路里控制准确率',
    unit: '%',
    sortDirection: 'desc',
    timeframe: 'monthly'
  }
}
