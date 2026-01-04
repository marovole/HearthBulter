'use client';

interface BudgetTrackerProps {
  budget: number | null;
  estimatedCost: number | null;
  actualCost: number | null;
}

export function BudgetTracker({
  budget,
  estimatedCost,
  actualCost,
}: BudgetTrackerProps) {
  const hasBudget = budget !== null;
  const hasEstimate = estimatedCost !== null;
  const hasActual = actualCost !== null;

  // 计算超预算金额
  const overBudget =
    hasBudget && hasEstimate && estimatedCost > budget
      ? estimatedCost - budget
      : null;

  // 计算价格差异
  const priceDiff =
    hasEstimate && hasActual ? actualCost - estimatedCost : null;
  const priceDiffPercent =
    priceDiff !== null && hasEstimate
      ? (priceDiff / estimatedCost) * 100
      : null;

  return (
    <div className='bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4'>
      <h3 className='text-sm font-semibold text-blue-900 mb-3'>预算信息</h3>

      <div className='space-y-2'>
        {/* 预算 */}
        {hasBudget && (
          <div className='flex items-center justify-between'>
            <span className='text-sm text-blue-700'>预算</span>
            <span className='text-sm font-medium text-blue-900'>
              ¥{budget.toFixed(2)}
            </span>
          </div>
        )}

        {/* 估算成本 */}
        {hasEstimate && (
          <div className='flex items-center justify-between'>
            <span className='text-sm text-blue-700'>估算成本</span>
            <span
              className={`text-sm font-medium ${
                overBudget ? 'text-red-600' : 'text-blue-900'
              }`}
            >
              ¥{estimatedCost.toFixed(2)}
            </span>
          </div>
        )}

        {/* 实际花费 */}
        {hasActual && (
          <div className='flex items-center justify-between'>
            <span className='text-sm text-blue-700'>实际花费</span>
            <span className='text-sm font-medium text-blue-900'>
              ¥{actualCost.toFixed(2)}
            </span>
          </div>
        )}

        {/* 超预算提示 */}
        {overBudget && (
          <div className='mt-3 pt-3 border-t border-blue-200'>
            <div className='flex items-center justify-between'>
              <span className='text-sm font-medium text-red-600'>超预算</span>
              <span className='text-sm font-medium text-red-600'>
                ¥{overBudget.toFixed(2)}
              </span>
            </div>
            <p className='mt-1 text-xs text-red-600'>
              建议选择更经济的替代食材或调整预算
            </p>
          </div>
        )}

        {/* 价格差异提示 */}
        {priceDiff !== null && priceDiffPercent !== null && (
          <div className='mt-3 pt-3 border-t border-blue-200'>
            <div className='flex items-center justify-between'>
              <span className='text-sm text-blue-700'>价格差异</span>
              <span
                className={`text-sm font-medium ${
                  priceDiff > 0 ? 'text-red-600' : 'text-green-600'
                }`}
              >
                {priceDiff > 0 ? '+' : ''}
                {priceDiff.toFixed(2)} ({priceDiffPercent > 0 ? '+' : ''}
                {priceDiffPercent.toFixed(1)}%)
              </span>
            </div>
          </div>
        )}

        {/* 预算进度条 */}
        {hasBudget && hasEstimate && (
          <div className='mt-3 pt-3 border-t border-blue-200'>
            <div className='flex items-center justify-between mb-1'>
              <span className='text-xs text-blue-700'>预算使用率</span>
              <span className='text-xs text-blue-700'>
                {((estimatedCost / budget) * 100).toFixed(1)}%
              </span>
            </div>
            <div className='w-full bg-blue-200 rounded-full h-2'>
              <div
                className={`h-2 rounded-full transition-all ${
                  estimatedCost > budget
                    ? 'bg-red-500'
                    : estimatedCost > budget * 0.9
                      ? 'bg-yellow-500'
                      : 'bg-blue-500'
                }`}
                style={{
                  width: `${Math.min((estimatedCost / budget) * 100, 100)}%`,
                }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
