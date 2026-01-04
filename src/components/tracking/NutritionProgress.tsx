'use client';

interface NutritionProgressProps {
  nutrient: {
    name: string;
    target: number;
    actual: number;
    unit: string;
    color: string;
  };
}

export function NutritionProgress({ nutrient }: NutritionProgressProps) {
  const { name, target, actual, unit, color } = nutrient;

  const percentage = Math.min((actual / target) * 100, 100);
  const isOver = actual > target * 1.2; // 超标20%
  const isLow = actual < target * 0.8; // 不足20%
  const isGood = !isOver && !isLow;

  const getStatusColor = () => {
    if (isOver) return 'bg-red-500';
    if (isLow) return 'bg-yellow-500';
    return color;
  };

  const getStatusText = () => {
    if (isOver) return '超标';
    if (isLow) return '不足';
    if (percentage >= 95) return '已达标✓';
    return '进行中';
  };

  return (
    <div className='space-y-2'>
      <div className='flex justify-between items-center'>
        <span className='font-medium'>{name}</span>
        <div className='text-sm text-gray-600'>
          <span className={isOver ? 'text-red-600 font-semibold' : ''}>
            {Math.round(actual)}
          </span>
          /{target}
          {unit}
          <span
            className={`ml-2 px-2 py-0.5 rounded text-xs ${
              isOver
                ? 'bg-red-100 text-red-700'
                : isLow
                  ? 'bg-yellow-100 text-yellow-700'
                  : 'bg-green-100 text-green-700'
            }`}
          >
            {getStatusText()}
          </span>
        </div>
      </div>

      <div className='relative w-full h-3 bg-gray-200 rounded-full overflow-hidden'>
        <div
          className={`h-full transition-all duration-500 ${getStatusColor()}`}
          style={{ width: `${percentage}%` }}
        />
      </div>

      {(isOver || isLow) && (
        <div className='text-sm text-gray-600'>
          {isOver && (
            <span className='text-red-600'>
              已超出{Math.round(actual - target)}
              {unit}，建议减少摄入
            </span>
          )}
          {isLow && (
            <span className='text-yellow-600'>
              还差{Math.round(target - actual)}
              {unit}，建议适当增加
            </span>
          )}
        </div>
      )}
    </div>
  );
}

interface DailyNutritionProgressProps {
  targets: {
    calories: { target: number; actual: number };
    protein: { target: number; actual: number };
    carbs: { target: number; actual: number };
    fat: { target: number; actual: number };
  };
}

export function DailyNutritionProgress({
  targets,
}: DailyNutritionProgressProps) {
  const nutrients = [
    {
      name: '热量',
      target: targets.calories.target,
      actual: targets.calories.actual,
      unit: 'kcal',
      color: 'bg-blue-500',
    },
    {
      name: '蛋白质',
      target: targets.protein.target,
      actual: targets.protein.actual,
      unit: 'g',
      color: 'bg-green-500',
    },
    {
      name: '碳水化合物',
      target: targets.carbs.target,
      actual: targets.carbs.actual,
      unit: 'g',
      color: 'bg-yellow-500',
    },
    {
      name: '脂肪',
      target: targets.fat.target,
      actual: targets.fat.actual,
      unit: 'g',
      color: 'bg-orange-500',
    },
  ];

  return (
    <div className='bg-white rounded-lg shadow p-6 space-y-4'>
      <h3 className='text-lg font-semibold mb-4'>今日营养进度</h3>
      {nutrients.map((nutrient, index) => (
        <NutritionProgress key={index} nutrient={nutrient} />
      ))}
    </div>
  );
}
