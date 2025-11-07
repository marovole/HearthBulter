import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { TemplateEngine } from '@/lib/services/notification';

const templateEngine = new TemplateEngine(prisma);

// GET /api/notifications/templates - 获取通知模板列表
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const isActive = searchParams.get('isActive');
    const category = searchParams.get('category');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    const options: any = {
      limit,
      offset,
    };

    if (isActive !== null) {
      options.isActive = isActive === 'true';
    }

    if (category) {
      options.category = category;
    }

    const result = await templateEngine.getAllTemplates(options);

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Error fetching notification templates:', error);
    return NextResponse.json(
      { error: 'Failed to fetch notification templates' },
      { status: 500 }
    );
  }
}

// POST /api/notifications/templates - 创建或更新通知模板
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

    const template = await templateEngine.upsertTemplate({
      type,
      titleTemplate,
      contentTemplate,
      channelTemplates: channelTemplates ? JSON.stringify(channelTemplates) : undefined,
      variables: variables ? JSON.stringify(variables) : undefined,
      isActive: isActive !== undefined ? isActive : true,
      version: version || '1.0',
      defaultChannels: defaultChannels ? JSON.stringify(defaultChannels) : undefined,
      defaultPriority,
      translations: translations ? JSON.stringify(translations) : undefined,
      description,
      category,
    });

    // 解析JSON字段返回
    const formattedTemplate = {
      ...template,
      channelPreferences: JSON.parse(template.channelPreferences || '{}'),
      typeSettings: JSON.parse(template.typeSettings || '{}'),
    };

    return NextResponse.json({
      success: true,
      data: formattedTemplate,
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

// PUT /api/notifications/templates/preview - 预览模板渲染
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

    const rendered = await templateEngine.previewTemplate(type, data || {}, locale);

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
