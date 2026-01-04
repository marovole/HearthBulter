import { PrismaClient, NotificationType } from "@prisma/client";

export interface TemplateVariable {
  name: string;
  type: "string" | "number" | "date" | "boolean";
  description: string;
  required?: boolean;
}

export interface RenderedTemplate {
  title: string;
  content: string;
}

export class TemplateEngine {
  private prisma: PrismaClient;
  private templateCache: Map<string, any> = new Map();

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * 渲染通知模板
   */
  async renderNotification(
    type: NotificationType,
    data?: Record<string, any>,
  ): Promise<RenderedTemplate> {
    const template = await this.getTemplate(type);

    if (!template) {
      throw new Error(`Template not found for type: ${type}`);
    }

    const title = this.renderText(template.titleTemplate, data);
    const content = this.renderText(template.contentTemplate, data);

    // 更新使用统计
    await this.updateTemplateStats(template.id);

    return { title, content };
  }

  /**
   * 渲染渠道特定模板
   */
  async renderChannelTemplate(
    type: NotificationType,
    channel: string,
    data?: Record<string, any>,
  ): Promise<RenderedTemplate | null> {
    const template = await this.getTemplate(type);

    if (!template) {
      return null;
    }

    const channelTemplates = JSON.parse(template.channelTemplates || "{}");
    const channelTemplate = channelTemplates[channel];

    if (!channelTemplate) {
      // 回退到默认模板
      return await this.renderNotification(type, data);
    }

    const title = this.renderText(
      channelTemplate.title || template.titleTemplate,
      data,
    );
    const content = this.renderText(
      channelTemplate.content || template.contentTemplate,
      data,
    );

    return { title, content };
  }

