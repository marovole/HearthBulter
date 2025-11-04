# Spec: Landing Page UI Components

## ADDED Requirements

### Requirement: LND-001 - Hero Section with Animated Elements
**Priority**: High
**Category**: User Interface

The landing page SHALL display a hero section with animated headline, subtitle, and call-to-action buttons that engage users and communicate the core value proposition.

#### Scenario: User visits landing page for first time
**Given** a user navigates to the homepage (`/`)  
**When** the page loads  
**Then** the hero section SHALL fade in with a slide-up animation within 600ms  
**And** the headline with gradient text SHALL be visible and animated  
**And** the subtitle SHALL fade in 200ms after the headline  
**And** the CTA buttons SHALL slide up 400ms after the headline  
**And** the social proof stats SHALL be displayed below the CTAs  

**Rationale**: First impressions are critical. Animated entry creates visual interest and guides user attention through the content hierarchy.

---

### Requirement: LND-002 - Glassmorphism Feature Cards
**Priority**: High
**Category**: User Interface

Feature cards SHALL use modern glassmorphism design with backdrop blur, semi-transparent backgrounds, and elevated shadows to create visual depth.

#### Scenario: User scrolls to features section
**Given** the user has scrolled past the hero section  
**When** the features section enters the viewport  
**Then** each feature card SHALL animate in with a stagger delay of 150ms  
**And** each card SHALL display with glassmorphism effect (backdrop-blur-lg, bg-white/80)  
**And** each card SHALL contain an animated icon, title, and description  

#### Scenario: User hovers over feature card
**Given** a feature card is displayed  
**When** the user hovers over the card  
**Then** the card SHALL lift 8px upward with transform  
**And** the shadow SHALL intensify from shadow-xl to shadow-2xl  
**And** the icon SHALL animate (rotate or scale)  
**And** the transition SHALL be smooth over 300ms  

**Rationale**: Glassmorphism provides a modern, premium feel. Hover effects provide tactile feedback and encourage exploration.

---

### Requirement: LND-003 - Animated Stats Counter
**Priority**: Medium
**Category**: User Interface / Interaction

The landing page SHALL display key statistics (users, recipes, satisfaction) with animated number counters that trigger when scrolled into view.

#### Scenario: Stats section becomes visible
**Given** the stats section is below the viewport  
**When** the user scrolls and the section is 10% visible  
**Then** each stat counter SHALL animate from 0 to its target value  
**And** the animation SHALL complete within 2000ms  
**And** numbers SHALL be formatted with commas (e.g., "10,000+")  
**And** the animation SHALL only trigger once (not on every scroll)  

#### Scenario: User has reduced motion preference
**Given** the user has `prefers-reduced-motion: reduce` enabled  
**When** the stats section becomes visible  
**Then** the numbers SHALL appear instantly without animation  

**Rationale**: Animated counters draw attention to social proof metrics. Respecting motion preferences ensures accessibility.

---

### Requirement: LND-004 - Testimonial Carousel
**Priority**: Low
**Category**: User Interface / Content

The landing page SHALL display a carousel of user testimonials with auto-play, manual navigation, and pause-on-hover functionality.

#### Scenario: Testimonial carousel displays
**Given** the testimonials section is visible  
**When** the carousel initializes  
**Then** it SHALL display one testimonial at a time  
**And** it SHALL auto-advance to the next testimonial every 5 seconds  
**And** it SHALL show pagination dots indicating position  
**And** it SHALL provide prev/next navigation buttons  

#### Scenario: User hovers over carousel
**Given** the carousel is auto-playing  
**When** the user hovers over the carousel  
**Then** auto-play SHALL pause  
**And** manual navigation SHALL remain functional  
**When** the user stops hovering  
**Then** auto-play SHALL resume after 1 second  

#### Scenario: User manually navigates
**Given** the carousel is displayed  
**When** the user clicks the next/prev button or pagination dot  
**Then** the carousel SHALL transition to the selected testimonial  
**And** auto-play timer SHALL reset  
**And** the transition SHALL be smooth (fade + slide)  

**Rationale**: Testimonials provide social proof. Auto-play ensures all content is seen, while manual controls give users agency.

---

### Requirement: LND-005 - Responsive Layout Optimization
**Priority**: High
**Category**: User Interface / Responsive Design

All landing page components SHALL be fully responsive and provide optimal user experience across mobile, tablet, and desktop viewports.

