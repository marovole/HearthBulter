import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { FamilyMembersCard } from '../../components/dashboard/FamilyMembersCard';

// Mock the API calls
const mockFetch = global.fetch as jest.Mock;

describe('FamilyMembersCard', () => {
  const mockMembers = [
    {
      id: 'member-1',
      name: '张三',
      email: 'zhangsan@example.com',
      role: 'admin',
      avatar: null,
      healthGoals: ['减重'],
      allergies: ['花生'],
      joinedAt: '2024-01-01',
      isActive: true,
    },
    {
      id: 'member-2',
      name: '李四',
      email: 'lisi@example.com',
      role: 'member',
      avatar: null,
      healthGoals: ['增肌'],
      allergies: [],
      joinedAt: '2024-01-15',
      isActive: true,
    },
  ];

  const defaultProps = {
    members: mockMembers,
    currentMemberId: 'member-1',
    onMemberSelect: jest.fn(),
  };

  beforeEach(() => {
    mockFetch.mockClear();
    jest.clearAllMocks();
  });

  it('renders loading state initially', () => {
    mockFetch.mockImplementationOnce(() => new Promise(() => {})); // Never resolves

    render(<FamilyMembersCard {...defaultProps} />);

    expect(screen.getByText('加载家庭成员中...')).toBeInTheDocument();
  });

  it('renders error state when API fails', async () => {
    mockFetch.mockRejectedValueOnce(new Error('API Error'));

    render(<FamilyMembersCard {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('API Error')).toBeInTheDocument();
    });
  });

  it('renders family members list on successful API call', async () => {
    const mockMembers = {
      data: [
        {
          id: '1',
          name: '张爸爸',
          email: 'dad@example.com',
          role: 'admin',
          healthScore: 85,
          lastActive: new Date(),
          goals: ['减重5kg', '血压控制'],
          allergies: ['花生'],
        },
        {
          id: '2',
          name: '李妈妈',
          email: 'mom@example.com',
          role: 'member',
          healthScore: 88,
          lastActive: new Date(),
          goals: ['改善睡眠'],
          allergies: [],
        },
      ],
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockMembers,
    });

    render(<FamilyMembersCard {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('家庭成员')).toBeInTheDocument();
    });

    expect(screen.getByText('张爸爸')).toBeInTheDocument();
    expect(screen.getByText('李妈妈')).toBeInTheDocument();
    expect(screen.getByText('85')).toBeInTheDocument();
    expect(screen.getByText('88')).toBeInTheDocument();
  });

  it('switches between grid and list views', async () => {
    const mockMembers = {
      data: [
        {
          id: '1',
          name: '张爸爸',
          email: 'dad@example.com',
          role: 'admin',
          healthScore: 85,
          lastActive: new Date(),
          goals: [],
          allergies: [],
        },
      ],
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockMembers,
    });

    render(<FamilyMembersCard {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('家庭成员')).toBeInTheDocument();
    });

    // Find and click the list view button
    const listViewButton = screen.getByLabelText('列表视图');
    fireEvent.click(listViewButton);

    // Verify the view changed (list view should have different layout)
    expect(screen.getByText('张爸爸')).toBeInTheDocument();
  });

  it('calls onMemberSelect when a member is clicked', async () => {
    const mockMembers = {
      data: [
        {
          id: '1',
          name: '张爸爸',
          email: 'dad@example.com',
          role: 'admin',
          healthScore: 85,
          lastActive: new Date(),
          goals: [],
          allergies: [],
        },
      ],
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockMembers,
    });

    render(<FamilyMembersCard {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('张爸爸')).toBeInTheDocument();
    });

    // Click on the member card
    const memberCard = screen.getByText('张爸爸').closest('div');
    fireEvent.click(memberCard!);

    expect(defaultProps.onMemberSelect).toHaveBeenCalledWith('1');
  });

  it('displays member role badges correctly', async () => {
    const mockMembers = {
      data: [
        {
          id: '1',
          name: '张爸爸',
          email: 'dad@example.com',
          role: 'admin',
          healthScore: 85,
          lastActive: new Date(),
          goals: [],
          allergies: [],
        },
        {
          id: '2',
          name: '小明',
          role: 'child',
          healthScore: 78,
          lastActive: new Date(),
          goals: [],
          allergies: [],
        },
      ],
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockMembers,
    });

    render(<FamilyMembersCard {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('管理员')).toBeInTheDocument();
      expect(screen.getByText('儿童')).toBeInTheDocument();
    });
  });

  it('displays member goals and allergies', async () => {
    const mockMembers = {
      data: [
        {
          id: '1',
          name: '张爸爸',
          email: 'dad@example.com',
          role: 'admin',
          healthScore: 85,
          lastActive: new Date(),
          goals: ['减重5kg', '血压控制'],
          allergies: ['花生', '海鲜'],
        },
      ],
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockMembers,
    });

    render(<FamilyMembersCard {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('减重5kg')).toBeInTheDocument();
      expect(screen.getByText('血压控制')).toBeInTheDocument();
      expect(screen.getByText('花生')).toBeInTheDocument();
      expect(screen.getByText('海鲜')).toBeInTheDocument();
    });
  });

  it('shows empty state when no members exist', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: [] }),
    });

    render(<FamilyMembersCard {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('暂无家庭成员')).toBeInTheDocument();
    });
  });

  it('displays family statistics', async () => {
    const mockMembers = {
      data: [
        {
          id: '1',
          name: '张爸爸',
          role: 'admin',
          healthScore: 85,
          lastActive: new Date(),
          goals: [],
          allergies: [],
        },
        {
          id: '2',
          name: '李妈妈',
          role: 'member',
          healthScore: 88,
          lastActive: new Date(),
          goals: [],
          allergies: [],
        },
      ],
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockMembers,
    });

    render(<FamilyMembersCard {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('家庭统计')).toBeInTheDocument();
    });

    expect(screen.getByText('2')).toBeInTheDocument(); // Total members
    expect(screen.getByText('86.5')).toBeInTheDocument(); // Average health score
  });

  it('handles member filtering', async () => {
    const mockMembers = {
      data: [
        {
          id: '1',
          name: '张爸爸',
          role: 'admin',
          healthScore: 85,
          lastActive: new Date(),
          goals: [],
          allergies: [],
        },
        {
          id: '2',
          name: '李妈妈',
          role: 'member',
          healthScore: 88,
          lastActive: new Date(),
          goals: [],
          allergies: [],
        },
      ],
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockMembers,
    });

    render(<FamilyMembersCard {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('张爸爸')).toBeInTheDocument();
      expect(screen.getByText('李妈妈')).toBeInTheDocument();
    });

    // Type in search box
    const searchInput = screen.getByPlaceholderText('搜索成员...');
    fireEvent.change(searchInput, { target: { value: '张爸爸' } });

    // Should only show 张爸爸
    expect(screen.getByText('张爸爸')).toBeInTheDocument();
    expect(screen.queryByText('李妈妈')).not.toBeInTheDocument();
  });

  it('calls API with correct parameters', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: [] }),
    });

    render(<FamilyMembersCard {...defaultProps} />);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/dashboard/family-members?familyId=test-family-1',
      );
    });
  });
});
