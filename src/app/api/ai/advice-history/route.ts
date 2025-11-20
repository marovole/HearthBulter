import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { SupabaseClientManager } from "@/lib/db/supabase-adapter";
import { fetchAdviceHistory } from "@/lib/db/supabase-rpc-helpers";
import {
  addCacheHeaders,
  EDGE_CACHE_PRESETS,
} from "@/lib/cache/edge-cache-helpers";

/**
 * GET /api/ai/advice-history
 * 获取AI建议历史和对话历史
 *
 * Migrated from Prisma to Supabase
 * Optimizations:
 * - 使用 RPC `fetch_advice_history` 减少往返次数
 * - Edge Cache (60s TTL) 提升响应速度
 * - Messages 字段压缩（最多 5 条）减少传输量
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
    const type = searchParams.get("type") as any;
    const limit = parseInt(searchParams.get("limit") || "20");
    const offset = parseInt(searchParams.get("offset") || "0");

    if (!memberId) {
      return NextResponse.json(
        { error: "Member ID is required" },
        { status: 400 },
      );
    }

    const supabase = SupabaseClientManager.getInstance();

    // 验证用户权限 - 检查是否是成员本人或家庭管理员
    const { data: memberCheck } = await supabase
      .from("family_members")
      .select("id, familyId, userId")
      .eq("id", memberId)
      .single();

    if (!memberCheck) {
      return NextResponse.json(
        { error: "Member not found or access denied" },
        { status: 404 },
      );
    }

    // 类型断言：memberCheck 已通过 null 检查
    type MemberData = { id: string; familyId: string; userId: string };
    const member = memberCheck as MemberData;

    // 检查权限：是成员本人
    const isOwnMember = member.userId === session.user.id;

    // 如果不是本人，检查是否是家庭管理员
    let isAdmin = false;
    if (!isOwnMember) {
      const { data: adminCheck } = await supabase
        .from("family_members")
        .select("id")
        .eq("familyId", member.familyId)
        .eq("userId", session.user.id)
        .eq("role", "ADMIN")
        .is("deletedAt", null)
        .maybeSingle();

      isAdmin = !!adminCheck;
    }

    if (!isOwnMember && !isAdmin) {
      return NextResponse.json(
        { error: "Member not found or access denied" },
        { status: 404 },
      );
    }

    // 使用优化的 RPC 函数获取 AI 建议历史
    // 优势：单次往返、messages 压缩（最多 5 条）、服务端聚合
    const adviceResult = await fetchAdviceHistory(memberId, { limit, offset });

    if (!adviceResult.success || !adviceResult.data) {
      console.error("获取AI建议历史失败:", adviceResult.error);
      return NextResponse.json(
        { error: "Failed to fetch advice history" },
        { status: 500 },
      );
    }

    const { advice: rawAdvice, pagination } = adviceResult.data;

    // 如果指定了 type 过滤，需要在客户端过滤
    // ⚠️ P2 限制：当前 type 过滤在客户端进行，导致：
    //    1. pagination.total 和 hasMore 不准确（是未过滤的总数）
    //    2. adviceByType 只反映当前页的统计，不是全局统计
    // TODO: 在 RPC 中添加 p_type 参数支持服务端过滤
    const filteredAdvice = type
      ? rawAdvice.filter((item) => item.type === type)
      : rawAdvice;

    // 获取对话历史
    const { data: conversationHistory, error: convError } = await supabase
      .from("ai_conversations")
      .select(
        "id, title, messages, status, tokens, createdAt, updatedAt, lastMessageAt",
      )
      .eq("memberId", memberId)
      .is("deletedAt", null)
      .order("lastMessageAt", { ascending: false })
      .limit(Math.min(limit, 10));

    if (convError) {
      console.error("获取对话历史失败:", convError);
      return NextResponse.json(
        { error: "Failed to fetch conversation history" },
        { status: 500 },
      );
    }

    // 处理对话历史，只保留最近的几条消息
    type ConversationData = {
      id: string;
      title: string | null;
      messages: any[];
      status: string;
      tokens: number | null;
      createdAt: string;
      updatedAt: string;
      lastMessageAt: string | null;
    };
    const processedConversations = (conversationHistory || []).map(
      (conv: ConversationData) => {
        const messages = conv.messages || [];
        return {
          ...conv,
          messages: messages.slice(-5), // 只保留最近5条消息
          messageCount: messages.length,
        };
      },
    );

    // 从 RPC 返回的 advice 数据计算统计信息
    // 优势：避免额外查询所有记录
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

    // 添加 Edge Cache 头（60s TTL, 30s stale-while-revalidate）
    const headers = new Headers();
    addCacheHeaders(headers, EDGE_CACHE_PRESETS.AI_ENDPOINT);

    return NextResponse.json(responseData, { headers });
  } catch (error) {
    console.error("Advice history API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * 从当前分页的建议数据计算统计信息（按类型分组）
 *
 * 优化：基于 RPC 返回的数据计算，避免额外查询所有记录
 *
 * ⚠️ 限制：这是基于当前页的统计，不是全局统计
 * - 如果使用了分页（offset > 0），统计数据仅反映当前页
 * - 如果使用了 type 过滤，统计数据仅反映过滤后的结果
 *
 * TODO: 如果需要全局统计，考虑：
 * 1. 在 RPC 中添加聚合查询返回全局统计
 * 2. 或者使用单独的统计端点（带缓存）
 *
 * @param advice - 当前页的建议记录数组
 * @returns 按类型分组的统计对象
 */
function calculateAdviceStats(advice: Array<{ type: string }>) {
  const stats = advice.reduce(
    (acc, item) => {
      const type = item.type;
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  return stats;
}
