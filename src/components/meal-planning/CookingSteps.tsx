// @ts-nocheck
"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Clock,
  ChefHat,
  Timer,
  Flame,
  Users,
  Play,
  Pause,
  RotateCcw,
  CheckCircle,
  Circle,
} from "lucide-react";

interface CookingStep {
  id: string;
  order: number;
  title: string;
  description: string;
  duration?: number; // 分钟
  temperature?: string; // 温度
  tips?: string[];
  image?: string;
  isCompleted?: boolean;
}

interface CookingStepsProps {
  steps: CookingStep[];
  cookingTime?: number;
  difficulty?: "EASY" | "MEDIUM" | "HARD";
  servings?: number;
  onStepComplete?: (stepId: string) => void;
  onReset?: () => void;
}

const DIFFICULTY_CONFIG = {
  EASY: {
    label: "简单",
    color: "bg-green-100 text-green-800 border-green-200",
    icon: "👨‍🍳",
    description: "适合新手，操作简单",
  },
  MEDIUM: {
    label: "中等",
    color: "bg-yellow-100 text-yellow-800 border-yellow-200",
    icon: "🧑‍🍳",
    description: "需要一定烹饪经验",
  },
  HARD: {
    label: "困难",
    color: "bg-red-100 text-red-800 border-red-200",
    icon: "👨‍🏼‍🍳",
    description: "需要丰富烹饪经验",
  },
};

