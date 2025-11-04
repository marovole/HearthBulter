# Tasks: Enhance Landing Page UI

## Overview
将 Health Butler 首页从基础 UI 升级为现代化、吸引人的落地页设计。

---

## Phase 1: Setup & Design System (0.5 day)

### Task 1.1: Install Dependencies
**Priority**: High | **Estimate**: 15min
- [ ] Install Framer Motion: `pnpm add framer-motion`
- [ ] Install React Intersection Observer: `pnpm add react-intersection-observer`
- [ ] Install Radix Avatar: `pnpm add @radix-ui/react-avatar`
- [ ] Verify all packages in package.json

**Validation**:
```bash
pnpm list framer-motion react-intersection-observer @radix-ui/react-avatar
```

**Dependencies**: None
**Blockers**: None

---

### Task 1.2: Extend Tailwind Config
**Priority**: High | **Estimate**: 30min
- [ ] Add brand colors to `tailwind.config.ts`
- [ ] Add custom gradients
- [ ] Add custom animations (float, fade-in-up)
- [ ] Add custom shadows
- [ ] Test config with `pnpm build`

**Files**:
- `tailwind.config.ts`

**Validation**:
```tsx
// Test in a component
<div className="bg-brand-blue text-hero-gradient">Test</div>
```

**Dependencies**: None
**Blockers**: None

---

### Task 1.3: Create Design Tokens File
**Priority**: Medium | **Estimate**: 20min
- [ ] Create `src/lib/design-tokens.ts`
- [ ] Export animation variants
- [ ] Export common transition configs
- [ ] Export typography scales
- [ ] Add JSDoc comments

**Files**:
- `src/lib/design-tokens.ts` (new)

**Example**:
```typescript
export const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 }
};
```

**Dependencies**: Task 1.1 (Framer Motion)
**Blockers**: None

---

## Phase 2: Component Development (1 day)

### Task 2.1: Create Hero Component
**Priority**: High | **Estimate**: 2 hours
- [ ] Create `src/components/landing/Hero.tsx`
- [ ] Implement animated headline with gradient text
- [ ] Add subtitle with fade-in animation
- [ ] Create CTA button group
- [ ] Add social proof stats placeholder
- [ ] Make responsive (mobile-first)
- [ ] Add TypeScript interfaces

**Files**:
- `src/components/landing/Hero.tsx` (new)

**Acceptance Criteria**:
- Hero section fades in on load
- Gradient text renders correctly
- Buttons have hover effects
- Mobile layout stacks vertically
- No layout shift (CLS < 0.1)

**Dependencies**: Task 1.1, 1.2, 1.3
**Blockers**: None

---

### Task 2.2: Create FeatureCard Component
**Priority**: High | **Estimate**: 1.5 hours
- [ ] Create `src/components/landing/FeatureCard.tsx`
- [ ] Implement glassmorphism effect
- [ ] Add animated icon with Framer Motion
- [ ] Add hover lift & shadow effects
- [ ] Make card responsive
- [ ] Add loading skeleton state

**Files**:
- `src/components/landing/FeatureCard.tsx` (new)

**Acceptance Criteria**:
- Glassmorphism renders on all browsers
- Icon animates on hover
- Card lifts smoothly on hover
- Accessible (keyboard navigation)

**Dependencies**: Task 1.1, 1.2
**Blockers**: None

---

### Task 2.3: Create FeaturesSection Component
**Priority**: High | **Estimate**: 1 hour
- [ ] Create `src/components/landing/FeaturesSection.tsx`
- [ ] Integrate FeatureCard components
- [ ] Add stagger animation for cards
- [ ] Use Intersection Observer for scroll trigger
- [ ] Make 3-column grid responsive

**Files**:
- `src/components/landing/FeaturesSection.tsx` (new)

**Acceptance Criteria**:
- Cards animate in sequence
- Animation triggers when scrolled into view
- Grid collapses to 1 column on mobile
- Animation only plays once

**Dependencies**: Task 2.2
**Blockers**: None

---

### Task 2.4: Create StatsCounter Component
**Priority**: Medium | **Estimate**: 1.5 hours
- [ ] Create `src/components/landing/StatsCounter.tsx`
- [ ] Implement number counting animation
- [ ] Add Intersection Observer trigger
- [ ] Format numbers with commas
- [ ] Support suffixes (+, %, etc.)
- [ ] Create StatItem sub-component

**Files**:
- `src/components/landing/StatsCounter.tsx` (new)

**Acceptance Criteria**:
- Counter animates from 0 to target
- Smooth easing function
- Triggers only when in viewport
- Accessible (screen reader support)

**Dependencies**: Task 1.1
**Blockers**: None

---

