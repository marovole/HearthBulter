'use client';

/**
 * 健康数据历史表格 - 重构后的主组件
 * 职责：组装子组件，提供统一的接口
 */

import React from 'react';
import { useHealthDataTable } from './useHealthDataTable';
import { LoadingState } from './LoadingState';
import { ErrorState } from './ErrorState';
import { EmptyState } from './EmptyState';
import { BatchActions } from './BatchActions';
import { TableFilters } from './TableFilters';
import { TableHeader } from './TableHeader';
import { TableRow } from './TableRow';
import { TablePagination } from './TablePagination';
import type { DataHistoryTableProps } from './types';

export function DataHistoryTable(props: DataHistoryTableProps) {
  const {
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
  } = useHealthDataTable(props);

  // 加载状态
  if (loading) {
    return <LoadingState />;
  }

  // 错误状态
  if (error) {
    return <ErrorState error={error} />;
  }

  // 空状态
  if (data.length === 0) {
    return <EmptyState />;
  }

  const ITEMS_PER_PAGE = 10;
  const allSelected = selectedItems.length === data.length && data.length > 0;

  return (
    <div className="space-y-4">
      {/* 批量操作栏 */}
      <BatchActions
        selectedCount={selectedItems.length}
        totalCount={data.length}
        showFilters={showFilters}
        onToggleFilters={() => setShowFilters(!showFilters)}
        onBatchDelete={handleBatchDelete}
      />

      {/* 筛选面板 */}
      <TableFilters
        filters={filters}
        show={showFilters}
        onFilterChange={setFilters}
      />

      {/* 数据表格 */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <TableHeader
            allSelected={allSelected}
            sortField={sortField}
            sortDirection={sortDirection}
            onSelectAll={handleSelectAll}
            onSort={handleSort}
          />

          <tbody className="bg-white divide-y divide-gray-200">
            {data.map((item) => (
              <TableRow
                key={item.id}
                item={item}
                isSelected={selectedItems.includes(item.id)}
                onSelect={handleSelectItem}
                onDelete={handleDelete}
              />
            ))}
          </tbody>
        </table>
      </div>

      {/* 分页 */}
      <TablePagination
        currentPage={currentPage}
        totalPages={totalPages}
        itemsPerPage={ITEMS_PER_PAGE}
        totalItems={data.length}
        onPageChange={setCurrentPage}
      />
    </div>
  );
}
