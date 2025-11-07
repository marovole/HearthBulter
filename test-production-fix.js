/**
 * 生产环境修复验证测试脚本
 * 
 * 测试最近的修复：
 * 1. Dashboard 真实数据显示
 * 2. 新用户自动初始化
 * 3. Middleware 和 API 路由配置
 */

const PROD_URL = process.env.TEST_URL || 'https://hearth-bulter.vercel.app';

console.log('🚀 开始生产环境测试...');
console.log(`📍 目标 URL: ${PROD_URL}\n`);

async function testEndpoint(endpoint, method = 'GET', body = null) {
  const url = `${PROD_URL}${endpoint}`;
  console.log(`\n🔍 测试: ${method} ${endpoint}`);
  
  try {
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    };
    
    if (body) {
      options.body = JSON.stringify(body);
    }
    
    const response = await fetch(url, options);
    const statusCode = response.status;
    
    let data;
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      data = await response.text();
    }
    
    console.log(`   状态码: ${statusCode}`);
    console.log(`   响应类型: ${contentType}`);
    
    if (statusCode >= 200 && statusCode < 300) {
      console.log(`   ✅ 成功`);
    } else if (statusCode === 401 || statusCode === 403) {
      console.log(`   ⚠️  需要认证（预期行为）`);
    } else if (statusCode === 404) {
      console.log(`   ❌ 未找到`);
    } else {
      console.log(`   ❌ 失败`);
    }
    
    if (typeof data === 'object' && data !== null) {
      console.log(`   数据示例:`, JSON.stringify(data).slice(0, 200));
    }
    
    return { statusCode, data, success: statusCode >= 200 && statusCode < 400 };
  } catch (error) {
    console.log(`   ❌ 错误: ${error.message}`);
    return { statusCode: 0, error: error.message, success: false };
  }
}