#### Scenario: Mobile viewport (< 640px)
**Given** the viewport width is less than 640px  
**When** the landing page is rendered  
**Then** the hero section SHALL stack vertically  
**And** CTA buttons SHALL be full-width  
**And** feature cards SHALL display in a single column  
**And** text sizes SHALL scale down appropriately  
**And** touch targets SHALL be at least 44x44px  

#### Scenario: Tablet viewport (640px - 1024px)
**Given** the viewport width is between 640px and 1024px  
**When** the landing page is rendered  
**Then** feature cards SHALL display in 2 columns  
**And** text sizes SHALL use medium scale  
**And** spacing SHALL use moderate padding  

#### Scenario: Desktop viewport (> 1024px)
**Given** the viewport width is greater than 1024px  
**When** the landing page is rendered  
**Then** feature cards SHALL display in 3 columns  
**And** text sizes SHALL use large scale  
**And** spacing SHALL use expansive padding  
**And** content SHALL be center-aligned with max-width constraint  

**Rationale**: Mobile-first design ensures accessibility on all devices. Responsive breakpoints optimize readability and usability.

---

### Requirement: LND-006 - Performance Requirements
**Priority**: High
**Category**: Performance

The enhanced landing page SHALL maintain excellent performance metrics and load within acceptable thresholds.

#### Scenario: Initial page load
**Given** a user navigates to the homepage  
**When** the page loads  
**Then** First Contentful Paint (FCP) SHALL be < 1.5 seconds  
**And** Largest Contentful Paint (LCP) SHALL be < 2.5 seconds  
**And** Cumulative Layout Shift (CLS) SHALL be < 0.1  
**And** Time to Interactive (TTI) SHALL be < 3.5 seconds  

#### Scenario: Lighthouse audit
**Given** the landing page is deployed  
**When** a Lighthouse audit is run  
**Then** the Performance score SHALL be >= 90  
**And** the Accessibility score SHALL be >= 95  
**And** the Best Practices score SHALL be >= 90  
**And** the SEO score SHALL be >= 90  

#### Scenario: Animation performance
**Given** animations are rendering  
**When** monitoring frame rate  
**Then** animations SHALL maintain >= 55 FPS  
**And** animations SHALL use GPU-accelerated properties only (transform, opacity)  
**And** animations SHALL not cause layout thrashing  

**Rationale**: Performance directly impacts user experience and conversion rates. Google Core Web Vitals affect SEO ranking.

---

### Requirement: LND-007 - Accessibility Standards
**Priority**: High
**Category**: Accessibility

The landing page SHALL meet WCAG 2.1 Level AA accessibility standards to ensure usability for all users.

#### Scenario: Keyboard navigation
**Given** a user navigates with keyboard only  
**When** they press Tab repeatedly  
**Then** all interactive elements SHALL be reachable  
**And** focus indicators SHALL be clearly visible  
**And** focus order SHALL be logical (top to bottom, left to right)  
**And** the user SHALL be able to activate elements with Enter/Space  

#### Scenario: Screen reader usage
**Given** a user is using a screen reader  
**When** they navigate the landing page  
**Then** all images SHALL have descriptive alt text  
**And** all buttons SHALL have meaningful labels  
**And** heading hierarchy SHALL be logical (h1 → h2 → h3)  
**And** ARIA labels SHALL be present for icon-only buttons  
**And** the page SHALL announce dynamic content changes  

#### Scenario: Color contrast
**Given** the landing page is displayed  
**When** checking color contrast ratios  
**Then** all text SHALL meet 4.5:1 contrast ratio (normal text)  
**And** large text SHALL meet 3:1 contrast ratio  
**And** UI components SHALL meet 3:1 contrast ratio  

#### Scenario: Reduced motion preference
**Given** a user has `prefers-reduced-motion: reduce` enabled  
**When** the landing page loads  
**Then** all animations SHALL be disabled or significantly reduced  
**And** functionality SHALL remain fully accessible  

**Rationale**: Accessibility is a legal requirement and moral imperative. Inclusive design benefits all users.

---

## MODIFIED Requirements

### Requirement: LND-M001 - Landing Page Layout
**Priority**: High
**Category**: User Interface

The landing page layout SHALL be enhanced from a simple hero + features grid to a multi-section experience with hero, features, stats, testimonials, and final CTA sections.

**Previously**: Simple hero + 3 feature cards in grid  
**Now**: Multi-section layout with hero, features, stats, testimonials, and final CTA

