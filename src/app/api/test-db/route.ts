import { NextResponse } from 'next/server';
import { supabaseAdapter, testDatabaseConnection } from '@/lib/db/supabase-adapter';

// 使用 Supabase HTTP 客户端 - 完全兼容 Cloudflare Workers
// 不依赖文件系统，不需要 Prisma 二进制文件

export async function GET() {
  try {
    // 检查环境变量配置
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({
        status: 'error',
        error: 'Supabase configuration missing',
        details: {
          hasUrl: !!supabaseUrl,
          hasKey: !!supabaseKey,
          availableEnvKeys: Object.keys(process.env)
            .filter(k => k.includes('SUPABASE') && !k.includes('SECRET')),
        },
      }, { status: 500 });
    }

    // 测试数据库连接
    const isConnected = await testDatabaseConnection();

    if (!isConnected) {
      return NextResponse.json({
        status: 'error',
        error: 'Database connection test failed',
        config: {
          url: supabaseUrl,
          adapter: 'Supabase HTTP Client',
        },
      }, { status: 500 });
    }

    // 执行一个简单的查询来验证 Supabase 适配器
    const userCount = await supabaseAdapter.user.count();

    return NextResponse.json({
      status: 'success',
      message: 'Supabase HTTP adapter works! ✅',
      timestamp: new Date().toISOString(),
      connection: {
        adapter: 'Supabase JS Client (HTTP)',
        runtime: 'Cloudflare Workers compatible',
        url: supabaseUrl,
      },
      stats: {
        userCount,
        method: 'Supabase Adapter API',
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}
