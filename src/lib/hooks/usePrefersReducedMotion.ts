/**
 * usePrefersReducedMotion Hook
 *
 * Safely detects and tracks the user's `prefers-reduced-motion` system preference.
 *
 * **Features**:
 * - SSR-safe: Returns `false` during server-side rendering to avoid hydration mismatches
 * - Reactive: Automatically updates when user changes system preference
 * - Performance: Single listener per hook instance with automatic cleanup
 * - Browser compatibility: Fallback to legacy `addListener` API for older browsers
 * - TypeScript: Full type safety
 *
 * **Usage**:
 * ```tsx
 * import { usePrefersReducedMotion } from '@/lib/hooks/usePrefersReducedMotion';
 *
 * function MyAnimatedComponent() {
 *   const prefersReducedMotion = usePrefersReducedMotion();
 *
 *   return (
 *     <motion.div
 *       animate={!prefersReducedMotion ? { scale: 1.2, rotate: 45 } : {}}
 *       transition={{ duration: prefersReducedMotion ? 0 : 0.3 }}
 *     >
 *       {content}
 *     </motion.div>
 *   );
 * }
 * ```
 *
 * **Accessibility Best Practices**:
 * - Always respect this setting in motion-heavy components
 * - Provide alternative visual feedback when animations are disabled
 * - Consider using instant transitions (duration: 0) instead of completely removing transitions
 *
 * @returns {boolean} `true` if user prefers reduced motion, `false` otherwise
 */

import { useEffect, useState } from 'react';

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

/**
 * Gets the initial prefers-reduced-motion value safely.
 * Returns `false` during SSR to avoid hydration mismatches.
 */
function getInitialPrefersReducedMotion(): boolean {
  // Guard against SSR and environments without matchMedia
  if (
    typeof window === 'undefined' ||
    typeof window.matchMedia !== 'function'
  ) {
    return false;
  }

  try {
    return window.matchMedia(REDUCED_MOTION_QUERY).matches;
  } catch (error) {
    // Fallback for browsers that don't support matchMedia
    console.warn('[usePrefersReducedMotion] matchMedia not supported:', error);
    return false;
  }
}

export function usePrefersReducedMotion(): boolean {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState<boolean>(
    getInitialPrefersReducedMotion,
  );

  useEffect(() => {
    // Early return for SSR
    if (
      typeof window === 'undefined' ||
      typeof window.matchMedia !== 'function'
    ) {
      return;
    }

    let mediaQueryList: MediaQueryList;

    try {
      mediaQueryList = window.matchMedia(REDUCED_MOTION_QUERY);
    } catch (error) {
      console.warn(
        '[usePrefersReducedMotion] Failed to create media query:',
        error,
      );
      return;
    }

    // Handler for media query changes
    const handleChange = (event: MediaQueryListEvent | MediaQueryList) => {
      setPrefersReducedMotion(event.matches);
    };

    // Sync the latest preference immediately when effect runs
    // This ensures we have the correct value even if it changed during SSR
    setPrefersReducedMotion(mediaQueryList.matches);

    // Modern browsers: addEventListener
    if ('addEventListener' in mediaQueryList) {
      mediaQueryList.addEventListener('change', handleChange);
      return () => {
        mediaQueryList.removeEventListener('change', handleChange);
      };
    }

    // Legacy browsers: addListener (deprecated but still needed for Safari < 14)
    // @ts-expect-error - addListener is deprecated but needed for older browsers
    mediaQueryList.addListener(handleChange);
    return () => {
      // @ts-expect-error - removeListener is deprecated but needed for older browsers
      mediaQueryList.removeListener(handleChange);
    };
  }, []);

  return prefersReducedMotion;
}

/**
 * Alternative hook that returns animation configuration based on reduced motion preference.
 *
 * **Usage**:
 * ```tsx
 * const { shouldAnimate, duration } = useMotionConfig();
 *
 * <motion.div
 *   animate={shouldAnimate ? { x: 100 } : {}}
 *   transition={{ duration }}
 * />
 * ```
 */
export function useMotionConfig() {
  const prefersReducedMotion = usePrefersReducedMotion();

  return {
    shouldAnimate: !prefersReducedMotion,
    duration: prefersReducedMotion ? 0 : 0.3,
    prefersReducedMotion,
  };
}
