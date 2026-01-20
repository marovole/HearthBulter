import { CardSkeleton, Skeleton } from "@/components/ui/skeleton";

function NutritionCardSkeleton() {
  return (
    <div className="space-y-2 rounded-lg border p-4">
      <Skeleton className="h-4 w-16" />
      <Skeleton className="h-8 w-24" />
      <Skeleton className="h-2 w-full" />
    </div>
  );
}

function DayColumnSkeleton() {
  return (
    <div className="space-y-2">
      <Skeleton className="h-4 w-full" />
      <div className="space-y-2">
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
      </div>
    </div>
  );
}

function RecipeCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-lg border">
      <Skeleton className="h-40 w-full" />
      <div className="space-y-2 p-4">
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <div className="flex gap-2">
          <Skeleton className="h-6 w-16" />
          <Skeleton className="h-6 w-16" />
        </div>
      </div>
    </div>
  );
}

export default function MealPlanningLoading() {
  return (
    <div className="container mx-auto space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-8 w-48 animate-pulse rounded bg-muted" />
          <div className="h-4 w-64 animate-pulse rounded bg-muted" />
        </div>
        <div className="flex gap-2">
          <div className="h-10 w-24 animate-pulse rounded bg-muted" />
          <div className="h-10 w-32 animate-pulse rounded bg-muted" />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <NutritionCardSkeleton />
        <NutritionCardSkeleton />
        <NutritionCardSkeleton />
        <NutritionCardSkeleton />
      </div>

      <div className="rounded-lg border p-6">
        <div className="mb-6 flex items-center justify-between">
          <Skeleton className="h-6 w-32" />
          <div className="flex gap-2">
            <Skeleton className="h-8 w-8" />
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-8 w-8" />
          </div>
        </div>

        <div className="grid grid-cols-7 gap-4">
          <DayColumnSkeleton />
          <DayColumnSkeleton />
          <DayColumnSkeleton />
          <DayColumnSkeleton />
          <DayColumnSkeleton />
          <DayColumnSkeleton />
          <DayColumnSkeleton />
        </div>
      </div>

      <div className="rounded-lg border p-6">
        <Skeleton className="mb-4 h-6 w-32" />
        <div className="grid gap-4 md:grid-cols-3">
          <RecipeCardSkeleton />
          <RecipeCardSkeleton />
          <RecipeCardSkeleton />
        </div>
      </div>
    </div>
  );
}