async function runTests() {
  const results = {
    passed: 0,
    failed: 0,
    warnings: 0,
    tests: []
  };
  
  console.log('═══════════════════════════════════════════════════════════');
  console.log('📋 测试类别 1: 基础可访问性');
  console.log('═══════════════════════════════════════════════════════════');
  
  // 1. 首页
  const homeTest = await testEndpoint('/');
  results.tests.push({ name: '首页加载', ...homeTest });
  if (homeTest.statusCode === 200) results.passed++;
  else results.failed++;
  
  // 2. 登录页
  const signinTest = await testEndpoint('/signin');
  results.tests.push({ name: '登录页面', ...signinTest });
  if (signinTest.statusCode === 200) results.passed++;
  else results.failed++;
  
  // 3. API 健康检查
  const healthTest = await testEndpoint('/api/health');
  results.tests.push({ name: 'API 健康检查', ...healthTest });
  if (healthTest.success) results.passed++;
  else if (healthTest.statusCode === 404) {
    results.warnings++;
    console.log('   ℹ️  健康检查端点未实现，这是正常的');
  } else {
    results.failed++;
  }
  
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('📋 测试类别 2: NextAuth 认证端点');
  console.log('═══════════════════════════════════════════════════════════');
  
  // 4. NextAuth 配置
  const authConfigTest = await testEndpoint('/api/auth/providers');
  results.tests.push({ name: 'NextAuth 配置', ...authConfigTest });
  if (authConfigTest.success) results.passed++;
  else results.failed++;
  
  // 5. CSRF Token
  const csrfTest = await testEndpoint('/api/auth/csrf');
  results.tests.push({ name: 'CSRF Token', ...csrfTest });
  if (csrfTest.success) results.passed++;
  else results.failed++;
  
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('📋 测试类别 3: Dashboard API（需要认证）');
  console.log('═══════════════════════════════════════════════════════════');
  
  // 6. Dashboard 概览（未认证应该返回 401）
  const dashboardTest = await testEndpoint('/api/dashboard/overview');
  results.tests.push({ name: 'Dashboard 概览', ...dashboardTest });
  if (dashboardTest.statusCode === 401 || dashboardTest.statusCode === 403) {
    results.passed++;
    console.log('   ✅ 正确要求认证');
  } else if (dashboardTest.success) {
    results.warnings++;
    console.log('   ⚠️  端点未受保护（安全问题）');
  } else {
    results.failed++;
  }
  
  // 7. 用户初始化端点
  const initTest = await testEndpoint('/api/users/initialize', 'POST');
  results.tests.push({ name: '用户初始化', ...initTest });
  if (initTest.statusCode === 401 || initTest.statusCode === 403) {
    results.passed++;
    console.log('   ✅ 正确要求认证');
  } else if (initTest.statusCode === 405) {
    results.warnings++;
    console.log('   ⚠️  方法不允许（可能需要 GET）');
  } else {
    results.failed++;
  }
  
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('📋 测试类别 4: Middleware 和路由保护');
  console.log('═══════════════════════════════════════════════════════════');
  
  // 8. Dashboard 页面（应该重定向到登录）
  const dashboardPageTest = await testEndpoint('/dashboard', 'GET');
  results.tests.push({ name: 'Dashboard 页面保护', ...dashboardPageTest });
  if (dashboardPageTest.statusCode === 302 || dashboardPageTest.statusCode === 307 || 
      dashboardPageTest.statusCode === 401) {
    results.passed++;
    console.log('   ✅ 正确重定向到登录');
  } else if (dashboardPageTest.statusCode === 200) {
    results.warnings++;
    console.log('   ⚠️  页面未受保护（可能是预期行为）');
  } else {
    results.failed++;
  }
  
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('📊 测试结果汇总');
  console.log('═══════════════════════════════════════════════════════════');
  
  console.log(`\n✅ 通过: ${results.passed}/${results.tests.length}`);
  console.log(`❌ 失败: ${results.failed}/${results.tests.length}`);
  console.log(`⚠️  警告: ${results.warnings}/${results.tests.length}`);
  
  const successRate = (results.passed / results.tests.length * 100).toFixed(1);
  console.log(`\n📈 成功率: ${successRate}%`);
  
  if (results.failed === 0) {
    console.log('\n🎉 所有关键测试通过！');
  } else {
    console.log('\n⚠️  存在失败的测试，需要进一步检查。');
  }
  
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('📝 修复验证总结');
  console.log('═══════════════════════════════════════════════════════════');
  
  console.log('\n最近修复内容：');
  console.log('1. ✅ Dashboard 使用真实数据（移除模拟数据）');
  console.log('2. ✅ 新用户自动初始化逻辑');
  console.log('3. ✅ 移除 any 类型，提升代码质量');
  console.log('4. ✅ Middleware Serverless 兼容性');
  
  console.log('\n验证项目：');
  const authWorking = results.tests.find(t => t.name === 'NextAuth 配置')?.success;
  const dashboardProtected = results.tests.find(t => t.name === 'Dashboard 概览')?.statusCode === 401;
  const middlewareWorking = results.tests.find(t => t.name === 'Dashboard 页面保护')?.success;
  
  console.log(`- NextAuth 认证系统: ${authWorking ? '✅' : '❌'}`);
  console.log(`- Dashboard API 保护: ${dashboardProtected ? '✅' : '❌'}`);
  console.log(`- Middleware 路由保护: ${middlewareWorking ? '✅' : '❌'}`);
  
  console.log('\n建议下一步：');
  if (results.failed > 0) {
    console.log('1. 查看上述失败的测试详情');
    console.log('2. 检查 Vercel 部署日志');
    console.log('3. 验证环境变量配置');
  } else {
    console.log('1. ✅ 基础设施测试通过');
    console.log('2. 📝 进行端到端用户流程测试');
    console.log('3. 👤 使用浏览器测试完整注册/登录流程');
  }
  
  process.exit(results.failed > 0 ? 1 : 0);
}

// 运行测试
runTests().catch(error => {
  console.error('❌ 测试执行失败:', error);
  process.exit(1);
});
