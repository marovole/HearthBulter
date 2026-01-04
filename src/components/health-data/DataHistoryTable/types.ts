/**
 * 健康数据历史表格的类型定义
 */

export interface HealthData {
  id: string;
  weight: number | null;
  bodyFat: number | null;
  muscleMass: number | null;
  bloodPressureSystolic: number | null;
  bloodPressureDiastolic: number | null;
  heartRate: number | null;
  bloodSugar?: number | null;
  sleep?: number | null;
  exercise?: number | null;
  measuredAt: string;
  source: string;
  notes: string | null;
}

export type SortField = 'measuredAt' | 'weight' | 'bloodPressure' | 'heartRate';
export type SortDirection = 'asc' | 'desc';
export type DateRange = 'week' | 'month' | 'quarter' | 'year' | 'all';

export interface TableFilters {
  source: string;
  hasWeight: boolean;
  hasBloodPressure: boolean;
  hasHeartRate: boolean;
}

export interface DataHistoryTableProps {
  memberId: string;
  searchTerm?: string;
  dateRange?: DateRange;
  onDataDeleted?: (id: string) => void;
}

export interface UseHealthDataTableReturn {
  data: HealthData[];
  loading: boolean;
  error: string | null;
  currentPage: number;
  totalPages: number;
  selectedItems: string[];
  sortField: SortField;
  sortDirection: SortDirection;
  showFilters: boolean;
  filters: TableFilters;
  setCurrentPage: (page: number) => void;
  setShowFilters: (show: boolean) => void;
  setFilters: (
    filters: TableFilters | ((prev: TableFilters) => TableFilters),
  ) => void;
  handleSort: (field: SortField) => void;
  handleSelectAll: (checked: boolean) => void;
  handleSelectItem: (id: string, checked: boolean) => void;
  handleDelete: (id: string) => Promise<void>;
  handleBatchDelete: () => Promise<void>;
  reload: () => Promise<void>;
}
