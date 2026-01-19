"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface HealthDataFormProps {
  memberId: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function HealthDataForm({
  memberId,
  onSuccess,
  onCancel,
}: HealthDataFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    weight: "",
    bodyFat: "",
    muscleMass: "",
    bloodPressureSystolic: "",
    bloodPressureDiastolic: "",
    heartRate: "",
    bloodSugar: "",
    sleep: "",
    exercise: "",
    steps: "",
    measuredAt: new Date().toISOString().split("T")[0],
    notes: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrors([]);
    setWarnings([]);

    try {
      const payload: any = {
        measuredAt: formData.measuredAt,
        source: "MANUAL",
      };

      // 只添加有值的字段
      if (formData.weight) payload.weight = parseFloat(formData.weight);
      if (formData.bodyFat) payload.bodyFat = parseFloat(formData.bodyFat);
      if (formData.muscleMass)
        payload.muscleMass = parseFloat(formData.muscleMass);
      if (formData.bloodPressureSystolic)
        payload.bloodPressureSystolic = parseInt(
          formData.bloodPressureSystolic,
        );
      if (formData.bloodPressureDiastolic)
        payload.bloodPressureDiastolic = parseInt(
          formData.bloodPressureDiastolic,
        );
      if (formData.heartRate) payload.heartRate = parseInt(formData.heartRate);
      if (formData.bloodSugar)
        payload.bloodSugar = parseFloat(formData.bloodSugar);
      if (formData.sleep) payload.sleep = parseFloat(formData.sleep);
      if (formData.exercise) payload.exercise = parseFloat(formData.exercise);
      if (formData.steps) payload.steps = parseInt(formData.steps);
      if (formData.notes) payload.notes = formData.notes;

      const response = await fetch(`/api/members/${memberId}/health-data`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        setErrors(data.details || [data.error || "录入失败"]);
        if (data.warnings) {
          setWarnings(data.warnings);
        }
        setLoading(false);
        return;
      }

      // 成功
      if (data.warnings && data.warnings.length > 0) {
        setWarnings(data.warnings);
        // 即使有警告也继续，只是提示用户
      }

      // 重置表单
      setFormData({
        weight: "",
        bodyFat: "",
        muscleMass: "",
        bloodPressureSystolic: "",
        bloodPressureDiastolic: "",
        heartRate: "",
        bloodSugar: "",
        sleep: "",
        exercise: "",
        steps: "",
        measuredAt: new Date().toISOString().split("T")[0],
        notes: "",
      });

      if (onSuccess) {
        onSuccess();
      } else {
        router.refresh();
      }
    } catch (error) {
      console.error("录入健康数据失败:", error);
      setErrors(["网络错误，请稍后重试"]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {errors.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-red-400"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">数据验证失败</h3>
              <div className="mt-2 text-sm text-red-700">
                <ul className="list-disc list-inside space-y-1">
                  {errors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {warnings.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-yellow-400"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">数据提醒</h3>
              <div className="mt-2 text-sm text-yellow-700">
                <ul className="list-disc list-inside space-y-1">
                  {warnings.map((warning, index) => (
                    <li key={index}>{warning}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 体重 */}
        <div>
          <label
            htmlFor="weight"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            体重 (kg)
          </label>
          <input
            type="number"
            id="weight"
            step="0.1"
            min="20"
            max="300"
            value={formData.weight}
            onChange={(e) =>
              setFormData({ ...formData, weight: e.target.value })
            }
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            placeholder="例如: 75.5"
          />
        </div>

        {/* 体脂率 */}
        <div>
          <label
            htmlFor="bodyFat"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            体脂率 (%)
          </label>
          <input
            type="number"
            id="bodyFat"
            step="0.1"
            min="3"
            max="50"
            value={formData.bodyFat}
            onChange={(e) =>
              setFormData({ ...formData, bodyFat: e.target.value })
            }
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            placeholder="例如: 18.5"
          />
        </div>

        {/* 肌肉量 */}
        <div>
          <label
            htmlFor="muscleMass"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            肌肉量 (kg)
          </label>
          <input
            type="number"
            id="muscleMass"
            step="0.1"
            min="0"
            max="200"
            value={formData.muscleMass}
            onChange={(e) =>
              setFormData({ ...formData, muscleMass: e.target.value })
            }
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            placeholder="例如: 55.0"
          />
        </div>

        {/* 收缩压 */}
        <div>
          <label
            htmlFor="bloodPressureSystolic"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            收缩压 (mmHg)
          </label>
          <input
            type="number"
            id="bloodPressureSystolic"
            min="60"
            max="200"
            value={formData.bloodPressureSystolic}
            onChange={(e) =>
              setFormData({
                ...formData,
                bloodPressureSystolic: e.target.value,
              })
            }
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            placeholder="例如: 120"
          />
        </div>

        {/* 舒张压 */}
        <div>
          <label
            htmlFor="bloodPressureDiastolic"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            舒张压 (mmHg)
          </label>
          <input
            type="number"
            id="bloodPressureDiastolic"
            min="40"
            max="150"
            value={formData.bloodPressureDiastolic}
            onChange={(e) =>
              setFormData({
                ...formData,
                bloodPressureDiastolic: e.target.value,
              })
            }
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            placeholder="例如: 80"
          />
        </div>

        {/* 心率 */}
        <div>
          <label
            htmlFor="heartRate"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            心率 (bpm)
          </label>
          <input
            type="number"
            id="heartRate"
            min="40"
            max="220"
            value={formData.heartRate}
            onChange={(e) =>
              setFormData({ ...formData, heartRate: e.target.value })
            }
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            placeholder="例如: 72"
          />
        </div>

        {/* 血糖 */}
        <div>
          <label
            htmlFor="bloodSugar"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            血糖 (mmol/L)
          </label>
          <input
            type="number"
            id="bloodSugar"
            step="0.1"
            min="2"
            max="30"
            value={formData.bloodSugar}
            onChange={(e) =>
              setFormData({ ...formData, bloodSugar: e.target.value })
            }
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            placeholder="例如: 5.6"
          />
        </div>

        {/* 睡眠时长 */}
        <div>
          <label
            htmlFor="sleep"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            睡眠时长 (小时)
          </label>
          <input
            type="number"
            id="sleep"
            step="0.5"
            min="0"
            max="24"
            value={formData.sleep}
            onChange={(e) =>
              setFormData({ ...formData, sleep: e.target.value })
            }
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            placeholder="例如: 8"
          />
        </div>

        {/* 运动时长 */}
        <div>
          <label
            htmlFor="exercise"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            运动时长 (分钟)
          </label>
          <input
            type="number"
            id="exercise"
            min="0"
            max="300"
            value={formData.exercise}
            onChange={(e) =>
              setFormData({ ...formData, exercise: e.target.value })
            }
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            placeholder="例如: 30"
          />
        </div>

        {/* 步数 */}
        <div>
          <label
            htmlFor="steps"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            步数
          </label>
          <input
            type="number"
            id="steps"
            min="0"
            max="100000"
            value={formData.steps}
            onChange={(e) =>
              setFormData({ ...formData, steps: e.target.value })
            }
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            placeholder="例如: 10000"
          />
        </div>

        {/* 测量时间 */}
        <div>
          <label
            htmlFor="measuredAt"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            测量时间
          </label>
          <input
            type="date"
            id="measuredAt"
            value={formData.measuredAt}
            onChange={(e) =>
              setFormData({ ...formData, measuredAt: e.target.value })
            }
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          />
        </div>
      </div>

      {/* 备注 */}
      <div>
        <label
          htmlFor="notes"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          备注
        </label>
        <textarea
          id="notes"
          rows={3}
          maxLength={500}
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          placeholder="可选：添加备注信息"
        />
        <p className="mt-1 text-sm text-gray-500">
          {formData.notes.length}/500
        </p>
      </div>

      {/* 按钮 */}
      <div className="flex justify-end space-x-3">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            取消
          </button>
        )}
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "提交中..." : "提交"}
        </button>
      </div>
    </form>
  );
}
