import { Filter, Trash2 } from 'lucide-react';

interface BatchActionsProps {
  selectedCount: number
  totalCount: number
  showFilters: boolean
  onToggleFilters: () => void
  onBatchDelete: () => void
}

export function BatchActions({
  selectedCount,
  totalCount,
  showFilters,
  onToggleFilters,
  onBatchDelete,
}: BatchActionsProps) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center space-x-4">
        <button
          onClick={onToggleFilters}
          className="flex items-center space-x-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          <Filter className="h-4 w-4" />
          <span>筛选</span>
        </button>
        
        {selectedCount > 0 && (
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-500">
              已选择 {selectedCount} 项
            </span>
            <button
              onClick={onBatchDelete}
              className="flex items-center space-x-1 px-3 py-1 text-sm font-medium text-red-600 bg-red-50 rounded hover:bg-red-100"
            >
              <Trash2 className="h-4 w-4" />
              <span>批量删除</span>
            </button>
          </div>
        )}
      </div>
      
      <div className="text-sm text-gray-500">
        共 {totalCount} 条记录
      </div>
    </div>
  );
}
