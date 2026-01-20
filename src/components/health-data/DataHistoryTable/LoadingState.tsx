export function LoadingState() {
  return (
    <div className="py-8 text-center">
      <div className="inline-block h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600"></div>
      <p className="mt-2 text-sm text-gray-500">加载中...</p>
    </div>
  );
}
