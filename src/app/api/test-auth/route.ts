import { NextRequest, NextResponse } from 'next/server';


// Force dynamic rendering
export const dynamic = 'force-dynamic';
export async function GET(request: NextRequest) {
  try {
    // 基础健康检查
    const healthCheck = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      version: '1.0.0',
    };
    
    // 检查关键环境变量（不显示实际值）
    const envVars = {
      NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET ? 'Configured' : 'Missing',
      NEXTAUTH_URL: process.env.NEXTAUTH_URL || 'Missing',
      DATABASE_URL: process.env.DATABASE_URL ? 'Configured' : 'Missing',
    };
    
    return NextResponse.json({
      ...healthCheck,
      envVars,
      message: 'Health Butler API is running',
    });
    
  } catch (error) {
    console.error('Health check error:', error);
    
    return NextResponse.json({
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}
