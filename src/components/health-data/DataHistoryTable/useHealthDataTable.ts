/**
 * 健康数据表格的自定义Hook
 * 处理所有状态管理和业务逻辑
 */

import { useState, useEffect, useCallback } from "react";
import type {
  HealthData,
  SortField,
  SortDirection,
  DateRange,
  TableFilters,
  UseHealthDataTableReturn,
} from "./types";

const ITEMS_PER_PAGE = 10;

interface UseHealthDataTableProps {
  memberId: string;
  searchTerm?: string;
  dateRange?: DateRange;
  onDataDeleted?: (id: string) => void;
}

export function useHealthDataTable({
  memberId,
  searchTerm = "",
  dateRange = "month",
  onDataDeleted,
}: UseHealthDataTableProps): UseHealthDataTableReturn {
  // 状态管理
  const [data, setData] = useState<HealthData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [sortField, setSortField] = useState<SortField>("measuredAt");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<TableFilters>({
    source: "all",
    hasWeight: false,
    hasBloodPressure: false,
    hasHeartRate: false,
  });

  // 加载数据
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: ITEMS_PER_PAGE.toString(),
        search: searchTerm,
        dateRange,
        sort: sortField,
        order: sortDirection,
        ...Object.fromEntries(
          Object.entries(filters).filter(
            ([_, value]) => value !== false && value !== "all",
          ),
        ),
      });

      const response = await fetch(
        `/api/members/${memberId}/health-data?${params}`,
      );
      if (!response.ok) {
        throw new Error("加载数据失败");
      }

      const result = await response.json();
      setData(result.data || []);
      setTotalPages(Math.ceil((result.total || 0) / ITEMS_PER_PAGE));
    } catch (err) {
      setError(err instanceof Error ? err.message : "加载失败");
    } finally {
      setLoading(false);
    }
  }, [
    memberId,
    currentPage,
    searchTerm,
    dateRange,
    sortField,
    sortDirection,
    filters,
  ]);

  // 自动加载数据
  useEffect(() => {
    loadData();
  }, [loadData]);

  // 排序处理
  const handleSort = useCallback(
    (field: SortField) => {
      if (sortField === field) {
        setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
      } else {
        setSortField(field);
        setSortDirection("desc");
      }
    },
    [sortField],
  );

  // 全选处理
  const handleSelectAll = useCallback(
    (checked: boolean) => {
      if (checked) {
        setSelectedItems(data.map((item) => item.id));
      } else {
        setSelectedItems([]);
      }
    },
    [data],
  );

  // 单选处理
  const handleSelectItem = useCallback((id: string, checked: boolean) => {
    if (checked) {
      setSelectedItems((prev) => [...prev, id]);
    } else {
      setSelectedItems((prev) => prev.filter((item) => item !== id));
    }
  }, []);

  // 删除单条数据
  const handleDelete = useCallback(
    async (id: string) => {
      if (!confirm("确定要删除这条健康数据吗？")) {
        return;
      }

      try {
        const response = await fetch(
          `/api/members/${memberId}/health-data/${id}`,
          {
            method: "DELETE",
          },
        );

        if (!response.ok) {
          throw new Error("删除失败");
        }

        setData((prev) => prev.filter((item) => item.id !== id));
        setSelectedItems((prev) => prev.filter((item) => item !== id));

        if (onDataDeleted) {
          onDataDeleted(id);
        }
      } catch (err) {
        alert(err instanceof Error ? err.message : "删除失败");
      }
    },
    [memberId, onDataDeleted],
  );

  // 批量删除
  const handleBatchDelete = useCallback(async () => {
    if (!confirm(`确定要删除选中的 ${selectedItems.length} 条数据吗？`)) {
      return;
    }

    try {
      const deletePromises = selectedItems.map((id) =>
        fetch(`/api/members/${memberId}/health-data/${id}`, {
          method: "DELETE",
        }),
      );

      await Promise.all(deletePromises);

      setData((prev) =>
        prev.filter((item) => !selectedItems.includes(item.id)),
      );
      setSelectedItems([]);
    } catch (err) {
      alert("批量删除失败");
    }
  }, [memberId, selectedItems]);

  return {
    data,
    loading,
    error,
    currentPage,
    totalPages,
    selectedItems,
    sortField,
    sortDirection,
    showFilters,
    filters,
    setCurrentPage,
    setShowFilters,
    setFilters,
    handleSort,
    handleSelectAll,
    handleSelectItem,
    handleDelete,
    handleBatchDelete,
    reload: loadData,
  };
}
