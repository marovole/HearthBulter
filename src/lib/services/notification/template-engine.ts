import { convexClient, api } from "@/lib/convex-client";
import type { Id, Doc } from "@/../convex/_generated/dataModel";

export type NotificationType =
  | "CHECK_IN_REMINDER"
  | "TASK_NOTIFICATION"
  | "EXPIRY_ALERT"
  | "BUDGET_WARNING"
  | "HEALTH_ALERT"
  | "GOAL_ACHIEVEMENT"
  | "FAMILY_ACTIVITY"
  | "SYSTEM_ANNOUNCEMENT"
  | "MARKETING"
  | "OTHER";

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

interface NotificationTemplate {
  _id: Id<"notificationTemplates">;
  type: string;
  titleTemplate: string;
  contentTemplate: string;
  channelTemplates?: unknown;
  variables?: unknown;
  isActive: boolean;
  version: string;
  defaultChannels?: unknown;
  defaultPriority?: string;
  translations?: unknown;
  description?: string;
  category?: string;
  usageCount?: number;
  lastUsed?: number;
  createdAt: number;
  updatedAt: number;
}

export class TemplateEngine {
  private templateCache: Map<string, { template: NotificationTemplate; timestamp: number }> =
    new Map();

  async renderNotification(
    type: NotificationType,
    data?: Record<string, unknown>
  ): Promise<RenderedTemplate> {
    const template = await this.getTemplate(type);

    if (!template) {
      throw new Error(`Template not found for type: ${type}`);
    }

    const title = this.renderText(template.titleTemplate, data);
    const content = this.renderText(template.contentTemplate, data);

    await this.updateTemplateStats(template.type);

    return { title, content };
  }

  async renderChannelTemplate(
    type: NotificationType,
    channel: string,
    data?: Record<string, unknown>
  ): Promise<RenderedTemplate | null> {
    const template = await this.getTemplate(type);

    if (!template) {
      return null;
    }

    const channelTemplates =
      typeof template.channelTemplates === "string"
        ? JSON.parse(template.channelTemplates as string)
        : (template.channelTemplates as Record<string, unknown> | undefined);
    const channelTemplate = channelTemplates?.[channel];

    if (!channelTemplate) {
      return await this.renderNotification(type, data);
    }

    const title = this.renderText(
      (channelTemplate as { title?: string }).title || template.titleTemplate,
      data
    );
    const content = this.renderText(
      (channelTemplate as { content?: string }).content || template.contentTemplate,
      data
    );

    return { title, content };
  }

