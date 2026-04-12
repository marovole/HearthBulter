import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { convexClient, api } from "@/lib/convex-client";
import { addCacheHeaders, EDGE_CACHE_PRESETS } from "@/lib/cache/edge-cache-helpers";
import type { Id, Doc } from "@/convex/_generated/dataModel";

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

interface AdviceItem {
  id: string;
  memberId: string;
  type: string;
  content: unknown;
  prompt: string;
  tokens: number;
  feedback?: unknown;
  generatedAt: number;
}

/**
 * GET /api/ai/advice-history
 * 获取AI建议历史和对话历史
 *
 * Migrated from Neon to Convex
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

    const member = await convexClient.query<Doc<"familyMembers"> | null>(
      api.families.getMemberById,
      {
        memberId: memberId as Id<"familyMembers">,
      }
    );

    if (!member) {
      return NextResponse.json({ error: "Member not found or access denied" }, { status: 404 });
    }

    const isOwnMember = member.userId === session.user.id;

    let isAdmin = false;
    if (!isOwnMember) {
      const role = await convexClient.query<string | null>(api.families.getUserFamilyRole, {
        familyId: member.familyId,
        userId: member.userId,
      });
      isAdmin = role === "ADMIN";
    }

    if (!isOwnMember && !isAdmin) {
      return NextResponse.json({ error: "Member not found or access denied" }, { status: 404 });
    }

    // Fetch advice from Convex with client-side pagination
    const allAdvice = await convexClient.query<Doc<"aiAdvice">[]>(api.ai.listAdviceByMember, {
      memberId,
      type: type || undefined,
      limit: limit + offset, // Fetch enough to handle offset
    });

    const rawAdvice = allAdvice.slice(offset, offset + limit);
    const total = allAdvice.length;
    const hasMore = offset + limit < total;

    const filteredAdvice = rawAdvice;

    // Fetch conversations from Convex
    const allConversations = await convexClient.query<Doc<"aiConversations">[]>(
      api.ai.listConversationsByMember,
      {
        memberId,
      }
    );

    const conversationHistory = allConversations.slice(0, Math.min(limit, 10));

    const processedConversations = (conversationHistory || []).map(
      (conv: Doc<"aiConversations">) => {
        const messages = Array.isArray(conv.messages) ? conv.messages : [];
        return {
          id: conv._id,
          title: conv.title,
          messages: messages.slice(-5),
          messageCount: messages.length,
          status: conv.status,
          tokens: conv.tokens,
          createdAt: new Date(conv._creationTime).toISOString(),
          updatedAt: new Date(conv._creationTime).toISOString(),
          lastMessageAt: conv.lastMessageAt ? new Date(conv.lastMessageAt).toISOString() : null,
        };
      }
    );

    const adviceStats = calculateAdviceStats(filteredAdvice);

    const responseData = {
      advice: {
        items: filteredAdvice.map((item: Doc<"aiAdvice">) => ({
          id: item._id,
          memberId: item.memberId,
          type: item.type,
          content: item.content,
          prompt: item.prompt,
          tokens: item.tokens,
          feedback: item.feedback,
          generatedAt: new Date(item.generatedAt).toISOString(),
        })),
        total,
        limit,
        offset,
        hasMore,
      },
      conversations: {
        items: processedConversations,
        total: processedConversations.length,
      },
      summary: {
        totalAdvice: total,
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
