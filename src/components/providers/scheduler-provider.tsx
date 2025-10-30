/**
 * 调度器提供者组件
 * 在服务端启动定时任务调度器
 */

'use client';

import { useEffect } from 'react';

export function SchedulerProvider() {
  useEffect(() => {
    // 在客户端组件中，我们不启动调度器
    // 调度器应该在服务端启动
    // 这个组件主要用于保持一致性
  }, []);

  return null;
}
