import dynamicImport from 'next/dynamic';
import './globals.css';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const Providers = dynamicImport(() => import('./providers'), {
  ssr: false,
  loading: () => null,
});

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
    <html lang="zh-CN" suppressHydrationWarning>
      <body className="font-body antialiased bg-background text-foreground">
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
