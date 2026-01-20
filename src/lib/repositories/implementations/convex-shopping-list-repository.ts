import type { PaginatedResult, PaginationInput } from "../types/common";
import type {
  ShoppingListDTO,
  ShoppingListGetOptions,
  ShoppingListItemDTO,
  ShoppingListListQuery,
  UpdateShoppingListDTO,
  UpdateShoppingListItemDTO,
  CompleteShoppingListDTO,
} from "../types/shopping-list";
import type { ShoppingListRepository } from "../interfaces/shopping-list-repository";
import { convexClient, api } from "@/lib/convex-client";
import type { Id } from "@/../convex/_generated/dataModel";

const DEFAULT_LIMIT = 20;

export class ConvexShoppingListRepository implements ShoppingListRepository {
  async listShoppingLists(
    query: ShoppingListListQuery,
    pagination?: PaginationInput
  ): Promise<PaginatedResult<ShoppingListDTO>> {
    const result = await convexClient.query<{
      data: Array<Record<string, unknown>>;
      total: number;
    }>(api["shopping-lists"].list, {
      planId: query.planId as Id<"mealPlans"> | undefined,
      planIds: query.planIds as Id<"mealPlans">[] | undefined,
      statuses: query.statuses,
      includeDeleted: query.includeDeleted,
      includePlan: query.includePlan,
      includeItems: query.includeItems,
      search: query.search,
      sortField: query.sort?.field,
      sortDirection: query.sort?.direction,
      offset: pagination?.offset,
      limit: pagination?.limit ?? DEFAULT_LIMIT,
    });

    const items = result.data.map(mapShoppingList);
    const offset = pagination?.offset ?? 0;

    return {
      items,
      total: result.total,
      hasMore: offset + items.length < result.total,
    };
  }

  async getShoppingListById(
    id: string,
    options?: ShoppingListGetOptions
  ): Promise<ShoppingListDTO | null> {
    const list = await convexClient.query<Record<string, unknown> | null>(
      api["shopping-lists"].getById,
      {
        listId: id as Id<"shoppingLists">,
        includePlan: options?.includePlan,
        includeItems: options?.includeItems,
      }
    );

    return list ? mapShoppingList(list) : null;
  }

  async updateShoppingList(id: string, payload: UpdateShoppingListDTO): Promise<ShoppingListDTO> {
    await convexClient.mutation(api["shopping-lists"].update, {
      listId: id as Id<"shoppingLists">,
      name: payload.name,
      budget: payload.budget ?? undefined,
      status: payload.status,
    });

    const updated = await this.getShoppingListById(id, {
      includePlan: true,
      includeItems: true,
    });

    if (!updated) {
      throw new Error("购物清单不存在");
    }

    return updated;
  }

  async deleteShoppingList(id: string): Promise<void> {
    await convexClient.mutation(api["shopping-lists"].deleteList, {
      listId: id as Id<"shoppingLists">,
    });
  }

  async updateShoppingListItem(
    listId: string,
    itemId: string,
    payload: UpdateShoppingListItemDTO
  ): Promise<ShoppingListItemDTO> {
    await convexClient.mutation(api["shopping-lists"].updateItem, {
      listId: listId as Id<"shoppingLists">,
      itemId: itemId as Id<"shoppingListItems">,
      purchased: payload.purchased,
      quantity: payload.quantity,
      notes: payload.notes ?? undefined,
    });

    const updatedList = await this.getShoppingListById(listId, {
      includeItems: true,
    });

    const item = updatedList?.items?.find((entry) => entry.id === itemId);
    if (!item) {
      throw new Error("购物项不存在");
    }

    return item;
  }

  async completeShoppingList(
    listId: string,
    payload: CompleteShoppingListDTO
  ): Promise<ShoppingListDTO> {
    await convexClient.mutation(api["shopping-lists"].complete, {
      listId: listId as Id<"shoppingLists">,
      actualCost: payload.actualCost,
    });

    const updated = await this.getShoppingListById(listId, {
      includePlan: true,
      includeItems: true,
    });

    if (!updated) {
      throw new Error("购物清单不存在");
    }

    return updated;
  }
}

function mapShoppingList(list: Record<string, unknown>): ShoppingListDTO {
  const plan = list.plan as
    | {
        id: string;
        name: string;
        member?: { id: string; name: string };
      }
    | undefined;
  const items = list.items as Array<Record<string, unknown>> | undefined;

  return {
    id: String(list._id ?? list.id),
    planId: String(list.planId),
    name: String(list.name),
    budget: typeof list.budget === "number" ? list.budget : null,
    estimatedCost: typeof list.estimatedCost === "number" ? list.estimatedCost : undefined,
    actualCost: typeof list.actualCost === "number" ? list.actualCost : undefined,
    status: list.status as ShoppingListDTO["status"],
    createdAt: new Date(Number(list.createdAt)),
    updatedAt: new Date(Number(list.updatedAt)),
    deletedAt: typeof list.deletedAt === "number" ? new Date(list.deletedAt) : undefined,
    plan: plan
      ? {
          id: plan.id,
          name: plan.name,
          member: plan.member,
        }
      : undefined,
    items: items ? items.map(mapShoppingListItem) : undefined,
  };
}

function mapShoppingListItem(item: Record<string, unknown>): ShoppingListItemDTO {
  const food = item.food as
    | {
        id: string;
        name: string;
        category?: string | null;
        defaultUnit?: string | null;
        imageUrl?: string | null;
      }
    | undefined;

  return {
    id: String(item.id),
    shoppingListId: String(item.shoppingListId),
    foodId: String(item.foodId),
    category: String(item.category),
    quantity: Number(item.quantity),
    unit: String(item.unit),
    purchased: Boolean(item.purchased),
    notes: typeof item.notes === "string" ? item.notes : undefined,
    createdAt: new Date(Number(item.createdAt)),
    updatedAt: new Date(Number(item.updatedAt)),
    food: food
      ? {
          id: food.id,
          name: food.name,
          category: food.category ?? undefined,
          defaultUnit: food.defaultUnit ?? undefined,
          imageUrl: food.imageUrl ?? undefined,
        }
      : undefined,
  };
}
