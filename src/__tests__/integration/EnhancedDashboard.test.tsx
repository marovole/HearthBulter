import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { EnhancedDashboard } from '../../components/dashboard/EnhancedDashboard';

// Mock the API calls
const mockFetch = global.fetch as jest.Mock;

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
      back: jest.fn(),
      forward: jest.fn(),
      refresh: jest.fn(),
    };
  },
  useSearchParams() {
    return new URLSearchParams();
  },
  usePathname() {
    return '/dashboard';
  },
}));

describe('EnhancedDashboard Integration Tests', () => {
  const mockFamilyId = 'test-family-1';
  const mockMemberId = 'test-member-1';

  beforeEach(() => {
    mockFetch.mockClear();
    
    // Setup default mock responses
    mockFetch.mockImplementation((url) => {
      if (url.includes('/family-members')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            data: [
              {
                id: mockMemberId,
                name: '张爸爸',
                email: 'dad@example.com',
                role: 'admin',
                healthScore: 85,
                lastActive: new Date(),
                goals: ['减重5kg'],
                allergies: [],
              },
            ],
          }),
        });
      }
      
      if (url.includes('/health-metrics')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            data: [
              {
                date: '2024-01-01',
                weight: 70.5,
                bodyFat: 18.5,
                bloodPressure: { systolic: 120, diastolic: 80 },
                heartRate: 72,
              },
            ],
          }),
        });
      }
      
      if (url.includes('/health-score')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            data: {
              score: 85,
              breakdown: {
                exercise: 88,
                nutrition: 82,
                sleep: 79,
                stress: 91,
              },
              recommendations: ['增加运动量', '改善睡眠质量'],
            },
          }),
        });
      }
      
      if (url.includes('/nutrition-trends')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            data: [
              {
                date: '2024-01-01',
                calories: 2000,
                protein: 80,
                carbs: 250,
                fat: 65,
              },
            ],
          }),
        });
      }
      
      if (url.includes('/overview-cards')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            data: {
              currentWeight: 70.5,
              weightChange: -0.5,
              currentBodyFat: 18.5,
              bodyFatChange: -0.3,
              avgBloodPressure: { systolic: 120, diastolic: 80 },
              avgHeartRate: 72,
            },
          }),
        });
      }
      
      if (url.includes('/weight-trend')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            data: {
              trend: [
                { date: '2024-01-01', weight: 71.0 },
                { date: '2024-01-02', weight: 70.5 },
              ],
              change: -0.5,
              changePercent: -0.7,
            },
          }),
        });
      }
      
      return Promise.resolve({
        ok: true,
        json: async () => ({ data: {} }),
      });
    });
  });

  it('renders complete dashboard with all components', async () => {
    render(<EnhancedDashboard familyId={mockFamilyId} />);
    
    // Wait for all components to load
    await waitFor(() => {
      expect(screen.getByText('健康数据趋势')).toBeInTheDocument();
    });
    
    await waitFor(() => {
      expect(screen.getByText('家庭成员')).toBeInTheDocument();
    });
    
    await waitFor(() => {
      expect(screen.getByText('营养趋势')).toBeInTheDocument();
    });
    
    await waitFor(() => {
      expect(screen.getByText('健康评分')).toBeInTheDocument();
    });
    
    await waitFor(() => {
      expect(screen.getByText('快速操作')).toBeInTheDocument();
    });
    
    await waitFor(() => {
      expect(screen.getByText('健康洞察')).toBeInTheDocument();
    });
  });

  it('handles member selection across all components', async () => {
    render(<EnhancedDashboard familyId={mockFamilyId} />);
    
    await waitFor(() => {
      expect(screen.getByText('张爸爸')).toBeInTheDocument();
    });
    
    // Click on family member
    const memberCard = screen.getByText('张爸爸').closest('div');
    fireEvent.click(memberCard!);
    
    // Verify that health metrics are updated for selected member
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining(`/api/dashboard/health-metrics?memberId=${mockMemberId}`)
      );
    });
  });

  it('displays health data correctly across components', async () => {
    render(<EnhancedDashboard familyId={mockFamilyId} />);
    
    await waitFor(() => {
      expect(screen.getByText('70.5')).toBeInTheDocument(); // Weight
    });
    
    await waitFor(() => {
      expect(screen.getByText('85')).toBeInTheDocument(); // Health score
    });
    
    await waitFor(() => {
      expect(screen.getByText('张爸爸')).toBeInTheDocument(); // Member name
    });
  });

  it('handles time range selection', async () => {
    render(<EnhancedDashboard familyId={mockFamilyId} />);
    
    await waitFor(() => {
      expect(screen.getByText('健康数据趋势')).toBeInTheDocument();
    });
    
    // Find and click time range selector
    const timeRangeButton = screen.getByText('30天');
    fireEvent.click(timeRangeButton);
    
    // Check if API is called with new time range
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('days=30')
      );
    });
  });

  it('displays error states gracefully', async () => {
    // Mock API failure
    mockFetch.mockRejectedValueOnce(new Error('Network Error'));
    
    render(<EnhancedDashboard familyId={mockFamilyId} />);
    
    await waitFor(() => {
      expect(screen.getByText('Network Error')).toBeInTheDocument();
    });
  });

  it('handles loading states across all components', async () => {
    // Mock slow API responses
    mockFetch.mockImplementation(() => new Promise(() => {}));
    
    render(<EnhancedDashboard familyId={mockFamilyId} />);
    
    // Should show loading states
    expect(screen.getByText('加载健康数据中...')).toBeInTheDocument();
    expect(screen.getByText('加载家庭成员中...')).toBeInTheDocument();
  });

  it('integrates quick actions with dashboard functionality', async () => {
    render(<EnhancedDashboard familyId={mockFamilyId} />);
    
    await waitFor(() => {
      expect(screen.getByText('快速操作')).toBeInTheDocument();
    });
    
    // Test quick action buttons
    const recordWeightButton = screen.getByText('记录体重');
    fireEvent.click(recordWeightButton);
    
    // Should trigger appropriate action (mocked)
    expect(recordWeightButton).toBeInTheDocument();
  });

  it('displays health insights based on data', async () => {
    render(<EnhancedDashboard familyId={mockFamilyId} />);
    
    await waitFor(() => {
      expect(screen.getByText('健康洞察')).toBeInTheDocument();
    });
    
    // Should display insights based on health data
    await waitFor(() => {
      expect(screen.getByText(/增加运动量/)).toBeInTheDocument();
    });
  });

  it('handles responsive layout changes', async () => {
    // Mock mobile viewport
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 375,
    });
    
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: 667,
    });
    
    render(<EnhancedDashboard familyId={mockFamilyId} />);
    
    await waitFor(() => {
      expect(screen.getByText('健康数据趋势')).toBeInTheDocument();
    });
    
    // Should render mobile-friendly layout
    const dashboard = screen.getByTestId('dashboard') || screen.getByText('健康数据趋势').closest('div');
    expect(dashboard).toBeInTheDocument();
  });

  it('maintains data consistency across components', async () => {
    render(<EnhancedDashboard familyId={mockFamilyId} />);
    
    await waitFor(() => {
      expect(screen.getByText('85')).toBeInTheDocument();
    });
    
    // Health score should be consistent across different components
    const healthScoreElements = screen.getAllByText('85');
    expect(healthScoreElements.length).toBeGreaterThan(0);
  });

  it('handles component interactions correctly', async () => {
    render(<EnhancedDashboard familyId={mockFamilyId} />);
    
    await waitFor(() => {
      expect(screen.getByText('健康数据趋势')).toBeInTheDocument();
    });
    
    // Test metric selection in health chart
    const bodyFatButton = screen.getByText('体脂率');
    fireEvent.click(bodyFatButton);
    
    // Should update chart display
    expect(bodyFatButton.closest('button')).toHaveClass('bg-blue-100');
  });

  it('calls all necessary APIs on component mount', async () => {
    render(<EnhancedDashboard familyId={mockFamilyId} />);
    
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        `/api/dashboard/family-members?familyId=${mockFamilyId}`
      );
    });
    
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/health-metrics')
    );
    
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/health-score')
    );
    
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/nutrition-trends')
    );
  });

  it('handles empty data states gracefully', async () => {
    // Mock empty responses
    mockFetch.mockImplementation((url) => {
      if (url.includes('/family-members')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ data: [] }),
        });
      }
      
      return Promise.resolve({
        ok: true,
        json: async () => ({ data: [] }),
      });
    });
    
    render(<EnhancedDashboard familyId={mockFamilyId} />);
    
    await waitFor(() => {
      expect(screen.getByText('暂无家庭成员')).toBeInTheDocument();
    });
  });
});
