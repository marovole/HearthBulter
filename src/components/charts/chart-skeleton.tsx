import { cn } from "@/lib/utils";

export function ChartSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn("min-h-[240px] w-full animate-pulse rounded-lg bg-muted", className)}
      aria-hidden
    />
  );
}
