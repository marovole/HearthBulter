"use client";

import { useEffect, useRef, useState } from "react";
import {
  Camera,
  Upload,
  AlertCircle,
  CheckCircle,
  Loader2,
} from "lucide-react";

interface RecognizedFood {
  photoId: string;
  mealLogId: string;
  foodId?: string | null;
  name: string;
  confidence: number;
  estimatedAmount: number;
  nutrition: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  alternatives?: Array<{
    id: string;
    name: string;
    confidence: number;
  }>;
}

interface FoodPhotoUploadProps {
  onFoodRecognized: (food: RecognizedFood) => void;
  onError: (error: string) => void;
}

export function FoodPhotoUpload({
  onFoodRecognized,
  onError,
}: FoodPhotoUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [isRecognizing, setIsRecognizing] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [recognitionResult, setRecognitionResult] =
    useState<RecognizedFood | null>(null);
  const [correctionFoodId, setCorrectionFoodId] = useState<string | null>(null);
  const [correctionAmount, setCorrectionAmount] = useState<number | null>(null);
  const [isCorrecting, setIsCorrecting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!recognitionResult) {
      setCorrectionFoodId(null);
      setCorrectionAmount(null);
      return;
    }

    const defaultFoodId =
      recognitionResult.foodId ||
      recognitionResult.alternatives?.[0]?.id ||
      null;
    setCorrectionFoodId(defaultFoodId);
    setCorrectionAmount(recognitionResult.estimatedAmount);
  }, [recognitionResult]);

  const handleFileSelect = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      onError("请选择图片文件");
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      onError("图片大小不能超过10MB");
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);

    // Upload and recognize
    await uploadAndRecognize(file);
  };

  const uploadAndRecognize = async (file: File) => {
    setIsUploading(true);
    setIsRecognizing(true);

    try {
      // Create FormData for file upload
      const formData = new FormData();
      formData.append("image", file);

      // Upload image
      const uploadResponse = await fetch("/api/tracking/photo/upload", {
        method: "POST",
        body: formData,
      });

      if (!uploadResponse.ok) {
        throw new Error("图片上传失败");
      }

      const { photoId } = await uploadResponse.json();

      if (!photoId) {
        throw new Error("上传响应缺少照片信息");
      }

      const recognizeResponse = await fetch("/api/tracking/recognize", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ photoId }),
      });

      if (!recognizeResponse.ok) {
        throw new Error("食物识别失败");
      }

      const result = await recognizeResponse.json();
      setRecognitionResult(result);
    } catch (error) {
      console.error("食物识别错误:", error);
      onError(error instanceof Error ? error.message : "识别过程中出现错误");
      setRecognitionResult(null);
    } finally {
      setIsUploading(false);
      setIsRecognizing(false);
    }
  };

  const handleConfirm = () => {
    if (recognitionResult) {
      onFoodRecognized(recognitionResult);
      resetState();
    }
  };

  const handleCorrection = async () => {
    if (!recognitionResult || !correctionFoodId || !correctionAmount) {
      onError("请选择要修正的食物并填写份量");
      return;
    }

    setIsCorrecting(true);
    try {
      const response = await fetch("/api/tracking/recognize/correct", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          photoId: recognitionResult.photoId,
          foodId: correctionFoodId,
          amount: correctionAmount,
        }),
      });

      if (!response.ok) {
        throw new Error("修正失败");
      }

      const data = await response.json();
      setRecognitionResult((prev) =>
        prev
          ? {
              ...prev,
              foodId: correctionFoodId,
              name: data.name || prev.name,
              confidence: 100,
              estimatedAmount: correctionAmount,
              nutrition: data.nutrition || prev.nutrition,
            }
          : prev,
      );
    } catch (error) {
      onError(error instanceof Error ? error.message : "修正失败");
    } finally {
      setIsCorrecting(false);
    }
  };

  const handleRetake = () => {
    resetState();
    fileInputRef.current?.click();
  };

  const resetState = () => {
    setPreview(null);
    setRecognitionResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return "text-green-600";
    if (confidence >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  const getConfidenceText = (confidence: number) => {
    if (confidence >= 80) return "识别准确度很高";
    if (confidence >= 60) return "识别准确度中等";
    return "识别准确度较低，建议手动确认";
  };

  const correctionOptions = recognitionResult
    ? [
        ...(recognitionResult.foodId
          ? [
              {
                id: recognitionResult.foodId,
                name: recognitionResult.name,
                confidence: recognitionResult.confidence,
              },
            ]
          : []),
        ...(recognitionResult.alternatives ?? []),
      ]
    : [];

  return (
    <div className="space-y-4">
      {/* Upload Area */}
      {!preview && (
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
          <div className="space-y-4">
            <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
              <Camera className="w-8 h-8 text-gray-400" />
            </div>

            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                拍照识别食物
              </h3>
              <p className="text-sm text-gray-500 mb-4">
                上传食物照片，AI将自动识别食物种类和估算份量
              </p>
            </div>

            <div className="flex justify-center space-x-4">
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="flex items-center space-x-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Upload className="w-5 h-5" />
                <span>选择图片</span>
              </button>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
              capture="environment"
            />
          </div>
        </div>
      )}

      {/* Preview and Recognition */}
      {preview && (
        <div className="space-y-4">
          {/* Image Preview */}
          <div className="relative">
            <img
              src={preview}
              alt="Food preview"
              className="w-full h-64 object-cover rounded-lg"
            />

            {isRecognizing && (
              <div className="absolute inset-0 bg-black bg-opacity-50 rounded-lg flex items-center justify-center">
                <div className="text-center">
                  <Loader2 className="w-8 h-8 animate-spin text-white mx-auto mb-2" />
                  <p className="text-white">AI正在识别食物...</p>
                </div>
              </div>
            )}
          </div>

          {/* Recognition Result */}
          {recognitionResult && (
            <div className="border rounded-lg p-4 bg-gray-50">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h4 className="font-medium text-gray-900 text-lg">
                    {recognitionResult.name}
                  </h4>
                  <p className="text-sm text-gray-500">
                    估算份量: {recognitionResult.estimatedAmount}g
                  </p>
                </div>

                <div className="text-right">
                  <div
                    className={`flex items-center space-x-1 ${getConfidenceColor(recognitionResult.confidence)}`}
                  >
                    {recognitionResult.confidence >= 80 ? (
                      <CheckCircle className="w-5 h-5" />
                    ) : (
                      <AlertCircle className="w-5 h-5" />
                    )}
                    <span className="font-medium">
                      {recognitionResult.confidence}%
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {getConfidenceText(recognitionResult.confidence)}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-3 mb-4">
                <div className="text-center p-2 bg-white rounded">
                  <p className="text-xs text-gray-500">热量</p>
                  <p className="font-medium text-orange-600">
                    {recognitionResult.nutrition.calories} kcal
                  </p>
                </div>
                <div className="text-center p-2 bg-white rounded">
                  <p className="text-xs text-gray-500">蛋白质</p>
                  <p className="font-medium text-blue-600">
                    {recognitionResult.nutrition.protein}g
                  </p>
                </div>
                <div className="text-center p-2 bg-white rounded">
                  <p className="text-xs text-gray-500">碳水</p>
                  <p className="font-medium text-green-600">
                    {recognitionResult.nutrition.carbs}g
                  </p>
                </div>
                <div className="text-center p-2 bg-white rounded">
                  <p className="text-xs text-gray-500">脂肪</p>
                  <p className="font-medium text-yellow-600">
                    {recognitionResult.nutrition.fat}g
                  </p>
                </div>
              </div>

              {correctionOptions.length > 0 && (
                <div className="border-t border-gray-200 pt-3 mb-4 space-y-2">
                  <p className="text-sm font-medium text-gray-700">手动修正</p>
                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      value={correctionFoodId || ""}
                      onChange={(event) =>
                        setCorrectionFoodId(event.target.value)
                      }
                      className="px-3 py-1 border border-gray-200 rounded-md text-sm"
                    >
                      <option value="" disabled>
                        选择食物
                      </option>
                      {correctionOptions.map((option) => (
                        <option key={option.id} value={option.id}>
                          {option.name} ({option.confidence}%)
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      min={1}
                      value={correctionAmount ?? ""}
                      onChange={(event) =>
                        setCorrectionAmount(
                          event.target.value
                            ? Number(event.target.value)
                            : null,
                        )
                      }
                      className="w-24 px-3 py-1 border border-gray-200 rounded-md text-sm"
                      placeholder="克数"
                    />
                    <button
                      onClick={handleCorrection}
                      disabled={isCorrecting}
                      className="px-3 py-1 border border-gray-300 text-gray-700 rounded-md text-sm hover:bg-gray-50 disabled:opacity-50"
                    >
                      {isCorrecting ? "修正中" : "应用修正"}
                    </button>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex space-x-3">
                <button
                  onClick={handleConfirm}
                  className="flex-1 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  确认添加
                </button>
                <button
                  onClick={handleRetake}
                  className="flex-1 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  重新拍照
                </button>
              </div>
            </div>
          )}

          {/* Error State */}
          {!recognitionResult && !isRecognizing && (
            <div className="border border-red-200 rounded-lg p-4 bg-red-50">
              <div className="flex items-center space-x-2 text-red-600">
                <AlertCircle className="w-5 h-5" />
                <p className="font-medium">识别失败</p>
              </div>
              <p className="text-sm text-red-500 mt-1">
                无法识别图片中的食物，请尝试重新拍照或手动搜索添加
              </p>
              <div className="flex space-x-3 mt-3">
                <button
                  onClick={handleRetake}
                  className="flex-1 py-2 border border-red-300 text-red-700 rounded-lg hover:bg-red-100"
                >
                  重新拍照
                </button>
                <button
                  onClick={resetState}
                  className="flex-1 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  取消
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
