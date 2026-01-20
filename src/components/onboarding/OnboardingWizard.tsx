"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useOnboarding } from "@/lib/context/OnboardingContext";

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  component?: React.ComponentType<{
    onNext: () => void;
    onPrevious: () => void;
    onSkip: () => void;
  }> | null;
}

const steps: OnboardingStep[] = [
  {
    id: "welcome",
    title: "欢迎使用 Health Butler",
    description: "了解您的智能家庭健康管家",
    component: () => null, // Will be handled by welcome page
  },
  {
    id: "family-setup",
    title: "家庭设置",
    description: "创建家庭成员档案",
    component: null, // Will be implemented
  },
  {
    id: "health-goals",
    title: "健康目标",
    description: "设置个人健康目标",
    component: null, // Will be implemented
  },
  {
    id: "feature-tour",
    title: "功能导览",
    description: "了解核心功能使用",
    component: null, // Will be implemented
  },
];

export function OnboardingWizard() {
  const [currentStep, setCurrentStep] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const router = useRouter();
  const { completeOnboarding, saveProgress } = useOnboarding();

  const progress = ((currentStep + 1) / steps.length) * 100;

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      const nextStep = currentStep + 1;
      setCurrentStep(nextStep);
      saveProgress(nextStep);
    } else {
      handleComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      const prevStep = currentStep - 1;
      setCurrentStep(prevStep);
      saveProgress(prevStep);
    }
  };

  const handleSkip = () => {
    completeOnboarding();
    router.push("/dashboard");
  };

  const handleComplete = () => {
    completeOnboarding();
    setIsCompleted(true);
    setTimeout(() => {
      router.push("/dashboard");
    }, 2000);
  };

  const goToStep = (stepIndex: number) => {
    setCurrentStep(stepIndex);
    saveProgress(stepIndex);
  };

  if (isCompleted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl text-green-600">设置完成！</CardTitle>
            <CardDescription>欢迎开始使用 Health Butler</CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <p className="mb-4 text-gray-600">您已成功完成初始设置，现在可以开始使用所有功能了。</p>
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600"></div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentStepData = steps[currentStep];
  if (!currentStepData) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 px-4 py-8">
      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Badge variant="outline" className="bg-white">
              步骤 {currentStep + 1} / {steps.length}
            </Badge>
            <h1 className="text-2xl font-semibold text-gray-900">{currentStepData.title}</h1>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSkip}
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="mr-1 h-4 w-4" />
            跳过引导
          </Button>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <Progress value={progress} className="h-2" />
          <p className="mt-2 text-center text-sm text-gray-500">{currentStepData.description}</p>
        </div>

        {/* Step Navigation */}
        <div className="mb-8 flex justify-center">
          <div className="flex space-x-2">
            {steps.map((step, index) => (
              <button
                key={step.id}
                onClick={() => goToStep(index)}
                className={`h-3 w-3 rounded-full transition-colors ${
                  index === currentStep
                    ? "bg-blue-600"
                    : index < currentStep
                      ? "bg-green-500"
                      : "bg-gray-300"
                }`}
                aria-label={`转到步骤 ${index + 1}`}
              />
            ))}
          </div>
        </div>

        {/* Content */}
        <Card className="mb-8">
          <CardContent className="p-8">
            {currentStep === 0 && (
              <div className="text-center">
                <div className="mb-8">
                  <h2 className="mb-4 text-3xl font-bold text-gray-900">欢迎使用 Health Butler</h2>
                  <p className="mx-auto max-w-2xl text-xl text-gray-600">
                    您的智能家庭健康管家，让健康管理变得简单而有趣。
                  </p>
                </div>

                <div className="mb-8 grid gap-6 md:grid-cols-2">
                  <div className="rounded-lg bg-blue-50 p-6 text-left">
                    <h3 className="mb-2 text-lg font-semibold">🏥 家庭健康管理</h3>
                    <p className="text-gray-600">为全家成员创建健康档案，统一管理健康数据</p>
                  </div>
                  <div className="rounded-lg bg-green-50 p-6 text-left">
                    <h3 className="mb-2 text-lg font-semibold">📊 健康数据追踪</h3>
                    <p className="text-gray-600">记录关键指标，可视化健康趋势</p>
                  </div>
                  <div className="rounded-lg bg-purple-50 p-6 text-left">
                    <h3 className="mb-2 text-lg font-semibold">🤖 AI营养建议</h3>
                    <p className="text-gray-600">个性化营养指导和食谱推荐</p>
                  </div>
                  <div className="rounded-lg bg-orange-50 p-6 text-left">
                    <h3 className="mb-2 text-lg font-semibold">🛒 智能购物清单</h3>
                    <p className="text-gray-600">根据食谱自动生成购物清单</p>
                  </div>
                </div>
              </div>
            )}

            {currentStep === 1 && (
              <div>
                <h2 className="mb-6 text-center text-2xl font-semibold">设置您的家庭档案</h2>
                <p className="mb-8 text-center text-gray-600">
                  添加家庭成员，为他们创建个性化的健康档案
                </p>
                <div className="py-12 text-center">
                  <p className="text-gray-500">家庭设置组件将在这里实现...</p>
                </div>
              </div>
            )}

            {currentStep === 2 && (
              <div>
                <h2 className="mb-6 text-center text-2xl font-semibold">设置健康目标</h2>
                <p className="mb-8 text-center text-gray-600">为您和您的家人设置个性化的健康目标</p>
                <div className="py-12 text-center">
                  <p className="text-gray-500">健康目标设置组件将在这里实现...</p>
                </div>
              </div>
            )}

            {currentStep === 3 && (
              <div>
                <h2 className="mb-6 text-center text-2xl font-semibold">功能导览</h2>
                <p className="mb-8 text-center text-gray-600">
                  了解如何使用 Health Butler 的核心功能
                </p>
                <div className="py-12 text-center">
                  <p className="text-gray-500">功能导览组件将在这里实现...</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Navigation Buttons */}
        <div className="flex justify-between">
          <Button variant="outline" onClick={handlePrevious} disabled={currentStep === 0}>
            <ChevronLeft className="mr-2 h-4 w-4" />
            上一步
          </Button>

          <Button onClick={handleNext}>
            {currentStep === steps.length - 1 ? "完成设置" : "下一步"}
            <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
