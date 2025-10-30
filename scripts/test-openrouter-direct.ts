import dotenv from 'dotenv';

// 加载环境变量
dotenv.config({ path: '.env.local' });

/**
 * 直接测试OpenRouter API连接（不使用OpenAI SDK）
 */

async function testOpenRouterDirect() {
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    console.error('❌ 未找到OPENROUTER_API_KEY环境变量');
    return false;
  }

  console.log('🔄 直接测试OpenRouter API连接...');
  console.log('🔑 API Key前缀:', apiKey.substring(0, 10) + '...');

  try {
    // 先测试models端点
    console.log('📋 测试models端点...');
    const modelsResponse = await fetch('https://openrouter.ai/api/v1/models', {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!modelsResponse.ok) {
      console.error('❌ Models端点测试失败:', modelsResponse.status, modelsResponse.statusText);
      const errorText = await modelsResponse.text();
      console.error('错误详情:', errorText);
      return false;
    }

    const modelsData = await modelsResponse.json();
    console.log('✅ Models端点正常，返回模型数量:', modelsData.data?.length || 0);

    // 测试chat completions
    console.log('💬 测试chat completions...');
    const chatResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://hearthbulter.com',
        'X-Title': 'Hearth Butler Health App',
      },
      body: JSON.stringify({
        model: 'openai/gpt-oss-20b:free',
        messages: [
          {
            role: 'user',
            content: '你好，请简单介绍一下你自己。'
          }
        ],
        max_tokens: 100,
        temperature: 0.7,
      }),
    });

    if (!chatResponse.ok) {
      console.error('❌ Chat completions测试失败:', chatResponse.status, chatResponse.statusText);
      const errorText = await chatResponse.text();
      console.error('错误详情:', errorText);
      return false;
    }

    const chatData = await chatResponse.json();
    const reply = chatData.choices?.[0]?.message?.content;

    console.log('✅ Chat completions正常!');
    console.log('🤖 AI回复:', reply ? reply.substring(0, 100) + '...' : '无回复内容');
    console.log('📊 Token使用:', chatData.usage?.total_tokens || '未知');

    return true;

  } catch (error) {
    console.error('❌ 网络请求失败:', error);
    return false;
  }
}

// 运行测试
testOpenRouterDirect()
  .then(success => {
    console.log('\n' + '='.repeat(50));
    if (success) {
      console.log('🎉 OpenRouter API测试完全通过！');
      console.log('✅ API密钥有效');
      console.log('✅ 网络连接正常');
      console.log('✅ 模型调用成功');
    } else {
      console.log('⚠️ OpenRouter API测试失败');
      console.log('🔧 建议检查:');
      console.log('1. API密钥是否正确');
      console.log('2. OpenRouter账户是否有余额');
      console.log('3. 网络连接是否正常');
      console.log('4. 模型名称是否正确');
    }
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('测试执行失败:', error);
    process.exit(1);
  });
