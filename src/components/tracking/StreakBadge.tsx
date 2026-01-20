"use client";

interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  requirement: number;
}

interface StreakBadgeProps {
  currentStreak: number;
  longestStreak: number;
  totalDays: number;
  badges: Badge[];
  nextBadge?: Badge;
  daysUntilNextBadge: number;
}

export function StreakBadge({
  currentStreak,
  longestStreak,
  totalDays,
  badges,
  nextBadge,
  daysUntilNextBadge,
}: StreakBadgeProps) {
  return (
    <div className="rounded-lg bg-white p-6 shadow">
      <h3 className="mb-4 text-lg font-semibold">连续打卡</h3>

      {/* 连续打卡统计 */}
      <div className="mb-6 grid grid-cols-3 gap-4">
        <div className="text-center">
          <div className="text-3xl font-bold text-orange-500">🔥 {currentStreak}</div>
          <div className="mt-1 text-sm text-gray-600">当前连续</div>
        </div>
        <div className="text-center">
          <div className="text-3xl font-bold text-blue-500">👑 {longestStreak}</div>
          <div className="mt-1 text-sm text-gray-600">最长连续</div>
        </div>
        <div className="text-center">
          <div className="text-3xl font-bold text-green-500">✓ {totalDays}</div>
          <div className="mt-1 text-sm text-gray-600">总打卡</div>
        </div>
      </div>

      {/* 下一个徽章进度 */}
      {nextBadge && (
        <div className="mb-6 rounded-lg bg-blue-50 p-4">
          <div className="mb-2 flex items-center gap-3">
            <span className="text-3xl">{nextBadge.icon}</span>
            <div className="flex-1">
              <div className="font-semibold">{nextBadge.name}</div>
              <div className="text-sm text-gray-600">{nextBadge.description}</div>
            </div>
          </div>
          <div className="mt-3">
            <div className="mb-1 flex justify-between text-sm">
              <span>进度</span>
              <span>
                {currentStreak}/{nextBadge.requirement}天
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
              <div
                className="h-full bg-blue-500 transition-all duration-500"
                style={{
                  width: `${(currentStreak / nextBadge.requirement) * 100}%`,
                }}
              />
            </div>
            <div className="mt-1 text-sm text-gray-600">还差 {daysUntilNextBadge} 天即可解锁</div>
          </div>
        </div>
      )}

      {/* 已获得徽章 */}
      <div>
        <h4 className="mb-3 font-semibold">已获得徽章</h4>
        {badges.length === 0 ? (
          <div className="py-8 text-center text-gray-400">还没有获得徽章，继续加油！</div>
        ) : (
          <div className="grid grid-cols-4 gap-3">
            {badges.map((badge) => (
              <div key={badge.id} className="rounded-lg bg-gray-50 p-3 text-center">
                <div className="mb-1 text-3xl">{badge.icon}</div>
                <div className="text-xs font-medium">{badge.name}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 鼓励语 */}
      {currentStreak >= 7 && (
        <div className="mt-4 rounded-lg border border-green-200 bg-green-50 p-3 text-center">
          <div className="text-sm text-green-700">
            {currentStreak >= 100
              ? "🎉 太棒了！你已经坚持了100天以上！"
              : currentStreak >= 30
                ? "💪 坚持了一个月，你真厉害！"
                : "🌟 一周连续打卡，保持下去！"}
          </div>
        </div>
      )}
    </div>
  );
}
