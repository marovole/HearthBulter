interface EmptyFamilyStateProps {
  onCreate: () => void;
  isCreating: boolean;
  disabled?: boolean;
  error?: string | null;
  disabledReason?: string;
}

export function EmptyFamilyState({
  onCreate,
  isCreating,
  disabled = false,
  error,
  disabledReason,
}: EmptyFamilyStateProps) {
  return (
    <div className="flex h-64 flex-col items-center justify-center rounded-lg border border-dashed border-gray-200 bg-white p-8 text-center shadow">
      <h3 className="mb-2 text-lg font-semibold text-gray-900">还没有家庭数据</h3>
      <p className="mb-6 text-sm text-gray-600">
        现在创建家庭后即可开始记录健康数据，我们会为你初始化基础成员信息。
      </p>
      <ol className="mb-6 list-decimal space-y-2 text-left text-sm text-gray-600">
        <li>点击“创建家庭”</li>
        <li>系统会自动生成你的默认家庭与成员</li>
        <li>开始添加健康记录并查看仪表盘</li>
      </ol>
      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}
      {disabledReason && disabled && !error && (
        <p className="mb-4 text-sm text-amber-600">{disabledReason}</p>
      )}
      <button
        onClick={onCreate}
        disabled={disabled || isCreating}
        className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
          disabled || isCreating
            ? "cursor-not-allowed bg-gray-200 text-gray-500"
            : "bg-blue-600 text-white hover:bg-blue-700"
        }`}
      >
        {isCreating ? "正在初始化..." : "创建家庭"}
      </button>
    </div>
  );
}
