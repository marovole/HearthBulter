import { test, expect } from '@playwright/test';
import { writeFileSync } from 'fs';
import { join } from 'path';

test.describe('Landing Page 诊断测试', () => {
  test.beforeEach(async ({ page }) => {
    // 禁用缓存
    await page.goto('http://localhost:3000', {
      waitUntil: 'domcontentloaded',
      timeout: 60000
    });
    // 等待页面基本加载
    await page.waitForTimeout(3000);
  });

  test('完整页面截图和基础检查', async ({ page }) => {
    // 等待页面完全加载
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000); // 等待动画

    // 截取完整页面
    await page.screenshot({
      path: 'temp/landing-fullpage.png',
      fullPage: true
    });

    // 检查页面标题
    const title = await page.title();
    console.log('页面标题:', title);

    // 检查是否有控制台错误
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    // 等待并记录错误
    await page.waitForTimeout(1000);
    if (errors.length > 0) {
      console.log('控制台错误:', errors);
    }
  });

  test('Hero 区域样式检查', async ({ page }) => {
    // 查找 Hero section
    const heroSection = page.locator('section').first();

    // 截取 Hero 区域
    await heroSection.screenshot({ path: 'temp/hero-section.png' });

    // 检查背景类
    const classList = await heroSection.getAttribute('class');
    console.log('Hero 类名:', classList);

    // 检查是否有渐变背景类
    const hasGradient = classList?.includes('from-indigo-50') &&
                        classList?.includes('via-purple-50') &&
                        classList?.includes('to-pink-50');

    console.log('✓ 渐变背景类存在:', hasGradient);

    // 检查计算样式
    const computedBg = await heroSection.evaluate((el) => {
      return window.getComputedStyle(el).background;
    });
    console.log('Hero 背景样式:', computedBg);

    // 检查浮动图标
    const icons = await page.locator('svg[class*="lucide"]').count();
    console.log('✓ 页面图标数量:', icons);
  });

  test('ScrollEnhancements 组件检查', async ({ page }) => {
    // 检查滚动进度条
    const progressBar = page.locator('div').filter({ hasText: '' }).first();
    const progressBarExists = await progressBar.count() > 0;
    console.log('✓ 滚动进度条:', progressBarExists ? '存在' : '不存在');

    // 滚动到底部
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(1000);

    // 检查返回顶部按钮
    const backToTopButton = page.locator('button[aria-label="返回顶部"]');
    const buttonVisible = await backToTopButton.isVisible().catch(() => false);
    console.log('✓ 返回顶部按钮可见:', buttonVisible);

    // 截图
    await page.screenshot({ path: 'temp/scrolled-page.png' });
  });

  test('CTA 按钮样式检查', async ({ page }) => {
    const ctaButton = page.locator('a[href="/auth/signup"]').first();

    // 检查按钮存在
    await expect(ctaButton).toBeVisible();

    // 获取按钮类名
    const buttonClass = await ctaButton.getAttribute('class');
    console.log('CTA 按钮类名:', buttonClass);

    // 检查是否有渐变类
    const hasGradient = buttonClass?.includes('from-brand-blue') ||
                        buttonClass?.includes('bg-gradient');
    console.log('✓ CTA 按钮渐变:', hasGradient);

    // 截取按钮
    await ctaButton.screenshot({ path: 'temp/cta-button.png' });
  });

  test('CSS 资源加载检查', async ({ page }) => {
    const cssFiles: string[] = [];
    const failedResources: string[] = [];

    page.on('response', response => {
      const url = response.url();
      if (url.includes('.css')) {
        cssFiles.push(url);
        if (response.status() !== 200) {
          failedResources.push(`${url} - ${response.status()}`);
        }
      }
    });

    await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    console.log('✓ 加载的 CSS 文件:', cssFiles);
    if (failedResources.length > 0) {
      console.log('✗ 加载失败的资源:', failedResources);
    }
  });

  test('Tailwind 自定义类检查', async ({ page }) => {
    // 检查自定义品牌色
    const brandElements = page.locator('[class*="brand-"]');
    const brandCount = await brandElements.count();
    console.log('✓ 使用品牌色的元素数量:', brandCount);

    // 检查动画类
    const animatedElements = page.locator('[class*="animate-"]');
    const animatedCount = await animatedElements.count();
    console.log('✓ 使用动画的元素数量:', animatedCount);

    // 生成诊断报告
    const report = {
      timestamp: new Date().toISOString(),
      brandElements: brandCount,
      animatedElements: animatedCount,
      pageUrl: page.url(),
    };

    writeFileSync(
      'temp/diagnostic-report.json',
      JSON.stringify(report, null, 2)
    );
  });
});
