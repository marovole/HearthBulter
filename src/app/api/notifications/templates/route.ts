import { NextRequest, NextResponse } from "next/server";
import { SupabaseClientManager } from "@/lib/db/supabase-adapter";

/**
 * 通知模板管理端点
 *
 * Note: 此端点直接使用 Supabase，未使用双写框架，因为：
 * 1. 模板是系统配置，不是用户数据
 * 2. NotificationRepository 接口中没有模板相关方法
 * 3. 模板操作频率低，通常由管理员配置
 * 4. 不需要 Prisma <-> Supabase 数据同步
 */

/**
 * GET /api/notifications/templates - 获取通知模板列表
 */

// Force dynamic rendering
export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const isActive = searchParams.get("isActive");
    const category = searchParams.get("category");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    const supabase = SupabaseClientManager.getInstance();

    // 构建查询
    let query = supabase
      .from("notification_templates")
      .select("*", { count: "exact" });

    // 应用筛选条件
    if (isActive !== null) {
      query = query.eq("isActive", isActive === "true");
    }

    if (category) {
      query = query.eq("category", category);
    }

    // 分页查询
    const {
      data: templates,
      error,
      count,
    } = await query
      .order("createdAt", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error("查询通知模板失败:", error);
      return NextResponse.json(
        { error: "Failed to fetch notification templates" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        templates: templates || [],
        total: count || 0,
        limit,
        offset,
      },
    });
  } catch (error) {
    console.error("Error fetching notification templates:", error);
    return NextResponse.json(
      { error: "Failed to fetch notification templates" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/notifications/templates - 创建或更新通知模板
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      type,
      titleTemplate,
      contentTemplate,
      channelTemplates,
      variables,
      isActive,
      version,
      defaultChannels,
      defaultPriority,
      translations,
      description,
      category,
    } = body;

    // 验证必需字段
    if (!type || !titleTemplate || !contentTemplate) {
      return NextResponse.json(
        { error: "Type, title template, and content template are required" },
        { status: 400 },
      );
    }

    // 验证模板内容
    const validation = validateTemplateContent(titleTemplate, contentTemplate);
    if (!validation.isValid) {
      return NextResponse.json(
        { error: "Invalid template content", details: validation.errors },
        { status: 400 },
      );
    }

    const supabase = SupabaseClientManager.getInstance();

    // 准备模板数据
    const templateData = {
      type,
      titleTemplate,
      contentTemplate,
      channelTemplates: channelTemplates
        ? JSON.stringify(channelTemplates)
        : null,
      variables: variables ? JSON.stringify(variables) : null,
      isActive: isActive !== undefined ? isActive : true,
      version: version || "1.0",
      defaultChannels: defaultChannels ? JSON.stringify(defaultChannels) : null,
      defaultPriority: defaultPriority || "MEDIUM",
      translations: translations ? JSON.stringify(translations) : null,
      description: description || null,
      category: category || null,
    };

    // Upsert模板（基于type字段）
    const { data: template, error: upsertError } = await supabase
      .from("notification_templates")
      .upsert(templateData, {
        onConflict: "type",
      })
      .select()
      .single();

    if (upsertError) {
      console.error("保存通知模板失败:", upsertError);
      return NextResponse.json(
        { error: "Failed to save notification template" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      data: template,
      message: "Template saved successfully",
    });
  } catch (error) {
    console.error("Error saving notification template:", error);
    return NextResponse.json(
      { error: "Failed to save notification template" },
      { status: 500 },
    );
  }
}

/**
 * PUT /api/notifications/templates - 预览模板渲染
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, data } = body;

    if (!type) {
      return NextResponse.json(
        { error: "Template type is required" },
        { status: 400 },
      );
    }

    const supabase = SupabaseClientManager.getInstance();

    // 获取模板
    const { data: template, error } = await supabase
      .from("notification_templates")
      .select("*")
      .eq("type", type)
      .maybeSingle();

    if (error) {
      console.error("查询模板失败:", error);
      return NextResponse.json(
        { error: "Failed to fetch template" },
        { status: 500 },
      );
    }

    if (!template) {
      return NextResponse.json(
        { error: "Template not found" },
        { status: 404 },
      );
    }

    // 渲染模板
    const rendered = {
      title: renderTemplate((template as any).titleTemplate, data || {}),
      content: renderTemplate((template as any).contentTemplate, data || {}),
      type: (template as any).type,
      version: (template as any).version,
    };

    return NextResponse.json({
      success: true,
      data: rendered,
    });
  } catch (error) {
    console.error("Error previewing template:", error);
    return NextResponse.json(
      { error: "Failed to preview template" },
      { status: 500 },
    );
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * 渲染模板 - 替换{{variable}}格式的变量
 */
function renderTemplate(template: string, data: Record<string, any>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, varName) => {
    return data[varName] !== undefined ? String(data[varName]) : match;
  });
}

/**
 * 验证模板内容
 */
function validateTemplateContent(
  titleTemplate: string,
  contentTemplate: string,
): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // 验证标题模板
  if (!titleTemplate || titleTemplate.trim().length === 0) {
    errors.push("Title template cannot be empty");
  }

  if (titleTemplate.length > 200) {
    errors.push("Title template length cannot exceed 200 characters");
  }

  // 验证内容模板
  if (!contentTemplate || contentTemplate.trim().length === 0) {
    errors.push("Content template cannot be empty");
  }

  if (contentTemplate.length > 2000) {
    errors.push("Content template length cannot exceed 2000 characters");
  }

  // 验证变量语法
  const validateVariables = (text: string, context: string) => {
    const varMatches = text.match(/\{\{(\w+)\}\}/g);
    if (varMatches) {
      for (const match of varMatches) {
        const varName = match.slice(2, -2);
        if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(varName)) {
          errors.push(`Invalid variable name in ${context}: ${varName}`);
        }
      }
    }
  };

  validateVariables(titleTemplate, "title");
  validateVariables(contentTemplate, "content");

  return {
    isValid: errors.length === 0,
    errors,
  };
}
