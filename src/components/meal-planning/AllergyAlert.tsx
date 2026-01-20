"use client";

import { useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, X, Info, Shield, Eye, EyeOff } from "lucide-react";

type SeverityLevel = "mild" | "moderate" | "severe";

interface AllergyAlertProps {
  allergens: string[];
  severity?: SeverityLevel;
  showDismiss?: boolean;
  onDismiss?: () => void;
}

const ALLERGEN_INFO = {
  花生: {
    severity: "severe" as const,
    description: "严重过敏原，可能引起过敏性休克",
    alternatives: ["杏仁酱", "葵花籽酱", "芝麻酱"],
  },
  坚果: {
    severity: "severe" as const,
    description: "包括核桃、杏仁、腰果等，严重过敏原",
    alternatives: ["南瓜籽", "葵花籽", "亚麻籽"],
  },
  海鲜: {
    severity: "severe" as const,
    description: "包括鱼、虾、蟹、贝类等，严重过敏原",
    alternatives: ["鸡肉", "豆腐", "蛋白粉"],
  },
  大豆: {
    severity: "moderate" as const,
    description: "常见于豆制品、酱油等，中等过敏风险",
    alternatives: ["鹰嘴豆", "扁豆", "肉类蛋白"],
  },
  牛奶: {
    severity: "moderate" as const,
    description: "乳制品过敏，常见于儿童和成人",
    alternatives: ["豆浆", "杏仁奶", "燕麦奶"],
  },
  鸡蛋: {
    severity: "moderate" as const,
    description: "常见过敏原，存在于多种食品中",
    alternatives: ["亚麻籽蛋", "香蕉", "蛋白粉"],
  },
  小麦: {
    severity: "mild" as const,
    description: "麸质过敏，可能引起消化不适",
    alternatives: ["糙米", "藜麦", "燕麦"],
  },
  芝麻: {
    severity: "moderate" as const,
    description: "越来越常见的过敏原",
    alternatives: ["葵花籽", "南瓜籽", "亚麻籽"],
  },
};

const SEVERITY_CONFIGS = {
  mild: {
    bgColor: "bg-yellow-50",
    borderColor: "border-yellow-200",
    textColor: "text-yellow-800",
    iconColor: "text-yellow-600",
    title: "轻度过敏风险",
  },
  moderate: {
    bgColor: "bg-orange-50",
    borderColor: "border-orange-200",
    textColor: "text-orange-800",
    iconColor: "text-orange-600",
    title: "中度过敏风险",
  },
  severe: {
    bgColor: "bg-red-50",
    borderColor: "border-red-200",
    textColor: "text-red-800",
    iconColor: "text-red-600",
    title: "严重过敏风险",
  },
};

