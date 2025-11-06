import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // 测试基本环境变量
    const envCheck = {
      NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET ? 'Set' : 'Missing',
      NEXTAUTH_URL: process.env.NEXTAUTH_URL || 'Missing',
      NODE_ENV: process.env.NODE_ENV,
    };

    // 测试NextAuth配置
    let authConfigStatus = 'Unknown';
    try {
      const { authOptions } = await import('@/lib/auth');
      authConfigStatus = authOptions ? 'Configured' : 'Not configured';
    } catch (error) {
      authConfigStatus = 'Error: ' + error.message;
    }

    return NextResponse.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      message: 'Health Butler API is running',
      environment: envCheck,
      authConfig: authConfigStatus,
      buildId: process.env.VERCEL_URL ? 'Vercel' : 'Local',
    });
  } catch (error) {
    return NextResponse.json({
      status: 'error',
      message: error.message,
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}
