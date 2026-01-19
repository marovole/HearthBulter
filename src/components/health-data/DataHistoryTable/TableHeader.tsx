import { SortAsc, SortDesc } from "lucide-react";
import type { SortField, SortDirection } from "./types";

interface TableHeaderProps {
  allSelected: boolean;
  sortField: SortField;
  sortDirection: SortDirection;
  onSelectAll: (checked: boolean) => void;
  onSort: (field: SortField) => void;
}

export function TableHeader({
  allSelected,
  sortField,
  sortDirection,
  onSelectAll,
  onSort,
}: TableHeaderProps) {
  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) return null;
    return sortDirection === "asc" ? (
      <SortAsc className="h-4 w-4" />
    ) : (
      <SortDesc className="h-4 w-4" />
    );
  };

  return (
    <thead className="bg-gray-50">
      <tr>
        <th className="px-6 py-3 text-left">
          <input
            type="checkbox"
            checked={allSelected}
            onChange={(e) => onSelectAll(e.target.checked)}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
        </th>

        <th
          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
          onClick={() => onSort("measuredAt")}
        >
          <div className="flex items-center space-x-1">
            <span>测量时间</span>
            {renderSortIcon("measuredAt")}
          </div>
        </th>

        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
          健康指标
        </th>

        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
          数据来源
        </th>

        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
          备注
        </th>

        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
          操作
        </th>
      </tr>
    </thead>
  );
}
