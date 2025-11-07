/**
 * Design Tokens for Landing Page UI
 * Centralized animation variants and transitions for Framer Motion
 */

import { Variants } from 'framer-motion';

/**
 * Fade in with upward motion
 * Usage: variants={fadeInUp}
 */
export const fadeInUp: Variants = {
  hidden: { 
    opacity: 0, 
    y: 20, 
  },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: {
      duration: 0.6,
      ease: 'easeOut',
    },
  },
};

/**
 * Simple fade in
 * Usage: variants={fadeIn}
 */
export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { 
    opacity: 1,
    transition: {
      duration: 0.6,
    },
  },
};

/**
 * Scale in animation
 * Usage: variants={scaleIn}
 */
export const scaleIn: Variants = {
  hidden: { 
    scale: 0.9, 
    opacity: 0, 
  },
  visible: { 
    scale: 1, 
    opacity: 1,
    transition: {
      duration: 0.3,
      ease: 'easeOut',
    },
  },
};

/**
 * Container with staggered children
 * Usage: variants={staggerContainer}
 */
export const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
      delayChildren: 0.1,
    },
  },
};

/**
 * Individual stagger item
 * Usage: variants={staggerItem}
 */
export const staggerItem: Variants = {
  hidden: { 
    opacity: 0, 
    y: 20, 
  },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: {
      duration: 0.5,
    },
  },
};

/**
 * Slide in from left
 */
export const slideInLeft: Variants = {
  hidden: { 
    opacity: 0, 
    x: -50, 
  },
  visible: { 
    opacity: 1, 
    x: 0,
    transition: {
      duration: 0.6,
      ease: 'easeOut',
    },
  },
};

/**
 * Slide in from right
 */
export const slideInRight: Variants = {
  hidden: { 
    opacity: 0, 
    x: 50, 
  },
  visible: { 
    opacity: 1, 
    x: 0,
    transition: {
      duration: 0.6,
      ease: 'easeOut',
    },
  },
};

/**
 * Common transition configurations
 */
export const transitions = {
  default: {
    duration: 0.3,
    ease: 'easeInOut',
  },
  smooth: {
    duration: 0.6,
    ease: 'easeOut',
  },
  spring: {
    type: 'spring' as const,
    stiffness: 100,
    damping: 10,
  },
};

/**
 * Typography scale (matching Tailwind config)
 */
export const typography = {
  hero: {
    fontSize: {
      mobile: '2.25rem', // text-4xl
      tablet: '3rem',    // md:text-5xl
      desktop: '3.75rem', // lg:text-6xl
    },
    fontWeight: '800',   // font-extrabold
    lineHeight: '1.1',
  },
  heading: {
    fontSize: {
      mobile: '1.875rem', // text-3xl
      tablet: '2.25rem',  // md:text-4xl
      desktop: '3rem',     // lg:text-5xl
    },
    fontWeight: '700',    // font-bold
    lineHeight: '1.2',
  },
  subheading: {
    fontSize: {
      mobile: '1.5rem',   // text-2xl
      tablet: '1.875rem', // md:text-3xl
      desktop: '2.25rem',  // lg:text-4xl
    },
    fontWeight: '600',    // font-semibold
    lineHeight: '1.3',
  },
  body: {
    fontSize: {
      mobile: '1rem',     // text-base
      tablet: '1.125rem', // md:text-lg
      desktop: '1.125rem', // lg:text-lg
    },
    lineHeight: '1.75',    // leading-relaxed
  },
};

/**
 * Spacing scale
 */
export const spacing = {
  section: {
    mobile: '4rem',    // py-16
    tablet: '6rem',    // md:py-24
    desktop: '8rem',    // lg:py-32
  },
  element: {
    small: '1.5rem',   // space-y-6
    medium: '2rem',    // md:space-y-8
    large: '3rem',      // lg:space-y-12
  },
};

/**
 * Hover transform utilities
 */
export const hoverEffects = {
  lift: {
    scale: 1.02,
    y: -8,
    transition: transitions.smooth,
  },
  glow: {
    boxShadow: '0 0 30px rgba(37, 99, 235, 0.6)',
    transition: transitions.smooth,
  },
  scaleUp: {
    scale: 1.05,
    transition: transitions.default,
  },
};
