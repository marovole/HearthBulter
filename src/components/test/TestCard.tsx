/**
 * 测试卡片组件
 */

import React from 'react';

export interface TestCardProps {
  title: string;
  content: string;
  onClick?: () => void;
  variant?: 'default' | 'primary' | 'secondary';
  disabled?: boolean;
}

export const TestCard: React.FC<TestCardProps> = ({
  title,
  content,
  onClick,
  variant = 'default',
  disabled = false,
}) => {
  return (
    <div
      className={`test-card test-card--${variant}`}
      onClick={disabled ? undefined : onClick}
      onKeyDown={disabled ? undefined : (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick?.();
        }
      }}
      tabIndex={disabled ? -1 : 0}
      style={{
        opacity: disabled ? 0.5 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer',
        padding: '16px',
        border: '1px solid #ccc',
        borderRadius: '8px',
        margin: '8px',
      }}
    >
      <h3>{title}</h3>
      <p>{content}</p>
    </div>
  );
};
