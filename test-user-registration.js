const { chromium } = require('@playwright/test');

async function testUserRegistration() {
  console.log('🚀 开始用户注册测试...\n');

  // 启动浏览器
  const browser = await chromium.launch({
    headless: false, // 显示浏览器窗口
    slowMo: 500 // 放慢操作以便观察
  });

  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // 生成唯一的测试账号
    const timestamp = Date.now();
    const testEmail = `test.user.${timestamp}@example.com`;
    const testPassword = 'TestPassword123!';
    const testName = `测试用户${timestamp}`;

    console.log(`📧 测试邮箱: ${testEmail}`);
    console.log(`👤 用户名: ${testName}\n`);

    // 步骤 1: 访问主页
    console.log('步骤 1: 访问主页 http://localhost:3000');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
    await page.screenshot({ path: 'screenshots/01-homepage.png' });
    console.log('✅ 主页加载成功\n');

    // 步骤 2: 导航到注册页面
    console.log('步骤 2: 前往注册页面');
    // 尝试多种可能的注册链接
    try {
      await page.click('text=注册', { timeout: 3000 });
    } catch {
      try {
        await page.click('text=Sign up', { timeout: 3000 });
      } catch {
        // 直接访问注册页面
        await page.goto('http://localhost:3000/auth/signup', { waitUntil: 'networkidle' });
      }
    }

    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'screenshots/02-signup-page.png' });
    console.log('✅ 注册页面加载成功\n');

    // 步骤 3: 填写注册表单
    console.log('步骤 3: 填写注册表单');

    // 填写用户名
    const nameInput = await page.locator('input[name="name"], input[placeholder*="名"], input[placeholder*="Name"]').first();
    if (await nameInput.isVisible()) {
      await nameInput.fill(testName);
      console.log('  ✅ 填写用户名');
    }

    // 填写邮箱
    const emailInput = await page.locator('input[type="email"], input[name="email"]').first();
    await emailInput.fill(testEmail);
    console.log('  ✅ 填写邮箱');

    // 填写密码
    const passwordInputs = await page.locator('input[type="password"]').all();
    if (passwordInputs.length > 0) {
      await passwordInputs[0].fill(testPassword);
      console.log('  ✅ 填写密码');
    }

    // 填写确认密码（如果有）
    if (passwordInputs.length > 1) {
      await passwordInputs[1].fill(testPassword);
      console.log('  ✅ 填写确认密码');
    }

    await page.screenshot({ path: 'screenshots/03-form-filled.png' });
    console.log('\n步骤 4: 提交注册表单');

    // 步骤 4: 提交表单
    const submitButton = await page.locator('button[type="submit"], button:has-text("注册"), button:has-text("Sign up")').first();
    await submitButton.click();

    console.log('  ⏳ 等待注册响应...\n');

    // 等待跳转或错误信息
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'screenshots/04-after-submit.png' });

    // 检查是否注册成功
    const currentUrl = page.url();
    console.log(`当前 URL: ${currentUrl}`);

    // 检查页面内容
    const pageContent = await page.content();

    if (currentUrl.includes('/dashboard') || currentUrl.includes('/onboarding')) {
      console.log('✅ 注册成功！已跳转到:', currentUrl);
      await page.screenshot({ path: 'screenshots/05-success.png' });
    } else if (pageContent.includes('error') || pageContent.includes('错误')) {
      console.log('❌ 注册失败 - 检测到错误信息');
      const errorMsg = await page.locator('.error, [class*="error"]').first().textContent().catch(() => '未找到具体错误');
      console.log('错误信息:', errorMsg);
    } else {
      console.log('⚠️ 注册状态不明确，请查看截图');
    }

    console.log('\n📸 所有截图已保存到 screenshots/ 目录');
    console.log('\n测试完成！浏览器将在 5 秒后关闭...');
    await page.waitForTimeout(5000);

  } catch (error) {
    console.error('\n❌ 测试过程中出错:', error.message);
    await page.screenshot({ path: 'screenshots/error.png' });
    console.log('错误截图已保存到 screenshots/error.png');
  } finally {
    await browser.close();
    console.log('\n✅ 测试结束\n');
  }
}

// 运行测试
testUserRegistration().catch(console.error);
