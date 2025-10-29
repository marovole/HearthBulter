# Shopping List Generation - Technical Design

## Data Models

```prisma
model ShoppingList {
  id        String   @id @default(cuid())
  planId    String   // 关联食谱计划
  budget    Float?   // 预算（元）
  estimatedCost Float? // 估算成本
  actualCost    Float? // 实际花费
  status    ListStatus @default(PENDING)

  createdAt DateTime @default(now())
  items     ShoppingItem[]

  @@map("shopping_lists")
}

model ShoppingItem {
  id         String  @id @default(cuid())
  listId     String
  foodId     String
  amount     Float   // g
  category   FoodCategory
  purchased  Boolean @default(false)
  estimatedPrice Float?

  list ShoppingList @relation(fields: [listId], references: [id])
  food Food @relation(fields: [foodId], references: [id])

  @@map("shopping_items")
}

enum ListStatus {
  PENDING      // 待采购
  IN_PROGRESS  // 采购中
  COMPLETED    // 已完成
}
```

## Ingredient Aggregation

```typescript
async function generateShoppingList(planId: string) {
  const plan = await prisma.mealPlan.findUnique({
    where: { id: planId },
    include: { meals: { include: { ingredients: true } } }
  });

  // 聚合相同食材
  const aggregated = new Map<string, number>();

  plan.meals.forEach(meal => {
    meal.ingredients.forEach(ingredient => {
      const current = aggregated.get(ingredient.foodId) || 0;
      aggregated.set(ingredient.foodId, current + ingredient.amount);
    });
  });

  // 创建购物清单
  return prisma.shoppingList.create({
    data: {
      planId,
      items: {
        create: Array.from(aggregated.entries()).map(([foodId, amount]) => ({
          foodId,
          amount
        }))
      }
    }
  });
}
```

**最后更新**: 2025-10-29
