"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Shield,
  AlertTriangle,
  CheckCircle,
  Info,
  Clock,
  Users,
  Database,
  Brain,
} from "lucide-react";
import { ConsentType, consentManager } from "@/lib/services/consent-manager";
import { cn } from "@/lib/utils";

interface ConsentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  consentType: ConsentType;
  userId: string;
  onConsentGranted: (consentId: string) => void;
  onConsentDenied: () => void;
  context?: Record<string, any>;
  forceRefresh?: boolean;
}

export function ConsentDialog({
  open,
  onOpenChange,
  consentType,
  userId,
  onConsentGranted,
  onConsentDenied,
  context,
  forceRefresh = false,
}: ConsentDialogProps) {
  const [isAccepted, setIsAccepted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  // 重置状态
  useEffect(() => {
    if (open) {
      setIsAccepted(false);
      setIsSubmitting(false);
      setShowDetails(false);
    }
  }, [open]);

  const handleAccept = async () => {
    if (!isAccepted || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await consentManager.grantConsent(userId, consentType.id, context, {
        ipAddress:
          typeof window !== "undefined" ? window.location.hostname : undefined,
        userAgent:
          typeof window !== "undefined"
            ? window.navigator.userAgent
            : undefined,
      });

      onConsentGranted(consentType.id);
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to grant consent:", error);
      // 这里可以显示错误提示
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDecline = () => {
    onConsentDenied();
    onOpenChange(false);
  };

  const getCategoryIcon = (category: ConsentType["category"]) => {
    switch (category) {
    case "ai_analysis":
      return <Brain className="w-5 h-5" />;
    case "data_processing":
      return <Database className="w-5 h-5" />;
    case "health_sharing":
      return <Users className="w-5 h-5" />;
    case "research":
      return <Shield className="w-5 h-5" />;
    default:
      return <Info className="w-5 h-5" />;
    }
  };

  const getCategoryColor = (category: ConsentType["category"]) => {
    switch (category) {
    case "ai_analysis":
      return "text-blue-600 bg-blue-50 border-blue-200";
    case "data_processing":
      return "text-green-600 bg-green-50 border-green-200";
    case "health_sharing":
      return "text-purple-600 bg-purple-50 border-purple-200";
    case "research":
      return "text-orange-600 bg-orange-50 border-orange-200";
    case "marketing":
      return "text-pink-600 bg-pink-50 border-pink-200";
    default:
      return "text-gray-600 bg-gray-50 border-gray-200";
    }
  };

  const getRequiredBadge = () => {
    if (consentType.required) {
      return (
        <Badge variant="destructive" className="text-xs">
          <AlertTriangle className="w-3 h-3 mr-1" />
          必需同意
        </Badge>
      );
    }
    return (
      <Badge variant="secondary" className="text-xs">
        可选同意
      </Badge>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            {getCategoryIcon(consentType.category)}
            <span>{consentType.name}</span>
            {getRequiredBadge()}
          </DialogTitle>
          <DialogDescription>{consentType.description}</DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-4">
            {/* 摘要卡片 */}
            <Card
              className={cn("border-2", getCategoryColor(consentType.category))}
            >
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center">
                  <Info className="w-4 h-4 mr-2" />
                  同意概述
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  {consentType.content.summary}
                </p>
              </CardContent>
            </Card>

            {/* 详细信息切换 */}
            <div className="flex items-center justify-between">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowDetails(!showDetails)}
                className="text-sm"
              >
                {showDetails ? "收起详细信息" : "展开详细信息"}
              </Button>
              {consentType.validDays > 0 && (
                <div className="flex items-center text-xs text-muted-foreground">
                  <Clock className="w-3 h-3 mr-1" />
                  同意有效期：{consentType.validDays}天
                </div>
              )}
            </div>

            {/* 详细信息 */}
            {showDetails && (
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">详细说明</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="whitespace-pre-line text-sm text-muted-foreground">
                      {consentType.content.details}
                    </div>
                  </CardContent>
                </Card>

                {/* 风险和益处 */}
                {(consentType.content.risks ||
                  consentType.content.benefits) && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {consentType.content.risks && (
                      <Alert className="border-amber-200 bg-amber-50">
                        <AlertTriangle className="h-4 w-4 text-amber-600" />
                        <AlertDescription className="text-amber-800">
                          <strong className="block mb-1">潜在风险</strong>
                          <span className="text-sm">
                            {consentType.content.risks}
                          </span>
                        </AlertDescription>
                      </Alert>
                    )}

                    {consentType.content.benefits && (
                      <Alert className="border-green-200 bg-green-50">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <AlertDescription className="text-green-800">
                          <strong className="block mb-1">预期益处</strong>
                          <span className="text-sm">
                            {consentType.content.benefits}
                          </span>
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                )}
              </div>
            )}

            <Separator />

            {/* 同意复选框 */}
            <div className="flex items-start space-x-3 p-4 bg-muted/50 rounded-lg">
              <Checkbox
                id="consent-accept"
                checked={isAccepted}
                onCheckedChange={(checked) => setIsAccepted(checked as boolean)}
                className="mt-1"
              />
              <div className="flex-1">
                <label
                  htmlFor="consent-accept"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  我已仔细阅读并理解上述内容
                </label>
                <p className="text-xs text-muted-foreground mt-1">
                  {consentType.required
                    ? "这是必需的同意项目，必须同意才能继续使用相关功能。"
                    : "这是可选的同意项目，您可以选择同意或拒绝。"}
                </p>
              </div>
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="flex-col space-y-3">
          <div className="flex space-x-2 w-full">
            <Button
              variant="outline"
              onClick={handleDecline}
              disabled={isSubmitting}
              className="flex-1"
            >
              {consentType.required ? "取消" : "拒绝"}
            </Button>
            <Button
              onClick={handleAccept}
              disabled={!isAccepted || isSubmitting}
              className="flex-1"
            >
              {isSubmitting ? "处理中..." : "同意并继续"}
            </Button>
          </div>

          <div className="text-xs text-muted-foreground text-center">
            同意版本：{consentType.version} | 最后更新：
            {new Date().toLocaleDateString("zh-CN")}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// 同意管理器 Hook
export function useConsentManager(userId: string) {
  const [pendingConsents, setPendingConsents] = useState<ConsentType[]>([]);
  const [currentConsent, setCurrentConsent] = useState<ConsentType | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(false);

  const requestConsent = async (
    consentId: string,
    context?: Record<string, any>,
    forceRefresh = false,
  ): Promise<boolean> => {
    const consentType = consentManager.getConsentType(consentId);
    if (!consentType) {
      throw new Error(`Unknown consent type: ${consentId}`);
    }

    setIsLoading(true);
    try {
      const result = await consentManager.requestConsent(userId, {
        type: consentType,
        context,
        forceRefresh,
      });

      if (result.granted) {
        return true;
      }

      // 需要用户同意
      setCurrentConsent(consentType);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const grantConsent = async (
    consentId: string,
    context?: Record<string, any>,
  ) => {
    await consentManager.grantConsent(userId, consentId, context);
    setCurrentConsent(null);
  };

  const checkConsent = async (consentId: string): Promise<boolean> => {
    return await consentManager.checkConsent(userId, consentId);
  };

  const checkMultipleConsents = async (
    consentIds: string[],
  ): Promise<Record<string, boolean>> => {
    return await consentManager.checkMultipleConsents(userId, consentIds);
  };

  return {
    currentConsent,
    isLoading,
    requestConsent,
    grantConsent,
    checkConsent,
    checkMultipleConsents,
    clearCurrentConsent: () => setCurrentConsent(null),
  };
}

// 快速同意检查组件
interface ConsentCheckerProps {
  userId: string;
  consentId: string;
  children: (
    hasConsent: boolean,
    requestConsent: () => Promise<boolean>,
  ) => React.ReactNode;
  context?: Record<string, any>;
}

export function ConsentChecker({
  userId,
  consentId,
  children,
  context,
}: ConsentCheckerProps) {
  const [hasConsent, setHasConsent] = useState<boolean | null>(null);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    checkInitialConsent();
  }, [userId, consentId]);

  const checkInitialConsent = async () => {
    try {
      const consent = await consentManager.checkConsent(userId, consentId);
      setHasConsent(consent);
    } catch (error) {
      console.error("Failed to check consent:", error);
      setHasConsent(false);
    } finally {
      setIsChecking(false);
    }
  };

  const requestConsent = async (): Promise<boolean> => {
    const consentType = consentManager.getConsentType(consentId);
    if (!consentType) return false;

    try {
      const result = await consentManager.requestConsent(userId, {
        type: consentType,
        context,
      });

      if (result.granted) {
        setHasConsent(true);
        return true;
      }

      return false;
    } catch (error) {
      console.error("Failed to request consent:", error);
      return false;
    }
  };

  if (isChecking) {
    return (
      <div className="flex items-center justify-center p-4">检查权限中...</div>
    );
  }

  return <>{children(hasConsent || false, requestConsent)}</>;
}
