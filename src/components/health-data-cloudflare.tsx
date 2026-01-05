"use client";

import { useState, useEffect } from "react";
import { useHealthData, useRealtimeData } from "@/hooks/use-supabase-data";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Plus, TrendingUp, Activity, Heart } from "lucide-react";

interface HealthDataForm {
  dataType: string;
  value: string;
  unit: string;
  recordedAt: string;
}

interface HealthDataItem {
  id: string;
  data_type: string;
  value: number;
  unit: string;
  recorded_at: string;
  created_at: string;
}

export function HealthDataManager({ memberId }: { memberId: string }) {
  const { toast } = useToast();
  const [formData, setFormData] = useState<HealthDataForm>({
    dataType: "weight",
    value: "",
    unit: "kg",
    recordedAt: new Date().toISOString().slice(0, 16),
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 获取健康数据
  const {
    data: healthData,
    loading,
    error,
    refetch,
  } = useHealthData(memberId, { limit: 20 });

  // 实时订阅健康数据更新
  const { data: realtimeHealthData } = useRealtimeData<HealthDataItem>(
    `health-data-${memberId}`,
    "health_data",
    { member_id: memberId },
    true,
  );

  // 处理表单提交
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/v1/health", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${await getAccessToken()}`,
        },
        body: JSON.stringify({
          data_type: formData.dataType,
          value: parseFloat(formData.value),
          unit: formData.unit,
          recorded_at: formData.recordedAt,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save health data");
      }

      const result = await response.json();

      toast({
        title: "Success",
        description: "Health data saved successfully",
        variant: "default",
      });

      // 重置表单
      setFormData({
        ...formData,
        value: "",
        recordedAt: new Date().toISOString().slice(0, 16),
      });

      // 刷新数据
      refetch();
    } catch (error) {
      console.error("Error saving health data:", error);
      toast({
        title: "Error",
        description: "Failed to save health data",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // 获取访问令牌
  const getAccessToken = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    return session?.access_token || "";
  };

  // 获取单位选项
  const getUnitOptions = (dataType: string) => {
    switch (dataType) {
    case "weight":
      return ["kg", "lbs", "g", "oz"];
    case "blood_pressure":
      return ["mmHg", "kPa"];
    case "blood_sugar":
      return ["mg/dL", "mmol/L"];
    case "heart_rate":
      return ["bpm"];
    case "temperature":
      return ["celsius", "fahrenheit"];
    case "steps":
      return ["steps"];
    case "sleep":
      return ["hours"];
    case "calories":
      return ["kcal"];
    case "water":
      return ["ml", "l", "cups"];
    default:
      return ["unit"];
    }
  };

  // 合并静态和实时数据
  const allHealthData = healthData?.data || [];
  const combinedData =
    realtimeHealthData.length > 0
      ? [
        ...realtimeHealthData,
        ...allHealthData.filter(
          (item) =>
            !realtimeHealthData.some((realtime) => realtime.id === item.id),
        ),
      ]
      : allHealthData;

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <span className="ml-2">Loading health data...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-destructive/10 border border-destructive rounded-lg">
        <p className="text-destructive">
          Error loading health data: {error.message}
        </p>
        <Button onClick={refetch} variant="outline" size="sm">
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 添加健康数据表单 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Heart className="h-5 w-5" />
            Add Health Data
          </CardTitle>
          <CardDescription>
            Record your health metrics to track your wellness journey
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="dataType">Data Type</Label>
                <Select
                  value={formData.dataType}
                  onValueChange={(value) =>
                    setFormData({ ...formData, dataType: value })
                  }
                >
                  <SelectTrigger id="dataType">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="weight">Weight</SelectItem>
                    <SelectItem value="blood_pressure">
                      Blood Pressure
                    </SelectItem>
                    <SelectItem value="blood_sugar">Blood Sugar</SelectItem>
                    <SelectItem value="heart_rate">Heart Rate</SelectItem>
                    <SelectItem value="temperature">Temperature</SelectItem>
                    <SelectItem value="steps">Steps</SelectItem>
                    <SelectItem value="sleep">Sleep</SelectItem>
                    <SelectItem value="calories">Calories</SelectItem>
                    <SelectItem value="water">Water Intake</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="value">Value</Label>
                <Input
                  id="value"
                  type="number"
                  step="0.01"
                  placeholder="Enter value"
                  value={formData.value}
                  onChange={(e) =>
                    setFormData({ ...formData, value: e.target.value })
                  }
                  required
                />
              </div>

              <div>
                <Label htmlFor="unit">Unit</Label>
                <Select
                  value={formData.unit}
                  onValueChange={(value) =>
                    setFormData({ ...formData, unit: value })
                  }
                >
                  <SelectTrigger id="unit">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {getUnitOptions(formData.dataType).map((unit) => (
                      <SelectItem key={unit} value={unit}>
                        {unit}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="recordedAt">Recorded At</Label>
                <Input
                  id="recordedAt"
                  type="datetime-local"
                  value={formData.recordedAt}
                  onChange={(e) =>
                    setFormData({ ...formData, recordedAt: e.target.value })
                  }
                  required
                />
              </div>
            </div>

            <Button type="submit" disabled={isSubmitting} className="w-full">
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Saving...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Health Data
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* 健康数据历史 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Health Data History
          </CardTitle>
          <CardDescription>Your recent health measurements</CardDescription>
        </CardHeader>
        <CardContent>
          {combinedData.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No health data recorded yet</p>
              <p className="text-sm">Start adding your health metrics above</p>
            </div>
          ) : (
            <div className="space-y-3">
              {combinedData.map((record: HealthDataItem) => (
                <div
                  key={record.id}
                  className="flex items-center justify-between p-3 bg-secondary rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-primary rounded-full"></div>
                    <div>
                      <p className="font-medium capitalize">
                        {record.data_type.replace("_", " ")}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(record.recorded_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">
                      {record.value} {record.unit}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {record.unit}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="mt-4 text-center">
            <Button onClick={refetch} variant="outline" size="sm">
              Refresh Data
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// 导出类型定义
export type { HealthDataItem, HealthDataForm };
