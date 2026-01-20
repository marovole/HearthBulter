import type { TableFilters as Filters } from "./types";

interface TableFiltersProps {
  filters: Filters;
  show: boolean;
  onFilterChange: (filters: Filters | ((prev: Filters) => Filters)) => void;
}

export function TableFilters({ filters, show, onFilterChange }: TableFiltersProps) {
  if (!show) return null;

  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">数据来源</label>
          <select
            value={filters.source}
            onChange={(e) => onFilterChange((prev) => ({ ...prev, source: e.target.value }))}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">全部</option>
            <option value="MANUAL">手动录入</option>
            <option value="WEARABLE">可穿戴设备</option>
            <option value="MEDICAL_REPORT">体检报告</option>
          </select>
        </div>

        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="hasWeight"
            checked={filters.hasWeight}
            onChange={(e) =>
              onFilterChange((prev) => ({
                ...prev,
                hasWeight: e.target.checked,
              }))
            }
            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <label htmlFor="hasWeight" className="text-sm font-medium text-gray-700">
            包含体重
          </label>
        </div>

        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="hasBloodPressure"
            checked={filters.hasBloodPressure}
            onChange={(e) =>
              onFilterChange((prev) => ({
                ...prev,
                hasBloodPressure: e.target.checked,
              }))
            }
            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <label htmlFor="hasBloodPressure" className="text-sm font-medium text-gray-700">
            包含血压
          </label>
        </div>

        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="hasHeartRate"
            checked={filters.hasHeartRate}
            onChange={(e) =>
              onFilterChange((prev) => ({
                ...prev,
                hasHeartRate: e.target.checked,
              }))
            }
            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <label htmlFor="hasHeartRate" className="text-sm font-medium text-gray-700">
            包含心率
          </label>
        </div>
      </div>
    </div>
  );
}