### Task 2.5: Create TestimonialCarousel Component
**Priority**: Low | **Estimate**: 2 hours
- [ ] Create `src/components/landing/TestimonialCarousel.tsx`
- [ ] Add auto-play with 5s interval
- [ ] Add manual navigation (prev/next)
- [ ] Add pagination dots
- [ ] Add pause on hover
- [ ] Style with glassmorphism
- [ ] Add testimonial data (mock)

**Files**:
- `src/components/landing/TestimonialCarousel.tsx` (new)
- `src/lib/testimonials-data.ts` (new, mock data)

**Acceptance Criteria**:
- Auto-play works smoothly
- Manual navigation responsive
- Pauses on hover
- Accessible (ARIA labels)
- Mobile swipe support (optional)

**Dependencies**: Task 1.3
**Blockers**: None
**Note**: Can be done in parallel with other tasks

---

## Phase 3: Integration (0.5 day)

### Task 3.1: Update Landing Page
**Priority**: High | **Estimate**: 1 hour
- [ ] Backup current `src/app/page.tsx` to `page.backup.tsx`
- [ ] Import new landing components
- [ ] Replace old sections with new components
- [ ] Add section spacing and layout
- [ ] Test all animations work together

**Files**:
- `src/app/page.tsx` (modified)
- `src/app/page.backup.tsx` (new, backup)

**Acceptance Criteria**:
- All components render correctly
- No console errors
- Animations don't conflict
- Page loads < 2s

**Dependencies**: Task 2.1, 2.2, 2.3, 2.4
**Blockers**: None

---

### Task 3.2: Add Background Effects
**Priority**: Medium | **Estimate**: 45min
- [ ] Add multi-layer gradient background
- [ ] Add floating shapes (optional)
- [ ] Add subtle noise texture
- [ ] Optimize for performance

**Files**:
- `src/app/page.tsx` (modified)
- `src/styles/landing.css` (optional, new)

**Acceptance Criteria**:
- Background renders smoothly
- No performance impact
- Works in dark mode (future-proof)

**Dependencies**: Task 3.1
**Blockers**: None

---

### Task 3.3: Implement Scroll Animations
**Priority**: High | **Estimate**: 1 hour
- [ ] Add scroll trigger for features section
- [ ] Add scroll trigger for stats section
- [ ] Add scroll trigger for testimonials
- [ ] Test scroll performance
- [ ] Add reduced motion support

**Files**:
- `src/components/landing/FeaturesSection.tsx`
- `src/components/landing/StatsCounter.tsx`
- `src/components/landing/TestimonialCarousel.tsx`

**Acceptance Criteria**:
- Animations trigger at correct scroll position
- No jank or stuttering
- Respects `prefers-reduced-motion`

**Dependencies**: Task 3.1
**Blockers**: None

---

## Phase 4: Polish & Optimization (0.5 day)

### Task 4.1: Performance Optimization
**Priority**: High | **Estimate**: 1 hour
- [ ] Lazy load non-critical components
- [ ] Optimize images (if added)
- [ ] Code split Framer Motion
- [ ] Remove unused CSS
- [ ] Run Lighthouse audit

**Files**:
- `src/app/page.tsx`
- `next.config.js` (if needed)

**Validation**:
```bash
# Run Lighthouse
npx lighthouse https://hearth-bulter.vercel.app --view
```

**Acceptance Criteria**:
- Lighthouse Performance > 90
- FCP < 1.5s
- LCP < 2.5s
- CLS < 0.1

**Dependencies**: Task 3.3
**Blockers**: None

---

### Task 4.2: Accessibility Audit
**Priority**: High | **Estimate**: 45min
- [ ] Add ARIA labels to all interactive elements
- [ ] Test keyboard navigation
- [ ] Check focus states
- [ ] Add skip-to-content link
- [ ] Test with screen reader (VoiceOver/NVDA)

**Files**:
- All landing components

**Validation**:
```bash
# Run axe DevTools
# Test with keyboard only
```

**Acceptance Criteria**:
- No axe violations
- All interactive elements keyboard accessible
- Focus indicators visible
- Screen reader announces correctly

**Dependencies**: Task 3.3
**Blockers**: None

---

### Task 4.3: Responsive Testing
**Priority**: High | **Estimate**: 1 hour
- [ ] Test on iPhone SE (375px)
- [ ] Test on iPad (768px)
- [ ] Test on Desktop (1920px)
- [ ] Fix any layout issues
- [ ] Test touch interactions

**Devices**:
- Mobile: iPhone 12, Samsung Galaxy S21
- Tablet: iPad Pro, Surface
- Desktop: 1080p, 1440p, 4K

**Acceptance Criteria**:
- No horizontal scrolling
- Text readable at all sizes
- Touch targets >= 44px
- Images don't overflow

