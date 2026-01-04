/**
 * useAnimateOnView Hook
 *
 * Combines Intersection Observer with Framer Motion for scroll-triggered animations.
 * Automatically respects `prefers-reduced-motion` settings for accessibility.
 *
 * **Features**:
 * - Intersection Observer integration via `react-intersection-observer`
 * - Automatic `prefers-reduced-motion` respect
 * - Returns props ready to spread onto Framer Motion components
 * - Reuses shared variants from design-tokens
 * - Configurable thresholds, root margins, and trigger behavior
 * - TypeScript type-safe
 *
 * **Usage**:
 * ```tsx
 * // Basic usage with default fadeInUp animation
 * function FeatureCard() {
 *   const animationProps = useAnimateOnView();
 *
 *   return (
 *     <motion.div {...animationProps}>
 *       Content
 *     </motion.div>
 *   );
 * }
 *
 * // Advanced usage with custom configuration
 * function StatsCounter() {
 *   const animationProps = useAnimateOnView({
 *     threshold: 0.5,
 *     triggerOnce: true,
 *     variants: {
 *       hidden: { opacity: 0, y: 40 },
 *       visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
 *     }
 *   });
 *
 *   return <motion.div {...animationProps}>Stats</motion.div>;
 * }
 *
 * // Using shared variants from design-tokens
 * import { scaleIn } from '@/lib/design-tokens';
 *
 * function ProductCard() {
 *   const animationProps = useAnimateOnView({
 *     variants: scaleIn,
 *     threshold: 0.3
 *   });
 *
 *   return <motion.div {...animationProps}>Product</motion.div>;
 * }
 * ```
 *
 * **Accessibility**:
 * - When `prefers-reduced-motion` is enabled, animations are skipped
 * - Elements render directly in visible state without motion
 * - No performance impact for users who prefer reduced motion
 */

import { useInView } from 'react-intersection-observer';
import { Transition, Variants } from 'framer-motion';
import { useMemo } from 'react';
import { usePrefersReducedMotion } from './usePrefersReducedMotion';
import { fadeInUp } from '../design-tokens';

/**
 * Configuration options for useAnimateOnView hook
 */
export interface UseAnimateOnViewOptions {
  /**
   * Intersection Observer threshold(s).
   * Percentage of the element that must be visible to trigger the animation.
   *
   * @default 0.15 (15% of element visible)
   * @example
   * threshold: 0.5 // Trigger when 50% visible
   * threshold: [0, 0.25, 0.5, 1] // Multiple thresholds
   */
  threshold?: number | number[];

  /**
   * Margin around the root viewport.
   * Use negative values to trigger before element enters viewport,
   * positive values to delay until element is further in.
   *
   * @default '0px'
   * @example
   * rootMargin: '-100px' // Trigger 100px before element enters viewport
   * rootMargin: '0px 0px -100px 0px' // Custom margins (top, right, bottom, left)
   */
  rootMargin?: string;

  /**
   * Whether the animation should only trigger once.
   * If `false`, animation will trigger every time the element enters/exits viewport.
   *
   * @default true
   */
  triggerOnce?: boolean;

  /**
   * Framer Motion variants to use for the animation.
   * Defaults to the shared `fadeInUp` variant from design-tokens.
   *
   * @default fadeInUp
   * @example
   * variants: {
   *   hidden: { opacity: 0, scale: 0.8 },
   *   visible: { opacity: 1, scale: 1 }
   * }
   */
  variants?: Variants;

  /**
   * Override the variant name for the "hidden" state.
   *
   * @default 'hidden'
   */
  initialState?: string;

  /**
   * Override the variant name for the "visible" state.
   *
   * @default 'visible'
   */
  visibleState?: string;

  /**
   * Optional transition override.
   * If omitted, the transition defined in the variants will be used.
   *
   * @example
   * transition: { duration: 0.8, ease: 'easeOut' }
   */
  transition?: Transition;
}

/**
 * Return type for useAnimateOnView hook.
 * These props can be directly spread onto a Framer Motion component.
 */
export interface UseAnimateOnViewReturn {
  /** Ref to attach to the element for Intersection Observer */
  ref: (node?: Element | null) => void;
  /** Framer Motion variants */
  variants: Variants;
  /** Initial animation state */
  initial: string;
  /** Current animation state (based on viewport intersection) */
  animate: string;
  /** Optional transition configuration */
  transition: Transition | undefined;
}

/**
 * Hook that wires Intersection Observer and prefers-reduced-motion
 * into a set of props ready to spread onto a Framer Motion element.
 *
 * @param options - Configuration options
 * @returns Props to spread onto a Framer Motion component
 *
 * @example
 * ```tsx
 * const animationProps = useAnimateOnView();
 * return <motion.div {...animationProps}>Content</motion.div>;
 * ```
 */
export function useAnimateOnView(
  options: UseAnimateOnViewOptions = {},
): UseAnimateOnViewReturn {
  const {
    threshold = 0.15,
    rootMargin = '0px',
    triggerOnce = true,
    variants = fadeInUp,
    initialState = 'hidden',
    visibleState = 'visible',
    transition,
  } = options;

  const prefersReducedMotion = usePrefersReducedMotion();
  const { ref, inView } = useInView({
    threshold,
    rootMargin,
    triggerOnce,
  });

  // Memoize animation state to avoid unnecessary re-renders
  const animationState = useMemo(() => {
    // If user prefers reduced motion, skip animation entirely
    // Render directly in visible state
    if (prefersReducedMotion) {
      return {
        initial: visibleState,
        animate: visibleState,
        transition: undefined,
      };
    }

    // Normal animation: transition from hidden to visible when in view
    return {
      initial: initialState,
      animate: inView ? visibleState : initialState,
      transition,
    };
  }, [initialState, inView, prefersReducedMotion, transition, visibleState]);

  return {
    ref,
    variants,
    initial: animationState.initial,
    animate: animationState.animate,
    transition: animationState.transition,
  } as const;
}

/**
 * Simplified hook for common use cases.
 * Provides sensible defaults for most scroll-triggered animations.
 *
 * @example
 * ```tsx
 * const animationProps = useScrollAnimation();
 * return <motion.div {...animationProps}>Content</motion.div>;
 * ```
 */
export function useScrollAnimation() {
  return useAnimateOnView({
    threshold: 0.15,
    triggerOnce: true,
    variants: fadeInUp,
  });
}
