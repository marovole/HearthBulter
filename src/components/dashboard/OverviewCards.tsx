"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { HealthScoreGauge } from "./HealthScoreGauge";
import { GoalProgressBar } from "./GoalProgressBar";
import { EmptyStateGuide } from "./EmptyStateGuide";
import {
  TrendingUp,
  TrendingDown,
  Scale,
  Target,
  Utensils,
  Activity,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface OverviewData {
  overview: {
    weightTrend: {
      currentWeight: number | null;
      change: number;
      changePercent: number;
      targetWeight: number | null;
    };
    nutritionSummary: {
      targetCalories: number | null;
      actualCalories: number | null;
      adherenceRate: number;
    };
    goalProgress: Array<{
      goalId: string;
      goalType: string;
      currentProgress: number;
      targetWeight: number | null;
      currentWeight: number | null;
      startWeight: number | null;
      onTrack: boolean;
      weeksRemaining: number | null;
    }>;
  };
  healthScore: {
    totalScore: number;
    breakdown: {
      bmiScore: number;
      nutritionScore: number;
      activityScore: number;
      dataCompletenessScore: number;
    };
    details: {
      bmi: number | null;
      bmiCategory: string | null;
      nutritionAdherenceRate: number;
      activityFrequency: number;
      dataCompletenessRate: number;
    };
    recommendations: string[];
  };
}

interface OverviewCardsProps {
  memberId: string;
}

export function OverviewCards({ memberId }: OverviewCardsProps) {
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [memberId]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(
        `/api/dashboard/overview?memberId=${memberId}`,
      );
      if (!response.ok) throw new Error("加载概览数据失败");
      const result = await response.json();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "加载失败");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} variant="default" className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-4 bg-muted rounded w-20 mb-3" />
              <div className="h-8 bg-muted rounded w-24" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Card variant="outline" className="border-destructive/50">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <p className="text-sm text-destructive">{error}</p>
            <button
              onClick={loadData}
              className="text-sm text-primary font-medium hover:underline"
            >
              重试
            </button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return (
      <EmptyStateGuide
        memberId={memberId}
        type="overview"
        onInitialize={loadData}
      />
    );
  }

  const { overview, healthScore } = data;

  const statCards = [
    {
      label: "当前体重",
      value: overview.weightTrend.currentWeight
        ? `${overview.weightTrend.currentWeight.toFixed(1)} kg`
        : "--",
      subtext: overview.weightTrend.targetWeight
        ? `目标: ${overview.weightTrend.targetWeight.toFixed(1)} kg`
        : undefined,
      icon: Scale,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      label: "体重变化",
      value: `${overview.weightTrend.change >= 0 ? "+" : ""}${overview.weightTrend.change.toFixed(1)} kg`,
      subtext: `${overview.weightTrend.changePercent >= 0 ? "+" : ""}${overview.weightTrend.changePercent.toFixed(1)}%`,
      icon: overview.weightTrend.change >= 0 ? TrendingUp : TrendingDown,
      color:
        overview.weightTrend.change >= 0 ? "text-destructive" : "text-success",
      bgColor:
        overview.weightTrend.change >= 0
          ? "bg-destructive/10"
          : "bg-success/10",
    },
    {
      label: "营养达标率",
      value: `${overview.nutritionSummary.adherenceRate.toFixed(0)}%`,
      subtext: overview.nutritionSummary.targetCalories
        ? `目标: ${overview.nutritionSummary.targetCalories} kcal`
        : undefined,
      icon: Utensils,
      color: "text-accent",
      bgColor: "bg-accent/10",
    },
    {
      label: "健康评分",
      value: `${healthScore.totalScore} 分`,
      subtext: healthScore.details.bmiCategory
        ? `BMI: ${healthScore.details.bmiCategory === "normal" ? "正常" : "需关注"}`
        : undefined,
      icon: Activity,
      color: "text-info",
      bgColor: "bg-info/10",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, index) => (
          <Card key={stat.label} variant="elevated" className="group">
            <CardContent className="p-5">
              <div className="flex items-start justify-between mb-3">
                <span className="text-sm font-medium text-muted-foreground">
                  {stat.label}
                </span>
                <div
                  className={cn(
                    "p-2 rounded-lg transition-transform group-hover:scale-110",
                    stat.bgColor,
                  )}
                >
                  <stat.icon className={cn("h-4 w-4", stat.color)} />
                </div>
              </div>
              <div
                className={cn(
                  "font-mono text-2xl font-bold mb-1",
                  stat.color === "text-destructive" ||
                    stat.color === "text-success"
                    ? stat.color
                    : "text-foreground",
                )}
              >
                {stat.value}
              </div>
              {stat.subtext && (
                <div className="text-xs text-muted-foreground">
                  {stat.subtext}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Score and Goals */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card variant="elevated">
          <CardContent className="p-6">
            <h3 className="font-display text-lg font-semibold text-foreground mb-4">
              健康评分
            </h3>
            <HealthScoreGauge
              score={healthScore.totalScore}
              breakdown={healthScore.breakdown}
            />
          </CardContent>
        </Card>

        <Card variant="elevated">
          <CardContent className="p-6">
            <h3 className="font-display text-lg font-semibold text-foreground mb-4">
              目标进度
            </h3>
            {overview.goalProgress.length > 0 ? (
              <div className="space-y-4">
                {overview.goalProgress.map((goal) => (
                  <GoalProgressBar
                    key={goal.goalId}
                    goalType={goal.goalType}
                    currentProgress={goal.currentProgress}
                    targetWeight={goal.targetWeight}
                    currentWeight={goal.currentWeight}
                    startWeight={goal.startWeight}
                    onTrack={goal.onTrack}
                    weeksRemaining={goal.weeksRemaining}
                  />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="p-3 rounded-full bg-muted mb-3">
                  <Target className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground">暂无活跃目标</p>
                <button className="mt-2 text-sm text-primary font-medium hover:underline">
                  设置健康目标
                </button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
