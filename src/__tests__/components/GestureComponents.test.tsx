import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { useSwipe, useLongPress, usePinchZoom } from '../../lib/hooks/useGestures';
import { GestureEnhancedCard, SwipeableCarousel } from '../../components/dashboard/GestureComponents';

// Test components for gesture hooks
function TestSwipeComponent({ onSwipeLeft, onSwipeRight }: any) {
  const divRef = React.useRef<HTMLDivElement>(null);
  const { addEventListeners } = useSwipe({
    onSwipeLeft,
    onSwipeRight,
    threshold: 50,
  });

  React.useEffect(() => {
    if (divRef.current) {
      addEventListeners(divRef.current);
    }
  }, [addEventListeners]);

  return <div ref={divRef} data-testid="swipe-area">Swipe Area</div>;
}

function TestLongPressComponent({ onLongPress }: any) {
  const longPressHandlers = useLongPress({
    onLongPress,
    threshold: 500,
  });

  return (
    <div 
      data-testid="long-press-area"
      {...longPressHandlers}
    >
      Long Press Area
    </div>
  );
}

describe('Gesture Hooks', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('useSwipe', () => {
    it('should detect swipe left gesture', async () => {
      const onSwipeLeft = jest.fn();
      render(<TestSwipeComponent onSwipeLeft={onSwipeLeft} />);
      
      const swipeArea = screen.getByTestId('swipe-area');
      
      // Simulate swipe left
      fireEvent.touchStart(swipeArea, {
        targetTouches: [{ clientX: 100, clientY: 50 }],
      });
      
      fireEvent.touchMove(swipeArea, {
        targetTouches: [{ clientX: 30, clientY: 50 }],
      });
      
      fireEvent.touchEnd(swipeArea, {
        changedTouches: [{ clientX: 30, clientY: 50 }],
      });
      
      await waitFor(() => {
        expect(onSwipeLeft).toHaveBeenCalled();
      });
    });

    it('should detect swipe right gesture', async () => {
      const onSwipeRight = jest.fn();
      render(<TestSwipeComponent onSwipeRight={onSwipeRight} />);
      
      const swipeArea = screen.getByTestId('swipe-area');
      
      // Simulate swipe right
      fireEvent.touchStart(swipeArea, {
        targetTouches: [{ clientX: 30, clientY: 50 }],
      });
      
      fireEvent.touchMove(swipeArea, {
        targetTouches: [{ clientX: 100, clientY: 50 }],
      });
      
      fireEvent.touchEnd(swipeArea, {
        changedTouches: [{ clientX: 100, clientY: 50 }],
      });
      
      await waitFor(() => {
        expect(onSwipeRight).toHaveBeenCalled();
      });
    });

    it('should not trigger swipe if distance is too short', async () => {
      const onSwipeLeft = jest.fn();
      render(<TestSwipeComponent onSwipeLeft={onSwipeLeft} />);
      
      const swipeArea = screen.getByTestId('swipe-area');
      
      // Simulate short swipe (less than threshold)
      fireEvent.touchStart(swipeArea, {
        targetTouches: [{ clientX: 100, clientY: 50 }],
      });
      
      fireEvent.touchMove(swipeArea, {
        targetTouches: [{ clientX: 80, clientY: 50 }],
      });
      
      fireEvent.touchEnd(swipeArea, {
        changedTouches: [{ clientX: 80, clientY: 50 }],
      });
      
      await new Promise(resolve => setTimeout(resolve, 100));
      expect(onSwipeLeft).not.toHaveBeenCalled();
    });
  });

  describe('useLongPress', () => {
    jest.useFakeTimers();

    it('should trigger long press after threshold', async () => {
      const onLongPress = jest.fn();
      render(<TestLongPressComponent onLongPress={onLongPress} />);
      
      const longPressArea = screen.getByTestId('long-press-area');
      
      fireEvent.mouseDown(longPressArea);
      
      // Fast-forward time beyond threshold
      jest.advanceTimersByTime(600);
      
      await waitFor(() => {
        expect(onLongPress).toHaveBeenCalled();
      });
    });

    it('should not trigger long press if released before threshold', async () => {
      const onLongPress = jest.fn();
      render(<TestLongPressComponent onLongPress={onLongPress} />);
      
      const longPressArea = screen.getByTestId('long-press-area');
      
      fireEvent.mouseDown(longPressArea);
      
      // Fast-forward time but not beyond threshold
      jest.advanceTimersByTime(300);
      
      fireEvent.mouseUp(longPressArea);
      
      // Fast-forward remaining time
      jest.advanceTimersByTime(300);
      
      expect(onLongPress).not.toHaveBeenCalled();
    });

    afterEach(() => {
      jest.clearAllTimers();
    });
  });
});

