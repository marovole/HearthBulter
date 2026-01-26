import { NextRequest, NextResponse } from "next/server";
import { convexClient, api } from "@/lib/convex-client";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const isActive = searchParams.get("isActive");
    const category = searchParams.get("category");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    const result = await convexClient.query<{
      data: Array<Record<string, unknown>>;
      total: number;
    }>(api.notificationTemplates.list, {
      isActive: isActive === null ? undefined : isActive === "true",
      category: category || undefined,
      limit,
      offset,
    });

    return NextResponse.json({
      success: true,
      data: {
        templates: result.data ?? [],
        total: result.total ?? 0,
        limit,
        offset,
      },
    });
  } catch (error) {
    console.error("Error fetching notification templates:", error);
    return NextResponse.json({ error: "Failed to fetch notification templates" }, { status: 500 });
  }
}

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

    if (!type || !titleTemplate || !contentTemplate) {
      return NextResponse.json(
        { error: "Type, title template, and content template are required" },
        { status: 400 }
      );
    }

    const validation = validateTemplateContent(titleTemplate, contentTemplate);
    if (!validation.isValid) {
      return NextResponse.json(
        { error: "Invalid template content", details: validation.errors },
        { status: 400 }
      );
    }

    const templateData = {
      type,
      titleTemplate,
      contentTemplate,
      channelTemplates: channelTemplates ? JSON.stringify(channelTemplates) : null,
      variables: variables ? JSON.stringify(variables) : null,
      isActive: isActive !== undefined ? isActive : true,
      version: version || "1.0",
      defaultChannels: defaultChannels ? JSON.stringify(defaultChannels) : null,
      defaultPriority: defaultPriority || "MEDIUM",
      translations: translations ? JSON.stringify(translations) : null,
      description: description || null,
      category: category || null,
    };

    await convexClient.mutation(api.notificationTemplates.upsert, {
      ...templateData,
      isActive: Boolean(templateData.isActive),
    });

    const template = await convexClient.query<Record<string, unknown> | null>(
      api.notificationTemplates.getByType,
      { type }
    );

    return NextResponse.json({
      success: true,
      data: template,
      message: "Template saved successfully",
    });
  } catch (error) {
    console.error("Error saving notification template:", error);
    return NextResponse.json({ error: "Failed to save notification template" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, data } = body;

    if (!type) {
      return NextResponse.json({ error: "Template type is required" }, { status: 400 });
    }

    const template = await convexClient.query<Record<string, unknown> | null>(
      api.notificationTemplates.getByType,
      { type }
    );

    if (!template) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }

    const rendered = {
      title: renderTemplate(String(template.titleTemplate), data || {}),
      content: renderTemplate(String(template.contentTemplate), data || {}),
      type: template.type,
      version: template.version,
    };

    return NextResponse.json({
      success: true,
      data: rendered,
    });
  } catch (error) {
    console.error("Error previewing template:", error);
    return NextResponse.json({ error: "Failed to preview template" }, { status: 500 });
  }
}

function renderTemplate(template: string, data: Record<string, any>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, varName) => {
    return data[varName] !== undefined ? String(data[varName]) : match;
  });
}

function validateTemplateContent(
  titleTemplate: string,
  contentTemplate: string
): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!titleTemplate || titleTemplate.trim().length === 0) {
    errors.push("Title template cannot be empty");
  }

  if (titleTemplate.length > 200) {
    errors.push("Title template length cannot exceed 200 characters");
  }

  if (!contentTemplate || contentTemplate.trim().length === 0) {
    errors.push("Content template cannot be empty");
  }

  if (contentTemplate.length > 2000) {
    errors.push("Content template length cannot exceed 2000 characters");
  }

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