export function AllergyAlert({
  allergens,
  severity = "moderate",
  showDismiss = true,
  onDismiss,
}: AllergyAlertProps) {
  const [showDetails, setShowDetails] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const severityLevel: SeverityLevel = severity ?? "moderate";
  const config = SEVERITY_CONFIGS[severityLevel];

  // 计算最高严重程度
  const maxSeverity = allergens.reduce<SeverityLevel>((max, allergen) => {
    const allergenInfo = ALLERGEN_INFO[allergen as keyof typeof ALLERGEN_INFO];
    if (!allergenInfo) return max;

    const severityLevels = { mild: 1, moderate: 2, severe: 3 };
    const currentLevel = severityLevels[allergenInfo.severity];
    const maxLevel = severityLevels[max] || 0;

    return currentLevel > maxLevel ? allergenInfo.severity : max;
  }, severityLevel);

  const finalConfig = SEVERITY_CONFIGS[maxSeverity];

  const handleDismiss = () => {
    setDismissed(true);
    onDismiss?.();
  };

  const handleShowAlternatives = (allergen: string) => {
    const info = ALLERGEN_INFO[allergen as keyof typeof ALLERGEN_INFO];
    if (info?.alternatives) {
      // 这里可以显示替代食材的详细信息
      console.log(`替代 ${allergen} 的建议:`, info.alternatives);
    }
  };

  if (dismissed) {
    return null;
  }

  return (
    <Alert className={`${finalConfig.bgColor} ${finalConfig.borderColor} ${finalConfig.textColor}`}>
      <AlertTriangle className={`h-4 w-4 ${finalConfig.iconColor}`} />
      <AlertTitle className="flex items-center justify-between">
        <span className="flex items-center gap-2">
          <Shield className="h-4 w-4" />
          {finalConfig.title}
        </span>
        {showDismiss && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDismiss}
            className={`h-6 w-6 p-0 ${finalConfig.textColor} hover:${finalConfig.bgColor}`}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </AlertTitle>

      <AlertDescription className="space-y-3">
        <div>
          <span className="font-medium">检测到过敏原：</span>
          <div className="mt-2 flex flex-wrap gap-2">
            {allergens.map((allergen, index) => {
              const info = ALLERGEN_INFO[allergen as keyof typeof ALLERGEN_INFO];
              const allergenSeverity = info?.severity || "moderate";
              const allergenConfig = SEVERITY_CONFIGS[allergenSeverity];

              return (
                <Badge
                  key={index}
                  variant="outline"
                  className={`${allergenConfig.bgColor} ${allergenConfig.borderColor} ${allergenConfig.textColor}`}
                >
                  {allergen}
                </Badge>
              );
            })}
          </div>
        </div>

        {/* 详细信息切换 */}
        <div className="flex items-center justify-between">
          <span className="text-sm">
            {maxSeverity === "severe" && "⚠️ 严重过敏原，请立即避免食用"}
            {maxSeverity === "moderate" && "⚡ 中度过敏风险，建议谨慎食用"}
            {maxSeverity === "mild" && "💡 轻度过敏风险，请注意观察"}
          </span>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowDetails(!showDetails)}
            className={`h-8 px-2 ${finalConfig.textColor}`}
          >
            {showDetails ? (
              <>
                <EyeOff className="mr-1 h-4 w-4" />
                收起详情
              </>
            ) : (
              <>
                <Eye className="mr-1 h-4 w-4" />
                查看详情
              </>
            )}
          </Button>
        </div>

        {/* 详细过敏信息 */}
        {showDetails && (
          <div className="mt-4 space-y-3 border-t border-current border-opacity-20 pt-3">
            {allergens.map((allergen, index) => {
              const info = ALLERGEN_INFO[allergen as keyof typeof ALLERGEN_INFO];
              if (!info) return null;

              return (
                <div key={index} className="rounded-lg bg-white bg-opacity-50 p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <h4 className="flex items-center gap-2 font-medium">
                      <AlertTriangle className="h-4 w-4" />
                      {allergen}
                    </h4>
                    <Badge
                      variant="outline"
                      className={`${SEVERITY_CONFIGS[info.severity].bgColor} ${SEVERITY_CONFIGS[info.severity].borderColor} ${SEVERITY_CONFIGS[info.severity].textColor}`}
                    >
                      {info.severity === "severe" && "严重"}
                      {info.severity === "moderate" && "中等"}
                      {info.severity === "mild" && "轻度"}
                    </Badge>
                  </div>

                  <p className="mb-2 text-sm">{info.description}</p>

                  {info.alternatives && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <Info className="h-4 w-4" />
                        替代建议：
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {info.alternatives.map((alternative, altIndex) => (
                          <Button
                            key={altIndex}
                            variant="outline"
                            size="sm"
                            onClick={() => handleShowAlternatives(allergen)}
                            className="h-6 px-2 text-xs"
                          >
                            {alternative}
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {/* 安全提示 */}
            <div className="rounded-lg bg-blue-100 bg-opacity-50 p-3">
              <h4 className="mb-2 flex items-center gap-2 font-medium text-blue-900">
                <Shield className="h-4 w-4" />
                安全提示
              </h4>
              <ul className="space-y-1 text-sm text-blue-800">
                <li>• 如有严重过敏史，请严格避免相关过敏原</li>
                <li>• 食用前请仔细检查食品成分表</li>
                <li>• 建议随身携带抗过敏药物</li>
                <li>• 出现过敏症状请立即就医</li>
              </ul>
            </div>
          </div>
        )}
      </AlertDescription>
    </Alert>
  );
}

// 简化版本的过敏警告，用于卡片内显示
export function AllergyBadge({ allergens }: { allergens: string[] }) {
  if (!allergens || allergens.length === 0) return null;

  const maxSeverity = allergens.reduce<SeverityLevel>((max, allergen) => {
    const info = ALLERGEN_INFO[allergen as keyof typeof ALLERGEN_INFO];
    if (!info) return max;

    const severityLevels = { mild: 1, moderate: 2, severe: 3 };
    const currentLevel = severityLevels[info.severity];
    const maxLevel = severityLevels[max] || 0;

    return currentLevel > maxLevel ? info.severity : max;
  }, "mild");

  const config = SEVERITY_CONFIGS[maxSeverity];

  return (
    <Badge
      variant="outline"
      className={`${config.bgColor} ${config.borderColor} ${config.textColor} text-xs`}
    >
      <AlertTriangle className="mr-1 h-3 w-3" />
      {allergens.length}个过敏原
    </Badge>
  );
}