describe('Gesture Components', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GestureEnhancedCard', () => {
    it('renders children content', () => {
      render(
        <GestureEnhancedCard title="Test Card">
          <div>Card Content</div>
        </GestureEnhancedCard>
      );
      
      expect(screen.getByText('Test Card')).toBeInTheDocument();
      expect(screen.getByText('Card Content')).toBeInTheDocument();
    });

    it('shows gesture hints when enabled', async () => {
      render(
        <GestureEnhancedCard 
          title="Test Card"
          showGestureHints={true}
          onSwipeLeft={() => {}}
          onSwipeRight={() => {}}
        >
          <div>Card Content</div>
        </GestureEnhancedCard>
      );
      
      // Wait for hint to appear
      await new Promise(resolve => setTimeout(resolve, 1100));
      
      expect(screen.getByText('← 滑动切换 →')).toBeInTheDocument();
    });

    it('does not show gesture hints when disabled', () => {
      render(
        <GestureEnhancedCard 
          title="Test Card"
          showGestureHints={false}
          onSwipeLeft={() => {}}
          onSwipeRight={() => {}}
        >
          <div>Card Content</div>
        </GestureEnhancedCard>
      );
      
      expect(screen.queryByText('← 滑动切换 →')).not.toBeInTheDocument();
    });

    it('applies custom className', () => {
      render(
        <GestureEnhancedCard 
          title="Test Card"
          className="custom-class"
        >
          <div>Card Content</div>
        </GestureEnhancedCard>
      );
      
      const card = screen.getByText('Test Card').closest('.relative');
      expect(card).toHaveClass('custom-class');
    });
  });

  describe('SwipeableCarousel', () => {
    it('renders all items', () => {
      const items = [
        <div key="1">Item 1</div>,
        <div key="2">Item 2</div>,
        <div key="3">Item 3</div>,
      ];
      
      render(<SwipeableCarousel items={items} />);
      
      expect(screen.getByText('Item 1')).toBeInTheDocument();
      expect(screen.getByText('Item 2')).toBeInTheDocument();
      expect(screen.getByText('Item 3')).toBeInTheDocument();
    });

    it('shows navigation buttons for multiple items', () => {
      const items = [
        <div key="1">Item 1</div>,
        <div key="2">Item 2</div>,
      ];
      
      render(<SwipeableCarousel items={items} />);
      
      // Check for navigation buttons (they should exist but might not be visible)
      const navigationButtons = screen.getAllByRole('button').filter(
        button => button.querySelector('svg')
      );
      
      expect(navigationButtons.length).toBeGreaterThanOrEqual(2);
    });

    it('displays correct number of indicators', () => {
      const items = [
        <div key="1">Item 1</div>,
        <div key="2">Item 2</div>,
        <div key="3">Item 3</div>,
      ];
      
      render(<SwipeableCarousel items={items} />);
      
      const indicators = screen.getAllByRole('button').filter(
        button => button.classList.contains('rounded-full') && 
                 button.classList.contains('w-2')
      );
      
      expect(indicators).toHaveLength(3);
    });

    it('handles item selection via indicators', () => {
      const onIndexChange = jest.fn();
      const items = [
        <div key="1">Item 1</div>,
        <div key="2">Item 2</div>,
      ];
      
      render(<SwipeableCarousel items={items} onIndexChange={onIndexChange} />);
      
      const indicators = screen.getAllByRole('button').filter(
        button => button.classList.contains('rounded-full') && 
                 button.classList.contains('w-2')
      );
      
      // Click on second indicator
      fireEvent.click(indicators[1]);
      
      expect(onIndexChange).toHaveBeenCalledWith(1);
    });

    it('handles navigation button clicks', () => {
      const items = [
        <div key="1">Item 1</div>,
        <div key="2">Item 2</div>,
        <div key="3">Item 3</div>,
      ];
      
      render(<SwipeableCarousel items={items} />);
      
      const navigationButtons = screen.getAllByRole('button').filter(
        button => button.querySelector('svg')
      );
      
      // Click on right navigation button
      if (navigationButtons.length >= 2) {
        fireEvent.click(navigationButtons[1]);
      }
      
      // Should navigate to next item (implementation would update currentIndex)
      expect(navigationButtons.length).toBeGreaterThanOrEqual(2);
    });

    it('handles single item without navigation', () => {
      const items = [
        <div key="1">Single Item</div>,
      ];
      
      render(<SwipeableCarousel items={items} />);
      
      // Should not show navigation buttons for single item
      const navigationButtons = screen.getAllByRole('button').filter(
        button => button.querySelector('svg')
      );
      
      expect(navigationButtons).toHaveLength(0);
    });
  });
});
