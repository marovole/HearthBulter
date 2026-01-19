"use client";

import { useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertTriangle, Info } from "lucide-react";

interface MedicalDisclaimerProps {
  onAccept: () => void;
  onDecline: () => void;
  requireAcceptance?: boolean;
  showAsAlert?: boolean;
}

export function MedicalDisclaimer({
  onAccept,
  onDecline,
  requireAcceptance = true,
  showAsAlert = false,
}: MedicalDisclaimerProps) {
  const [isAccepted, setIsAccepted] = useState(false);
  const [showDialog, setShowDialog] = useState(requireAcceptance);

  const disclaimerContent = (
    <div className="space-y-4">
      <div className="flex items-start space-x-3">
        <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" />
        <div>
          <h3 className="font-semibold text-amber-800 mb-2">
            重要医疗免责声明
          </h3>
          <div className="text-sm space-y-2 text-amber-700">
            <p>
              本AI营养建议引擎提供的健康分析、营养建议和医疗报告仅供参考，不构成专业的医疗诊断或治疗建议。
            </p>
            <p>
              <strong>请注意：</strong>
            </p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>AI分析结果不能替代专业医生的诊断</li>
              <li>建议基于一般性健康原则，可能不适合您的具体情况</li>
              <li>如果您有已知的健康问题，请务必咨询专业医疗人员</li>
              <li>
                对于儿童、孕妇、老人或有特殊健康状况的人群，使用时请特别谨慎
              </li>
              <li>如出现健康问题，请立即就医，不要自行根据AI建议处理</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="flex items-start space-x-3">
        <Info className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
        <div>
          <h3 className="font-semibold text-blue-800 mb-2">数据隐私保护</h3>
          <div className="text-sm space-y-2 text-blue-700">
            <p>
              您的健康数据将严格保密，仅用于为您提供个性化健康建议。我们采用行业标准的加密技术保护您的数据安全。
            </p>
            <p>
              <strong>数据使用说明：</strong>
            </p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>健康数据仅用于AI分析，不会用于其他商业目的</li>
              <li>您可以随时要求删除您的健康数据</li>
              <li>我们不会向第三方出售或分享您的个人信息</li>
              <li>所有AI处理都在安全的服务器环境中进行</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );

  if (showAsAlert) {
    return (
      <Alert className="border-amber-200 bg-amber-50">
        <AlertTriangle className="h-4 w-4 text-amber-600" />
        <AlertDescription className="text-amber-800">
          <div className="space-y-2">
            <p className="font-medium">医疗免责声明</p>
            <p className="text-sm">
              本AI健康建议仅供参考，不能替代专业医疗诊断。如有健康问题，请咨询专业医生。
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowDialog(true)}
              className="mt-2"
            >
              查看完整声明
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <>
      {/* 弹窗形式的完整免责声明 */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <AlertTriangle className="w-5 h-5 text-amber-500 mr-2" />
              医疗免责声明
            </DialogTitle>
            <DialogDescription>
              使用AI营养建议引擎前，请仔细阅读以下重要声明
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">{disclaimerContent}</div>

          <DialogFooter className="flex-col space-y-3">
            <div className="flex items-center space-x-2 w-full">
              <Checkbox
                id="accept-disclaimer"
                checked={isAccepted}
                onCheckedChange={(checked) => setIsAccepted(checked as boolean)}
              />
              <label
                htmlFor="accept-disclaimer"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                我已仔细阅读并理解上述免责声明
              </label>
            </div>

            <div className="flex space-x-2 w-full">
              <Button
                variant="outline"
                onClick={() => {
                  setShowDialog(false);
                  onDecline?.();
                }}
                className="flex-1"
              >
                不同意
              </Button>
              <Button
                onClick={() => {
                  if (isAccepted) {
                    setShowDialog(false);
                    onAccept?.();
                  }
                }}
                disabled={!isAccepted}
                className="flex-1"
              >
                同意并继续
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 内联显示的简化版 */}
      {!requireAcceptance && !showAsAlert && (
        <div className="p-4 border border-amber-200 rounded-lg bg-amber-50">
          <div className="flex items-start space-x-3">
            <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="font-semibold text-amber-800 mb-2">
                医疗免责声明
              </h3>
              <p className="text-sm text-amber-700 mb-3">
                本AI健康建议仅供参考，不能替代专业医疗诊断。如有健康问题，请咨询专业医生。
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDialog(true)}
              >
                查看完整声明
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// Hook for managing disclaimer acceptance
export function useMedicalDisclaimer() {
  const [isAccepted, setIsAccepted] = useState(() => {
    // 检查本地存储是否已接受
    if (typeof window !== "undefined") {
      const accepted = localStorage.getItem("medical-disclaimer-accepted");
      return accepted === "true";
    }
    return false;
  });

  const acceptDisclaimer = () => {
    setIsAccepted(true);
    if (typeof window !== "undefined") {
      localStorage.setItem("medical-disclaimer-accepted", "true");
    }
  };

  const declineDisclaimer = () => {
    setIsAccepted(false);
    if (typeof window !== "undefined") {
      localStorage.removeItem("medical-disclaimer-accepted");
    }
  };

  return {
    isAccepted,
    acceptDisclaimer,
    declineDisclaimer,
  };
}
