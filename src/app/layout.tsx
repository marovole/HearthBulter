import dynamic from 'next/dynamic';
import './globals.css';
import { Inter } from 'next/font/google';
// import { startScheduler } from '@/lib/services/scheduler/startup';

// Dynamically import Providers with SSR disabled to prevent Context prerender errors
const Providers = dynamic(() => import('./providers'), {
  ssr: false,
});

// 临时禁用调度器以隔离问题
// // 启动调度器（仅在服务端执行）
// if (typeof window === 'undefined') {
//   startScheduler().catch(console.error);
// }

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'Health Butler - 健康管家',
  description: '基于健康数据与电商库存的动态饮食引擎',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-CN">
      <body className={inter.className}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
