import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

async function testSupabaseDatabaseConnection(): Promise<boolean> {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.error('Supabase 环境变量缺失');
      return false;
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // 执行简单查询测试连接
    const { error } = await supabase.from('users').select('id').limit(1);

    if (error) {
      console.error('Supabase 连接测试失败:', error.message);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Supabase 连接测试异常:', error);
    return false;
  }
}

export async function GET() {
  try {
    const isConnected = await testSupabaseDatabaseConnection();

    // 检查环境变量
    const envVars = {
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅' : '❌',
      SUPABASE_SERVICE_KEY: process.env.SUPABASE_SERVICE_KEY ? '✅' : '❌',
      NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET ? '✅' : '❌',
      NEXTAUTH_URL: process.env.NEXTAUTH_URL ? '✅' : '❌',
      UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL ? '✅' : '❌',
    };

    return NextResponse.json({
      status: isConnected ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      database: isConnected ? 'connected' : 'disconnected',
      environment: envVars,
      uptime: process.uptime(),
      version: '1.0.1',
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
        database: 'disconnected',
      },
      { status: 500 }
    );
  }
}
