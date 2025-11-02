import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { platformAdapterFactory } from '@/lib/services/ecommerce'
import { EcommercePlatform } from '@prisma/client'
import { PlatformError, PlatformErrorType } from '@/lib/services/ecommerce/types'

export async function GET(
  request: NextRequest,
  { params }: { params: { platform: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const platform = params.platform?.toUpperCase() as EcommercePlatform
    if (!platformAdapterFactory.isPlatformSupported(platform)) {
      return NextResponse.json({ error: 'Unsupported platform' }, { status: 400 })
    }

    const { searchParams } = new URL(request.url)
    const redirectUri = searchParams.get('redirect_uri')
    const state = searchParams.get('state')

    if (!redirectUri) {
      return NextResponse.json({ error: 'redirect_uri is required' }, { status: 400 })
    }

    const adapter = platformAdapterFactory.createAdapter(platform)
    const authResponse = await adapter.getAuthorizationUrl({
      redirectUri,
      state: state || undefined,
      scope: ['read', 'write']
    })

    return NextResponse.json(authResponse)
  } catch (error) {
    console.error('Get authorization URL error:', error)
    return NextResponse.json(
      { error: 'Failed to get authorization URL' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { platform: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const platform = params.platform?.toUpperCase() as EcommercePlatform
    if (!platformAdapterFactory.isPlatformSupported(platform)) {
      return NextResponse.json({ error: 'Unsupported platform' }, { status: 400 })
    }

    const body = await request.json()
    const { code, redirectUri, state } = body

    if (!code || !redirectUri) {
      return NextResponse.json(
        { error: 'code and redirect_uri are required' },
        { status: 400 }
      )
    }

    const adapter = platformAdapterFactory.createAdapter(platform)
    const tokenInfo = await adapter.exchangeToken({
      code,
      redirectUri,
      state
    })

    // 保存平台账号信息到数据库
    const platformAccount = await prisma.platformAccount.upsert({
      where: {
        userId_platform: {
          userId: session.user.id,
          platform
        }
      },
      update: {
        platformUserId: tokenInfo.platformUserId,
        accessToken: tokenInfo.accessToken,
        refreshToken: tokenInfo.refreshToken,
        tokenType: tokenInfo.tokenType,
        scope: tokenInfo.scope,
        expiresAt: tokenInfo.expiresAt,
        status: 'ACTIVE',
        isActive: true,
        lastSyncAt: new Date()
      },
      create: {
        userId: session.user.id,
        platform,
        platformUserId: tokenInfo.platformUserId,
        accessToken: tokenInfo.accessToken,
        refreshToken: tokenInfo.refreshToken,
        tokenType: tokenInfo.tokenType,
        scope: tokenInfo.scope,
        expiresAt: tokenInfo.expiresAt,
        status: 'ACTIVE',
        isActive: true
      }
    })

    return NextResponse.json({
      success: true,
      accountId: platformAccount.id,
      platform,
      platformName: adapter.platformName
    })
  } catch (error) {
    console.error('Token exchange error:', error)
    
    if (error instanceof PlatformError) {
      return NextResponse.json(
        { error: error.message, type: error.type },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to exchange token' },
      { status: 500 }
    )
  }
}
