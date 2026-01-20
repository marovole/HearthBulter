"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Send,
  MessageCircle,
  ThumbsUp,
  ThumbsDown,
  Bug,
  Lightbulb,
  Heart,
  Star,
  Upload,
  X,
} from "lucide-react";

interface FeedbackFormProps {
  onSubmit: (feedback: FeedbackData) => void;
  onCancel?: () => void;
  type?: "general" | "bug" | "feature" | "satisfaction";
  showRating?: boolean;
  showAttachment?: boolean;
}

interface FeedbackData {
  type: string;
  category: string;
  title: string;
  description: string;
  rating?: number;
  email?: string;
  attachments?: File[];
  userAgent?: string;
  timestamp: string;
}

export function FeedbackForm({
  onSubmit,
  onCancel,
  type = "general",
  showRating = true,
  showAttachment = true,
}: FeedbackFormProps) {
  const [formData, setFormData] = useState<Partial<FeedbackData>>({
    type,
    category: "",
    title: "",
    description: "",
    rating: 0,
    email: "",
    attachments: [],
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);

  const feedbackTypes = [
    {
      value: "general",
      label: "一般反馈",
      icon: <MessageCircle className="h-4 w-4" />,
    },
    { value: "bug", label: "问题报告", icon: <Bug className="h-4 w-4" /> },
    {
      value: "feature",
      label: "功能建议",
      icon: <Lightbulb className="h-4 w-4" />,
    },
    {
      value: "satisfaction",
      label: "满意度调查",
      icon: <Heart className="h-4 w-4" />,
    },
  ];

  const categories = {
    general: ["用户体验", "界面设计", "功能建议", "其他"],
    bug: ["功能异常", "性能问题", "界面错误", "数据问题", "其他"],
    feature: ["新功能建议", "功能改进", "流程优化", "其他"],
    satisfaction: ["整体满意度", "功能满意度", "客服满意度", "其他"],
  };

  const handleInputChange = (field: keyof FeedbackData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleFileAttach = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    const validFiles = files.filter((file) => {
      const maxSize = 5 * 1024 * 1024; // 5MB
      const validTypes = [
        "image/jpeg",
        "image/png",
        "image/gif",
        "application/pdf",
        "text/plain",
      ];
      return file.size <= maxSize && validTypes.includes(file.type);
    });

    setAttachedFiles((prev) => [...prev, ...validFiles]);
  };

  const removeFile = (index: number) => {
    setAttachedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const submissionData: FeedbackData = {
      ...formData,
      attachments: attachedFiles,
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString(),
    } as FeedbackData;

    try {
      await onSubmit(submissionData);
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderRatingStars = () => {
    if (!showRating || formData.type !== "satisfaction") return null;

    return (
      <div className="space-y-2">
        <Label>满意度评分</Label>
        <div className="flex space-x-2">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => handleInputChange("rating", star)}
              className="p-1"
            >
              <Star
                className={`h-6 w-6 ${
                  star <= (formData.rating || 0)
                    ? "fill-yellow-400 text-yellow-400"
                    : "text-gray-300"
                }`}
              />
            </button>
          ))}
        </div>
        <p className="text-sm text-gray-500">
          {formData.rating === 1 && "非常不满意"}
          {formData.rating === 2 && "不满意"}
          {formData.rating === 3 && "一般"}
          {formData.rating === 4 && "满意"}
          {formData.rating === 5 && "非常满意"}
        </p>
      </div>
    );
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <MessageCircle className="h-5 w-5" />
          <span>用户反馈</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Feedback Type */}
          <div className="space-y-2">
            <Label>反馈类型</Label>
            <RadioGroup
              value={formData.type}
              onValueChange={(value) => handleInputChange("type", value)}
              className="flex flex-wrap gap-4"
            >
              {feedbackTypes.map((feedbackType) => (
                <div
                  key={feedbackType.value}
                  className="flex items-center space-x-2"
                >
                  <RadioGroupItem
                    value={feedbackType.value}
                    id={feedbackType.value}
                  />
                  <Label
                    htmlFor={feedbackType.value}
                    className="flex items-center space-x-1 cursor-pointer"
                  >
                    {feedbackType.icon}
                    <span>{feedbackType.label}</span>
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          {/* Category */}
          {formData.type &&
            categories[formData.type as keyof typeof categories] && (
              <div className="space-y-2">
                <Label>详细分类</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) =>
                    handleInputChange("category", value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="请选择分类" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories[formData.type as keyof typeof categories].map(
                      (category) => (
                        <SelectItem key={category} value={category}>
                          {category}
                        </SelectItem>
                      ),
                    )}
                  </SelectContent>
                </Select>
              </div>
            )}

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">标题 *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => handleInputChange("title", e.target.value)}
              placeholder="请简要描述您的反馈"
              required
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">详细描述 *</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange("description", e.target.value)}
              placeholder="请详细描述您的问题、建议或体验..."
              className="min-h-32"
              required
            />
          </div>

          {/* Rating */}
          {renderRatingStars()}

          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="email">联系邮箱（可选）</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => handleInputChange("email", e.target.value)}
              placeholder="如需回复，请留下您的邮箱"
            />
          </div>

          {/* Attachments */}
          {showAttachment && (
            <div className="space-y-2">
              <Label>附件（可选）</Label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                <input
                  type="file"
                  multiple
                  accept="image/*,.pdf,.txt"
                  onChange={handleFileAttach}
                  className="hidden"
                  id="file-upload"
                />
                <label
                  htmlFor="file-upload"
                  className="cursor-pointer flex flex-col items-center"
                >
                  <Upload className="h-8 w-8 text-gray-400 mb-2" />
                  <span className="text-sm text-gray-600">
                    点击上传文件或拖拽到此处
                  </span>
                  <span className="text-xs text-gray-500">
                    支持图片、PDF、文本文件，最大5MB
                  </span>
                </label>
              </div>

              {/* Attached Files */}
              {attachedFiles.length > 0 && (
                <div className="space-y-2">
                  <Label>已上传文件</Label>
                  {attachedFiles.map((file, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-2 bg-gray-50 rounded"
                    >
                      <div className="flex items-center space-x-2">
                        <Badge variant="outline" className="text-xs">
                          {file.type}
                        </Badge>
                        <span className="text-sm">{file.name}</span>
                        <span className="text-xs text-gray-500">
                          ({(file.size / 1024).toFixed(1)}KB)
                        </span>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFile(index)}
                        className="h-6 w-6 p-0"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Submit Buttons */}
          <div className="flex justify-end space-x-3 pt-4">
            {onCancel && (
              <Button type="button" variant="outline" onClick={onCancel}>
                取消
              </Button>
            )}
            <Button
              type="submit"
              disabled={
                isSubmitting || !formData.title || !formData.description
              }
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isSubmitting ? (
                "提交中..."
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  提交反馈
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

// Quick Feedback Component
interface QuickFeedbackProps {
  onPositive: () => void;
  onNegative: () => void;
  message?: string;
}

export function QuickFeedback({
  onPositive,
  onNegative,
  message = "这个内容对您有帮助吗？",
}: QuickFeedbackProps) {
  return (
    <div className="flex items-center justify-center space-x-4 p-4 bg-gray-50 rounded-lg">
      <span className="text-sm text-gray-600">{message}</span>
      <div className="flex space-x-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onPositive}
          className="text-green-600 hover:text-green-700 hover:bg-green-50"
        >
          <ThumbsUp className="h-4 w-4 mr-1" />
          有帮助
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onNegative}
          className="text-red-600 hover:text-red-700 hover:bg-red-50"
        >
          <ThumbsDown className="h-4 w-4 mr-1" />
          没帮助
        </Button>
      </div>
    </div>
  );
}