  renderText(template: string, data?: Record<string, unknown>): string {
    if (!template || !data) {
      return template;
    }

    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      const value = this.getNestedValue(data, key);
      return value !== undefined ? String(value) : match;
    });
  }

  async renderLocalizedTemplate(
    type: NotificationType,
    locale: string = "zh-CN",
    data?: Record<string, unknown>
  ): Promise<RenderedTemplate> {
    const template = await this.getTemplate(type);

    if (!template) {
      throw new Error(`Template not found for type: ${type}`);
    }

    const translations =
      typeof template.translations === "string"
        ? JSON.parse(template.translations as string)
        : (template.translations as Record<string, unknown> | undefined);
    const localizedTemplate = translations?.[locale] as
      | { title?: string; content?: string }
      | undefined;

    const titleTemplate = localizedTemplate?.title || template.titleTemplate;
    const contentTemplate = localizedTemplate?.content || template.contentTemplate;

    const title = this.renderText(titleTemplate, data);
    const content = this.renderText(contentTemplate, data);

    return { title, content };
  }

  async getTemplateVariables(type: NotificationType): Promise<TemplateVariable[]> {
    const template = await this.getTemplate(type);

    if (!template) {
      return [];
    }

    const variables =
      typeof template.variables === "string"
        ? JSON.parse(template.variables as string)
        : (template.variables as TemplateVariable[] | undefined);
    return variables || [];
  }

  async validateTemplateData(
    type: NotificationType,
    data: Record<string, unknown>
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
  }): Promise<Id<"notificationTemplates">> {
    return await convexClient.mutation(api.notificationTemplates.upsert, {
      type: data.type,
      titleTemplate: data.titleTemplate,
      contentTemplate: data.contentTemplate,
      channelTemplates: data.channelTemplates ? JSON.parse(data.channelTemplates) : undefined,
      variables: data.variables ? JSON.parse(data.variables) : undefined,
      isActive: data.isActive ?? true,
      version: data.version ?? "1.0.0",
      defaultChannels: data.defaultChannels ? JSON.parse(data.defaultChannels) : undefined,
      defaultPriority: data.defaultPriority,
      translations: data.translations ? JSON.parse(data.translations) : undefined,
      description: data.description,
      category: data.category,
    });
  }

  async getAllTemplates(options: {
    isActive?: boolean;
    category?: string;
    limit?: number;
    offset?: number;
  }): Promise<{
    templates: NotificationTemplate[];
    total: number;
    hasMore: boolean;
  }> {
    const result = await convexClient.query<{
      data: NotificationTemplate[];
      total: number;
    }>(api.notificationTemplates.list, {
      isActive: options.isActive,
      category: options.category,
      limit: options.limit ?? 50,
      offset: options.offset,
    });

    return {
      templates: result.data,
      total: result.total,
      hasMore: (options.offset ?? 0) + result.data.length < result.total,
    };
  }

  async deleteTemplate(type: NotificationType): Promise<void> {
    await convexClient.mutation(api.notificationTemplates.deleteTemplate, {
      type,
    });
  }

  async previewTemplate(
    type: NotificationType,
    data: Record<string, unknown>,
    locale?: string
  ): Promise<RenderedTemplate> {
    if (locale) {
      return await this.renderLocalizedTemplate(type, locale, data);
    } else {
      return await this.renderNotification(type, data);
    }
  }

  async getTemplateStats(type?: NotificationType): Promise<
    Array<{
      type: string;
      usageCount: number;
      lastUsed: number | null;
      category: string | undefined;
      isActive: boolean;
    }>
  > {
    const stats = await convexClient.query<
      Array<{
        type: string;
        usageCount: number | undefined;
        lastUsed: number | undefined;
        category: string | undefined;
        isActive: boolean;
      }>
    >(api.notificationTemplates.getStats, {
      type,
    });

    return stats.map((s) => ({
      ...s,
      usageCount: s.usageCount ?? 0,
      lastUsed: s.lastUsed ?? null,
    }));
  }

  private async getTemplate(type: NotificationType): Promise<NotificationTemplate | null> {
    const cacheKey = `template_${type}`;
    const cached = this.templateCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < 5 * 60 * 1000) {
      return cached.template;
    }

    const template = await convexClient.query<NotificationTemplate | null>(
      api.notificationTemplates.getByType,
      { type }
    );

    if (template) {
      this.templateCache.set(cacheKey, {
        template,
        timestamp: Date.now(),
      });
    }

    return template;
  }

  private async updateTemplateStats(type: string): Promise<void> {
    await convexClient.mutation(api.notificationTemplates.incrementUsage, {
      type,
    });
  }

  private getNestedValue(obj: unknown, path: string): unknown {
    if (typeof obj !== "object" || obj === null) {
      return undefined;
    }

    let current: unknown = obj;
    for (const key of path.split(".")) {
      if (current && typeof current === "object" && key in (current as Record<string, unknown>)) {
        current = (current as Record<string, unknown>)[key];
      } else {
        return undefined;
      }
    }

    return current;
  }

  private hasValue(obj: Record<string, unknown>, path: string): boolean {
    const value = this.getNestedValue(obj, path);
    return value !== undefined && value !== null && value !== "";
  }

  clearCache(): void {
    this.templateCache.clear();
  }

  async warmupCache(): Promise<void> {
    const result = await convexClient.query<{
      data: NotificationTemplate[];
      total: number;
    }>(api.notificationTemplates.list, {
      isActive: true,
    });

    for (const template of result.data) {
      const cacheKey = `template_${template.type}`;
      this.templateCache.set(cacheKey, {
        template,
        timestamp: Date.now(),
      });
    }
  }

  async batchRender(
    requests: Array<{
      type: NotificationType;
      data?: Record<string, unknown>;
      locale?: string;
    }>
  ): Promise<RenderedTemplate[]> {
    const results: RenderedTemplate[] = [];

    for (const request of requests) {
      try {
        const result = request.locale
          ? await this.renderLocalizedTemplate(request.type, request.locale, request.data)
          : await this.renderNotification(request.type, request.data);
        results.push(result);
      } catch (error) {
        console.error(`Failed to render template for type ${request.type}:`, error);
        results.push({
          title: "通知",
          content: "您有一条新通知",
        });
      }
    }

    return results;
  }
}
