/**
 * Animation Hooks - Unified Export
 *
 * Centralized export for all animation-related hooks used across the landing page
 * and other interactive components.
 *
 * **Available Hooks**:
 * - `usePrefersReducedMotion` - Detects user's motion preference
 * - `useMotionConfig` - Returns animation configuration based on motion preference
 * - `useAnimateOnView` - Scroll-triggered animations with Intersection Observer
 * - `useScrollAnimation` - Simplified scroll animation with sensible defaults
 *
 * **Usage**:
 * ```tsx
 * import {
 *   usePrefersReducedMotion,
 *   useAnimateOnView,
 *   useScrollAnimation
 * } from '@/lib/hooks';
 * ```
 */

// Motion preference hooks
export {
  usePrefersReducedMotion,
  useMotionConfig,
} from './usePrefersReducedMotion';

// Scroll animation hooks
export {
  useAnimateOnView,
  useScrollAnimation,
  type UseAnimateOnViewOptions,
  type UseAnimateOnViewReturn,
} from './useAnimateOnView';
