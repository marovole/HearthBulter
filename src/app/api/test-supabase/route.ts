import { NextResponse } from 'next/server';
import { testDatabaseConnection } from '@/lib/db/supabase-adapter';
import { createClient } from '@supabase/supabase-js';

// 使用 Node.js runtime（OpenNext 兼容）
// Supabase HTTP 客户端在任何运行时环境都可以工作

export async function GET() {
  try {
    // 检查环境变量
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({
        status: 'error',
        error: 'Missing Supabase configuration',
        details: {
          hasUrl: !!supabaseUrl,
          hasKey: !!supabaseKey,
          availableEnvKeys: Object.keys(process.env)
            .filter(k => k.includes('SUPABASE') && !k.includes('SECRET'))
        }
      }, { status: 500 });
    }

    // 测试 Supabase 连接
    const isConnected = await testDatabaseConnection();

    if (!isConnected) {
      return NextResponse.json({
        status: 'error',
        error: 'Supabase connection test failed',
        config: {
          url: supabaseUrl,
          keyType: process.env.SUPABASE_SERVICE_KEY ? 'service_key' : 'anon_key'
        }
      }, { status: 500 });
    }

    // 执行一个简单的查询来验证连接
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { count, error: countError } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true });

    return NextResponse.json({
      status: 'success',
      message: 'Supabase HTTP client works! ✅',
      timestamp: new Date().toISOString(),
      connection: {
        url: supabaseUrl,
        protocol: 'HTTP (Cloudflare Workers compatible)',
        adapter: 'Supabase JS Client',
        verified: !countError
      },
      stats: {
        usersTableAccessible: !countError,
        userCount: count !== null ? count : 'N/A'
      }
    });

  } catch (error) {
    return NextResponse.json({
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      runtime: 'edge'
    }, { status: 500 });
  }
}
