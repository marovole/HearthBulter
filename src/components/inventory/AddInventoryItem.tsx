"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarIcon, Camera, Search } from "lucide-react";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { StorageLocation } from "@prisma/client";

interface Food {
  id: string;
  name: string;
  nameEn?: string;
  category: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

interface AddInventoryItemProps {
  isOpen: boolean;
  onClose: () => void;
  memberId: string;
  onSuccess?: () => void;
}

const storageLocationLabels = {
  REFRIGERATOR: "冷藏",
  FREEZER: "冷冻",
  PANTRY: "常温储藏室",
  COUNTER: "台面",
  CABINET: "橱柜",
  OTHER: "其他",
};

const commonUnits = [
  "个",
  "斤",
  "kg",
  "g",
  "ml",
  "L",
  "瓶",
  "盒",
  "袋",
  "包",
  "箱",
  "颗",
  "根",
  "片",
];

export function AddInventoryItem({
  isOpen,
  onClose,
  memberId,
  onSuccess,
}: AddInventoryItemProps) {
  const [loading, setLoading] = useState(false);
  const [foods, setFoods] = useState<Food[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedFood, setSelectedFood] = useState<Food | null>(null);
  const [showFoodSearch, setShowFoodSearch] = useState(false);

  const [formData, setFormData] = useState({
    quantity: "",
    unit: "个",
    purchasePrice: "",
    purchaseSource: "",
    expiryDate: undefined as Date | undefined,
    productionDate: undefined as Date | undefined,
    storageLocation: StorageLocation.PANTRY,
    storageNotes: "",
    minStockThreshold: "",
    barcode: "",
    brand: "",
    packageInfo: "",
  });

  useEffect(() => {
    if (isOpen) {
      fetchFoods();
      resetForm();
    }
  }, [isOpen]);

  const fetchFoods = async () => {
    try {
      const response = await fetch("/api/foods?limit=100");
      const result = await response.json();

      if (result.success) {
        setFoods(result.data);
      }
    } catch (error) {
      console.error("获取食物列表失败:", error);
    }
  };

  const resetForm = () => {
    setFormData({
      quantity: "",
      unit: "个",
      purchasePrice: "",
      purchaseSource: "",
      expiryDate: undefined,
      productionDate: undefined,
      storageLocation: StorageLocation.PANTRY,
      storageNotes: "",
      minStockThreshold: "",
      barcode: "",
      brand: "",
      packageInfo: "",
    });
    setSelectedFood(null);
    setSearchTerm("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedFood) {
      alert("请选择食物");
      return;
    }

    if (!formData.quantity || parseFloat(formData.quantity) <= 0) {
      alert("请输入有效的数量");
      return;
    }

    setLoading(true);

    try {
      const payload = {
        memberId,
        foodId: selectedFood.id,
        quantity: parseFloat(formData.quantity),
        unit: formData.unit,
        purchasePrice: formData.purchasePrice
          ? parseFloat(formData.purchasePrice)
          : undefined,
        purchaseSource: formData.purchaseSource || undefined,
        expiryDate: formData.expiryDate?.toISOString(),
        productionDate: formData.productionDate?.toISOString(),
        storageLocation: formData.storageLocation,
        storageNotes: formData.storageNotes || undefined,
        minStockThreshold: formData.minStockThreshold
          ? parseFloat(formData.minStockThreshold)
          : undefined,
        barcode: formData.barcode || undefined,
        brand: formData.brand || undefined,
        packageInfo: formData.packageInfo || undefined,
      };

      const response = await fetch("/api/inventory/items", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (result.success) {
        onSuccess?.();
        onClose();
        resetForm();
      } else {
        alert(result.error || "添加失败");
      }
    } catch (error) {
      console.error("添加库存条目失败:", error);
      alert("添加失败，请重试");
    } finally {
      setLoading(false);
    }
  };

  const handleFoodSelect = (food: Food) => {
    setSelectedFood(food);
    setShowFoodSearch(false);
    setSearchTerm("");

    // 根据食物类型智能推荐存储位置
    let suggestedLocation = StorageLocation.PANTRY;
    if (
      ["VEGETABLES", "FRUITS", "PROTEIN", "SEAFOOD", "DAIRY"].includes(
        food.category,
      )
    ) {
      suggestedLocation = StorageLocation.REFRIGERATOR;
    }

    setFormData((prev) => ({
      ...prev,
      storageLocation: suggestedLocation,
    }));
  };

  const filteredFoods = foods.filter(
    (food) =>
      food.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      food.nameEn?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      food.category.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>添加库存物品</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 食物选择 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">选择食物</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative">
                <div
                  className="flex items-center space-x-2 p-3 border rounded-lg cursor-pointer hover:bg-gray-50"
                  onClick={() => setShowFoodSearch(!showFoodSearch)}
                >
                  {selectedFood ? (
                    <div className="flex-1">
                      <div className="font-medium">
                        {selectedFood.name}
                        {selectedFood.nameEn && (
                          <span className="text-gray-500 ml-2">
                            ({selectedFood.nameEn})
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-gray-500">
                        {selectedFood.category} • {selectedFood.calories}
                        kcal/100g
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2 text-gray-500">
                      <Search className="h-4 w-4" />
                      <span>点击选择食物</span>
                    </div>
                  )}
                </div>

                {showFoodSearch && (
                  <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    <div className="p-2 border-b">
                      <Input
                        placeholder="搜索食物..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        autoFocus
                      />
                    </div>
                    <div className="max-h-48 overflow-y-auto">
                      {filteredFoods.map((food) => (
                        <div
                          key={food.id}
                          className="p-3 hover:bg-gray-50 cursor-pointer border-b last:border-b-0"
                          onClick={() => handleFoodSelect(food)}
                        >
                          <div className="font-medium">
                            {food.name}
                            {food.nameEn && (
                              <span className="text-gray-500 ml-2">
                                ({food.nameEn})
                              </span>
                            )}
                          </div>
                          <div className="text-sm text-gray-500">
                            {food.category} • {food.calories}kcal/100g
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    /* TODO: 扫码功能 */
                  }}
                >
                  <Camera className="h-4 w-4 mr-2" />
                  扫码识别
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    /* TODO: 创建新食物 */
                  }}
                >
                  创建新食物
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* 基本信息 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">基本信息</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="quantity">数量 *</Label>
                <div className="flex space-x-2">
                  <Input
                    id="quantity"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="请输入数量"
                    value={formData.quantity}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        quantity: e.target.value,
                      }))
                    }
                    required
                  />
                  <Select
                    value={formData.unit}
                    onValueChange={(value) =>
                      setFormData((prev) => ({ ...prev, unit: value }))
                    }
                  >
                    <SelectTrigger className="w-24">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {commonUnits.map((unit) => (
                        <SelectItem key={unit} value={unit}>
                          {unit}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="purchasePrice">购买价格</Label>
                <Input
                  id="purchasePrice"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="请输入价格"
                  value={formData.purchasePrice}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      purchasePrice: e.target.value,
                    }))
                  }
                />
              </div>

              <div>
                <Label htmlFor="purchaseSource">购买来源</Label>
                <Input
                  id="purchaseSource"
                  placeholder="如：山姆、盒马等"
                  value={formData.purchaseSource}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      purchaseSource: e.target.value,
                    }))
                  }
                />
              </div>

              <div>
                <Label htmlFor="brand">品牌</Label>
                <Input
                  id="brand"
                  placeholder="请输入品牌"
                  value={formData.brand}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, brand: e.target.value }))
                  }
                />
              </div>
            </CardContent>
          </Card>

          {/* 保质期信息 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">保质期信息</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <div>
                <Label>生产日期</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !formData.productionDate && "text-muted-foreground",
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.productionDate
                        ? format(formData.productionDate, "yyyy-MM-dd", {
                          locale: zhCN,
                        })
                        : "选择日期"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={formData.productionDate}
                      onSelect={(date) =>
                        setFormData((prev) => ({
                          ...prev,
                          productionDate: date,
                        }))
                      }
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div>
                <Label>保质期</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !formData.expiryDate && "text-muted-foreground",
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.expiryDate
                        ? format(formData.expiryDate, "yyyy-MM-dd", {
                          locale: zhCN,
                        })
                        : "选择日期"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={formData.expiryDate}
                      onSelect={(date) =>
                        setFormData((prev) => ({ ...prev, expiryDate: date }))
                      }
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </CardContent>
          </Card>

          {/* 存储信息 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">存储信息</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>存储位置</Label>
                <Select
                  value={formData.storageLocation}
                  onValueChange={(value) =>
                    setFormData((prev) => ({
                      ...prev,
                      storageLocation: value as StorageLocation,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(storageLocationLabels).map(
                      ([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ),
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="storageNotes">存储备注</Label>
                <Textarea
                  id="storageNotes"
                  placeholder="如：需要冷藏、避免阳光直射等"
                  value={formData.storageNotes}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      storageNotes: e.target.value,
                    }))
                  }
                />
              </div>

              <div>
                <Label htmlFor="minStockThreshold">最低库存阈值</Label>
                <Input
                  id="minStockThreshold"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="低于此数量时会提醒补货"
                  value={formData.minStockThreshold}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      minStockThreshold: e.target.value,
                    }))
                  }
                />
              </div>
            </CardContent>
          </Card>

          {/* 其他信息 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">其他信息（选填）</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="barcode">条形码</Label>
                <Input
                  id="barcode"
                  placeholder="请输入条形码"
                  value={formData.barcode}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      barcode: e.target.value,
                    }))
                  }
                />
              </div>

              <div>
                <Label htmlFor="packageInfo">包装信息</Label>
                <Textarea
                  id="packageInfo"
                  placeholder="如：包装规格、开封后保质期等"
                  value={formData.packageInfo}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      packageInfo: e.target.value,
                    }))
                  }
                />
              </div>
            </CardContent>
          </Card>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              取消
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "添加中..." : "添加物品"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
