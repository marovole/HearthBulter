import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { HealthMetricsChart } from '../../components/dashboard/HealthMetricsChart';

// Mock the API calls
const mockFetch = global.fetch as jest.Mock;

describe('HealthMetricsChart', () => {
  const defaultProps = {
    memberId: 'test-member-1',
    days: 30,
  };

  beforeEach(() => {
    mockFetch.mockClear();
  });

  it('renders loading state initially', () => {
    mockFetch.mockImplementationOnce(() => new Promise(() => {})); // Never resolves

    render(<HealthMetricsChart {...defaultProps} />);
    
    expect(screen.getByText('加载健康数据中...')).toBeInTheDocument();
  });

  it('renders error state when API fails', async () => {
    mockFetch.mockRejectedValueOnce(new Error('API Error'));

    render(<HealthMetricsChart {...defaultProps} />);
    
    await waitFor(() => {
      expect(screen.getByText('API Error')).toBeInTheDocument();
    });
  });

  it('renders chart with data on successful API call', async () => {
    const mockData = {
      data: [
        {
          date: '2024-01-01',
          weight: 70.5,
          bodyFat: 18.5,
          bloodPressure: { systolic: 120, diastolic: 80 },
          heartRate: 72,
        },
        {
          date: '2024-01-02',
          weight: 70.3,
          bodyFat: 18.3,
          bloodPressure: { systolic: 118, diastolic: 78 },
          heartRate: 70,
        },
      ],
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockData,
    });

    render(<HealthMetricsChart {...defaultProps} />);
    
    await waitFor(() => {
      expect(screen.getByText('健康数据趋势')).toBeInTheDocument();
    });
    
    expect(screen.getByText('体重')).toBeInTheDocument();
    expect(screen.getByText('体脂率')).toBeInTheDocument();
    expect(screen.getByText('血压')).toBeInTheDocument();
    expect(screen.getByText('心率')).toBeInTheDocument();
  });

  it('switches between different metrics', async () => {
    const mockData = {
      data: [
        {
          date: '2024-01-01',
          weight: 70.5,
          bodyFat: 18.5,
          bloodPressure: { systolic: 120, diastolic: 80 },
          heartRate: 72,
        },
      ],
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockData,
    });

    render(<HealthMetricsChart {...defaultProps} />);
    
    await waitFor(() => {
      expect(screen.getByText('健康数据趋势')).toBeInTheDocument();
    });
    
    // Click on body fat metric
    const bodyFatButton = screen.getByText('体脂率');
    fireEvent.click(bodyFatButton);
    
    // Verify the metric is selected (button should have active styling)
    expect(bodyFatButton.closest('button')).toHaveClass('bg-blue-100');
  });

  it('displays correct statistics for selected metric', async () => {
    const mockData = {
      data: [
        {
          date: '2024-01-01',
          weight: 70.5,
          bodyFat: 18.5,
          bloodPressure: { systolic: 120, diastolic: 80 },
          heartRate: 72,
        },
        {
          date: '2024-01-02',
          weight: 69.5,
          bodyFat: 18.0,
          bloodPressure: { systolic: 118, diastolic: 78 },
          heartRate: 70,
        },
      ],
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockData,
    });

    render(<HealthMetricsChart {...defaultProps} />);
    
    await waitFor(() => {
      expect(screen.getByText('健康数据趋势')).toBeInTheDocument();
    });
    
    // Check if statistics are displayed
    expect(screen.getByText('当前值')).toBeInTheDocument();
    expect(screen.getByText('平均值')).toBeInTheDocument();
    expect(screen.getByText('变化')).toBeInTheDocument();
  });

  it('shows empty state when no data is available', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: [] }),
    });

    render(<HealthMetricsChart {...defaultProps} />);
    
    await waitFor(() => {
      expect(screen.getByText('暂无健康数据')).toBeInTheDocument();
    });
  });

  it('calls API with correct parameters', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: [] }),
    });

    render(<HealthMetricsChart {...defaultProps} />);
    
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/dashboard/health-metrics?memberId=test-member-1&days=30'
      );
    });
  });

  it('handles different day ranges', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: [] }),
    });

    render(<HealthMetricsChart {...defaultProps} days={7} />);
    
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/dashboard/health-metrics?memberId=test-member-1&days=7'
      );
    });
  });

  it('displays health advice based on selected metric', async () => {
    const mockData = {
      data: [
        {
          date: '2024-01-01',
          weight: 70.5,
          bodyFat: 18.5,
          bloodPressure: { systolic: 120, diastolic: 80 },
          heartRate: 72,
        },
      ],
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockData,
    });

    render(<HealthMetricsChart {...defaultProps} />);
    
    await waitFor(() => {
      expect(screen.getByText('健康建议')).toBeInTheDocument();
    });
    
    // Check if advice is displayed
    expect(screen.getByText(/您的体重趋势/)).toBeInTheDocument();
  });
});
