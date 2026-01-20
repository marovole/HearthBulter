"use client";

import { useState, useEffect } from "react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Settings,
  ChefHat,
  Heart,
  DollarSign,
  Clock,
  Users,
  Target,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface UserPreferences {
  memberId: string;
  spiceLevel: "NONE" | "LOW" | "MEDIUM" | "HIGH" | "EXTREME";
  sweetness: "NONE" | "LOW" | "MEDIUM" | "HIGH" | "EXTREME";
  saltiness: "LOW" | "MEDIUM" | "HIGH" | "EXTREME";
  preferredCuisines: string[];
  avoidedIngredients: string[];
  preferredIngredients: string[];
  maxCookTime?: number;
  minServings: number;
  maxServings: number;
  costLevel: "LOW" | "MEDIUM" | "HIGH";
  maxEstimatedCost?: number;
  dietType: string;
  isLowCarb: boolean;
  isLowFat: boolean;
  isHighProtein: boolean;
  isVegetarian: boolean;
  isVegan: boolean;
  isGlutenFree: boolean;
  isDairyFree: boolean;
  enableRecommendations: boolean;
  learnedPreferences: { [key: string]: any };
  preferenceScore: number;
}

interface PreferencesSettingsProps {
  memberId: string;
}

const CUISINE_OPTIONS = [
  "川菜",
  "粤菜",
  "鲁菜",
  "苏菜",
  "浙菜",
  "闽菜",
  "湘菜",
  "徽菜",
  "东北菜",
  "西北菜",
  "西南菜",
  "东南亚菜",
  "日料",
  "韩料",
  "意大利菜",
  "法国菜",
  "墨西哥菜",
  "中东菜",
  "印度菜",
  "泰国菜",
];

const COMMON_INGREDIENTS = [
  "鸡肉",
  "牛肉",
  "猪肉",
  "羊肉",
  "鱼",
  "虾",
  "蟹",
  "鸡蛋",
  "牛奶",
  "西兰花",
  "胡萝卜",
  "土豆",
  "洋葱",
  "大蒜",
  "姜",
  "青椒",
  "西红柿",
  "豆腐",
  "豆芽",
  "海带",
  "香菇",
  "金针菇",
  "木耳",
  "黄瓜",
  "白菜",
];

