"use client";

import { useState, useEffect } from "react";

interface HealthData {
  id: string;
  weight: number | null;
  bodyFat: number | null;
  muscleMass: number | null;
  bloodPressureSystolic: number | null;
  bloodPressureDiastolic: number | null;
  heartRate: number | null;
  measuredAt: string;
  source: string;
  notes: string | null;
}

interface HealthDataListProps {
  memberId: string;
  onDelete?: (id: string) => void;
}

export function HealthDataList({ memberId, onDelete }: HealthDataListProps) {
  const [data, setData] = useState<HealthData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [memberId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/members/${memberId}/health-data`);
      if (!response.ok) {
        throw new Error("加载数据失败");
      }
      const result = await response.json();
      setData(result.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "加载失败");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("确定要删除这条健康数据吗？")) {
      return;
    }

    try {
      const response = await fetch(`/api/members/${memberId}/health-data/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("删除失败");
      }

      // 更新列表
      setData(data.filter((item) => item.id !== id));

      if (onDelete) {
        onDelete(id);
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "删除失败");
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getSourceLabel = (source: string) => {
    switch (source) {
      case "MANUAL":
        return "手动录入";
      case "WEARABLE":
        return "可穿戴设备";
      case "MEDICAL_REPORT":
        return "体检报告";
      default:
        return source;
    }
  };

  if (loading) {
    return (
      <div className="py-8 text-center">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600"></div>
        <p className="mt-2 text-sm text-gray-500">加载中...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-md border border-red-200 bg-red-50 p-4">
        <p className="text-sm text-red-800">{error}</p>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="py-8 text-center">
        <p className="text-gray-500">暂无健康数据记录</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {data.map((item) => (
        <div
          key={item.id}
          className="rounded-lg border border-gray-200 bg-white p-4 transition-colors hover:border-blue-300"
        >
          <div className="mb-3 flex items-start justify-between">
            <div className="flex-1">
              <div className="mb-2 flex items-center gap-3">
                <h3 className="text-lg font-semibold text-gray-900">
                  {formatDate(item.measuredAt)}
                </h3>
                <span className="rounded bg-gray-100 px-2 py-1 text-xs text-gray-500">
                  {getSourceLabel(item.source)}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm md:grid-cols-3 lg:grid-cols-6">
                {item.weight !== null && (
                  <div>
                    <span className="text-gray-500">体重:</span>
                    <span className="ml-2 font-medium">{item.weight} kg</span>
                  </div>
                )}
                {item.bodyFat !== null && (
                  <div>
                    <span className="text-gray-500">体脂率:</span>
                    <span className="ml-2 font-medium">{item.bodyFat}%</span>
                  </div>
                )}
                {item.muscleMass !== null && (
                  <div>
                    <span className="text-gray-500">肌肉量:</span>
                    <span className="ml-2 font-medium">{item.muscleMass} kg</span>
                  </div>
                )}
                {item.bloodPressureSystolic !== null && item.bloodPressureDiastolic !== null && (
                  <div>
                    <span className="text-gray-500">血压:</span>
                    <span className="ml-2 font-medium">
                      {item.bloodPressureSystolic}/{item.bloodPressureDiastolic} mmHg
                    </span>
                  </div>
                )}
                {item.heartRate !== null && (
                  <div>
                    <span className="text-gray-500">心率:</span>
                    <span className="ml-2 font-medium">{item.heartRate} bpm</span>
                  </div>
                )}
              </div>

              {item.notes && (
                <div className="mt-3 border-t border-gray-200 pt-3">
                  <p className="text-sm text-gray-600">{item.notes}</p>
                </div>
              )}
            </div>

            {onDelete && (
              <button
                onClick={() => handleDelete(item.id)}
                className="ml-4 text-sm font-medium text-red-600 hover:text-red-800"
              >
                删除
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
