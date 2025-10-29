# Meal Planning - Technical Design

## Data Models

```prisma
model MealPlan {
  id        String   @id @default(cuid())
  memberId  String
  startDate DateTime
  endDate   DateTime
  goal      GoalType

  // 营养目标
  targetCalories Float
  targetProtein  Float
  targetCarbs    Float
  targetFat      Float

  status    PlanStatus @default(ACTIVE)
  createdAt DateTime @default(now())

  meals Meal[]
  member FamilyMember @relation(fields: [memberId], references: [id])

  @@map("meal_plans")
}

model Meal {
  id         String   @id @default(cuid())
  planId     String
  date       DateTime
  mealType   MealType // BREAKFAST, LUNCH, DINNER, SNACK

  // 营养成分（实际值）
  calories   Float
  protein    Float
  carbs      Float
  fat        Float

  ingredients MealIngredient[]
  plan        MealPlan @relation(fields: [planId], references: [id])

  @@map("meals")
}

model MealIngredient {
  id       String @id @default(cuid())
  mealId   String
  foodId   String
  amount   Float  // g

  meal Meal @relation(fields: [mealId], references: [id])
  food Food @relation(fields: [foodId], references: [id])

  @@map("meal_ingredients")
}

enum MealType {
  BREAKFAST
  LUNCH
  DINNER
  SNACK
}

enum PlanStatus {
  ACTIVE
  COMPLETED
  CANCELLED
}
```

## Meal Generation Algorithm

```typescript
async function generateMealPlan(memberId: string, days: number = 7) {
  // 1. 获取成员数据
  const member = await getMemberWithGoals(memberId);
  const { tdee, goal, allergies } = member;

  // 2. 计算目标营养
  const targetCalories = adjustCaloriesForGoal(tdee, goal);
  const macros = calculateMacros(targetCalories, goal);

  // 3. 筛选可用食材
  const availableFoods = await prisma.food.findMany({
    where: {
      NOT: { id: { in: allergies.map(a => a.foodId) } }
    }
  });

  // 4. 生成每日食谱
  const meals = [];
  for (let day = 0; day < days; day++) {
    const dailyMeals = await generateDailyMeals({
      foods: availableFoods,
      targetCalories,
      macros
    });
    meals.push(...dailyMeals);
  }

  // 5. 保存食谱计划
  return prisma.mealPlan.create({
    data: {
      memberId,
      targetCalories,
      ...macros,
      meals: { create: meals }
    }
  });
}
```

**最后更新**: 2025-10-29
