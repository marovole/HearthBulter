#!/usr/bin/env node

/**
 * Supabase 连接测试脚本
 * 
 * 验证 Supabase 配置和连接是否正常
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

// ANSI 颜色代码
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'blue');
}

// 显示横幅
function showBanner() {
  console.log('');
  log('╔═══════════════════════════════════════════════╗', 'blue');
  log('║     Supabase 连接测试                         ║', 'blue');
  log('╚═══════════════════════════════════════════════╝', 'blue');
  console.log('');
}

// 检查环境变量
function checkEnvironmentVariables() {
  logInfo('检查环境变量配置...');
  console.log('');

  const requiredVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  ];

  const optionalVars = ['SUPABASE_SERVICE_KEY'];

  let hasAllRequired = true;

  // 检查必需变量
  requiredVars.forEach((varName) => {
    if (process.env[varName]) {
      logSuccess(`${varName}: 已设置`);
    } else {
      logError(`${varName}: 未设置`);
      hasAllRequired = false;
    }
  });

  // 检查可选变量
  optionalVars.forEach((varName) => {
    if (process.env[varName]) {
      logSuccess(`${varName}: 已设置 (可选)`);
    } else {
      logWarning(`${varName}: 未设置 (可选，用于服务端)`);
    }
  });

  console.log('');

  if (!hasAllRequired) {
    logError('缺少必需的环境变量');
    console.log('');
    console.log('请在 .env.local 中设置以下变量：');
    console.log('  NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co');
    console.log('  NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx...');
    console.log('  SUPABASE_SERVICE_KEY=eyJxxx... (可选)');
    console.log('');
    process.exit(1);
  }

  logSuccess('环境变量配置正确');
  console.log('');
}

// 测试基本连接
async function testBasicConnection() {
  logInfo('测试基本连接...');

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );

    // 尝试执行简单查询
    const { data, error } = await supabase.from('users').select('id').limit(1);

    if (error) {
      // 如果表不存在，这是正常的（还未迁移）
      if (error.code === '42P01') {
        logWarning('表 "users" 不存在（可能还未运行迁移）');
        return true;
      }
      throw error;
    }

    logSuccess('基本连接测试通过');
    return true;
  } catch (error) {
    logError(`基本连接失败: ${error.message}`);
    return false;
  }
}

// 测试服务端连接
async function testServiceConnection() {
  if (!process.env.SUPABASE_SERVICE_KEY) {
    logWarning('跳过服务端连接测试（SUPABASE_SERVICE_KEY 未设置）');
    return true;
  }

  logInfo('测试服务端连接...');

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );

    // 服务端可以绕过 RLS，尝试访问
    const { data, error } = await supabase.from('users').select('id').limit(1);

    if (error) {
      if (error.code === '42P01') {
        logWarning('表 "users" 不存在（可能还未运行迁移）');
        return true;
      }
      throw error;
    }

    logSuccess('服务端连接测试通过');
    return true;
  } catch (error) {
    logError(`服务端连接失败: ${error.message}`);
    return false;
  }
}

// 测试认证功能
async function testAuthFunctionality() {
  logInfo('测试认证功能...');

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );

    // 测试获取会话（应该返回 null，因为未登录）
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();

    if (error) {
      throw error;
    }

    if (session === null) {
      logSuccess('认证功能测试通过（未登录状态）');
      return true;
    } else {
      logSuccess('认证功能测试通过（已登录状态）');
      return true;
    }
  } catch (error) {
    logError(`认证功能测试失败: ${error.message}`);
    return false;
  }
}

// 测试数据库 Schema
async function testDatabaseSchema() {
  if (!process.env.SUPABASE_SERVICE_KEY) {
    logWarning('跳过 Schema 测试（需要 SUPABASE_SERVICE_KEY）');
    return true;
  }

  logInfo('检查数据库 Schema...');

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );

    // 检查核心表是否存在
    const coreTables = [
      'users',
      'families',
      'family_members',
      'health_data',
      'meal_logs',
    ];

    const results = {};

    for (const table of coreTables) {
      const { error } = await supabase.from(table).select('id').limit(1);

      if (error) {
        if (error.code === '42P01') {
          results[table] = false;
        } else {
          throw error;
        }
      } else {
        results[table] = true;
      }
    }

    const existingTables = Object.entries(results)
      .filter(([_, exists]) => exists)
      .map(([table]) => table);

    const missingTables = Object.entries(results)
      .filter(([_, exists]) => !exists)
      .map(([table]) => table);

    if (existingTables.length > 0) {
      logSuccess(`找到 ${existingTables.length} 个表: ${existingTables.join(', ')}`);
    }

    if (missingTables.length > 0) {
      logWarning(`缺少 ${missingTables.length} 个表: ${missingTables.join(', ')}`);
      console.log('');
      console.log('提示: 运行迁移脚本创建表：');
      console.log('  npx tsx scripts/generate-supabase-schema.ts');
      console.log('  然后在 Supabase Dashboard 中执行生成的 SQL');
      console.log('');
    }

    return true;
  } catch (error) {
    logError(`Schema 检查失败: ${error.message}`);
    return false;
  }
}

// 显示配置信息
function showConfiguration() {
  logInfo('当前配置信息：');
  console.log('');

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '(未设置)';
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    ? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.substring(0, 20) + '...'
    : '(未设置)';
  const serviceKey = process.env.SUPABASE_SERVICE_KEY
    ? process.env.SUPABASE_SERVICE_KEY.substring(0, 20) + '...'
    : '(未设置)';

  console.log(`  Supabase URL: ${url}`);
  console.log(`  Anon Key: ${anonKey}`);
  console.log(`  Service Key: ${serviceKey}`);
  console.log('');
}

// 显示总结
function showSummary(results) {
  console.log('');
  log('╔═══════════════════════════════════════════════╗', 'blue');
  log('║              测试总结                         ║', 'blue');
  log('╚═══════════════════════════════════════════════╝', 'blue');
  console.log('');

  const tests = [
    { name: '环境变量配置', passed: results.envVars },
    { name: '基本连接', passed: results.basicConnection },
    { name: '服务端连接', passed: results.serviceConnection },
    { name: '认证功能', passed: results.authFunctionality },
    { name: 'Schema 检查', passed: results.schemaCheck },
  ];

  tests.forEach((test) => {
    if (test.passed) {
      logSuccess(`${test.name}: 通过`);
    } else {
      logError(`${test.name}: 失败`);
    }
  });

  console.log('');

  const allPassed = tests.every((test) => test.passed);

  if (allPassed) {
    log('╔═══════════════════════════════════════════════╗', 'green');
    log('║          所有测试通过！ 🎉                    ║', 'green');
    log('╚═══════════════════════════════════════════════╝', 'green');
    console.log('');
    console.log('Supabase 配置正确，可以开始使用。');
    console.log('');
  } else {
    log('╔═══════════════════════════════════════════════╗', 'red');
    log('║          部分测试失败                         ║', 'red');
    log('╚═══════════════════════════════════════════════╝', 'red');
    console.log('');
    console.log('请检查上面的错误信息并修复配置。');
    console.log('');
    process.exit(1);
  }
}

// 主函数
async function main() {
  showBanner();
  showConfiguration();

  const results = {
    envVars: false,
    basicConnection: false,
    serviceConnection: false,
    authFunctionality: false,
    schemaCheck: false,
  };

  try {
    // 1. 检查环境变量
    checkEnvironmentVariables();
    results.envVars = true;

    // 2. 测试基本连接
    results.basicConnection = await testBasicConnection();
    console.log('');

    // 3. 测试服务端连接
    results.serviceConnection = await testServiceConnection();
    console.log('');

    // 4. 测试认证功能
    results.authFunctionality = await testAuthFunctionality();
    console.log('');

    // 5. 检查 Schema
    results.schemaCheck = await testDatabaseSchema();
    console.log('');

    // 显示总结
    showSummary(results);
  } catch (error) {
    console.log('');
    logError(`测试过程出错: ${error.message}`);
    console.log('');
    console.error(error);
    process.exit(1);
  }
}

// 执行测试
if (require.main === module) {
  main();
}

module.exports = { main };
