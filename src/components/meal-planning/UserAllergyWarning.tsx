"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Switch } from "@/components/ui/switch";
import {
  AlertTriangle,
  XCircle,
  Shield,
  User,
  Bell,
  BellOff,
  Eye,
  EyeOff,
  Settings,
  Info,
  Phone,
  MapPin,
  Clock,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import { toast } from "@/lib/toast";

interface UserAllergy {
  id: string;
  allergenId: string;
  allergenName: string;
  severity: "MILD" | "MODERATE" | "SEVERE" | "ANAPHYLAXIS";
  symptoms: string[];
  emergencyContact?: string;
  emergencyMedication?: string;
  notes?: string;
  isActive: boolean;
  createdAt: Date;
  lastUpdated: Date;
}

interface MealIngredient {
  id: string;
  name: string;
  allergens?: string[];
}

interface UserAllergyWarningProps {
  ingredients: MealIngredient[];
  userAllergies: UserAllergy[];
  userId?: string;
  onDismiss?: () => void;
  onEmergencyContact?: () => void;
  showEmergencyInfo?: boolean;
  enableNotifications?: boolean;
}

const SEVERITY_CONFIG = {
  MILD: {
    label: "轻度",
    color: "text-yellow-600 bg-yellow-50 border-yellow-200",
    icon: <AlertCircle className="h-4 w-4" />,
    priority: 1,
  },
  MODERATE: {
    label: "中度",
    color: "text-orange-600 bg-orange-50 border-orange-200",
    icon: <AlertTriangle className="h-4 w-4" />,
    priority: 2,
  },
  SEVERE: {
    label: "严重",
    color: "text-red-600 bg-red-50 border-red-200",
    icon: <XCircle className="h-4 w-4" />,
    priority: 3,
  },
  ANAPHYLAXIS: {
    label: "过敏性休克",
    color: "text-red-700 bg-red-100 border-red-300",
    icon: <XCircle className="h-5 w-5" />,
    priority: 4,
  },
};

export function UserAllergyWarning({
  ingredients,
  userAllergies,
  userId,
  onDismiss,
  onEmergencyContact,
  showEmergencyInfo = true,
  enableNotifications = true,
}: UserAllergyWarningProps) {
  const [conflictingAllergies, setConflictingAllergies] = useState<
    UserAllergy[]
  >([]);
  const [showDetails, setShowDetails] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] =
    useState(enableNotifications);
  const [dismissedWarnings, setDismissedWarnings] = useState<Set<string>>(
    new Set(),
  );
  const [emergencyMode, setEmergencyMode] = useState(false);

  useEffect(() => {
    analyzeAllergies();
  }, [ingredients, userAllergies]);

  const analyzeAllergies = () => {
    const conflicts: UserAllergy[] = [];

    ingredients.forEach((ingredient) => {
      const ingredientAllergens = ingredient.allergens || [];

      userAllergies.forEach((userAllergy) => {
        if (
          userAllergy.isActive &&
          ingredientAllergens.includes(userAllergy.allergenId) &&
          !dismissedWarnings.has(userAllergy.id)
        ) {
          conflicts.push(userAllergy);
        }
      });
    });

    // 按严重程度排序
    conflicts.sort(
      (a, b) =>
        SEVERITY_CONFIG[b.severity].priority -
        SEVERITY_CONFIG[a.severity].priority,
    );

    setConflictingAllergies(conflicts);
  };

  const handleDismissWarning = (allergyId: string) => {
    setDismissedWarnings((prev) => new Set([...prev, allergyId]));
    setConflictingAllergies((prev) => prev.filter((a) => a.id !== allergyId));
    toast.info("已忽略此过敏警告");
  };

  const handleEnableNotifications = (enabled: boolean) => {
    setNotificationsEnabled(enabled);
    // 这里可以调用API保存设置
    toast.success(enabled ? "已启用过敏提醒" : "已关闭过敏提醒");
  };

  const getHighestSeverity = ():
    | "MILD"
    | "MODERATE"
    | "SEVERE"
    | "ANAPHYLAXIS"
    | null => {
    if (conflictingAllergies.length === 0) return null;

    return conflictingAllergies.reduce((highest, current) =>
      SEVERITY_CONFIG[current.severity].priority >
      SEVERITY_CONFIG[highest.severity].priority
        ? current
        : highest,
    ).severity;
  };

  const highestSeverity = getHighestSeverity();
  const severityConfig = highestSeverity
    ? SEVERITY_CONFIG[highestSeverity]
    : null;

  const handleEmergencyCall = () => {
    // 在实际应用中，这里可以调用紧急联系人或拨打急救电话
    toast.warning("正在联系紧急联系人...");
    onEmergencyContact?.();
  };

  const getEmergencyInstructions = (severity: string): string[] => {
    switch (severity) {
    case "ANAPHYLAXIS":
      return [
        "立即停止食用该食物",
        "立即使用肾上腺素自动注射器（如有处方）",
        "拨打急救电话 120",
        "保持平躺，抬高双脚",
        "如呼吸困难，保持坐姿",
        "等待医疗救援",
      ];
    case "SEVERE":
      return [
        "立即停止食用该食物",
        "服用抗过敏药物（如有处方）",
        "密切观察症状变化",
        "如症状加重，立即就医",
        "联系家人或朋友陪同",
      ];
    case "MODERATE":
      return [
        "停止食用该食物",
        "服用抗过敏药物",
        "多喝水促进代谢",
        "观察症状变化",
        "如有不适及时就医",
      ];
    case "MILD":
      return [
        "停止食用该食物",
        "观察症状变化",
        "可服用轻微抗过敏药物",
        "避免抓挠皮肤",
        "如症状持续或加重，请就医",
      ];
    default:
      return [];
    }
  };

  if (conflictingAllergies.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* 主要警告 */}
      <Alert className={`${severityConfig?.color} border-2`}>
        {severityConfig?.icon}
        <AlertDescription className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-semibold text-lg">⚠️ 过敏风险警告</div>
              <div className="text-sm mt-1">
                检测到 <strong>{conflictingAllergies.length}</strong>{" "}
                个过敏原冲突
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className={severityConfig?.color}>
                {severityConfig?.label}风险
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowDetails(!showDetails)}
              >
                {showDetails ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          {/* 紧急操作按钮 */}
          {highestSeverity === "ANAPHYLAXIS" && (
            <div className="flex gap-2 pt-2">
              <Button
                variant="destructive"
                size="sm"
                onClick={handleEmergencyCall}
                className="flex items-center gap-2"
              >
                <Phone className="h-4 w-4" />
                紧急求助
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEmergencyMode(!emergencyMode)}
              >
                <Shield className="h-4 w-4 mr-2" />
                {emergencyMode ? "隐藏" : "显示"}急救指南
              </Button>
            </div>
          )}
        </AlertDescription>
      </Alert>

      {/* 详细信息 */}
      {showDetails && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              过敏原详情
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* 冲突过敏原列表 */}
            <div className="space-y-3">
              {conflictingAllergies.map((allergy) => (
                <div
                  key={allergy.id}
                  className={`p-4 border rounded-lg ${SEVERITY_CONFIG[allergy.severity].color}`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {SEVERITY_CONFIG[allergy.severity].icon}
                      <span className="font-semibold">
                        {allergy.allergenName}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {SEVERITY_CONFIG[allergy.severity].label}
                      </Badge>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDismissWarning(allergy.id)}
                      className="text-gray-500 hover:text-gray-700"
                    >
                      忽略
                    </Button>
                  </div>

                  <div className="text-sm space-y-2">
                    <div>
                      <span className="font-medium">常见症状：</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {allergy.symptoms.map((symptom, index) => (
                          <Badge
                            key={index}
                            variant="secondary"
                            className="text-xs"
                          >
                            {symptom}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    {allergy.emergencyMedication && (
                      <div>
                        <span className="font-medium">急救药物：</span>
                        <span className="ml-2">
                          {allergy.emergencyMedication}
                        </span>
                      </div>
                    )}

                    {allergy.emergencyContact && (
                      <div>
                        <span className="font-medium">紧急联系人：</span>
                        <span className="ml-2">{allergy.emergencyContact}</span>
                      </div>
                    )}

                    {allergy.notes && (
                      <div>
                        <span className="font-medium">备注：</span>
                        <span className="ml-2 text-gray-600">
                          {allergy.notes}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* 设置选项 */}
            <div className="flex items-center justify-between pt-4 border-t">
              <div className="flex items-center gap-2">
                {notificationsEnabled ? (
                  <Bell className="h-4 w-4" />
                ) : (
                  <BellOff className="h-4 w-4" />
                )}
                <span className="text-sm font-medium">过敏提醒</span>
              </div>
              <Switch
                checked={notificationsEnabled}
                onCheckedChange={handleEnableNotifications}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* 急救指南 */}
      {emergencyMode && highestSeverity && (
        <Card className="bg-red-50 border-red-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-800">
              <Shield className="h-5 w-5" />
              紧急处理指南
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm text-red-800">
              <div className="font-semibold mb-3">
                如果出现{SEVERITY_CONFIG[highestSeverity].label}过敏反应：
              </div>
              <ol className="space-y-2">
                {getEmergencyInstructions(highestSeverity).map(
                  (instruction, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="font-semibold text-red-600">
                        {index + 1}.
                      </span>
                      <span>{instruction}</span>
                    </li>
                  ),
                )}
              </ol>
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                variant="destructive"
                size="sm"
                onClick={handleEmergencyCall}
                className="flex items-center gap-2"
              >
                <Phone className="h-4 w-4" />
                拨打 120
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEmergencyMode(false)}
              >
                关闭指南
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 含有过敏原的食材提示 */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <div className="flex items-start gap-2">
          <Info className="h-4 w-4 text-blue-600 mt-0.5" />
          <div className="text-sm text-blue-800">
            <div className="font-medium mb-1">含有过敏原的食材：</div>
            <div className="flex flex-wrap gap-2">
              {ingredients
                .filter((ingredient) =>
                  ingredient.allergens?.some((allergenId) =>
                    conflictingAllergies.some(
                      (allergy) => allergy.allergenId === allergenId,
                    ),
                  ),
                )
                .map((ingredient) => (
                  <Badge
                    key={ingredient.id}
                    variant="outline"
                    className="text-xs"
                  >
                    {ingredient.name}
                  </Badge>
                ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
