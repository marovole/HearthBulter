/**
 * Supabase Adapter CRUD 操作测试
 *
 * 测试 Supabase Adapter 的基本 CRUD 操作和关系查询
 */

// 加载环境变量
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(__dirname, '../.env.local') });

import { supabaseAdapter } from '../src/lib/db/supabase-adapter';

// 颜色输出
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message: string, color: keyof typeof colors = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function testCRUD() {
  log('\n🧪 开始 Supabase Adapter CRUD 测试\n', 'cyan');

  let testUserId: string | null = null;

  try {
    // 1. Create 测试
    log('1️⃣  测试 Create 操作...', 'blue');
    const testEmail = `test-${Date.now()}@example.com`;

    const newUser = await supabaseAdapter.user.create({
      data: {
        email: testEmail,
        name: 'Test User for Supabase Migration',
        passwordHash: 'hashed_password_placeholder',
      },
    });

    testUserId = newUser.id;
    log(`   ✅ Create 成功: ${newUser.email} (ID: ${newUser.id})`, 'green');

    // 2. FindUnique 测试
    log('\n2️⃣  测试 FindUnique 操作...', 'blue');
    const foundUser = await supabaseAdapter.user.findUnique({
      where: { id: testUserId },
    });

    if (!foundUser) {
      throw new Error('FindUnique 失败：未找到用户');
    }

    log(`   ✅ FindUnique 成功: ${foundUser.email}`, 'green');

    // 3. Update 测试
    log('\n3️⃣  测试 Update 操作...', 'blue');
    const updatedUser = await supabaseAdapter.user.update({
      where: { id: testUserId },
      data: { name: 'Updated Test User' },
    });

    if (updatedUser.name !== 'Updated Test User') {
      throw new Error('Update 失败：名称未更新');
    }

    log(`   ✅ Update 成功: ${updatedUser.name}`, 'green');

    // 4. FindMany with filters 测试
    log('\n4️⃣  测试 FindMany 操作（带过滤条件）...', 'blue');
    const users = await supabaseAdapter.user.findMany({
      where: {
        email: { contains: 'test-' },
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    log(`   ✅ FindMany 成功: 找到 ${users.length} 个测试用户`, 'green');

    // 5. Count 测试
    log('\n5️⃣  测试 Count 操作...', 'blue');
    const count = await supabaseAdapter.user.count({
      where: {
        email: { contains: 'test-' },
      },
    });

    log(`   ✅ Count 成功: 共 ${count} 个测试用户`, 'green');

    // 6. FindFirst 测试
    log('\n6️⃣  测试 FindFirst 操作...', 'blue');
    const firstUser = await supabaseAdapter.user.findFirst({
      where: {
        email: { contains: 'test-' },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!firstUser) {
      throw new Error('FindFirst 失败：未找到用户');
    }

    log(`   ✅ FindFirst 成功: ${firstUser.email}`, 'green');

    // 7. Delete 测试
    log('\n7️⃣  测试 Delete 操作...', 'blue');
    await supabaseAdapter.user.delete({
      where: { id: testUserId },
    });

    // 验证删除
    const deletedUser = await supabaseAdapter.user.findUnique({
      where: { id: testUserId },
    });

    if (deletedUser) {
      throw new Error('Delete 失败：用户仍然存在');
    }

    log('   ✅ Delete 成功', 'green');
    testUserId = null; // 标记为已删除

    // 8. 关系查询测试（如果数据存在）
    log('\n8️⃣  测试关系查询（include）...', 'blue');
    const userWithFamilies = await supabaseAdapter.familyMember.findFirst({
      include: {
        user: true,
        family: true,
      },
    });

    if (userWithFamilies) {
      log('   ✅ 关系查询成功: 找到家庭成员数据', 'green');
      log(`      - 用户: ${userWithFamilies.user?.email || 'N/A'}`, 'cyan');
      log(`      - 家庭: ${userWithFamilies.family?.name || 'N/A'}`, 'cyan');
    } else {
      log('   ⚠️  关系查询: 数据库中暂无家庭成员数据', 'yellow');
    }

    // 测试成功
    log('\n╔═══════════════════════════════════════════════╗', 'green');
    log('║          🎉 所有 CRUD 测试通过！              ║', 'green');
    log('╚═══════════════════════════════════════════════╝', 'green');
    log('\n✅ Supabase Adapter 功能验证完成', 'green');
    log('✅ 数据一致性检查通过\n', 'green');

  } catch (error) {
    log('\n❌ 测试失败：', 'red');
    console.error(error);

    // 清理测试数据
    if (testUserId) {
      try {
        await supabaseAdapter.user.delete({
          where: { id: testUserId },
        });
        log('\n🧹 已清理测试数据', 'yellow');
      } catch (cleanupError) {
        log('⚠️  清理测试数据失败', 'yellow');
      }
    }

    process.exit(1);
  }
}

// 运行测试
testCRUD()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('意外错误：', error);
    process.exit(1);
  });
