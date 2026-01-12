// @ts-nocheck
/**
 * MealCard 组件测试
 */

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { MealCard } from "@/components/meal-planning/MealCard";

describe("MealCard", () => {
  const mockMeal = {
    id: "test-meal-1",
    date: "2025-01-01",
    mealType: "LUNCH" as const,
    calories: 320,
    protein: 35,
    carbs: 12,
    fat: 8,
    ingredients: [
      {
        id: "ing-1",
        amount: 200,
        food: {
          id: "food-1",
          name: "鸡胸肉",
        },
      },
      {
        id: "ing-2",
        amount: 100,
        food: {
          id: "food-2",
          name: "生菜",
        },
      },
      {
        id: "ing-3",
        amount: 50,
        food: {
          id: "food-3",
          name: "番茄",
        },
      },
      {
        id: "ing-4",
        amount: 50,
        food: {
          id: "food-4",
          name: "黄瓜",
        },
      },
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should render meal card correctly", () => {
    const { container } = render(<MealCard meal={mockMeal} />);

    // MealCard renders a simple div with specific classes
    const card = container.querySelector(".hover\\:shadow-lg");
    expect(card).toBeInTheDocument();
    expect(screen.getByText("午餐")).toBeInTheDocument(); // LUNCH should display as 午餐
  });

  it("should display nutrition information", () => {
    const { container } = render(<MealCard meal={mockMeal} />);

    // Calories are displayed as "320 kcal" (with text node and number split)
    expect(screen.getByText(/320/)).toBeInTheDocument();
    // Protein, carbs, fat are displayed with g unit
    expect(container.textContent).toContain("35.0");
    expect(container.textContent).toContain("12.0");
    expect(container.textContent).toContain("8.0");
  });

  it("should display ingredients list", () => {
    render(<MealCard meal={mockMeal} />);

    mockMeal.ingredients.forEach((ingredient) => {
      expect(screen.getByText(ingredient.food.name)).toBeInTheDocument();
    });
  });

  it("should handle empty ingredients list", () => {
    const mealWithoutIngredients = {
      ...mockMeal,
      ingredients: [],
    };

    const { container } = render(<MealCard meal={mealWithoutIngredients} />);

    const card = container.querySelector(".hover\\:shadow-lg");
    expect(card).toBeInTheDocument();
    expect(screen.getByText("暂无食材信息")).toBeInTheDocument();
  });

  it("should handle loading state with zero calories", () => {
    const loadingMeal = {
      id: "loading-meal",
      date: "2025-01-01",
      mealType: "LUNCH" as const,
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      ingredients: [],
    };

    const { container } = render(<MealCard meal={loadingMeal} />);

    const card = container.querySelector(".hover\\:shadow-lg");
    expect(card).toBeInTheDocument();
    expect(container.textContent).toContain("0.0"); // 0.0 for protein, carbs, fat
    expect(container.textContent).toContain("0"); // 0 kcal
  });

  it("should display date when showDate is true", () => {
    render(<MealCard meal={mockMeal} showDate={true} />);

    // Date should be formatted as "1月1日"
    expect(screen.getByText("1月1日")).toBeInTheDocument();
  });

  it("should hide date when showDate is false or not provided", () => {
    render(<MealCard meal={mockMeal} showDate={false} />);

    // Date should not be displayed
    const dateElement = screen.queryByText("1月1日");
    expect(dateElement).not.toBeInTheDocument();
  });

  it("should handle different meal types", () => {
    const breakfastMeal = {
      ...mockMeal,
      mealType: "BREAKFAST" as const,
    };

    render(<MealCard meal={breakfastMeal} />);
    expect(screen.getByText("早餐")).toBeInTheDocument();

    const { unmount } = render(
      <MealCard meal={{ ...mockMeal, mealType: "DINNER" as const }} />,
    );
    expect(screen.getByText("晚餐")).toBeInTheDocument();
    unmount();

    render(<MealCard meal={{ ...mockMeal, mealType: "SNACK" as const }} />);
    expect(screen.getByText("加餐")).toBeInTheDocument();
  });

  it("should handle replace button callback", async () => {
    const mockOnReplace = jest.fn();

    render(<MealCard meal={mockMeal} onReplace={mockOnReplace} />);

    const replaceButton = screen.getByText("替换");
    fireEvent.click(replaceButton);

    await waitFor(() => {
      expect(mockOnReplace).toHaveBeenCalled();
    });
  });

  it("should format amounts correctly in grams and kilograms", () => {
    const mealWithLargeAmount = {
      ...mockMeal,
      ingredients: [
        {
          id: "ing-1",
          amount: 1500,
          food: { id: "food-1", name: "米饭" },
        },
        {
          id: "ing-2",
          amount: 50,
          food: { id: "food-2", name: "盐" },
        },
      ],
    };

    const { container } = render(<MealCard meal={mealWithLargeAmount} />);

    // 1500g should be displayed as 1.5kg
    expect(screen.getByText("1.5kg")).toBeInTheDocument();
    // 50g should be displayed as 50g
    expect(screen.getByText("50g")).toBeInTheDocument();
  });

  it("should display emoji for meal type", () => {
    render(<MealCard meal={mockMeal} />);

    // Lunch should show 🍱 emoji
    expect(screen.getByText("🍱")).toBeInTheDocument();
  });

  it("should handle large amount of ingredients", () => {
    const manyIngredientsArray = Array.from({ length: 10 }, (_, i) => ({
      id: `ing-${i}`,
      amount: 50 + i * 10,
      food: { id: `food-${i}`, name: `食材${i + 1}` },
    }));

    const mealWithManyIngredients = {
      ...mockMeal,
      ingredients: manyIngredientsArray,
    };

    render(<MealCard meal={mealWithManyIngredients} />);

    // First 5 ingredients should be displayed
    for (let i = 0; i < 5; i++) {
      expect(screen.getByText(`食材${i + 1}`)).toBeInTheDocument();
    }

    // Show more button should be present for additional ingredients
    expect(screen.getByText(/显示更多/)).toBeInTheDocument();
  });
});
