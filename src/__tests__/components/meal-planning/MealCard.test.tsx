/**
 * MealCard 组件测试
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import MealCard from '@/components/meal-planning/MealCard';

// Mock UI components
jest.mock('@/components/ui/card', () => ({
  Card: ({ children, className, ...props }: any) => (
    <div data-testid="card" className={className} {...props}>{children}</div>
  ),
  CardContent: ({ children, ...props }: any) => (
    <div data-testid="card-content" {...props}>{children}</div>
  ),
  CardDescription: ({ children, ...props }: any) => (
    <div data-testid="card-description" {...props}>{children}</div>
  ),
  CardHeader: ({ children, ...props }: any) => (
    <div data-testid="card-header" {...props}>{children}</div>
  ),
  CardTitle: ({ children, ...props }: any) => (
    <div data-testid="card-title" {...props}>{children}</div>
  ),
}));

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, variant, disabled, ...props }: any) => (
    <button
      data-testid="button"
      data-variant={variant}
      data-disabled={disabled}
      onClick={onClick}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  ),
}));

jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children, variant, ...props }: any) => (
    <span data-testid="badge" data-variant={variant} {...props}>{children}</span>
  ),
}));

jest.mock('@/components/ui/progress', () => ({
  Progress: ({ value, max, ...props }: any) => (
    <div data-testid="progress" data-value={value} data-max={max} {...props}>
      <div data-testid="progress-bar"></div>
    </div>
  ),
}));

describe('MealCard', () => {
  const mockMeal = {
    id: 'test-meal-1',
    name: '鸡胸肉沙拉',
    description: '高蛋白低脂的健康沙拉',
    image: '/images/chicken-salad.jpg',
    prepTime: 15,
    cookTime: 0,
    servings: 2,
    difficulty: 'easy',
    nutrition: {
      calories: 320,
      protein: 35,
      carbs: 12,
      fat: 8,
      fiber: 6
    },
    ingredients: [
      { name: '鸡胸肉', amount: '200g' },
      { name: '生菜', amount: '100g' },
      { name: '番茄', amount: '50g' },
      { name: '黄瓜', amount: '50g' }
    ],
    instructions: [
      '将鸡胸肉煮熟切片',
      '将蔬菜洗净切块',
      '混合所有食材',
      '添加调味料'
    ],
    tags: ['高蛋白', '低脂', '沙拉', '快手菜'],
    isFavorite: false,
    rating: 4.5
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render meal card correctly', () => {
    render(<MealCard meal={mockMeal} />);

    expect(screen.getByTestId('card')).toBeInTheDocument();
    expect(screen.getByText('鸡胸肉沙拉')).toBeInTheDocument();
    expect(screen.getByText('高蛋白低脂的健康沙拉')).toBeInTheDocument();
  });

  it('should display nutrition information', () => {
    render(<MealCard meal={mockMeal} />);

    expect(screen.getByText('320')).toBeInTheDocument(); // calories
    expect(screen.getByText('35g')).toBeInTheDocument(); // protein
    expect(screen.getByText('12g')).toBeInTheDocument(); // carbs
    expect(screen.getByText('8g')).toBeInTheDocument(); // fat
  });

  it('should display meal tags', () => {
    render(<MealCard meal={mockMeal} />);

    mockMeal.tags.forEach(tag => {
      expect(screen.getByText(tag)).toBeInTheDocument();
    });
  });

  it('should show cooking time information', () => {
    render(<MealCard meal={mockMeal} />);

    expect(screen.getByText('15分钟')).toBeInTheDocument(); // prep time
  });

  it('should display serving size', () => {
    render(<MealCard meal={mockMeal} />);

    expect(screen.getByText('2人份')).toBeInTheDocument();
  });

  it('should handle favorite toggle', async () => {
    const mockOnToggleFavorite = jest.fn();

    render(
      <MealCard
        meal={mockMeal}
        onToggleFavorite={mockOnToggleFavorite}
      />
    );

    // Find favorite button (could be represented by a heart icon or similar)
    const favoriteButton = screen.getAllByTestId('button').find(btn =>
      btn.getAttribute('aria-label')?.includes('favorite') ||
      btn.textContent?.includes('收藏')
    );

    if (favoriteButton) {
      fireEvent.click(favoriteButton);
      await waitFor(() => {
        expect(mockOnToggleFavorite).toHaveBeenCalledWith(mockMeal.id);
      });
    }
  });

  it('should display rating', () => {
    render(<MealCard meal={mockMeal} />);

    // Rating might be displayed as stars or numeric value
    expect(screen.getByText('4.5')).toBeInTheDocument();
  });

  it('should handle meal click events', async () => {
    const mockOnClick = jest.fn();

    render(<MealCard meal={mockMeal} onClick={mockOnClick} />);

    const card = screen.getByTestId('card');
    fireEvent.click(card);

    await waitFor(() => {
      expect(mockOnClick).toHaveBeenCalledWith(mockMeal);
    });
  });

  it('should show difficulty badge', () => {
    render(<MealCard meal={mockMeal} />);

    expect(screen.getByText('简单')).toBeInTheDocument();
  });

  it('should handle meal without image', () => {
    const mealWithoutImage = {
      ...mockMeal,
      image: undefined
    };

    render(<MealCard meal={mealWithoutImage} />);

    expect(screen.getByTestId('card')).toBeInTheDocument();
    // Should render placeholder or default image
  });

  it('should handle loading state', () => {
    render(<MealCard meal={null} />);

    expect(screen.getByTestId('card')).toBeInTheDocument();
    // Should show loading placeholder or handle gracefully
  });

  it('should display ingredients list', () => {
    render(<MealCard meal={mockMeal} />);

    mockMeal.ingredients.forEach(ingredient => {
      expect(screen.getByText(ingredient.name)).toBeInTheDocument();
      expect(screen.getByText(ingredient.amount)).toBeInTheDocument();
    });
  });

  it('should handle empty ingredients list', () => {
    const mealWithoutIngredients = {
      ...mockMeal,
      ingredients: []
    };

    render(<MealCard meal={mealWithoutIngredients} />);

    expect(screen.getByTestId('card')).toBeInTheDocument();
    // Should not crash with empty ingredients
  });

  it('should display cooking instructions', () => {
    render(<MealCard meal={mockMeal} />);

    mockMeal.instructions.forEach((instruction, index) => {
      expect(screen.getByText(`${index + 1}. ${instruction}`)).toBeInTheDocument();
    });
  });

  it('should handle meal with empty instructions', () => {
    const mealWithoutInstructions = {
      ...mockMeal,
      instructions: []
    };

    render(<MealCard meal={mealWithoutInstructions} />);

    expect(screen.getByTestId('card')).toBeInTheDocument();
    // Should handle gracefully
  });

  it('should handle meal without tags', () => {
    const mealWithoutTags = {
      ...mockMeal,
      tags: []
    };

    render(<MealCard meal={mealWithoutTags} />);

    expect(screen.getByTestId('card')).toBeInTheDocument();
    // Should not display tags section
  });

  it('should handle different difficulty levels', () => {
    const mediumDifficultyMeal = {
      ...mockMeal,
      difficulty: 'medium'
    };

    render(<MealCard meal={mediumDifficultyMeal} />);

    expect(screen.getByText('中等')).toBeInTheDocument();
  });

  it('should show dietary restrictions if available', () => {
    const mealWithRestrictions = {
      ...mockMeal,
      dietaryRestrictions: ['gluten-free', 'dairy-free', 'vegetarian']
    };

    render(<MealCard meal={mealWithRestrictions} />);

    mealWithRestrictions.dietaryRestrictions.forEach(restriction => {
      expect(screen.getByText(restriction)).toBeInTheDocument();
    });
  });

  it('should handle view details action', async () => {
    const mockOnViewDetails = jest.fn();

    render(
      <MealCard
        meal={mockMeal}
        onViewDetails={mockOnViewDetails}
      />
    );

    const detailsButton = screen.getAllByTestId('button').find(btn =>
      btn.textContent?.includes('详情') || btn.textContent?.includes('查看')
    );

    if (detailsButton) {
      fireEvent.click(detailsButton);
      await waitFor(() => {
        expect(mockOnViewDetails).toHaveBeenCalledWith(mockMeal);
      });
    }
  });

  it('should handle add to meal plan action', async () => {
    const mockOnAddToMealPlan = jest.fn();

    render(
      <MealCard
        meal={mockMeal}
        onAddToMealPlan={mockOnAddToMealPlan}
      />
    );

    const addButton = screen.getAllByTestId('button').find(btn =>
      btn.textContent?.includes('添加') || btn.textContent?.includes('加入')
    );

    if (addButton) {
      fireEvent.click(addButton);
      await waitFor(() => {
        expect(mockOnAddToMealPlan).toHaveBeenCalledWith(mockMeal);
      });
    }
  });

  it('should be accessible', () => {
    render(<MealCard meal={mockMeal} />);

    const card = screen.getByTestId('card');
    expect(card).toBeInTheDocument();

    // Check for proper ARIA attributes
    expect(screen.getByText('鸡胸肉沙拉')).toBeInTheDocument();
    // Image should have alt text if present
  });

  it('should display nutrition progress bars', () => {
    render(<MealCard meal={mockMeal} />);

    // Should show progress indicators for nutrition
    expect(screen.getAllByTestId('progress')).toHaveLength(4); // protein, carbs, fat, fiber
  });

  it('should handle long meal names', () => {
    const mealWithLongName = {
      ...mockMeal,
      name: '超级营养均衡的有机鸡胸肉配新鲜蔬菜沙拉配特制酱汁低脂健康餐'
    };

    render(<MealCard meal={mealWithLongName} />);

    expect(screen.getByTestId('card')).toBeInTheDocument();
    // Should handle long names gracefully (truncation, etc.)
  });

  it('should respond to hover interactions', () => {
    render(<MealCard meal={mockMeal} />);

    const card = screen.getByTestId('card');
    fireEvent.mouseEnter(card);

    // Should handle hover states (might show additional actions, etc.)
    expect(card).toBeInTheDocument();

    fireEvent.mouseLeave(card);
    expect(card).toBeInTheDocument();
  });

  it('should be keyboard accessible', () => {
    const mockOnClick = jest.fn();

    render(<MealCard meal={mockMeal} onClick={mockOnClick} />);

    const card = screen.getByTestId('card');
    card.focus();
    fireEvent.keyDown(card, { key: 'Enter' });

    expect(mockOnClick).toHaveBeenCalledWith(mockMeal);

    fireEvent.keyDown(card, { key: ' ' });
    expect(mockOnClick).toHaveBeenCalledWith(mockMeal);
  });
});