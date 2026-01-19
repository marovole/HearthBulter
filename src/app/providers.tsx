"use client";

import type { ReactNode } from "react";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/sonner";
import { ConvexClientProvider } from "@/components/providers/ConvexClientProvider";

/**
 * Props for the Providers component
 */
interface ProvidersProps {
  children: ReactNode;
}

/**
 * Global Providers Component
 *
 * This client component wraps all global context providers to ensure proper
 * initialization during static export and SSR/SSG processes.
 *
 * Providers included:
 * - ThemeProvider: Manages light/dark theme state (from next-themes)
 * - Toaster: Global toast notification system (from sonner)
 *
 * IMPORTANT: This component must be rendered in a client boundary to avoid
 * "Cannot read properties of null (reading 'useContext')" errors during
 * static export for Cloudflare Pages deployment.
 *
 * @param {ProvidersProps} props - Component props
 * @returns {JSX.Element} Wrapped children with all global providers
 */
export default function Providers({ children }: ProvidersProps): JSX.Element {
  return (
    <ConvexClientProvider>
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
      >
        {children}

        {/* Global toast notification system */}
        <Toaster position="top-right" expand={false} richColors closeButton />
      </ThemeProvider>
    </ConvexClientProvider>
  );
}
