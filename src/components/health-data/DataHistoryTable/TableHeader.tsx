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
            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
        </th>

        <th
          className="cursor-pointer px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 hover:bg-gray-100"
          onClick={() => onSort("measuredAt")}
        >
          <div className="flex items-center space-x-1">
            <span>测量时间</span>
            {renderSortIcon("measuredAt")}
          </div>
        </th>

        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
          健康指标
        </th>

        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
          数据来源
        </th>

        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
          备注
        </th>

        <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
          操作
        </th>
      </tr>
    </thead>
  );
}
