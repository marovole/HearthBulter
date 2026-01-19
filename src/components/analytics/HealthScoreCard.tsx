"use client";

import { ScoreGrade } from "@prisma/client";

interface HealthScoreCardProps {
  score: number;
  grade: ScoreGrade;
  components?: {
    nutritionScore?: number;
    exerciseScore?: number;
    sleepScore?: number;
    medicalScore?: number;
  };
  showDetails?: boolean;
}

const gradeConfig = {
  EXCELLENT: {
    label: "优秀",
    color: "text-green-600",
    bgColor: "bg-green-50",
    borderColor: "border-green-200",
  },
  GOOD: {
    label: "良好",
    color: "text-blue-600",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200",
  },
  FAIR: {
    label: "一般",
    color: "text-yellow-600",
    bgColor: "bg-yellow-50",
    borderColor: "border-yellow-200",
  },
  POOR: {
    label: "较差",
    color: "text-red-600",
    bgColor: "bg-red-50",
    borderColor: "border-red-200",
  },
};

export default function HealthScoreCard({
  score,
  grade,
  components,
  showDetails = false,
}: HealthScoreCardProps) {
  const config = gradeConfig[grade];

  return (
    <div
      className={`rounded-xl border-2 ${config.borderColor} ${config.bgColor} p-6`}
    >
      {/* 主评分 */}
      <div className="text-center mb-4">
        <div className="text-sm text-gray-600 mb-2">综合健康评分</div>
        <div className={`text-6xl font-bold ${config.color} mb-2`}>
          {score.toFixed(1)}
        </div>
        <div
          className={`inline-block px-4 py-1 rounded-full ${config.bgColor} ${config.color} font-semibold`}
        >
          {config.label}
        </div>
      </div>

      {/* 评分详情 */}
      {showDetails && components && (
        <div className="mt-6 pt-6 border-t border-gray-200">
          <div className="grid grid-cols-2 gap-4">
            {components.nutritionScore !== undefined && (
              <ScoreItem
                label="营养评分"
                score={components.nutritionScore}
                weight={40}
              />
            )}
            {components.exerciseScore !== undefined && (
              <ScoreItem
                label="运动评分"
                score={components.exerciseScore}
                weight={30}
              />
            )}
            {components.sleepScore !== undefined && (
              <ScoreItem
                label="睡眠评分"
                score={components.sleepScore}
                weight={20}
              />
            )}
            {components.medicalScore !== undefined && (
              <ScoreItem
                label="体检评分"
                score={components.medicalScore}
                weight={10}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ScoreItem({
  label,
  score,
  weight,
}: {
  label: string;
  score: number;
  weight: number;
}) {
  const getColor = (s: number) => {
    if (s >= 90) return "text-green-600";
    if (s >= 75) return "text-blue-600";
    if (s >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  return (
    <div className="text-center">
      <div className="text-sm text-gray-600 mb-1">{label}</div>
      <div className={`text-2xl font-bold ${getColor(score)}`}>
        {score.toFixed(0)}
      </div>
      <div className="text-xs text-gray-500">权重 {weight}%</div>
    </div>
  );
}
