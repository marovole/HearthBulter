'use client';

import type { ReactNode } from 'react';
import { SessionProvider as NextAuthSessionProvider } from 'next-auth/react';
import { ThemeProvider } from 'next-themes';
import { Toaster } from '@/components/ui/sonner';

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
 * - SessionProvider: Manages authentication session state (from next-auth)
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
    <ThemeProvider
      attribute='class'
      defaultTheme='system'
      enableSystem
      disableTransitionOnChange
    >
      <NextAuthSessionProvider
        // Enable session refresh on window focus for better UX
        refetchOnWindowFocus={true}
        // Refetch session every 5 minutes to keep it fresh
        refetchInterval={5 * 60}
      >
        {children}

        {/* Global toast notification system */}
        <Toaster position='top-right' expand={false} richColors closeButton />
      </NextAuthSessionProvider>
    </ThemeProvider>
  );
}
