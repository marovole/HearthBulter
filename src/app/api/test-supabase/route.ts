import { NextResponse } from 'next/server';

// 最小化依赖版本 - 只测试环境变量和基础功能

// Force dynamic rendering
export const dynamic = 'force-dynamic';
export async function GET() {
  try {
    const supabaseUrl =
      process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseKey =
      process.env.SUPABASE_SERVICE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    return NextResponse.json({
      status: 'success',
      message: 'Supabase test endpoint is working! ✅',
      timestamp: new Date().toISOString(),
      config: {
        hasUrl: !!supabaseUrl,
        hasKey: !!supabaseKey,
        url: supabaseUrl ? `${supabaseUrl.substring(0, 30)}...` : 'not set',
        runtime: 'nodejs',
      },
      note: 'This is a simplified test endpoint without external dependencies',
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 },
    );
  }
}
