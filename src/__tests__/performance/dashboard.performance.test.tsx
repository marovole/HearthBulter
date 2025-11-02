/**
 * Dashboard Performance Tests
 * 仪表盘性能测试
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { performance } from 'perf_hooks';

// Mock components for performance testing
const MockHeavyComponent = ({ dataCount }: { dataCount: number }) => {
  const data = Array.from({ length: dataCount }, (_, i) => ({
    id: i,
    value: Math.random() * 100,
    date: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString(),
  }));

  return (
    <div data-testid="heavy-component">
      {data.map(item => (
        <div key={item.id} data-testid={`item-${item.id}`}>
          {item.value.toFixed(2)}
        </div>
      ))}
    </div>
  );
};

describe('Dashboard Performance Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders large datasets efficiently', async () => {
    const startTime = performance.now();
    
    render(<MockHeavyComponent dataCount={1000} />);
    
    const endTime = performance.now();
    const renderTime = endTime - startTime;

    // Render should complete within reasonable time (less than 100ms for 1000 items)
    expect(renderTime).toBeLessThan(100);

    await waitFor(() => {
      expect(screen.getByTestId('heavy-component')).toBeInTheDocument();
    });

    // All items should be rendered
    expect(screen.getAllByTestId(/^item-/)).toHaveLength(1000);
  });

  it('handles memory usage properly', async () => {
    const initialMemory = (performance as any).memory?.usedJSHeapSize || 0;

    // Render and unrender multiple times
    for (let i = 0; i < 10; i++) {
      const { unmount } = render(<MockHeavyComponent dataCount={500} />);
      
      await waitFor(() => {
        expect(screen.getByTestId('heavy-component')).toBeInTheDocument();
      });
      
      unmount();
    }

    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }

    const finalMemory = (performance as any).memory?.usedJSHeapSize || 0;
    const memoryIncrease = finalMemory - initialMemory;

    // Memory increase should be minimal (less than 10MB)
    expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024);
  });

  it('performs well with concurrent updates', async () => {
    const startTime = performance.now();
    
    // Simulate concurrent data updates
    const promises = Array.from({ length: 5 }, (_, i) =>
      new Promise<void>(resolve => {
        setTimeout(() => {
          render(<MockHeavyComponent dataCount={200} />);
          resolve();
        }, i * 10);
      })
    );

    await Promise.all(promises);

    const endTime = performance.now();
    const totalTime = endTime - startTime;

    // Concurrent updates should complete efficiently
    expect(totalTime).toBeLessThan(200);
  });

  it('optimizes re-renders with memoization', async () => {
    let renderCount = 0;

    const MemoizedComponent = React.memo(({ data }: { data: any[] }) => {
      renderCount++;
      return <div data-testid="memoized-component">{data.length} items</div>;
    });

    const data = Array.from({ length: 100 }, (_, i) => ({ id: i, value: i }));

    const { rerender } = render(<MemoizedComponent data={data} />);

    await waitFor(() => {
      expect(screen.getByTestId('memoized-component')).toBeInTheDocument();
    });

    const initialRenderCount = renderCount;

    // Re-render with same data
    rerender(<MemoizedComponent data={data} />);

    // Should not re-render due to memoization
    expect(renderCount).toBe(initialRenderCount);

    // Re-render with different data
    const newData = [...data, { id: 100, value: 100 }];
    rerender(<MemoizedComponent data={newData} />);

    // Should re-render once
    expect(renderCount).toBe(initialRenderCount + 1);
  });

  it('handles large chart data efficiently', async () => {
    // Mock chart data optimization
    const optimizeChartData = (data: any[], maxPoints: number) => {
      if (data.length <= maxPoints) return data;
      
      const step = Math.ceil(data.length / maxPoints);
      const optimized = [];
      
      for (let i = 0; i < data.length; i += step) {
        optimized.push(data[i]);
      }
      
      return optimized;
    };

    const largeData = Array.from({ length: 10000 }, (_, i) => ({
      x: i,
      y: Math.sin(i * 0.1) * 100 + Math.random() * 10,
    }));

    const startTime = performance.now();
    
    const optimizedData = optimizeChartData(largeData, 1000);
    
    const endTime = performance.now();
    const optimizationTime = endTime - startTime;

    // Optimization should be fast
    expect(optimizationTime).toBeLessThan(10);
    expect(optimizedData.length).toBeLessThanOrEqual(1000);
  });

  it('maintains smooth scrolling with virtualization', async () => {
    // Mock virtual list implementation
    const VirtualList = ({ items, itemHeight, containerHeight }: any) => {
      const [scrollTop, setScrollTop] = React.useState(0);
      
      const startIndex = Math.floor(scrollTop / itemHeight);
      const endIndex = Math.min(
        startIndex + Math.ceil(containerHeight / itemHeight) + 1,
        items.length
      );
      
      const visibleItems = items.slice(startIndex, endIndex);
      
      return (
        <div
          data-testid="virtual-list"
          style={{ height: containerHeight, overflow: 'auto' }}
          onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
        >
          <div style={{ height: items.length * itemHeight, position: 'relative' }}>
            {visibleItems.map((item: any, index: number) => (
              <div
                key={item.id}
                data-testid={`virtual-item-${item.id}`}
                style={{
                  position: 'absolute',
                  top: (startIndex + index) * itemHeight,
                  height: itemHeight,
                }}
              >
                {item.value}
              </div>
            ))}
          </div>
        </div>
      );
    };

    const largeItems = Array.from({ length: 10000 }, (_, i) => ({
      id: i,
      value: `Item ${i}`,
    }));

    const startTime = performance.now();
    
    render(
      <VirtualList 
        items={largeItems} 
        itemHeight={40} 
        containerHeight={400} 
      />
    );
    
    const endTime = performance.now();
    const renderTime = endTime - startTime;

    // Virtual list should render quickly
    expect(renderTime).toBeLessThan(50);

    await waitFor(() => {
      expect(screen.getByTestId('virtual-list')).toBeInTheDocument();
    });

    // Should only render visible items
    expect(screen.getAllByTestId(/^virtual-item-/).length).toBeLessThan(20);
  });

  it('optimizes API calls with debouncing', async () => {
    const mockApiCall = jest.fn().mockResolvedValue({ data: [] });
    
    // Mock debounce implementation
    const debounce = (func: Function, delay: number) => {
      let timeoutId: NodeJS.Timeout;
      return (...args: any[]) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => func(...args), delay);
      };
    };

    const debouncedApiCall = debounce(mockApiCall, 100);

    // Make multiple rapid calls
    debouncedApiCall('test1');
    debouncedApiCall('test2');
    debouncedApiCall('test3');

    // Wait for debounce
    await new Promise(resolve => setTimeout(resolve, 150));

    // Should only call API once
    expect(mockApiCall).toHaveBeenCalledTimes(1);
    expect(mockApiCall).toHaveBeenCalledWith('test3');
  });

  it('measures component performance correctly', async () => {
    const performanceMetrics: Array<{ componentName: string; renderTime: number }> = [];

    const withPerformanceMeasurement = (WrappedComponent: React.ComponentType<any>, name: string) => {
      return (props: any) => {
        const startTime = performance.now();
        const result = <WrappedComponent {...props} />;
        const endTime = performance.now();
        
        performanceMetrics.push({
          componentName: name,
          renderTime: endTime - startTime,
        });
        
        return result;
      };
    };

    const TestComponent = () => <div data-testid="test-component">Test</div>;
    const MeasuredComponent = withPerformanceMeasurement(TestComponent, 'TestComponent');

    render(<MeasuredComponent />);

    await waitFor(() => {
      expect(screen.getByTestId('test-component')).toBeInTheDocument();
    });

    const metric = performanceMetrics.find(m => m.componentName === 'TestComponent');
    expect(metric).toBeDefined();
    expect(metric!.renderTime).toBeGreaterThan(0);
  });
});
