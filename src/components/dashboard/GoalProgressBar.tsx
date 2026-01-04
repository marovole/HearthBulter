'use client';

interface GoalProgressBarProps {
  goalType: string;
  currentProgress: number; // 0-100
  targetWeight: number | null;
  currentWeight: number | null;
  startWeight: number | null;
  onTrack: boolean;
  weeksRemaining: number | null;
}

export function GoalProgressBar({
  goalType,
  currentProgress,
  targetWeight,
  currentWeight,
  startWeight,
  onTrack,
  weeksRemaining,
}: GoalProgressBarProps) {
  const getGoalTypeLabel = (type: string) => {
    switch (type) {
      case 'LOSE_WEIGHT':
        return '减重目标';
      case 'GAIN_MUSCLE':
        return '增肌目标';
      case 'MAINTAIN':
        return '维持体重';
      case 'IMPROVE_HEALTH':
        return '改善健康';
      default:
        return '健康目标';
    }
  };

  const getProgressColor = () => {
    if (currentProgress >= 80) return 'bg-green-600';
    if (currentProgress >= 50) return 'bg-blue-600';
    if (currentProgress >= 25) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getStatusColor = () => {
    return onTrack ? 'text-green-600' : 'text-red-600';
  };

  const getStatusText = () => {
    return onTrack ? '正常进度' : '进度滞后';
  };

  return (
    <div className='bg-white rounded-lg border border-gray-200 p-4'>
      <div className='flex items-center justify-between mb-2'>
        <h3 className='text-sm font-medium text-gray-900'>
          {getGoalTypeLabel(goalType)}
        </h3>
        <span className={`text-xs font-medium ${getStatusColor()}`}>
          {getStatusText()}
        </span>
      </div>

      {/* 进度条 */}
      <div className='mb-3'>
        <div className='flex justify-between text-xs text-gray-600 mb-1'>
          <span>进度</span>
          <span>{Math.round(currentProgress)}%</span>
        </div>
        <div className='w-full bg-gray-200 rounded-full h-3'>
          <div
            className={`${getProgressColor()} h-3 rounded-full transition-all duration-300`}
            style={{ width: `${Math.min(100, Math.max(0, currentProgress))}%` }}
          />
        </div>
      </div>

      {/* 体重信息 */}
      <div className='grid grid-cols-3 gap-2 text-xs'>
        <div>
          <div className='text-gray-500'>起始体重</div>
          <div className='font-semibold text-gray-900'>
            {startWeight ? `${startWeight.toFixed(1)} kg` : '--'}
          </div>
        </div>
        <div>
          <div className='text-gray-500'>当前体重</div>
          <div className='font-semibold text-gray-900'>
            {currentWeight ? `${currentWeight.toFixed(1)} kg` : '--'}
          </div>
        </div>
        <div>
          <div className='text-gray-500'>目标体重</div>
          <div className='font-semibold text-gray-900'>
            {targetWeight ? `${targetWeight.toFixed(1)} kg` : '--'}
          </div>
        </div>
      </div>

      {/* 预计完成时间 */}
      {weeksRemaining !== null && (
        <div className='mt-3 pt-3 border-t border-gray-200'>
          <div className='text-xs text-gray-600'>
            预计剩余时间：
            <span className='font-semibold text-gray-900'>
              {weeksRemaining} 周
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
