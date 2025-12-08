import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { headers } from "next/headers";

// Force dynamic rendering
export const dynamic = "force-dynamic";

async function testSupabaseDatabaseConnection(): Promise<boolean> {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.error("Supabase 环境变量缺失");
      return false;
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { "x-health-check": "true" } },
    });

    // 执行简单查询测试连接
    const { error } = await supabase.from("users").select("id").limit(1);

    if (error) {
      console.error("Supabase 连接测试失败:", error.message);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Supabase 连接测试异常:", error);
    return false;
  }
}

export async function GET() {
  try {
    const token = process.env.INTERNAL_HEALTH_TOKEN;
    if (token && process.env.NODE_ENV === "production") {
      const requestToken = headers().get("x-health-token");
      if (!requestToken || requestToken !== token) {
        return NextResponse.json({ status: "forbidden" }, { status: 403 });
      }
    }

    const isConnected = await testSupabaseDatabaseConnection();

    return NextResponse.json({
      status: isConnected ? "healthy" : "unhealthy",
      timestamp: new Date().toISOString(),
      database: isConnected ? "connected" : "disconnected",
      uptime: process.uptime(),
      version: "1.0.2",
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: "unhealthy",
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : "Unknown error",
        database: "disconnected",
      },
      { status: 500 },
    );
  }
}