#### Scenario: User scrolls through entire landing page
**Given** a user visits the homepage  
**When** they scroll from top to bottom  
**Then** they SHALL encounter sections in this order:
1. Hero section with headline and CTAs
2. Features section with 3 cards
3. Stats section with animated counters
4. Testimonials carousel section
5. Final CTA section

**And** each section SHALL have appropriate spacing (py-16 md:py-24)  
**And** visual hierarchy SHALL guide user through content flow  

**Rationale**: Additional sections provide more touchpoints for user engagement and conversion.

---

### Requirement: LND-M002 - CTA Button Styling
**Priority**: Medium
**Category**: User Interface

CTA buttons SHALL be enhanced with gradient backgrounds, elevated shadows, scale transforms, and smooth animations to improve visual prominence and click-through rates.

**Previously**: Basic blue background with hover state  
**Now**: Enhanced with gradient, shadow, scale transform, and animation

#### Scenario: User hovers over primary CTA
**Given** the primary CTA button is displayed  
**When** the user hovers over it  
**Then** the button SHALL scale to 105% of original size  
**And** the shadow SHALL elevate from shadow-lg to shadow-2xl  
**And** the transform and shadow SHALL animate over 300ms  

#### Scenario: User clicks primary CTA
**Given** the user hovers over the primary CTA  
**When** they click the button  
**Then** a ripple effect MAY be displayed (optional)  
**And** navigation SHALL occur to `/auth/signup`  

**Rationale**: More prominent CTAs with better visual feedback improve click-through rates.

---

## REMOVED Requirements

### Requirement: LND-R001 - Basic Emoji Icons
**Removed**: Using emoji (📊, 🥗, 🛒) as feature icons

**Replacement**: Using animated Lucide React icons with Framer Motion

**Rationale**: Scalable icon library provides better visual consistency and animation capabilities.

---

## Cross-References

**Related Capabilities**:
- `user-authentication` - Hero CTA buttons link to `/auth/signin` and `/auth/signup`
- `design-system` - Uses shared Tailwind config and component patterns
- `analytics` - Track CTA clicks, scroll depth, and conversion funnel

**Dependencies**:
- Framer Motion library for animations
- React Intersection Observer for scroll triggers
- Tailwind CSS for styling
- Next.js Image component for optimizations

---

## Testing Requirements

### Unit Tests
```typescript
// Hero.test.tsx
describe('Hero Component', () => {
  it('renders headline and subtitle', () => {});
  it('renders CTA buttons with correct hrefs', () => {});
  it('applies animation variants on mount', () => {});
});

// FeatureCard.test.tsx
describe('FeatureCard Component', () => {
  it('renders with glassmorphism styles', () => {});
  it('applies hover transforms', () => {});
  it('animates icon on hover', () => {});
});

// StatsCounter.test.tsx
describe('StatsCounter Component', () => {
  it('counts from 0 to target value', () => {});
  it('formats numbers with commas', () => {});
  it('triggers only when in viewport', () => {});
  it('respects prefers-reduced-motion', () => {});
});
```

### E2E Tests
```typescript
// landing.spec.ts
test('hero CTA navigates to signup', async ({ page }) => {
  await page.goto('/');
  await page.click('text=开始免费试用');
  await expect(page).toHaveURL('/auth/signup');
});

test('feature cards animate on scroll', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => window.scrollTo(0, 500));
  // Assert animation classes applied
});
```

### Performance Tests
```bash
# Lighthouse CI
lighthouse https://hearth-bulter.vercel.app --output=html
# Assert scores >= thresholds
```

---

## Acceptance Criteria

- [ ] All new components render without errors
- [ ] Animations are smooth (>= 55 FPS)
- [ ] Page loads meet performance thresholds (FCP < 1.5s, LCP < 2.5s)
- [ ] Fully responsive on mobile/tablet/desktop
- [ ] WCAG 2.1 AA compliant
- [ ] All interactive elements keyboard accessible
- [ ] Screen reader announces content correctly
- [ ] Cross-browser compatible (Chrome, Firefox, Safari, Edge)
- [ ] Unit test coverage >= 80%
- [ ] E2E tests pass in CI
- [ ] No console errors or warnings
- [ ] Visual regression tests pass (or documented changes approved)

---

**Status**: Draft
**Last Updated**: 2025-11-04
**Author**: AI Assistant
**Reviewers**: [To be assigned]
