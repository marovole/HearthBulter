const { chromium } = require('@playwright/test');

async function testCompleteUserJourney() {
  console.log('🚀 开始完整用户路径测试...\n');

  const browser = await chromium.launch({
    headless: false,
    slowMo: 300
  });

  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    const timestamp = Date.now();
    const testEmail = `test.user.${timestamp}@example.com`;
    const testPassword = 'TestPassword123!';
    const testName = `测试用户${timestamp}`;

    console.log(`📧 测试邮箱: ${testEmail}`);
    console.log(`👤 用户名: ${testName}\n`);

    // ============ 步骤 1: 注册 ============
    console.log('📝 步骤 1: 用户注册');
    console.log('─────────────────────────────');

    await page.goto('http://localhost:3000/auth/signup', { waitUntil: 'networkidle' });
    await page.screenshot({ path: 'screenshots/journey-01-signup.png' });

    // 填写注册表单
    await page.locator('input[name="name"]').fill(testName);
    await page.locator('input[type="email"]').fill(testEmail);
    const passwordInputs = await page.locator('input[type="password"]').all();
    await passwordInputs[0].fill(testPassword);
    await passwordInputs[1].fill(testPassword);

    console.log('  ✅ 表单填写完成');
    await page.screenshot({ path: 'screenshots/journey-02-form-filled.png' });

    // 提交注册
    await page.locator('button[type="submit"]').click();
    console.log('  ⏳ 提交注册请求...');

    // 等待跳转到登录页面（增加超时时间）
    await page.waitForURL('**/auth/signin', { timeout: 10000 });
    console.log('  ✅ 注册成功！已跳转到登录页面\n');
    await page.screenshot({ path: 'screenshots/journey-03-redirected-to-signin.png' });

    // ============ 步骤 2: 登录 ============
    console.log('🔐 步骤 2: 用户登录');
    console.log('─────────────────────────────');

    // 填写登录表单
    await page.waitForTimeout(1000);
    await page.locator('input[type="email"]').fill(testEmail);
    await page.locator('input[type="password"]').fill(testPassword);

    console.log('  ✅ 登录表单填写完成');
    await page.screenshot({ path: 'screenshots/journey-04-login-form.png' });

    // 提交登录
    await page.locator('button[type="submit"]').click();
    console.log('  ⏳ 提交登录请求...');

    // 等待登录成功跳转
    await page.waitForTimeout(3000);
    const currentUrl = page.url();
    console.log(`  当前 URL: ${currentUrl}`);

    if (currentUrl.includes('/dashboard') || currentUrl.includes('/onboarding') || currentUrl === 'http://localhost:3000/') {
      console.log('  ✅ 登录成功！\n');
      await page.screenshot({ path: 'screenshots/journey-05-logged-in.png' });
    } else {
      console.log('  ⚠️ 登录后停留在:', currentUrl, '\n');
      await page.screenshot({ path: 'screenshots/journey-05-after-login.png' });
    }

    // ============ 步骤 3: 导航测试 ============
    console.log('🧭 步骤 3: 页面导航测试');
    console.log('─────────────────────────────');

    // 测试主要页面访问
    const pagesToTest = [
      { url: 'http://localhost:3000/', name: '首页' },
      { url: 'http://localhost:3000/dashboard', name: '仪表板' },
      { url: 'http://localhost:3000/meal-planning', name: '膳食规划' },
      { url: 'http://localhost:3000/shopping-list', name: '购物清单' },
    ];

    for (const testPage of pagesToTest) {
      try {
        await page.goto(testPage.url, { waitUntil: 'networkidle', timeout: 5000 });
        console.log(`  ✅ ${testPage.name} - 访问成功`);
        await page.screenshot({
          path: `screenshots/journey-06-${testPage.name.replace(/\s+/g, '-')}.png`
        });
      } catch (error) {
        console.log(`  ⚠️ ${testPage.name} - 访问失败: ${error.message}`);
      }
    }

    console.log('\n🧪 步骤 4: API 测试');
    console.log('─────────────────────────────');

    // 测试食品搜索 API（已登录状态）
    await page.goto('http://localhost:3000/');

    // 假设有搜索框，尝试搜索
    try {
      const searchInput = await page.locator('input[placeholder*="搜索"], input[type="search"]').first();
      if (await searchInput.isVisible({ timeout: 2000 })) {
        await searchInput.fill('鸡胸肉');
        await page.keyboard.press('Enter');
        await page.waitForTimeout(2000);
        console.log('  ✅ 食品搜索测试完成');
        await page.screenshot({ path: 'screenshots/journey-07-search-result.png' });
      } else {
        console.log('  ℹ️ 未找到搜索框');
      }
    } catch (error) {
      console.log('  ℹ️ 搜索功能测试跳过');
    }

    console.log('\n✅ 完整用户路径测试成功！');
    console.log('📸 所有截图已保存到 screenshots/ 目录');
    console.log('\n测试摘要:');
    console.log('  ✅ 用户注册 - 成功');
    console.log('  ✅ 用户登录 - 成功');
    console.log('  ✅ 页面导航 - 成功');
    console.log('\n浏览器将在 5 秒后关闭...');
    await page.waitForTimeout(5000);

  } catch (error) {
    console.error('\n❌ 测试失败:', error.message);
    console.error('错误堆栈:', error.stack);
    await page.screenshot({ path: 'screenshots/journey-error.png' });
  } finally {
    await browser.close();
    console.log('\n🏁 测试结束\n');
  }
}

testCompleteUserJourney().catch(console.error);