export function CookingSteps({
  steps,
  cookingTime,
  difficulty,
  servings,
  onStepComplete,
  onReset,
}: CookingStepsProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());
  const [isPlaying, setIsPlaying] = useState(false);

  const handleStepComplete = (stepId: string) => {
    setCompletedSteps((prev) => new Set(prev).add(stepId));
    onStepComplete?.(stepId);

    // 自动进入下一步
    if (currentStep < steps.length - 1) {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handleReset = () => {
    setCurrentStep(0);
    setCompletedSteps(new Set());
    setIsPlaying(false);
    onReset?.();
  };

  const togglePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const formatDuration = (minutes: number) => {
    if (minutes < 60) {
      return `${minutes}分钟`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}小时${mins}分钟` : `${hours}小时`;
  };

  const totalTime = steps.reduce((sum, step) => sum + (step.duration || 0), 0);
  const progress = (completedSteps.size / steps.length) * 100;

  return (
    <div className="space-y-6">
      {/* 烹饪信息概览 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ChefHat className="h-5 w-5" />
            烹饪指南
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* 总时间 */}
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <Clock className="h-8 w-8 text-blue-600 mx-auto mb-2" />
              <div className="text-sm text-blue-600 font-medium">总用时</div>
              <div className="text-lg font-bold text-blue-900">
                {formatDuration(totalTime)}
              </div>
            </div>

            {/* 烹饪时间 */}
            {cookingTime && (
              <div className="text-center p-4 bg-orange-50 rounded-lg">
                <Flame className="h-8 w-8 text-orange-600 mx-auto mb-2" />
                <div className="text-sm text-orange-600 font-medium">
                  烹饪时间
                </div>
                <div className="text-lg font-bold text-orange-900">
                  {formatDuration(cookingTime)}
                </div>
              </div>
            )}

            {/* 难度 */}
            {difficulty && (
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-2xl mb-2">
                  {DIFFICULTY_CONFIG[difficulty].icon}
                </div>
                <div className="text-sm text-gray-600 font-medium">难度</div>
                <Badge
                  variant="outline"
                  className={DIFFICULTY_CONFIG[difficulty].color}
                >
                  {DIFFICULTY_CONFIG[difficulty].label}
                </Badge>
              </div>
            )}

            {/* 份量 */}
            {servings && (
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <Users className="h-8 w-8 text-green-600 mx-auto mb-2" />
                <div className="text-sm text-green-600 font-medium">份量</div>
                <div className="text-lg font-bold text-green-900">
                  {servings}人份
                </div>
              </div>
            )}
          </div>

          {/* 进度条 */}
          <div className="mt-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">
                完成进度
              </span>
              <span className="text-sm text-gray-500">
                {completedSteps.size}/{steps.length} 步骤
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* 控制按钮 */}
          <div className="flex items-center gap-2 mt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={togglePlayPause}
              disabled={steps.length === 0}
            >
              {isPlaying ? (
                <>
                  <Pause className="h-4 w-4 mr-2" />
                  暂停
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  开始
                </>
              )}
            </Button>

            <Button variant="outline" size="sm" onClick={handleReset}>
              <RotateCcw className="h-4 w-4 mr-2" />
              重置
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 步骤列表 */}
      <div className="space-y-4">
        {steps.map((step, index) => {
          const isCurrent = index === currentStep;
          const isCompleted = completedSteps.has(step.id);

          return (
            <Card
              key={step.id}
              className={`transition-all duration-300 ${
                isCurrent
                  ? "ring-2 ring-blue-500 shadow-lg"
                  : isCompleted
                    ? "bg-green-50 border-green-200"
                    : "bg-white"
              }`}
            >
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  {/* 步骤编号和状态 */}
                  <div className="flex-shrink-0">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${
                        isCompleted
                          ? "bg-green-500 text-white"
                          : isCurrent
                            ? "bg-blue-500 text-white"
                            : "bg-gray-200 text-gray-600"
                      }`}
                    >
                      {isCompleted ? (
                        <CheckCircle className="h-5 w-5" />
                      ) : isCurrent ? (
                        <div className="animate-pulse">{index + 1}</div>
                      ) : (
                        index + 1
                      )}
                    </div>
                  </div>

                  {/* 步骤内容 */}
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-lg font-semibold text-gray-900">
                        步骤 {index + 1}: {step.title}
                      </h3>

                      {/* 步骤时长 */}
                      {step.duration && (
                        <div className="flex items-center gap-1 text-sm text-gray-600">
                          <Timer className="h-4 w-4" />
                          {formatDuration(step.duration)}
                        </div>
                      )}
                    </div>

                    <p className="text-gray-700 mb-4 leading-relaxed">
                      {step.description}
                    </p>

                    {/* 温度信息 */}
                    {step.temperature && (
                      <div className="flex items-center gap-2 mb-4">
                        <Flame className="h-4 w-4 text-orange-500" />
                        <span className="text-sm font-medium text-orange-700">
                          温度: {step.temperature}
                        </span>
                      </div>
                    )}

                    {/* 小贴士 */}
                    {step.tips && step.tips.length > 0 && (
                      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="text-amber-600">💡</div>
                          <span className="text-sm font-medium text-amber-900">
                            小贴士
                          </span>
                        </div>
                        <ul className="space-y-1">
                          {step.tips.map((tip, tipIndex) => (
                            <li
                              key={tipIndex}
                              className="text-sm text-amber-800"
                            >
                              • {tip}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* 步骤图片 */}
                    {step.image && (
                      <div className="mb-4">
                        <img
                          src={step.image}
                          alt={step.title}
                          className="w-full h-48 object-cover rounded-lg"
                        />
                      </div>
                    )}

                    {/* 完成按钮 */}
                    <div className="flex justify-end">
                      <Button
                        variant={isCompleted ? "secondary" : "default"}
                        size="sm"
                        onClick={() => handleStepComplete(step.id)}
                        disabled={isCompleted}
                      >
                        {isCompleted ? (
                          <>
                            <CheckCircle className="h-4 w-4 mr-2" />
                            已完成
                          </>
                        ) : (
                          <>
                            <Circle className="h-4 w-4 mr-2" />
                            标记完成
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* 完成提示 */}
      {completedSteps.size === steps.length && steps.length > 0 && (
        <Card className="bg-green-50 border-green-200">
          <CardContent className="p-6 text-center">
            <div className="text-4xl mb-4">🎉</div>
            <h3 className="text-xl font-bold text-green-900 mb-2">
              恭喜完成！
            </h3>
            <p className="text-green-700">
              您已成功完成所有烹饪步骤，享受您的美食吧！
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
