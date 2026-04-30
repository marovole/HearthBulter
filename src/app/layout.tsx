import dynamicImport from "next/dynamic";
import { ClerkProvider } from "@clerk/nextjs";
import { rootFontVariableClassName } from "@/lib/fonts";
import "./globals.css";

/**
 * 根布局为默认静态渲染（已移除 `force-dynamic` / `revalidate: 0`）。
 * 部署后请验证：Clerk 会话、OpenNext/Cloudflare 生产构建、中间件保护路由、已登录用户访问 `/` 跳转 `/dashboard`。
 */

const Providers = dynamicImport(() => import("./providers"), {
  ssr: false,
  loading: () => null,
});

const FloatingAIAssistant = dynamicImport(
  () => import("@/components/features/ai-assistant/FloatingAIAssistant"),
  { ssr: false }
);

export const metadata = {
  title: "Health Butler - 健康管家",
  description: "基于健康数据与电商库存的动态饮食引擎",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="zh-CN" suppressHydrationWarning className={rootFontVariableClassName}>
        <body className="bg-background font-body text-foreground antialiased">
          <Providers>{children}</Providers>
          <FloatingAIAssistant />
        </body>
      </html>
    </ClerkProvider>
  );
}
