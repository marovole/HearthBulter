import { NextRequest, NextResponse } from 'next/server';
import { SupabaseClientManager } from '@/lib/db/supabase-adapter';

/**
 * GET /api/notifications/templates - 获取通知模板列表
 *
 * Migrated from Prisma to Supabase
 * Note: Previously used TemplateEngine service, now using direct Supabase queries
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const isActive = searchParams.get('isActive');
    const category = searchParams.get('category');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    const supabase = SupabaseClientManager.getInstance();

    // 构建查询
    let query = supabase
      .from('notification_templates')
      .select('*', { count: 'exact' });

    // 应用筛选条件
    if (isActive !== null) {
      query = query.eq('isActive', isActive === 'true');
    }

    if (category) {
      query = query.eq('category', category);
    }

    // 分页
    const { data: templates, error, count } = await query
      .order('createdAt', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('查询通知模板失败:', error);
      return NextResponse.json(
        { error: 'Failed to fetch notification templates' },
        { status: 500 }
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
    console.error('Error fetching notification templates:', error);
    return NextResponse.json(
      { error: 'Failed to fetch notification templates' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/notifications/templates - 创建或更新通知模板
 *
 * Migrated from Prisma to Supabase
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
        { error: 'Type, title template, and content template are required' },
        { status: 400 }
      );
    }

    // 验证模板内容
    const validation = validateTemplateContent(titleTemplate, contentTemplate);
    if (!validation.isValid) {
      return NextResponse.json(
        { error: 'Invalid template content', details: validation.errors },
        { status: 400 }
      );
    }

    const supabase = SupabaseClientManager.getInstance();

    // Upsert模板（基于type字段）
    const templateData = {
      type,
      titleTemplate,
      contentTemplate,
      channelTemplates: channelTemplates ? JSON.stringify(channelTemplates) : null,
      variables: variables ? JSON.stringify(variables) : null,
      isActive: isActive !== undefined ? isActive : true,
      version: version || '1.0',
      defaultChannels: defaultChannels ? JSON.stringify(defaultChannels) : null,
      defaultPriority: defaultPriority || 'MEDIUM',
      translations: translations ? JSON.stringify(translations) : null,
      description: description || null,
      category: category || null,
    };

    const { data: template, error: upsertError } = await supabase
      .from('notification_templates')
      .upsert(templateData, {
        onConflict: 'type',
      })
      .select()
      .single();

    if (upsertError) {
      console.error('保存通知模板失败:', upsertError);
      return NextResponse.json(
        { error: 'Failed to save notification template' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: template,
      message: 'Template saved successfully',
    });
  } catch (error) {
    console.error('Error saving notification template:', error);
    return NextResponse.json(
      { error: 'Failed to save notification template' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/notifications/templates/preview - 预览模板渲染
 *
 * Migrated from Prisma to Supabase
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, data, locale } = body;

    if (!type) {
      return NextResponse.json(
        { error: 'Template type is required' },
        { status: 400 }
      );
    }

    const supabase = SupabaseClientManager.getInstance();

    // 获取模板
    const { data: template, error } = await supabase
      .from('notification_templates')
      .select('*')
      .eq('type', type)
      .maybeSingle();

    if (error) {
      console.error('查询模板失败:', error);
      return NextResponse.json(
        { error: 'Failed to fetch template' },
        { status: 500 }
      );
    }

    if (!template) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      );
    }

    // 简单的模板渲染（替换{{variable}}格式的变量）
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
    console.error('Error previewing template:', error);
    return NextResponse.json(
      { error: 'Failed to preview template' },
      { status: 500 }
    );
  }
}

// 简单的模板渲染函数
function renderTemplate(template: string, data: Record<string, any>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, varName) => {
    return data[varName] !== undefined ? String(data[varName]) : match;
  });
}

// 验证模板内容
function validateTemplateContent(titleTemplate: string, contentTemplate: string): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!titleTemplate || titleTemplate.trim().length === 0) {
    errors.push('Title template cannot be empty');
  }

  if (titleTemplate.length > 200) {
    errors.push('Title template length cannot exceed 200 characters');
  }

  if (!contentTemplate || contentTemplate.trim().length === 0) {
    errors.push('Content template cannot be empty');
  }

  if (contentTemplate.length > 2000) {
    errors.push('Content template length cannot exceed 2000 characters');
  }

  // 检查模板变量语法
  const titleVarMatches = titleTemplate.match(/\{\{(\w+)\}\}/g);
  const contentVarMatches = contentTemplate.match(/\{\{(\w+)\}\}/g);

  if (titleVarMatches) {
    for (const match of titleVarMatches) {
      const varName = match.slice(2, -2);
      if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(varName)) {
        errors.push(`Invalid variable name in title: ${varName}`);
      }
    }
  }

  if (contentVarMatches) {
    for (const match of contentVarMatches) {
      const varName = match.slice(2, -2);
      if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(varName)) {
        errors.push(`Invalid variable name in content: ${varName}`);
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}
