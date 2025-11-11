#!/usr/bin/env tsx
/**
 * 测试 RPC 函数的正确性和性能
 */

import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function testAcceptFamilyInvite() {
  console.log('🧪 开始测试 accept_family_invite 函数...\n');

  // 模拟数据
  const testUserId = 'test-user-rpc-' + Date.now();
  const testFamilyId = 'test-family-rpc-' + Date.now();
  const testInvitationId = 'test-invite-rpc-' + Date.now();

  try {
    // 1. 创建测试家庭
    console.log('📝 步骤 1: 创建测试家庭...');
    const { error: familyError } = await supabase
      .from('families')
      .insert({
        id: testFamilyId,
        name: 'RPC Test Family',
        creatorId: 'test-creator-id',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

    if (familyError) {
      console.error('❌ 创建家庭失败:', familyError);
      return;
    }
    console.log('✅ 家庭创建成功\n');

    // 2. 创建邀请
    console.log('📝 步骤 2: 创建邀请...');
    const { error: inviteError } = await supabase
      .from('family_invitation')
      .insert({
        id: testInvitationId,
        family_id: testFamilyId,
        email: 'test@example.com',
        role: 'MEMBER',
        status: 'PENDING',
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      });

    if (inviteError) {
      console.error('❌ 创建邀请失败:', inviteError);
      return;
    }
    console.log('✅ 邀请创建成功\n');

    // 3. 测试成功场景
    console.log('📝 步骤 3: 测试成功接受邀请...');
    const startTime = Date.now();
    const { data: successData, error: successError } = await supabase.rpc(
      'accept_family_invite',
      {
        p_invitation_id: testInvitationId,
        p_user_id: testUserId,
        p_member_name: 'RPC Test User',
        p_gender: 'MALE',
        p_birth_date: '1990-01-01',
      }
    );
    const duration = Date.now() - startTime;

    if (successError) {
      console.error('❌ 调用 RPC 失败:', successError);
      return;
    }

    if (successData.success) {
      console.log('✅ 邀请接受成功');
      console.log('   - 消息:', successData.message);
      console.log('   - 成员名:', successData.data.member.name);
      console.log('   - 成员角色:', successData.data.member.role);
      console.log(`   - 响应时间: ${duration}ms`);
      
      if (duration > 100) {
        console.log('⚠️  警告: 响应时间超过 100ms');
      } else {
        console.log('✅ 性能达标 (< 100ms)');
      }
    } else {
      console.error('❌ 邀请接受失败:', successData.error);
    }

    // 4. 验证数据库状态
    console.log('\n📝 步骤 4: 验证数据库状态...');
    
    // 检查邀请状态
    const { data: invitation } = await supabase
      .from('family_invitation')
      .select('status')
      .eq('id', testInvitationId)
      .single();

    console.log('   - 邀请状态:', invitation?.status);
    if (invitation?.status === 'ACCEPTED') {
      console.log('   ✅ 邀请状态正确');
    } else {
      console.log('   ❌ 邀请状态错误');
    }

    // 检查成员记录
    const { data: member } = await supabase
      .from('family_members')
      .select('*')
      .eq('user_id', testUserId)
      .eq('family_id', testFamilyId)
      .single();

    if (member) {
      console.log('   - 成员记录存在: 是');
      console.log('   - 成员名:', member.name);
      console.log('   ✅ 成员记录正确');
    } else {
      console.log('   ❌ 成员记录不存在');
    }

    // 5. 测试错误场景
    console.log('\n📝 步骤 5: 测试错误场景...');
    
    // 尝试重复接受邀请
    const { data: duplicateData } = await supabase.rpc('accept_family_invite', {
      p_invitation_id: testInvitationId,
      p_user_id: testUserId,
      p_member_name: 'Duplicate User',
    });

    if (!duplicateData.success) {
      console.log('   ✅ 重复邀请被正确拒绝:', duplicateData.error);
    } else {
      console.log('   ❌ 重复邀请未被拒绝');
    }

    // 6. 清理测试数据
    console.log('\n📝 步骤 6: 清理测试数据...');
    await supabase.from('family_members').delete().eq('user_id', testUserId);
    await supabase.from('family_invitation').delete().eq('id', testInvitationId);
    await supabase.from('families').delete().eq('id', testFamilyId);
    console.log('✅ 测试数据清理完成');

    console.log('\n🎉 accept_family_invite 函数测试完成！');
    
  } catch (error) {
    console.error('❌ 测试过程中发生错误:', error);
    
    // 清理测试数据
    try {
      await supabase.from('family_members').delete().eq('user_id', testUserId);
      await supabase.from('family_invitation').delete().eq('id', testInvitationId);
      await supabase.from('families').delete().eq('id', testFamilyId);
    } catch (cleanupError) {
      console.error('清理数据时出错:', cleanupError);
    }
  }
}

// 运行测试
testAcceptFamilyInvite().catch(console.error);
