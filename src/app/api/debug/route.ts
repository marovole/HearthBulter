import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const envCheck = {
      NODE_ENV: process.env.NODE_ENV,
      DATABASE_URL: process.env.DATABASE_URL ? `✅ ${process.env.DATABASE_URL.substring(0, 30)}...` : '❌',
      NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET ? '✅ (hidden)' : '❌',
      NEXTAUTH_URL: process.env.NEXTAUTH_URL || '❌',
      VERCEL: process.env.VERCEL || '❌',
      VERCEL_ENV: process.env.VERCEL_ENV || '❌',
    };

    return NextResponse.json({
      status: 'debug',
      timestamp: new Date().toISOString(),
      environment: envCheck,
      message: 'Debug endpoint working'
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: 'error',
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}
