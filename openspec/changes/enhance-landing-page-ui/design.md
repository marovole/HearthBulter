# Design: Enhance Landing Page UI

## Architecture Overview

```
┌────────────────────────────────────────────────────────┐
│                    Landing Page (/)                     │
│                                                         │
│  ┌──────────────────────────────────────────────────┐ │
│  │  Hero Section                                     │ │
│  │  - Animated headline with gradient text          │ │
│  │  - Subtitle with fade-in animation               │ │
│  │  - CTA buttons with hover effects                │ │
│  │  - Social proof stats (scroll counter)           │ │
│  └──────────────────────────────────────────────────┘ │
│                                                         │
│  ┌──────────────────────────────────────────────────┐ │
│  │  Features Section                                 │ │
│  │  - 3 Feature cards with glassmorphism             │ │
│  │  - Animated icons (Framer Motion)                │ │
│  │  - Stagger animation on scroll                   │ │
│  │  - Hover effects (lift + shadow)                 │ │
│  └──────────────────────────────────────────────────┘ │
│                                                         │
│  ┌──────────────────────────────────────────────────┐ │
│  │  Stats Section (NEW)                              │ │
│  │  - Number counter animation                       │ │
│  │  - Grid layout: Users | Recipes | Satisfaction   │ │
│  └──────────────────────────────────────────────────┘ │
│                                                         │
│  ┌──────────────────────────────────────────────────┐ │
│  │  Testimonials Carousel (NEW)                      │ │
│  │  - Auto-play carousel                             │ │
│  │  - User avatars + ratings                        │ │
│  └──────────────────────────────────────────────────┘ │
│                                                         │
│  ┌──────────────────────────────────────────────────┐ │
│  │  CTA Section                                      │ │
│  │  - Final call-to-action                          │ │
│  │  - Secondary CTA (watch demo)                    │ │
│  └──────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────┘
```

## Design System

### Color Palette

```typescript
// tailwind.config.ts extensions
theme: {
  extend: {
    colors: {
      brand: {
        blue: '#2563EB',     // Primary CTA
        green: '#10B981',    // Health/Success
        orange: '#F59E0B',   // Accent/Hover
        purple: '#8B5CF6',   // Secondary actions
      }
    },
    backgroundImage: {
      'hero-gradient': 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      'feature-gradient': 'linear-gradient(to right, #4facfe 0%, #00f2fe 100%)',
    }
  }
}
```

### Typography Scale

```
h1: text-5xl md:text-6xl lg:text-7xl font-extrabold
h2: text-3xl md:text-4xl lg:text-5xl font-bold
h3: text-2xl md:text-3xl font-semibold
p:  text-base md:text-lg leading-relaxed
```

### Spacing System

```
Section padding: py-16 md:py-24 lg:py-32
Element gap: space-y-6 md:space-y-8 lg:space-y-12
Container: max-w-7xl mx-auto px-4 sm:px-6 lg:px-8
```

## Component Specifications

### 1. Hero Component

**File**: `src/components/landing/Hero.tsx`

```tsx
interface HeroProps {
  onCTAClick?: () => void;
}

Features:
- Animated gradient text using bg-clip-text
- Framer Motion variants for:
  * Fade in + slide up (container)
  * Stagger children animation
- TypeWriter effect for subtitle (optional)
- Floating animation for decorative elements
- Responsive image/illustration
```

**Animation Timing**:
```typescript
const containerVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      staggerChildren: 0.2
    }
  }
};
```

### 2. Feature Card Component

**File**: `src/components/landing/FeatureCard.tsx`

```tsx
interface FeatureCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  index: number;
}

Styles:
- Glassmorphism: backdrop-blur-lg bg-white/80
- Border: border border-white/20
- Shadow: shadow-xl hover:shadow-2xl
- Transform: hover:scale-105 hover:-translate-y-2
- Transition: transition-all duration-300
```

**Glassmorphism CSS**:
```css
.glass-card {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.37);
}
```

### 3. Stats Counter Component

**File**: `src/components/landing/StatsCounter.tsx`

```tsx
interface StatItemProps {
  end: number;
  label: string;
  suffix?: string;
  duration?: number;
}

Logic:
- Use Intersection Observer to trigger on scroll
- Animate from 0 to target number
- Format with commas (10,000+)
- Optional suffix (%, +, etc.)
```

**Counter Logic**:
```typescript
const useCountUp = (end: number, duration: number = 2000) => {
  const [count, setCount] = useState(0);
  
  useEffect(() => {
    const steps = 60;
    const increment = end / steps;
    const stepTime = duration / steps;
    
    let current = 0;
    const timer = setInterval(() => {
      current += increment;
      if (current >= end) {
        setCount(end);
        clearInterval(timer);
      } else {
        setCount(Math.floor(current));
      }
    }, stepTime);
    
    return () => clearInterval(timer);
  }, [end, duration]);
  
  return count;
};
```

### 4. Testimonial Carousel

