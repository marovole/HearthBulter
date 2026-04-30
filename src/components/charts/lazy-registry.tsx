"use client";

import dynamic from "next/dynamic";
import { ChartSkeleton } from "@/components/charts/chart-skeleton";

const loading = () => <ChartSkeleton />;

export const WeightTrendChartLazy = dynamic(
  () => import("@/components/dashboard/WeightTrendChart").then((m) => m.WeightTrendChart),
  { ssr: false, loading }
);

export const MacroPieChartLazy = dynamic(
  () => import("@/components/dashboard/MacroPieChart").then((m) => m.MacroPieChart),
  { ssr: false, loading }
);

export const HealthScoreGaugeLazy = dynamic(
  () => import("@/components/dashboard/HealthScoreGauge").then((m) => m.HealthScoreGauge),
  { ssr: false, loading: () => <ChartSkeleton className="min-h-[200px]" /> }
);

export const NutritionTrendChartLazy = dynamic(
  () => import("@/components/dashboard/NutritionTrendChart").then((m) => m.NutritionTrendChart),
  { ssr: false, loading }
);

export const NutritionAnalysisChartLazy = dynamic(
  () =>
    import("@/components/dashboard/NutritionAnalysisChart").then((m) => m.NutritionAnalysisChart),
  { ssr: false, loading }
);

export const HealthMetricsChartLazy = dynamic(
  () => import("@/components/dashboard/HealthMetricsChart").then((m) => m.HealthMetricsChart),
  { ssr: false, loading }
);

export const DashboardHealthScoreCardLazy = dynamic(
  () => import("@/components/dashboard/HealthScoreCard"),
  { ssr: false, loading: () => <ChartSkeleton className="min-h-[280px]" /> }
);

export const MealPlanningNutritionChartLazy = dynamic(
  () => import("@/components/meal-planning/NutritionChart").then((m) => m.NutritionChart),
  { ssr: false, loading }
);

export const MacroNutrientChartLazy = dynamic(
  () => import("@/components/meal-planning/MacroNutrientChart").then((m) => m.MacroNutrientChart),
  { ssr: false, loading }
);

export const AnalyticsTrendChartLazy = dynamic(() => import("@/components/analytics/TrendChart"), {
  ssr: false,
  loading,
});
