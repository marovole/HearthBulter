# Tasks: Enhance Landing Page UI

## Overview
将 Health Butler 首页从基础 UI 升级为现代化、吸引人的落地页设计。

---

## ✅ 已完成的优化工作 (2025-11-17)

### 实际完成情况
经过 Phase 0 预检查，发现**所有核心组件已存在并使用 Framer Motion**，因此策略从"全新开发"调整为"审查和优化"。

### 已完成的关键优化

#### 1. 共享动画基础设施 ✅
- **新增**: `src/lib/hooks/usePrefersReducedMotion.ts` (132 行)
  - SSR 安全的 `prefers-reduced-motion` 检测
  - 响应式更新，监听系统设置变化
  - 额外的 `useMotionConfig` helper

- **新增**: `src/lib/hooks/useAnimateOnView.ts` (235 行)
  - 封装 Intersection Observer + Framer Motion
  - 自动整合 prefers-reduced-motion
  - 支持自定义配置和 variants
  - 提供 `useScrollAnimation` 简化 hook

- **新增**: `src/lib/hooks/index.ts` - 统一导出
- **更新**: `src/lib/design-tokens.ts` - 添加 hooks 集成文档

#### 2. Hero 组件优化 ✅ (src/components/landing/Hero.tsx +155/-38)
- ✅ 实现专业的鼠标视差效果
  - 使用 `useMotionValue` + `useSpring` 平滑过渡
  - 三个渐变球不同移动系数 (12/8, 9/6, 7/5) 创造层次感
- ✅ `requestAnimationFrame` 性能节流（避免每次 mousemove 都更新）
- ✅ 检测 `(pointer: fine)` 仅在桌面设备启用
- ✅ 整合 `usePrefersReducedMotion`，尊重用户偏好
- ✅ 支持设备切换（docking/undocking laptop）

#### 3. StatsCounter 组件优化 ✅ (src/components/landing/StatsCounter.tsx +53/-25)
- ✅ 将 `setInterval` 替换为 `requestAnimationFrame`
- ✅ 添加 ease-out cubic 缓动函数（更平滑的数字滚动）
- ✅ 整合 `usePrefersReducedMotion`（跳过动画直接显示最终值）
- ✅ 正确清理动画资源，防止内存泄漏

#### 4. TestimonialCarousel 组件优化 ✅ (src/components/landing/TestimonialCarousel.tsx +38/-26)
- ✅ 移除未使用的 `AnimatePresence` 导入
- ✅ 添加 `pause on hover` 功能
- ✅ 整合 `usePrefersReducedMotion`（禁用自动轮播）
- ✅ **修复内存泄漏**：添加 `api.off` 监听器清理

### CodeX 审查结果
- ✅ 代码质量：符合 React 最佳实践，TypeScript 类型完整
- ✅ 性能优化：requestAnimationFrame 使用正确，spring 配置合理
- ✅ 无障碍：prefers-reduced-motion 正确实现
- ✅ 发现并修复 TestimonialCarousel 监听器泄漏问题

### 性能影响
- Bundle size 增量：~400 行新代码（hooks + 组件优化）
- 新增依赖：0（所有依赖已存在）
- 运行时性能：改进（setInterval → requestAnimationFrame）

---

## Phase 1: Setup & Design System ✅ COMPLETED

### Task 1.1: Install Dependencies ✅
**Priority**: High | **Estimate**: 15min | **Status**: ✅ Already Installed
- [x] Install Framer Motion: `pnpm add framer-motion` - **已安装 v12.23.24**
- [x] Install React Intersection Observer: `pnpm add react-intersection-observer` - **已安装 v10.0.0**
- [x] Install Radix Avatar: `pnpm add @radix-ui/react-avatar` - **已安装 v1.1.11**
- [x] Verify all packages in package.json - **已验证**

**实际完成**: 预检查时发现所有依赖已安装 ✅

---

### Task 1.2: Extend Tailwind Config ✅
**Priority**: High | **Estimate**: 30min | **Status**: ✅ Already Configured
- [x] Add brand colors to `tailwind.config.ts` - **已配置**
- [x] Add custom gradients - **已配置 (hero-gradient, feature-gradient)**
- [x] Add custom animations (float, fade-in-up) - **已配置**
- [x] Add custom shadows - **已配置 (glow, glow-lg)**
- [x] Test config with `pnpm build` - **已测试**

**实际完成**: Tailwind 配置已完整，无需修改 ✅

---

