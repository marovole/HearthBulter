"use client";

import type { ReactNode } from "react";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/sonner";

/**
 * Props for the Providers component
 */
interface ProvidersProps {
  children: ReactNode;
}

/**
 * Global Providers Component
 *
 * Convex 实时能力仅在 `app/dashboard` 与 `app/health-data` 的 layout 中挂载，避免主包体积与初始化成本。
 *
 * @param {ProvidersProps} props - Component props
 * @returns {JSX.Element} Wrapped children with all global providers
 */
export default function Providers({ children }: ProvidersProps): JSX.Element {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      {children}

      <Toaster position="top-right" expand={false} richColors closeButton />
    </ThemeProvider>
  );
}