  /**
   * 渲染文本模板
   */
  renderText(template: string, data?: Record<string, any>): string {
    if (!template || !data) {
      return template;
    }

    // 简单的模板变量替换 {{variableName}}
    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      const value = this.getNestedValue(data, key);
      return value !== undefined ? String(value) : match;
    });
  }

  /**
   * 渲染多语言模板
   */
  async renderLocalizedTemplate(
    type: NotificationType,
    locale: string = "zh-CN",
    data?: Record<string, any>,
  ): Promise<RenderedTemplate> {
    const template = await this.getTemplate(type);

    if (!template) {
      throw new Error(`Template not found for type: ${type}`);
    }

    const translations = JSON.parse(template.translations || "{}");
    const localizedTemplate = translations[locale];

    const titleTemplate = localizedTemplate?.title || template.titleTemplate;
    const contentTemplate =
      localizedTemplate?.content || template.contentTemplate;

    const title = this.renderText(titleTemplate, data);
    const content = this.renderText(contentTemplate, data);

    return { title, content };
  }

  /**
   * 获取模板变量定义
   */
  async getTemplateVariables(
    type: NotificationType,
  ): Promise<TemplateVariable[]> {
    const template = await this.getTemplate(type);

    if (!template) {
      return [];
    }

    return JSON.parse(template.variables || "[]");
  }

  /**
   * 验证模板数据
   */
  async validateTemplateData(
    type: NotificationType,
    data: Record<string, any>,
  ): Promise<{ isValid: boolean; missingVariables: string[] }> {
    const variables = await this.getTemplateVariables(type);
    const missingVariables: string[] = [];

    for (const variable of variables) {
      if (variable.required && !this.hasValue(data, variable.name)) {
        missingVariables.push(variable.name);
      }
    }

    return {
      isValid: missingVariables.length === 0,
      missingVariables,
    };
  }

  /**
   * 创建或更新模板
   */
  async upsertTemplate(data: {
    type: NotificationType;
    titleTemplate: string;
    contentTemplate: string;
    channelTemplates?: string;
    variables?: string;
    isActive?: boolean;
    version?: string;
    defaultChannels?: string;
    defaultPriority?: any;
    translations?: string;
    description?: string;
    category?: string;
  }) {
    const existingTemplate = await this.prisma.notificationTemplate.findUnique({
      where: { type: data.type },
    });

    if (existingTemplate) {
      return await this.prisma.notificationTemplate.update({
        where: { type: data.type },
        data: {
          ...data,
          updatedAt: new Date(),
        },
      });
    } else {
      return await this.prisma.notificationTemplate.create({
        data: {
          ...data,
          usageCount: 0,
        },
      });
    }
  }

  /**
   * 获取所有模板
   */
  async getAllTemplates(
    options: {
      isActive?: boolean;
      category?: string;
      limit?: number;
      offset?: number;
    } = {},
  ) {
    const where: any = {};

    if (options.isActive !== undefined) {
      where.isActive = options.isActive;
    }

    if (options.category) {
      where.category = options.category;
    }

    const [templates, total] = await Promise.all([
      this.prisma.notificationTemplate.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: options.limit || 50,
        skip: options.offset || 0,
      }),
      this.prisma.notificationTemplate.count({ where }),
    ]);

    return {
      templates,
      total,
      hasMore: (options.offset || 0) + templates.length < total,
    };
  }

  /**
   * 删除模板
   */
  async deleteTemplate(type: NotificationType): Promise<void> {
    await this.prisma.notificationTemplate.delete({
      where: { type },
    });
  }

  /**
   * 预览模板渲染结果
   */
  async previewTemplate(
    type: NotificationType,
    data: Record<string, any>,
    locale?: string,
  ): Promise<RenderedTemplate> {
    if (locale) {
      return await this.renderLocalizedTemplate(type, locale, data);
    } else {
      return await this.renderNotification(type, data);
    }
  }

  /**
   * 获取模板使用统计
   */
  async getTemplateStats(type?: NotificationType) {
    const where = type ? { type } : {};

    const templates = await this.prisma.notificationTemplate.findMany({
      where,
      select: {
        type: true,
        usageCount: true,
        lastUsed: true,
        category: true,
        isActive: true,
      },
      orderBy: {
        usageCount: "desc",
      },
    });

    return templates.map((template) => ({
      ...template,
      lastUsed: template.lastUsed?.toISOString(),
    }));
  }

  /**
   * 获取模板
   */
  private async getTemplate(type: NotificationType) {
    // 检查缓存
    const cacheKey = `template_${type}`;
    if (this.templateCache.has(cacheKey)) {
      const cached = this.templateCache.get(cacheKey);
      if (Date.now() - cached.timestamp < 5 * 60 * 1000) {
        // 5分钟缓存
        return cached.template;
      }
    }

    const template = await this.prisma.notificationTemplate.findUnique({
      where: { type },
    });

    if (template) {
      // 缓存模板
      this.templateCache.set(cacheKey, {
        template,
        timestamp: Date.now(),
      });
    }

    return template;
  }

  /**
   * 更新模板使用统计
   */
  private async updateTemplateStats(templateId: string): Promise<void> {
    await this.prisma.notificationTemplate.update({
      where: { id: templateId },
      data: {
        usageCount: {
          increment: 1,
        },
        lastUsed: new Date(),
      },
    });
  }

  /**
   * 获取嵌套对象的值
   */
  private getNestedValue(obj: any, path: string): any {
    return path.split(".").reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : undefined;
    }, obj);
  }

  /**
   * 检查对象是否有值
   */
  private hasValue(obj: any, path: string): boolean {
    const value = this.getNestedValue(obj, path);
    return value !== undefined && value !== null && value !== "";
  }

  /**
   * 清理模板缓存
   */
  clearCache(): void {
    this.templateCache.clear();
  }

  /**
   * 预热模板缓存
   */
  async warmupCache(): Promise<void> {
    const templates = await this.prisma.notificationTemplate.findMany({
      where: { isActive: true },
    });

    templates.forEach((template) => {
      const cacheKey = `template_${template.type}`;
      this.templateCache.set(cacheKey, {
        template,
        timestamp: Date.now(),
      });
    });
  }

  /**
   * 批量渲染模板
   */
  async batchRender(
    requests: Array<{
      type: NotificationType;
      data?: Record<string, any>;
      locale?: string;
    }>,
  ): Promise<RenderedTemplate[]> {
    const results: RenderedTemplate[] = [];

    for (const request of requests) {
      try {
        const result = request.locale
          ? await this.renderLocalizedTemplate(
              request.type,
              request.locale,
              request.data,
            )
          : await this.renderNotification(request.type, request.data);
        results.push(result);
      } catch (error) {
        console.error(
          `Failed to render template for type ${request.type}:`,
          error,
        );
        // 返回默认模板
        results.push({
          title: "通知",
          content: "您有一条新通知",
        });
      }
    }

    return results;
  }
}