### Task 1.3: Create Design Tokens File ✅
**Priority**: Medium | **Estimate**: 20min | **Status**: ✅ Enhanced
- [x] Create `src/lib/design-tokens.ts` - **已存在并完整**
- [x] Export animation variants - **已完成**
- [x] Export common transition configs - **已完成**
- [x] Export typography scales - **已完成**
- [x] Add JSDoc comments - **已完成**
- [x] **额外新增**: 创建 `src/lib/hooks/` 目录和共享动画 hooks
  - `usePrefersReducedMotion.ts` (132 行)
  - `useAnimateOnView.ts` (235 行)
  - `index.ts` (统一导出)

**实际完成**: design-tokens.ts 已完整，额外创建了共享动画 hooks 系统 ✅

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

## Phase 2: Component Development ✅ OPTIMIZED (Not Created, Enhanced)

### Task 2.1: Hero Component ✅ OPTIMIZED
**Priority**: High | **Estimate**: 2 hours | **Status**: ✅ Enhanced (Already Existed)
- [x] `src/components/landing/Hero.tsx` - **已存在，已优化**
- [x] Implement animated headline with gradient text - **已实现**
- [x] Add subtitle with fade-in animation - **已实现**
- [x] Create CTA button group - **已实现**
- [x] Add social proof stats placeholder - **已实现**
- [x] Make responsive (mobile-first) - **已实现**
- [x] Add TypeScript interfaces - **已实现**
- [x] **新增优化**: 实现专业鼠标视差效果
  - useMotionValue + useSpring 平滑动画
  - requestAnimationFrame 性能节流
  - (pointer: fine) 检测仅桌面启用
  - 整合 usePrefersReducedMotion

**实际完成**: Hero 组件已存在，进行了深度性能和无障碍优化 (+155/-38 行) ✅

**Acceptance Criteria**: ✅ 全部满足，且超出预期（新增视差效果）

---

### Task 2.2: FeatureCard Component ✅
**Priority**: High | **Estimate**: 1.5 hours | **Status**: ✅ Already Implemented
- [x] `src/components/landing/FeatureCard.tsx` - **已存在**
- [x] Implement glassmorphism effect - **已实现**
- [x] Add animated icon with Framer Motion - **已实现**
- [x] Add hover lift & shadow effects - **已实现**
- [x] Make card responsive - **已实现**
- [x] Add loading skeleton state - **已实现**

**实际完成**: 组件已存在并完整实现，无需修改 ✅

**Acceptance Criteria**: ✅ 全部满足

---

### Task 2.3: FeaturesSection Component ✅
**Priority**: High | **Estimate**: 1 hour | **Status**: ✅ Already Implemented
- [x] `src/components/landing/FeaturesSection.tsx` - **已存在**
- [x] Integrate FeatureCard components - **已实现**
- [x] Add stagger animation for cards - **已实现**
- [x] Use Intersection Observer for scroll trigger - **已实现**
- [x] Make 3-column grid responsive - **已实现**

**实际完成**: 组件已存在并完整实现，无需修改 ✅

**Acceptance Criteria**: ✅ 全部满足

---

### Task 2.4: StatsCounter Component ✅ OPTIMIZED
**Priority**: Medium | **Estimate**: 1.5 hours | **Status**: ✅ Enhanced
- [x] `src/components/landing/StatsCounter.tsx` - **已存在，已优化**
- [x] Implement number counting animation - **已实现**
- [x] Add Intersection Observer trigger - **已实现**
- [x] Format numbers with commas - **已实现**
- [x] Support suffixes (+, %, etc.) - **已实现**
- [x] Create StatItem sub-component - **已实现**
- [x] **新增优化**: 性能和无障碍改进
  - setInterval → requestAnimationFrame
  - 添加 ease-out cubic 缓动函数
  - 整合 usePrefersReducedMotion
  - 正确清理动画资源

**实际完成**: 组件已存在，进行了性能和无障碍优化 (+53/-25 行) ✅

**Acceptance Criteria**: ✅ 全部满足，且性能更优

---

### Task 2.5: TestimonialCarousel Component ✅ OPTIMIZED
**Priority**: Low | **Estimate**: 2 hours | **Status**: ✅ Enhanced
- [x] `src/components/landing/TestimonialCarousel.tsx` - **已存在，已优化**
- [x] Add auto-play with 5s interval - **已实现**
- [x] Add manual navigation (prev/next) - **已实现**
- [x] Add pagination dots - **已实现**
- [x] Add pause on hover - **已实现并优化**
- [x] Style with glassmorphism - **已实现**
- [x] Add testimonial data (mock) - **已实现**
- [x] **新增优化**: 性能和无障碍改进
  - 移除未使用的 AnimatePresence 导入
  - 整合 usePrefersReducedMotion（禁用自动轮播）
  - **修复内存泄漏**: 添加 api.off 监听器清理
  - pause on hover 功能

**实际完成**: 组件已存在，进行了无障碍和内存泄漏修复 (+38/-26 行) ✅

**Acceptance Criteria**: ✅ 全部满足，且修复了关键 bug

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