**File**: `src/components/landing/TestimonialCarousel.tsx`

```tsx
interface Testimonial {
  id: string;
  name: string;
  avatar: string;
  role: string;
  content: string;
  rating: number;
}

Features:
- Auto-play with 5s interval
- Manual navigation (prev/next buttons)
- Pagination dots
- Smooth transition (fade + slide)
- Pause on hover
```

**Data Structure**:
```typescript
const testimonials: Testimonial[] = [
  {
    id: '1',
    name: '张女士',
    avatar: '/avatars/user1.jpg',
    role: '全职妈妈',
    content: '使用 Health Butler 3 个月，全家的饮食更科学了，孩子也更健康！',
    rating: 5
  },
  // ... more
];
```

## Animation Strategy

### Page Load Sequence

```
0ms    : Hero container fade in
200ms  : Headline slides up
400ms  : Subtitle fades in
600ms  : CTA buttons slide up
800ms  : Stats counter ready (triggers on scroll)
```

### Scroll Animations

```typescript
const useScrollAnimation = () => {
  const [ref, inView] = useInView({
    triggerOnce: true,
    threshold: 0.1
  });
  
  return {
    ref,
    initial: { opacity: 0, y: 50 },
    animate: inView ? { opacity: 1, y: 0 } : {},
    transition: { duration: 0.6 }
  };
};
```

### Micro-interactions

```css
/* Button Hover */
.cta-button {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
.cta-button:hover {
  transform: scale(1.05);
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
}

/* Card Hover */
.feature-card {
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}
.feature-card:hover {
  transform: translateY(-8px);
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
}
```

## Responsive Design

### Breakpoints

```
Mobile:  < 640px   (sm)
Tablet:  640-1024px (sm-lg)
Desktop: > 1024px  (lg+)
```

### Layout Adjustments

**Hero Section**:
```
Mobile:  Stack vertically, larger touch targets
Tablet:  Centered, moderate spacing
Desktop: Full width, expansive spacing
```

**Features**:
```
Mobile:  Single column
Tablet:  2 columns
Desktop: 3 columns
```

**Stats**:
```
Mobile:  Stack vertically
Tablet:  2x2 grid
Desktop: Horizontal row (4 items)
```

## Performance Optimization

### Code Splitting

```typescript
// Lazy load components not in viewport
const TestimonialCarousel = dynamic(
  () => import('@/components/landing/TestimonialCarousel'),
  { ssr: false }
);
```

### Image Optimization

```tsx
<Image
  src="/hero-image.jpg"
  alt="Health Butler"
  width={1200}
  height={800}
  priority // For hero image
  placeholder="blur"
/>
```

### Animation Performance

```typescript
// Use transform and opacity only (GPU accelerated)
animate={{
  x: 0,          // ✅ transform
  opacity: 1,    // ✅ opacity
  // Avoid:
  // width: 100, // ❌ triggers layout
  // left: 0,    // ❌ triggers layout
}}
```

## Accessibility

### ARIA Labels

```tsx
<button
  aria-label="开始免费试用 Health Butler"
  role="button"
>
  开始免费试用
</button>
```

### Keyboard Navigation

- Tab 顺序合理
- Focus 状态清晰可见
- Skip to main content link

### Motion Preferences

```tsx
const prefersReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');

<motion.div
  animate={!prefersReducedMotion && { /* animations */ }}
>
```

## Testing Strategy

### Visual Regression Testing
- Capture screenshots at breakpoints
- Compare before/after with Percy/Chromatic

### Performance Testing
- Lighthouse CI score > 90
- FCP < 1.5s
- LCP < 2.5s
- CLS < 0.1

### A/B Testing Plan
- Variant A: Current design (baseline)
- Variant B: New design
- Metrics: CTR, Bounce Rate, Time on Page
- Sample Size: 1000+ visitors
- Duration: 2 weeks

## Implementation Order

1. **Phase 1**: Design System (colors, typography)
2. **Phase 2**: Hero Section
3. **Phase 3**: Enhanced Features
4. **Phase 4**: Stats Counter
5. **Phase 5**: Testimonials
6. **Phase 6**: Polish & Animations
7. **Phase 7**: Testing & QA

## Dependencies

### npm packages to install:
```bash
pnpm add framer-motion
pnpm add react-intersection-observer
pnpm add @radix-ui/react-avatar  # For testimonials
pnpm add embla-carousel-react     # Alternative carousel (optional)
```

### Assets needed:
- Hero illustration or image
- Feature icons (can use Lucide)
- User avatars for testimonials
- Partner logos (if applicable)

## Rollback Plan

If issues arise:
1. Feature flag to toggle new UI
2. Keep old `page.tsx` as `page.backup.tsx`
3. Quick revert via git
4. Staging environment testing before prod

---

**Sign-off**:
- [ ] Design approved by Product/UX
- [ ] Technical approach reviewed by Tech Lead
- [ ] Performance impact assessed
- [ ] Accessibility requirements confirmed
