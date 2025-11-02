/**
 * TestCard 组件测试
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { TestCard } from '@/components/test/TestCard';

describe('TestCard Component', () => {
  it('should render card with title and content', () => {
    render(
      <TestCard
        title="Test Title"
        content="Test content"
      />
    );

    expect(screen.getByText('Test Title')).toBeInTheDocument();
    expect(screen.getByText('Test content')).toBeInTheDocument();
  });

  it('should handle click events', () => {
    const handleClick = jest.fn();

    render(
      <TestCard
        title="Clickable Card"
        content="Click me"
        onClick={handleClick}
      />
    );

    const card = screen.getByText('Clickable Card').closest('div');
    fireEvent.click(card);

    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('should not handle clicks when disabled', () => {
    const handleClick = jest.fn();

    render(
      <TestCard
        title="Disabled Card"
        content="Cannot click"
        onClick={handleClick}
        disabled={true}
      />
    );

    const card = screen.getByText('Disabled Card').closest('div');
    fireEvent.click(card);

    expect(handleClick).not.toHaveBeenCalled();
  });

  it('should render with different variants', () => {
    const { rerender } = render(
      <TestCard title="Default" content="Default variant" />
    );
    expect(screen.getByText('Default')).toBeInTheDocument();

    rerender(
      <TestCard title="Primary" content="Primary variant" variant="primary" />
    );
    expect(screen.getByText('Primary')).toBeInTheDocument();

    rerender(
      <TestCard title="Secondary" content="Secondary variant" variant="secondary" />
    );
    expect(screen.getByText('Secondary')).toBeInTheDocument();
  });

  it('should have correct CSS classes', () => {
    render(
      <TestCard
        title="Styled Card"
        content="With variant"
        variant="primary"
      />
    );

    const card = screen.getByText('Styled Card').closest('div');
    expect(card).toHaveClass('test-card');
    expect(card).toHaveClass('test-card--primary');
  });

  it('should be accessible', () => {
    render(<TestCard title="Accessible Card" content="Content" />);

    const card = screen.getByText('Accessible Card').closest('div');
    expect(card).toBeInTheDocument();
    expect(card).toHaveAttribute('tabIndex', '0');
  });

  it('should handle keyboard navigation', () => {
    const handleClick = jest.fn();

    render(
      <TestCard
        title="Keyboard Card"
        content="Navigate with keyboard"
        onClick={handleClick}
      />
    );

    const card = screen.getByText('Keyboard Card').closest('div');
    card.focus();
    fireEvent.keyDown(card, { key: 'Enter' });

    expect(handleClick).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(card, { key: ' ' });
    expect(handleClick).toHaveBeenCalledTimes(2);
  });

  it('should have proper disabled styling', () => {
    render(
      <TestCard
        title="Disabled Styled Card"
        content="Should be faded"
        disabled={true}
      />
    );

    const card = screen.getByText('Disabled Styled Card').closest('div');
    expect(card).toHaveStyle('opacity: 0.5');
    expect(card).toHaveStyle('cursor: not-allowed');
  });

  it('should handle long content', () => {
    const longContent = 'This is a very long content that should wrap properly and still be displayed correctly in the card component without any layout issues or overflow problems.';

    render(
      <TestCard
        title="Long Content Card"
        content={longContent}
      />
    );

    expect(screen.getByText('Long Content Card')).toBeInTheDocument();
    expect(screen.getByText(longContent)).toBeInTheDocument();
  });

  it('should render with children as complex content', () => {
    render(
      <TestCard
        title="Complex Card"
        content={
          <div>
            <span>Nested content</span>
            <ul>
              <li>Item 1</li>
              <li>Item 2</li>
            </ul>
          </div>
        }
      />
    );

    expect(screen.getByText('Complex Card')).toBeInTheDocument();
    expect(screen.getByText('Nested content')).toBeInTheDocument();
    expect(screen.getByText('Item 1')).toBeInTheDocument();
    expect(screen.getByText('Item 2')).toBeInTheDocument();
  });

  it('should support custom styling via inline styles', () => {
    render(
      <TestCard
        title="Styled Card"
        content="Custom styles"
        variant="secondary"
      />
    );

    const card = screen.getByText('Styled Card').closest('div');
    expect(card).toHaveStyle({
      padding: '16px',
      border: '1px solid #ccc',
      borderRadius: '8px',
      margin: '8px'
    });
  });

  it('should handle rapid clicks without errors', () => {
    const handleClick = jest.fn();

    render(
      <TestCard
        title="Rapid Click Card"
        content="Click me multiple times"
        onClick={handleClick}
      />
    );

    const card = screen.getByText('Rapid Click Card').closest('div');

    // Rapid fire clicks
    for (let i = 0; i < 10; i++) {
      fireEvent.click(card);
    }

    expect(handleClick).toHaveBeenCalledTimes(10);
  });

  it('should be responsive to prop changes', () => {
    const { rerender } = render(
      <TestCard title="Initial" content="Initial content" />
    );

    expect(screen.getByText('Initial')).toBeInTheDocument();

    rerender(
      <TestCard title="Updated" content="Updated content" variant="primary" />
    );

    expect(screen.getByText('Updated')).toBeInTheDocument();
    expect(screen.queryByText('Initial')).not.toBeInTheDocument();
  });

  it('should preserve component identity during re-renders', () => {
    const { rerender } = render(
      <TestCard title="Identity" content="Test" />
    );

    const initialCard = screen.getByText('Identity').closest('div');

    rerender(
      <TestCard title="Identity" content="Updated content" />
    );

    const updatedCard = screen.getByText('Identity').closest('div');
    expect(initialCard).toBe(updatedCard);
  });

  it('should handle edge cases gracefully', () => {
    render(
      <TestCard
        title=""
        content=""
      />
    );

    const card = screen.getByRole('heading');
    expect(card).toBeInTheDocument();
    expect(card.textContent).toBe('');
  });
});