export function PreferencesSettings({ memberId }: PreferencesSettingsProps) {
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadPreferences();
  }, [memberId]);

  const loadPreferences = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/user/preferences?memberId=${memberId}`,
      );
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to load preferences");
      }

      setPreferences(data.preferences);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error occurred");
    } finally {
      setLoading(false);
    }
  };

  const savePreferences = async () => {
    if (!preferences) return;

    try {
      setSaving(true);
      const response = await fetch("/api/user/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(preferences),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to save preferences");
      }

      setPreferences(data.preferences);
      toast({
        title: "偏好设置已保存",
        description: "您的推荐将根据新设置进行调整",
      });
    } catch (err) {
      toast({
        title: "保存失败",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const updatePreferences = (updates: Partial<UserPreferences>) => {
    if (preferences) {
      setPreferences({ ...preferences, ...updates });
    }
  };

  const toggleArrayItem = (array: string[], item: string): string[] => {
    return array.includes(item)
      ? array.filter((i) => i !== item)
      : [...array, item];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <span className="ml-2">正在加载偏好设置...</span>
      </div>
    );
  }

  if (error || !preferences) {
    return (
      <Card className="p-6">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <Button onClick={loadPreferences} variant="outline">
            重新加载
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Settings className="h-6 w-6" />
        <div>
          <h2 className="text-2xl font-bold">偏好设置</h2>
          <p className="text-muted-foreground">定制您的食谱推荐偏好</p>
        </div>
      </div>

      <Tabs defaultValue="taste" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="taste">口味偏好</TabsTrigger>
          <TabsTrigger value="dietary">饮食限制</TabsTrigger>
          <TabsTrigger value="cooking">烹饪偏好</TabsTrigger>
          <TabsTrigger value="recommendations">推荐设置</TabsTrigger>
        </TabsList>

        <TabsContent value="taste" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ChefHat className="h-5 w-5" />
                口味偏好
              </CardTitle>
              <CardDescription>设置您喜欢的口味类型和程度</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <Label>辣度偏好</Label>
                  <Select
                    value={preferences.spiceLevel}
                    onValueChange={(value: any) =>
                      updatePreferences({ spiceLevel: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="NONE">不辣</SelectItem>
                      <SelectItem value="LOW">微辣</SelectItem>
                      <SelectItem value="MEDIUM">中辣</SelectItem>
                      <SelectItem value="HIGH">重辣</SelectItem>
                      <SelectItem value="EXTREME">极辣</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>甜度偏好</Label>
                  <Select
                    value={preferences.sweetness}
                    onValueChange={(value: any) =>
                      updatePreferences({ sweetness: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="NONE">不甜</SelectItem>
                      <SelectItem value="LOW">微甜</SelectItem>
                      <SelectItem value="MEDIUM">中等</SelectItem>
                      <SelectItem value="HIGH">甜</SelectItem>
                      <SelectItem value="EXTREME">极甜</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>咸度偏好</Label>
                  <Select
                    value={preferences.saltiness}
                    onValueChange={(value: any) =>
                      updatePreferences({ saltiness: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="LOW">清淡</SelectItem>
                      <SelectItem value="MEDIUM">适中</SelectItem>
                      <SelectItem value="HIGH">咸</SelectItem>
                      <SelectItem value="EXTREME">很咸</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>偏好菜系</Label>
                <div className="flex flex-wrap gap-2">
                  {CUISINE_OPTIONS.map((cuisine) => (
                    <Badge
                      key={cuisine}
                      variant={
                        preferences.preferredCuisines.includes(cuisine)
                          ? "default"
                          : "outline"
                      }
                      className="cursor-pointer"
                      onClick={() =>
                        updatePreferences({
                          preferredCuisines: toggleArrayItem(
                            preferences.preferredCuisines,
                            cuisine,
                          ),
                        })
                      }
                    >
                      {cuisine}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="dietary" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                饮食限制与偏好
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>饮食类型</Label>
                <Select
                  value={preferences.dietType}
                  onValueChange={(value) =>
                    updatePreferences({ dietType: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="OMNIVORE">杂食</SelectItem>
                    <SelectItem value="VEGETARIAN">素食</SelectItem>
                    <SelectItem value="VEGAN">严格素食</SelectItem>
                    <SelectItem value="PESCETARIAN">鱼素</SelectItem>
                    <SelectItem value="KETO">生酮饮食</SelectItem>
                    <SelectItem value="PALEO">原始饮食</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { key: "isLowCarb", label: "低碳水" },
                  { key: "isLowFat", label: "低脂肪" },
                  { key: "isHighProtein", label: "高蛋白" },
                  { key: "isVegetarian", label: "素食" },
                  { key: "isVegan", label: "严格素食" },
                  { key: "isGlutenFree", label: "无麸质" },
                  { key: "isDairyFree", label: "无乳制品" },
                ].map(({ key, label }) => (
                  <div key={key} className="flex items-center space-x-2">
                    <Checkbox
                      id={key}
                      checked={
                        preferences[key as keyof UserPreferences] as boolean
                      }
                      onCheckedChange={(checked) =>
                        updatePreferences({ [key]: checked })
                      }
                    />
                    <Label htmlFor={key} className="text-sm">
                      {label}
                    </Label>
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                <Label>避开的食材</Label>
                <div className="flex flex-wrap gap-2">
                  {COMMON_INGREDIENTS.slice(0, 15).map((ingredient) => (
                    <Badge
                      key={ingredient}
                      variant={
                        preferences.avoidedIngredients.includes(ingredient)
                          ? "destructive"
                          : "outline"
                      }
                      className="cursor-pointer"
                      onClick={() =>
                        updatePreferences({
                          avoidedIngredients: toggleArrayItem(
                            preferences.avoidedIngredients,
                            ingredient,
                          ),
                        })
                      }
                    >
                      {ingredient}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>偏好的食材</Label>
                <div className="flex flex-wrap gap-2">
                  {COMMON_INGREDIENTS.map((ingredient) => (
                    <Badge
                      key={ingredient}
                      variant={
                        preferences.preferredIngredients.includes(ingredient)
                          ? "default"
                          : "outline"
                      }
                      className="cursor-pointer"
                      onClick={() =>
                        updatePreferences({
                          preferredIngredients: toggleArrayItem(
                            preferences.preferredIngredients,
                            ingredient,
                          ),
                        })
                      }
                    >
                      {ingredient}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cooking" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                烹饪偏好
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>最大烹饪时间（分钟）</Label>
                  <div className="px-3">
                    <Slider
                      value={[preferences.maxCookTime || 60]}
                      onValueChange={([value]) =>
                        updatePreferences({ maxCookTime: value })
                      }
                      max={180}
                      min={15}
                      step={15}
                      className="w-full"
                    />
                    <div className="text-sm text-muted-foreground mt-1">
                      {preferences.maxCookTime || 60} 分钟
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>成本等级偏好</Label>
                  <Select
                    value={preferences.costLevel}
                    onValueChange={(value: any) =>
                      updatePreferences({ costLevel: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="LOW">经济型</SelectItem>
                      <SelectItem value="MEDIUM">中等</SelectItem>
                      <SelectItem value="HIGH">高端</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>最小份数</Label>
                  <Input
                    type="number"
                    value={preferences.minServings}
                    onChange={(e) =>
                      updatePreferences({
                        minServings: parseInt(e.target.value) || 1,
                      })
                    }
                    min={1}
                    max={10}
                  />
                </div>

                <div className="space-y-2">
                  <Label>最大份数</Label>
                  <Input
                    type="number"
                    value={preferences.maxServings}
                    onChange={(e) =>
                      updatePreferences({
                        maxServings: parseInt(e.target.value) || 10,
                      })
                    }
                    min={1}
                    max={20}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>最大预算（元）</Label>
                <Input
                  type="number"
                  value={preferences.maxEstimatedCost || ""}
                  onChange={(e) =>
                    updatePreferences({
                      maxEstimatedCost: e.target.value
                        ? parseFloat(e.target.value)
                        : undefined,
                    })
                  }
                  placeholder="不限制"
                  min={0}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recommendations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Heart className="h-5 w-5" />
                推荐设置
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="enableRecommendations"
                  checked={preferences.enableRecommendations}
                  onCheckedChange={(checked) =>
                    updatePreferences({
                      enableRecommendations: checked as boolean,
                    })
                  }
                />
                <Label htmlFor="enableRecommendations">启用智能推荐</Label>
              </div>

              {preferences.enableRecommendations && (
                <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
                  <h4 className="font-medium">推荐权重设置</h4>
                  <p className="text-sm text-muted-foreground">
                    调整各项因素在推荐算法中的权重（总和应为1.0）
                  </p>

                  {/* 这里可以添加权重滑块，但为了简化暂时省略 */}
                  <div className="text-sm text-muted-foreground">
                    当前使用系统默认权重设置
                  </div>
                </div>
              )}

              {preferences.learnedPreferences &&
                Object.keys(preferences.learnedPreferences).length > 0 && (
                  <div className="space-y-2">
                    <Label>AI学习到的偏好</Label>
                    <div className="p-3 border rounded-lg bg-muted/50">
                      <div className="text-sm">
                        <div>
                          偏好明确度:{" "}
                          {(preferences.preferenceScore * 100).toFixed(1)}%
                        </div>
                        <div className="mt-2">
                          学习到的菜系:{" "}
                          {preferences.learnedPreferences.preferredCuisines?.join(
                            ", ",
                          ) || "暂无"}
                        </div>
                        <div className="mt-1">
                          学习到的食材:{" "}
                          {preferences.learnedPreferences.preferredIngredients
                            ?.slice(0, 5)
                            .join(", ") || "暂无"}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="flex justify-end gap-3 pt-6 border-t">
        <Button variant="outline" onClick={loadPreferences}>
          重置
        </Button>
        <Button onClick={savePreferences} disabled={saving}>
          {saving ? "保存中..." : "保存设置"}
        </Button>
      </div>
    </div>
  );
}
