export interface ShoppingItem {
  id: string;
  foodId: string;
  amount: number;
  category: string;
  purchased: boolean;
  estimatedPrice: number | null;
  food: {
    id: string;
    name: string;
    category: string;
  };
}

export interface ShoppingList {
  id: string;
  planId: string;
  name: string;
  budget: number | null;
  estimatedCost: number | null;
  actualCost: number | null;
  status: "PENDING" | "IN_PROGRESS" | "COMPLETED";
  items: ShoppingItem[];
  createdAt: string;
  plan: {
    id: string;
    member: {
      id: string;
      name: string;
    };
  };
}
