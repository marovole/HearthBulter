"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  ThumbsUp,
  ThumbsDown,
  MessageCircle,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface FeedbackData {
  type: "positive" | "negative" | "comment";
  comment?: string;
  timestamp: Date;
  adviceId?: string;
  sessionId?: string;
}

interface FeedbackButtonsProps {
  adviceId?: string;
  sessionId?: string;
  onFeedback?: (feedback: FeedbackData) => void;
  size?: "sm" | "md" | "lg";
  variant?: "inline" | "compact" | "detailed";
  className?: string;
  disabled?: boolean;
  showCounts?: boolean;
  initialFeedback?: FeedbackData;
}

export function FeedbackButtons({
  adviceId,
  sessionId,
  onFeedback,
  size = "md",
  variant = "inline",
  className,
  disabled = false,
  showCounts = false,
  initialFeedback,
}: FeedbackButtonsProps) {
  const [feedback, setFeedback] = useState<FeedbackData | null>(
    initialFeedback || null,
  );
  const [showCommentDialog, setShowCommentDialog] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [counts, setCounts] = useState({
    positive: 0,
    negative: 0,
    comments: 0,
  });

  const sizeClasses = {
    sm: "h-8 w-8",
    md: "h-9 w-9",
    lg: "h-10 w-10",
  };

  const iconSizeClasses = {
    sm: "w-3 h-3",
    md: "w-4 h-4",
    lg: "w-5 h-5",
  };

  const handleFeedback = async (type: "positive" | "negative" | "comment") => {
    if (disabled || isSubmitting) return;

    if (type === "comment") {
      setShowCommentDialog(true);
      return;
    }

    const feedbackData: FeedbackData = {
      type,
      timestamp: new Date(),
      adviceId,
      sessionId,
    };

    setIsSubmitting(true);
    try {
      await onFeedback?.(feedbackData);
      setFeedback(feedbackData);

      // 更新计数（如果显示计数）
      if (showCounts) {
        setCounts((prev) => ({
          ...prev,
          [type === "positive" ? "positive" : "negative"]:
            prev[type === "positive" ? "positive" : "negative"] + 1,
        }));
      }
    } catch (error) {
      console.error("Feedback submission failed:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCommentSubmit = async () => {
    if (!commentText.trim() || isSubmitting) return;

    const feedbackData: FeedbackData = {
      type: "comment",
      comment: commentText.trim(),
      timestamp: new Date(),
      adviceId,
      sessionId,
    };

    setIsSubmitting(true);
    try {
      await onFeedback?.(feedbackData);
      setFeedback(feedbackData);
      setShowCommentDialog(false);
      setCommentText("");

      // 更新计数
      if (showCounts) {
        setCounts((prev) => ({
          ...prev,
          comments: prev.comments + 1,
        }));
      }
    } catch (error) {
      console.error("Comment submission failed:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getButtonVariant = (
    buttonType: "positive" | "negative" | "comment",
  ) => {
    if (!feedback || feedback.type !== buttonType) return "outline";
    return "default";
  };

  if (variant === "compact") {
    return (
      <div className={cn("flex items-center space-x-1", className)}>
        <Button
          size="sm"
          variant={getButtonVariant("positive")}
          onClick={() => handleFeedback("positive")}
          disabled={disabled || isSubmitting}
          className={cn(sizeClasses.sm)}
        >
          <ThumbsUp className={iconSizeClasses.sm} />
        </Button>
        <Button
          size="sm"
          variant={getButtonVariant("negative")}
          onClick={() => handleFeedback("negative")}
          disabled={disabled || isSubmitting}
          className={cn(sizeClasses.sm)}
        >
          <ThumbsDown className={iconSizeClasses.sm} />
        </Button>
        <Button
          size="sm"
          variant={getButtonVariant("comment")}
          onClick={() => handleFeedback("comment")}
          disabled={disabled || isSubmitting}
          className={cn(sizeClasses.sm)}
        >
          <MessageCircle className={iconSizeClasses.sm} />
        </Button>
      </div>
    );
  }

  if (variant === "detailed") {
    return (
      <div className={cn("space-y-3", className)}>
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-muted-foreground">
            这个建议对您有帮助吗？
          </span>
          {feedback && (
            <Badge variant="secondary" className="flex items-center space-x-1">
              <CheckCircle className="w-3 h-3" />
              <span>已反馈</span>
            </Badge>
          )}
        </div>

        <div className="flex items-center space-x-2">
          <Button
            variant={getButtonVariant("positive")}
            onClick={() => handleFeedback("positive")}
            disabled={disabled || isSubmitting}
            className="flex items-center space-x-2"
          >
            <ThumbsUp className="w-4 h-4" />
            <span>有帮助</span>
            {showCounts && counts.positive > 0 && (
              <Badge variant="secondary" className="ml-1">
                {counts.positive}
              </Badge>
            )}
          </Button>

          <Button
            variant={getButtonVariant("negative")}
            onClick={() => handleFeedback("negative")}
            disabled={disabled || isSubmitting}
            className="flex items-center space-x-2"
          >
            <ThumbsDown className="w-4 h-4" />
            <span>没帮助</span>
            {showCounts && counts.negative > 0 && (
              <Badge variant="secondary" className="ml-1">
                {counts.negative}
              </Badge>
            )}
          </Button>

          <Button
            variant={getButtonVariant("comment")}
            onClick={() => handleFeedback("comment")}
            disabled={disabled || isSubmitting}
            className="flex items-center space-x-2"
          >
            <MessageCircle className="w-4 h-4" />
            <span>反馈</span>
            {showCounts && counts.comments > 0 && (
              <Badge variant="secondary" className="ml-1">
                {counts.comments}
              </Badge>
            )}
          </Button>
        </div>

        {/* 反馈历史显示 */}
        {feedback && (
          <div className="text-xs text-muted-foreground">
            {feedback.type === "positive" && "✓ 您觉得这个建议有帮助"}
            {feedback.type === "negative" && "✗ 您觉得这个建议没有帮助"}
            {feedback.type === "comment" && feedback.comment && (
              <div className="mt-1 p-2 bg-muted rounded text-xs">
                您的反馈: {feedback.comment}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // 默认 inline 变体
  return (
    <>
      <div className={cn("flex items-center space-x-1", className)}>
        <Button
          size="sm"
          variant={getButtonVariant("positive")}
          onClick={() => handleFeedback("positive")}
          disabled={disabled || isSubmitting}
          className="flex items-center space-x-1"
        >
          <ThumbsUp className={iconSizeClasses.sm} />
          {showCounts && counts.positive > 0 && (
            <span className="text-xs">{counts.positive}</span>
          )}
        </Button>

        <Button
          size="sm"
          variant={getButtonVariant("negative")}
          onClick={() => handleFeedback("negative")}
          disabled={disabled || isSubmitting}
          className="flex items-center space-x-1"
        >
          <ThumbsDown className={iconSizeClasses.sm} />
          {showCounts && counts.negative > 0 && (
            <span className="text-xs">{counts.negative}</span>
          )}
        </Button>

        <Button
          size="sm"
          variant="ghost"
          onClick={() => handleFeedback("comment")}
          disabled={disabled || isSubmitting}
          className="flex items-center space-x-1 text-muted-foreground hover:text-foreground"
        >
          <MessageCircle className={iconSizeClasses.sm} />
          {showCounts && counts.comments > 0 && (
            <span className="text-xs">{counts.comments}</span>
          )}
        </Button>
      </div>

      {/* 评论对话框 */}
      <Dialog open={showCommentDialog} onOpenChange={setShowCommentDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>提供详细反馈</DialogTitle>
            <DialogDescription>
              请告诉我们您的想法，这将帮助我们改进AI建议的质量。
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <Textarea
              placeholder="您的反馈内容..."
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              rows={4}
              maxLength={500}
            />
            <div className="text-xs text-muted-foreground text-right">
              {commentText.length}/500
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCommentDialog(false)}
              disabled={isSubmitting}
            >
              取消
            </Button>
            <Button
              onClick={handleCommentSubmit}
              disabled={!commentText.trim() || isSubmitting}
            >
              {isSubmitting ? "提交中..." : "提交反馈"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// 快速反馈组件 - 用于AI对话
interface QuickFeedbackProps {
  onFeedback?: (type: "like" | "dislike") => void;
  className?: string;
  disabled?: boolean;
}

export function QuickFeedback({
  onFeedback,
  className,
  disabled = false,
}: QuickFeedbackProps) {
  const [feedback, setFeedback] = useState<"like" | "dislike" | null>(null);

  const handleFeedback = (type: "like" | "dislike") => {
    if (disabled) return;
    setFeedback(type);
    onFeedback?.(type);
  };

  return (
    <div className={cn("flex items-center space-x-1", className)}>
      <Button
        size="sm"
        variant={feedback === "like" ? "default" : "ghost"}
        onClick={() => handleFeedback("like")}
        disabled={disabled}
        className="h-8 w-8 p-0"
      >
        <ThumbsUp className="w-3 h-3" />
      </Button>
      <Button
        size="sm"
        variant={feedback === "dislike" ? "default" : "ghost"}
        onClick={() => handleFeedback("dislike")}
        disabled={disabled}
        className="h-8 w-8 p-0"
      >
        <ThumbsDown className="w-3 h-3" />
      </Button>
    </div>
  );
}
