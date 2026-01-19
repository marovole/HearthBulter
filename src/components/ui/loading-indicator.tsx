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
      <div
        className={cn("flex items-center justify-center space-x-2", className)}
      >
        <Loader2 className={cn("animate-spin", sizeClasses[size])} />
        {showText && (
          <span className={cn("text-muted-foreground", textSizeClasses[size])}>
            {text}
          </span>
        )}
      </div>
    );
  }

  if (variant === "dots") {
    return (
      <div
        className={cn("flex items-center justify-center space-x-2", className)}
      >
        <div className="flex space-x-1">
          <div
            className={cn(
              "bg-current rounded-full animate-bounce",
              size === "sm"
                ? "w-1 h-1"
                : size === "md"
                  ? "w-1.5 h-1.5"
                  : size === "lg"
                    ? "w-2 h-2"
                    : "w-3 h-3",
            )}
            style={{ animationDelay: "0ms" }}
          />
          <div
            className={cn(
              "bg-current rounded-full animate-bounce",
              size === "sm"
                ? "w-1 h-1"
                : size === "md"
                  ? "w-1.5 h-1.5"
                  : size === "lg"
                    ? "w-2 h-2"
                    : "w-3 h-3",
            )}
            style={{ animationDelay: "150ms" }}
          />
          <div
            className={cn(
              "bg-current rounded-full animate-bounce",
              size === "sm"
                ? "w-1 h-1"
                : size === "md"
                  ? "w-1.5 h-1.5"
                  : size === "lg"
                    ? "w-2 h-2"
                    : "w-3 h-3",
            )}
            style={{ animationDelay: "300ms" }}
          />
        </div>
        {showText && (
          <span className={cn("text-muted-foreground", textSizeClasses[size])}>
            {text}
          </span>
        )}
      </div>
    );
  }

  if (variant === "pulse") {
    return (
      <div
        className={cn("flex items-center justify-center space-x-2", className)}
      >
        <div
          className={cn(
            "bg-current rounded-full animate-pulse",
            sizeClasses[size],
          )}
        />
        {showText && (
          <span className={cn("text-muted-foreground", textSizeClasses[size])}>
            {text}
          </span>
        )}
      </div>
    );
  }

  if (variant === "bars") {
    return (
      <div
        className={cn("flex items-center justify-center space-x-2", className)}
      >
        <div className="flex space-x-0.5">
          {[0, 1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className={cn(
                "bg-current animate-pulse",
                size === "sm"
                  ? "w-0.5 h-3"
                  : size === "md"
                    ? "w-1 h-4"
                    : size === "lg"
                      ? "w-1.5 h-6"
                      : "w-2 h-8",
              )}
              style={{
                animationDelay: `${i * 100}ms`,
                animationDuration: "1.5s",
              }}
            />
          ))}
        </div>
        {showText && (
          <span className={cn("text-muted-foreground", textSizeClasses[size])}>
            {text}
          </span>
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
    <div
      className={cn(
        "flex items-center space-x-3 p-4 bg-muted/50 rounded-lg",
        className,
      )}
    >
      <LoadingIndicator size={size} variant="dots" text="" showText={false} />
      <div className="flex-1">
        <p
          className={cn(
            "text-muted-foreground font-medium",
            size === "sm" ? "text-sm" : size === "md" ? "text-base" : "text-lg",
          )}
        >
          {message}
        </p>
        <div className="flex items-center mt-2">
          <div className="flex space-x-1">
            <div
              className="w-2 h-2 bg-primary rounded-full animate-bounce"
              style={{ animationDelay: "0ms" }}
            />
            <div
              className="w-2 h-2 bg-primary rounded-full animate-bounce"
              style={{ animationDelay: "200ms" }}
            />
            <div
              className="w-2 h-2 bg-primary rounded-full animate-bounce"
              style={{ animationDelay: "400ms" }}
            />
          </div>
          <span className="ml-2 text-xs text-muted-foreground">
            正在分析数据...
          </span>
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
      className={cn(
        "flex flex-col items-center justify-center min-h-[200px] space-y-4",
        className,
      )}
    >
      <LoadingIndicator size="lg" variant="spinner" text="" showText={false} />
      <p className="text-muted-foreground text-center">{message}</p>
    </div>
  );
}

// 内联加载状态指示器
interface InlineLoadingIndicatorProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function InlineLoadingIndicator({
  size = "sm",
  className,
}: InlineLoadingIndicatorProps) {
  return (
    <div className={cn("flex items-center justify-center", className)}>
      <Loader2
        className={cn("animate-spin text-muted-foreground", {
          "w-3 h-3": size === "sm",
          "w-4 h-4": size === "md",
          "w-5 h-5": size === "lg",
        })}
      />
    </div>
  );
}