**Dependencies**: Task 3.3
**Blockers**: None

---

### Task 4.4: Cross-browser Testing
**Priority**: Medium | **Estimate**: 30min
- [ ] Test on Chrome (latest)
- [ ] Test on Firefox (latest)
- [ ] Test on Safari (latest)
- [ ] Test on Edge (latest)
- [ ] Document any browser-specific issues

**Acceptance Criteria**:
- Consistent rendering across browsers
- Animations work in all browsers
- No console errors

**Dependencies**: Task 4.3
**Blockers**: None

---

## Phase 5: Testing & QA (0.5 day)

### Task 5.1: Unit Tests
**Priority**: Medium | **Estimate**: 1 hour
- [ ] Test Hero component renders
- [ ] Test FeatureCard hover states
- [ ] Test StatsCounter animation logic
- [ ] Test Testimonial navigation
- [ ] Achieve > 80% coverage for new components

**Files**:
- `src/__tests__/components/landing/Hero.test.tsx`
- `src/__tests__/components/landing/FeatureCard.test.tsx`
- `src/__tests__/components/landing/StatsCounter.test.tsx`

**Validation**:
```bash
pnpm test -- --coverage
```

**Dependencies**: Task 3.3
**Blockers**: None

---

### Task 5.2: E2E Tests
**Priority**: Low | **Estimate**: 45min
- [ ] Test hero CTA clicks navigate correctly
- [ ] Test feature cards are visible
- [ ] Test stats counter triggers
- [ ] Test testimonial carousel auto-play

**Files**:
- `src/__tests__/e2e/landing.spec.ts`

**Validation**:
```bash
pnpm test:e2e
```

**Dependencies**: Task 5.1
**Blockers**: None

---

### Task 5.3: Visual Regression Testing
**Priority**: Low | **Estimate**: 30min
- [ ] Capture baseline screenshots
- [ ] Compare with current production
- [ ] Document intentional changes
- [ ] Store in PR for review

**Tools**:
- Percy, Chromatic, or manual screenshots

**Dependencies**: Task 5.2
**Blockers**: None

---

## Phase 6: Deployment (0.5 day)

### Task 6.1: Staging Deployment
**Priority**: High | **Estimate**: 30min
- [ ] Deploy to Vercel preview
- [ ] Share preview URL with team
- [ ] Gather feedback
- [ ] Make any necessary tweaks

**Validation**:
```bash
# Vercel auto-deploys on PR
# Share URL in PR description
```

**Dependencies**: Task 5.3
**Blockers**: None

---

### Task 6.2: Production Deployment
**Priority**: High | **Estimate**: 15min
- [ ] Merge PR to main
- [ ] Monitor Vercel deployment
- [ ] Verify live site
- [ ] Monitor analytics for any issues

**Validation**:
- Visit https://hearth-bulter.vercel.app
- Check Vercel logs
- Monitor error tracking (Sentry)

**Dependencies**: Task 6.1
**Blockers**: Requires stakeholder approval

---

### Task 6.3: Post-Launch Monitoring
**Priority**: High | **Estimate**: 30min
- [ ] Monitor Core Web Vitals
- [ ] Check error rates
- [ ] Monitor user feedback
- [ ] Prepare for A/B test (if applicable)

**Metrics to track**:
- Page load time
- Bounce rate
- Time on page
- CTA click rate

**Dependencies**: Task 6.2
**Blockers**: None

---

## Summary

**Total Estimated Time**: 2-3 days
- Phase 1: 0.5 day (Setup)
- Phase 2: 1 day (Development)
- Phase 3: 0.5 day (Integration)
- Phase 4: 0.5 day (Polish)
- Phase 5: 0.5 day (Testing)
- Phase 6: 0.5 day (Deployment)

**Critical Path**:
1.1 → 1.2 → 1.3 → 2.1 → 2.2 → 2.3 → 3.1 → 3.3 → 4.1 → 4.2 → 6.1 → 6.2

**Parallelizable**:
- Task 2.4 (Stats) can be done parallel to 2.1-2.3
- Task 2.5 (Testimonials) can be done parallel to 2.1-2.4
- Task 4.4 (Cross-browser) can be done parallel to 4.2-4.3

**Key Milestones**:
- ✅ Dependencies installed (End of Phase 1)
- ✅ Core components complete (End of Phase 2)
- ✅ Integrated landing page (End of Phase 3)
- ✅ Performance optimized (End of Phase 4)
- ✅ Tested and QA'd (End of Phase 5)
- ✅ Live in production (End of Phase 6)

---

**Sign-off**:
- [ ] All tasks reviewed by Tech Lead
- [ ] Timeline approved by PM
- [ ] Ready to start implementation
