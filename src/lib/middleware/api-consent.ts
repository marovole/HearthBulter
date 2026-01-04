/**
 * API 同意检查中间件
 * 提供统一的用户同意验证逻辑
 */

import { NextResponse } from 'next/server';
import { consentManager } from '@/lib/services/consent-manager';

export type ConsentType =
  | 'ai_health_analysis'
  | 'medical_data_processing'
  | 'data_sharing';

export interface ConsentContext {
  grantedConsents: string[];
}

export type ConsentResult =
  | { success: true; context: ConsentContext }
  | { success: false; response: NextResponse };

/**
 * 检查单个同意类型
 * @param userId 用户 ID
 * @param consentType 同意类型
 */
export async function checkConsent(
  userId: string,
  consentType: ConsentType,
): Promise<ConsentResult> {
  const hasConsent = await consentManager.checkConsent(userId, consentType);

  if (!hasConsent) {
    const consentTypeInfo = consentManager.getConsentType(consentType);
    return {
      success: false,
      response: NextResponse.json(
        {
          error: 'Required consent not granted',
          requiredConsent: consentTypeInfo
            ? {
                id: consentTypeInfo.id,
                name: consentTypeInfo.name,
                description: consentTypeInfo.description,
                content: consentTypeInfo.content,
              }
            : null,
        },
        { status: 403 },
      ),
    };
  }

  return {
    success: true,
    context: {
      grantedConsents: [consentType],
    },
  };
}

/**
 * 检查多个同意类型
 * @param userId 用户 ID
 * @param consentTypes 同意类型列表
 */
export async function checkMultipleConsents(
  userId: string,
  consentTypes: ConsentType[],
): Promise<ConsentResult> {
  const consentResults = await consentManager.checkMultipleConsents(
    userId,
    consentTypes,
  );

  const missingConsents = consentTypes.filter(
    (consentId) => !consentResults[consentId],
  );

  if (missingConsents.length > 0) {
    const consentTypeInfos = missingConsents
      .map((id) => consentManager.getConsentType(id))
      .filter(Boolean);

    return {
      success: false,
      response: NextResponse.json(
        {
          error: 'Required consents not granted',
          requiredConsents: consentTypeInfos.map((type) => ({
            id: type?.id,
            name: type?.name,
            description: type?.description,
            content: type?.content,
          })),
          missingConsents,
        },
        { status: 403 },
      ),
    };
  }

  return {
    success: true,
    context: {
      grantedConsents: consentTypes,
    },
  };
}
