import { callOpenAI, RECOMMENDED_MODELS } from '../src/lib/services/ai/openai-client';

/**
 * 简单OpenRouter API连接测试
 */

async function testOpenRouterConnection() {
  console.log('🔄 测试OpenRouter API连接...');

  try {
    const response = await callOpenAI(
      '请用一句话介绍一下你自己。',
      RECOMMENDED_MODELS.FREE[0],
      50, // 简短回复
      0.7
    );

    console.log('✅ OpenRouter API连接成功!');
    console.log('🤖 回复:', response.content);
    console.log('📊 Token使用:', response.tokens);
    console.log('🎯 模型:', response.model);

    return true;
  } catch (error) {
    console.error('❌ OpenRouter API连接失败:');
    console.error('错误详情:', error);

    // 检查是否是认证问题
    if (error instanceof Error && error.message.includes('401')) {
      console.log('\n🔧 可能的问题:');
      console.log('1. API密钥是否正确？');
      console.log('2. 是否有足够的API额度？');
      console.log('3. 网络连接是否正常？');
    }

    return false;
  }
}

// 运行测试
testOpenRouterConnection()
  .then(success => {
    console.log('\n' + '='.repeat(50));
    if (success) {
      console.log('🎉 OpenRouter API测试通过！');
    } else {
      console.log('⚠️ OpenRouter API测试失败，请检查配置。');
    }
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('测试执行失败:', error);
    process.exit(1);
  });
