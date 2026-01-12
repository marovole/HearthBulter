// @ts-nocheck
"use client";

import { useState } from "react";

interface WaterTrackingProps {
  current: number;
  target: number;
  onAdd: (amount: number) => void;
}

export function WaterTracking({ current, target, onAdd }: WaterTrackingProps) {
  const percentage = Math.min((current / target) * 100, 100);
  const quickAmounts = [250, 500, 1000];

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold mb-4">💧 饮水打卡</h3>

      <div className="mb-4">
        <div className="flex justify-between text-sm mb-2">
          <span>今日饮水</span>
          <span className="font-medium">
            {current}/{target}ml
          </span>
        </div>
        <div className="w-full h-4 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-500 transition-all duration-500"
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>

      <div className="flex gap-2">
        {quickAmounts.map((amount) => (
          <button
            key={amount}
            onClick={() => onAdd(amount)}
            className="flex-1 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 text-sm font-medium"
          >
            +{amount}ml
          </button>
        ))}
      </div>
    </div>
  );
}

interface ExerciseTrackingProps {
  onAdd: (data: {
    minutes: number;
    caloriesBurned: number;
    exerciseType: string[];
  }) => void;
}

export function ExerciseTracking({ onAdd }: ExerciseTrackingProps) {
  const [minutes, setMinutes] = useState(30);
  const [exerciseType, setExerciseType] = useState("running");

  const exerciseTypes = [
    { value: "walking", label: "散步", icon: "🚶" },
    { value: "running", label: "跑步", icon: "🏃" },
    { value: "cycling", label: "骑行", icon: "🚴" },
    { value: "yoga", label: "瑜伽", icon: "🧘" },
    { value: "swimming", label: "游泳", icon: "🏊" },
    { value: "strength_training", label: "力量训练", icon: "💪" },
  ];

  // 简单的卡路里估算（实际应该根据体重和运动类型计算）
  const estimateCalories = (type: string, min: number) => {
    const rates: { [key: string]: number } = {
      walking: 4,
      running: 10,
      cycling: 8,
      yoga: 3,
      swimming: 8,
      strength_training: 6,
    };
    return Math.round((rates[type] || 5) * min);
  };

  const handleSubmit = () => {
    onAdd({
      minutes,
      caloriesBurned: estimateCalories(exerciseType, minutes),
      exerciseType: [exerciseType],
    });
    alert("运动打卡成功！");
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold mb-4">🏃 运动打卡</h3>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">运动类型</label>
          <div className="grid grid-cols-3 gap-2">
            {exerciseTypes.map((type) => (
              <button
                key={type.value}
                onClick={() => setExerciseType(type.value)}
                className={`p-3 rounded-lg border-2 transition-all ${
                  exerciseType === type.value
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-200 hover:border-blue-300"
                }`}
              >
                <div className="text-2xl mb-1">{type.icon}</div>
                <div className="text-xs font-medium">{type.label}</div>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            运动时长：{minutes}分钟
          </label>
          <input
            type="range"
            min="5"
            max="120"
            step="5"
            value={minutes}
            onChange={(e) => setMinutes(Number(e.target.value))}
            className="w-full"
          />
        </div>

        <div className="bg-gray-50 rounded-lg p-3 text-center">
          <div className="text-sm text-gray-600">预计消耗</div>
          <div className="text-2xl font-bold text-orange-600">
            {estimateCalories(exerciseType, minutes)} kcal
          </div>
        </div>

        <button
          onClick={handleSubmit}
          className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
        >
          完成打卡
        </button>
      </div>
    </div>
  );
}

interface WeightTrackingProps {
  onAdd: (data: { weight: number; bodyFat?: number }) => void;
}

export function WeightTracking({ onAdd }: WeightTrackingProps) {
  const [weight, setWeight] = useState("");
  const [bodyFat, setBodyFat] = useState("");

  const handleSubmit = () => {
    if (!weight) {
      alert("请输入体重");
      return;
    }

    onAdd({
      weight: parseFloat(weight),
      bodyFat: bodyFat ? parseFloat(bodyFat) : undefined,
    });

    setWeight("");
    setBodyFat("");
    alert("体重打卡成功！");
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold mb-4">⚖️ 体重打卡</h3>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">体重 (kg)</label>
          <input
            type="number"
            step="0.1"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg"
            placeholder="输入体重"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            体脂率 (%) 可选
          </label>
          <input
            type="number"
            step="0.1"
            value={bodyFat}
            onChange={(e) => setBodyFat(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg"
            placeholder="输入体脂率"
          />
        </div>

        <button
          onClick={handleSubmit}
          className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
        >
          完成打卡
        </button>
      </div>
    </div>
  );
}

interface SleepTrackingProps {
  onAdd: (data: { hours: number; quality: string }) => void;
}

export function SleepTracking({ onAdd }: SleepTrackingProps) {
  const [hours, setHours] = useState(7);
  const [quality, setQuality] = useState("GOOD");

  const qualities = [
    { value: "EXCELLENT", label: "极好", icon: "😴", color: "bg-green-500" },
    { value: "GOOD", label: "良好", icon: "😊", color: "bg-blue-500" },
    { value: "FAIR", label: "一般", icon: "😐", color: "bg-yellow-500" },
    { value: "POOR", label: "较差", icon: "😣", color: "bg-red-500" },
  ];

  const handleSubmit = () => {
    onAdd({ hours, quality });
    alert("睡眠打卡成功！");
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold mb-4">😴 睡眠打卡</h3>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">
            睡眠时长：{hours}小时
          </label>
          <input
            type="range"
            min="1"
            max="12"
            step="0.5"
            value={hours}
            onChange={(e) => setHours(Number(e.target.value))}
            className="w-full"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">睡眠质量</label>
          <div className="grid grid-cols-2 gap-2">
            {qualities.map((q) => (
              <button
                key={q.value}
                onClick={() => setQuality(q.value)}
                className={`p-3 rounded-lg border-2 transition-all ${
                  quality === q.value
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-200 hover:border-blue-300"
                }`}
              >
                <div className="text-2xl mb-1">{q.icon}</div>
                <div className="text-sm font-medium">{q.label}</div>
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={handleSubmit}
          className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
        >
          完成打卡
        </button>
      </div>
    </div>
  );
}
