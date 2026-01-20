import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { neonAdapter } from "@/lib/db/neon-adapter";
import { fetchAdviceHistory } from "@/lib/db/supabase-rpc-helpers";
import { addCacheHeaders, EDGE_CACHE_PRESETS } from "@/lib/cache/edge-cache-helpers";

interface FamilyMember {
  id: string;
  familyId: string;
  userId: string;
  role?: string;
}

interface AiConversation {
  id: string;
  title: string | null;
  messages: unknown[];
  status: string;
  tokens: number | null;
  createdAt: string;
  updatedAt: string;
  lastMessageAt: string | null;
}

/**
 * GET /api/ai/advice-history
 * 获取AI建议历史和对话历史
 *
 * Migrated from Supabase to Neon
 */

// Force dynamic rendering for auth()
export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const memberId = searchParams.get("memberId");
    const type = searchParams.get("type");
    const limit = parseInt(searchParams.get("limit") || "20");
    const offset = parseInt(searchParams.get("offset") || "0");

    if (!memberId) {
      return NextResponse.json({ error: "Member ID is required" }, { status: 400 });
    }

    const member = await neonAdapter.familyMember.findUnique<FamilyMember>({
      where: { id: memberId },
    });

    if (!member) {
      return NextResponse.json({ error: "Member not found or access denied" }, { status: 404 });
    }

    const isOwnMember = member.userId === session.user.id;

    let isAdmin = false;
    if (!isOwnMember) {
      const adminCheck = await neonAdapter.familyMember.findFirst<FamilyMember>({
        where: {
          familyId: member.familyId,
          userId: session.user.id,
          role: "ADMIN",
          deletedAt: null,
        },
      });
      isAdmin = !!adminCheck;
    }

    if (!isOwnMember && !isAdmin) {
      return NextResponse.json({ error: "Member not found or access denied" }, { status: 404 });
    }

    const adviceResult = await fetchAdviceHistory(memberId, { limit, offset });

    if (!adviceResult.success || !adviceResult.data) {
      console.error("获取AI建议历史失败:", adviceResult.error);
      return NextResponse.json({ error: "Failed to fetch advice history" }, { status: 500 });
    }

    const { advice: rawAdvice, pagination } = adviceResult.data;

    const filteredAdvice = type
      ? rawAdvice.filter((item: { type: string }) => item.type === type)
      : rawAdvice;

    const conversationHistory = await neonAdapter.aiConversation.findMany<AiConversation>({
      where: { memberId, deletedAt: null },
      orderBy: { lastMessageAt: "desc" },
      take: Math.min(limit, 10),
    });

    const processedConversations = (conversationHistory || []).map((conv) => {
      const messages = Array.isArray(conv.messages) ? conv.messages : [];
      return {
        ...conv,
        messages: messages.slice(-5),
        messageCount: messages.length,
      };
    });

    const adviceStats = calculateAdviceStats(filteredAdvice);

    const responseData = {
      advice: {
        items: filteredAdvice,
        total: pagination.total,
        limit: pagination.limit,
        offset: pagination.offset,
        hasMore: pagination.hasMore,
      },
      conversations: {
        items: processedConversations,
        total: processedConversations.length,
      },
      summary: {
        totalAdvice: pagination.total,
        totalConversations: processedConversations.length,
        adviceByType: adviceStats,
      },
    };

    const headers = new Headers();
    addCacheHeaders(headers, EDGE_CACHE_PRESETS.AI_ENDPOINT);

    return NextResponse.json(responseData, { headers });
  } catch (error) {
    console.error("Advice history API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

function calculateAdviceStats(advice: Array<{ type: string }>) {
  const stats = advice.reduce(
    (acc, item) => {
      const type = item.type;
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  return stats;
}
