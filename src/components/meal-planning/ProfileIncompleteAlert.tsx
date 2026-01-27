"use client";

import React from "react";
import { AlertCircle, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

// ============================================================================
// Props
// ============================================================================

interface ProfileIncompleteAlertProps {
  message: string;
  onDismiss?: () => void;
}

// ============================================================================
// Component
// ============================================================================

export function ProfileIncompleteAlert({ message, onDismiss }: ProfileIncompleteAlertProps) {
  // 根据错误消息推断缺失项
  const getMissingItems = () => {
    const items: string[] = [];
    if (message.includes("体重") || message.includes("身高")) {
      items.push("身高/体重信息");
    }
    if (message.includes("健康目标")) {
      items.push("健康目标设置");
    }
    return items;
  };

  const missingItems = getMissingItems();

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
      <div className="flex items-start gap-3">
        <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-600" />
        <div className="flex-1">
          <h3 className="font-medium text-amber-900">无法生成食谱计划</h3>
          <p className="mt-1 text-sm text-amber-700">{message}</p>

          {missingItems.length > 0 && (
            <div className="mt-3">
              <p className="text-sm font-medium text-amber-800">需要完善以下信息：</p>
              <ul className="mt-1 list-inside list-disc text-sm text-amber-700">
                {missingItems.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-4 flex items-center gap-3">
            <Button asChild size="sm">
              <Link href="/onboarding/setup">
                完善资料
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            {onDismiss && (
              <Button variant="ghost" size="sm" onClick={onDismiss}>
                稍后处理
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
