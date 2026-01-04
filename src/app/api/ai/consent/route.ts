import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { consentManager, getConsentType } from "@/lib/services/consent-manager";

// GET - 获取用户同意状态

// Force dynamic rendering for auth()
export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const consentId = searchParams.get("consentId");

    if (consentId) {
      // 获取特定同意状态
      const hasConsent = await consentManager.checkConsent(
        session.user.id,
        consentId,
      );
      const consentType = getConsentType(consentId);

      return NextResponse.json({
        consentId,
        hasConsent,
        consentType,
      });
    } else {
      // 获取所有同意状态
      const consentTypes = consentManager.getAllConsentTypes();
      const consentResults = await Promise.all(
        consentTypes.map(async (type) => ({
          id: type.id,
          name: type.name,
          description: type.description,
          required: type.required,
          category: type.category,
          hasConsent: await consentManager.checkConsent(
            session.user.id,
            type.id,
          ),
        })),
      );

      return NextResponse.json({
        consents: consentResults,
      });
    }
  } catch (error) {
    console.error("Consent GET error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// POST - 请求或授予同意
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { consentId, action, context } = body;

    if (!consentId) {
      return NextResponse.json(
        { error: "Consent ID is required" },
        { status: 400 },
      );
    }

    const consentType = getConsentType(consentId);
    if (!consentType) {
      return NextResponse.json(
        { error: "Invalid consent ID" },
        { status: 400 },
      );
    }

    if (action === "request") {
      // 请求同意状态
      const result = await consentManager.requestConsent(
        session.user.id,
        {
          type: consentType,
          context,
        },
        {
          ipAddress: request.ip,
          userAgent: request.headers.get("user-agent") || undefined,
        },
      );

      return NextResponse.json({
        granted: result.granted,
        required: result.required,
        expired: result.expired,
        consent: result.consent,
        consentType: {
          name: consentType.name,
          description: consentType.description,
          content: consentType.content,
        },
      });
    } else if (action === "grant") {
      // 授予同意
      const consent = await consentManager.grantConsent(
        session.user.id,
        consentId,
        context,
        {
          ipAddress: request.ip,
          userAgent: request.headers.get("user-agent") || undefined,
        },
      );

      return NextResponse.json({
        granted: true,
        consent,
        message: "同意已成功记录",
      });
    } else {
      return NextResponse.json(
        { error: 'Invalid action. Use "request" or "grant".' },
        { status: 400 },
      );
    }
  } catch (error) {
    console.error("Consent POST error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// DELETE - 撤销同意
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const consentId = searchParams.get("consentId");

    if (!consentId) {
      return NextResponse.json(
        { error: "Consent ID is required" },
        { status: 400 },
      );
    }

    await consentManager.revokeConsent(session.user.id, consentId);

    return NextResponse.json({
      message: "同意已成功撤销",
      consentId,
    });
  } catch (error) {
    console.error("Consent DELETE error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
