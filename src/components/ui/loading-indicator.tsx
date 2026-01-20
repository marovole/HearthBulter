"use client";

import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

interface LoadingIndicatorProps {
  size?: "sm" | "md" | "lg" | "xl";
  variant?: "spinner" | "dots" | "pulse" | "bars";
  text?: string;
  className?: string;
  showText?: boolean;
}

export function LoadingIndicator({
  size = "md",
  variant = "spinner",
  text = "加载中...",
  className,
  showText = true,
}: LoadingIndicatorProps) {
  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-6 h-6",
    lg: "w-8 h-8",
    xl: "w-12 h-12",
  };

  const textSizeClasses = {
    sm: "text-sm",
    md: "text-base",
    lg: "text-lg",
    xl: "text-xl",
  };

  if (variant === "spinner") {
    return (
      <div className={cn("flex items-center justify-center space-x-2", className)}>
        <Loader2 className={cn("animate-spin", sizeClasses[size])} />
        {showText && (
          <span className={cn("text-muted-foreground", textSizeClasses[size])}>{text}</span>
        )}
      </div>
    );
  }

  if (variant === "dots") {
    return (
      <div className={cn("flex items-center justify-center space-x-2", className)}>
        <div className="flex space-x-1">
          <div
            className={cn(
              "animate-bounce rounded-full bg-current",
              size === "sm"
                ? "h-1 w-1"
                : size === "md"
                  ? "h-1.5 w-1.5"
                  : size === "lg"
                    ? "h-2 w-2"
                    : "h-3 w-3"
            )}
            style={{ animationDelay: "0ms" }}
          />
          <div
            className={cn(
              "animate-bounce rounded-full bg-current",
              size === "sm"
                ? "h-1 w-1"
                : size === "md"
                  ? "h-1.5 w-1.5"
                  : size === "lg"
                    ? "h-2 w-2"
                    : "h-3 w-3"
            )}
            style={{ animationDelay: "150ms" }}
          />
          <div
            className={cn(
              "animate-bounce rounded-full bg-current",
              size === "sm"
                ? "h-1 w-1"
                : size === "md"
                  ? "h-1.5 w-1.5"
                  : size === "lg"
                    ? "h-2 w-2"
                    : "h-3 w-3"
            )}
            style={{ animationDelay: "300ms" }}
          />
        </div>
        {showText && (
          <span className={cn("text-muted-foreground", textSizeClasses[size])}>{text}</span>
        )}
      </div>
    );
  }

  if (variant === "pulse") {
    return (
      <div className={cn("flex items-center justify-center space-x-2", className)}>
        <div className={cn("animate-pulse rounded-full bg-current", sizeClasses[size])} />
        {showText && (
          <span className={cn("text-muted-foreground", textSizeClasses[size])}>{text}</span>
        )}
      </div>
    );
  }

  if (variant === "bars") {
    return (
      <div className={cn("flex items-center justify-center space-x-2", className)}>
        <div className="flex space-x-0.5">
          {[0, 1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className={cn(
                "animate-pulse bg-current",
                size === "sm"
                  ? "h-3 w-0.5"
                  : size === "md"
                    ? "h-4 w-1"
                    : size === "lg"
                      ? "h-6 w-1.5"
                      : "h-8 w-2"
              )}
              style={{
                animationDelay: `${i * 100}ms`,
                animationDuration: "1.5s",
              }}
            />
          ))}
        </div>
        {showText && (
          <span className={cn("text-muted-foreground", textSizeClasses[size])}>{text}</span>
        )}
      </div>
    );
  }

  return null;
}

// AI思考专用加载指示器
interface AIThinkingIndicatorProps {
  size?: "sm" | "md" | "lg";
  className?: string;
  message?: string;
}

export function AIThinkingIndicator({
  size = "md",
  className,
  message = "AI正在思考中...",
}: AIThinkingIndicatorProps) {
  return (
    <div className={cn("flex items-center space-x-3 rounded-lg bg-muted/50 p-4", className)}>
      <LoadingIndicator size={size} variant="dots" text="" showText={false} />
      <div className="flex-1">
        <p
          className={cn(
            "font-medium text-muted-foreground",
            size === "sm" ? "text-sm" : size === "md" ? "text-base" : "text-lg"
          )}
        >
          {message}
        </p>
        <div className="mt-2 flex items-center">
          <div className="flex space-x-1">
            <div
              className="h-2 w-2 animate-bounce rounded-full bg-primary"
              style={{ animationDelay: "0ms" }}
            />
            <div
              className="h-2 w-2 animate-bounce rounded-full bg-primary"
              style={{ animationDelay: "200ms" }}
            />
            <div
              className="h-2 w-2 animate-bounce rounded-full bg-primary"
              style={{ animationDelay: "400ms" }}
            />
          </div>
          <span className="ml-2 text-xs text-muted-foreground">正在分析数据...</span>
        </div>
      </div>
    </div>
  );
}

// 页面级加载指示器
interface PageLoadingIndicatorProps {
  message?: string;
  className?: string;
}

export function PageLoadingIndicator({
  message = "正在加载页面...",
  className,
}: PageLoadingIndicatorProps) {
  return (
    <div
      className={cn("flex min-h-[200px] flex-col items-center justify-center space-y-4", className)}
    >
      <LoadingIndicator size="lg" variant="spinner" text="" showText={false} />
      <p className="text-center text-muted-foreground">{message}</p>
    </div>
  );
}

// 内联加载状态指示器
interface InlineLoadingIndicatorProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function InlineLoadingIndicator({ size = "sm", className }: InlineLoadingIndicatorProps) {
  return (
    <div className={cn("flex items-center justify-center", className)}>
      <Loader2
        className={cn("animate-spin text-muted-foreground", {
          "h-3 w-3": size === "sm",
          "h-4 w-4": size === "md",
          "h-5 w-5": size === "lg",
        })}
      />
    </div>
  );
}
