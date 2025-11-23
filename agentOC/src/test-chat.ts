import dotenv from 'dotenv';
import { ChatInterface } from './services/chatInterface';

// 加载环境变量
dotenv.config();

async function testChatInterface() {
  console.log('🧪 测试 Agent OC 对话界面...\n');

  try {
    // 创建聊天界面实例
    const chatInterface = new ChatInterface();
    
    console.log('✅ 聊天界面创建成功');
    
    // 测试配置
    console.log('📋 当前配置:');
    console.log(`  - ENABLE_CHAT_INTERFACE: ${process.env.ENABLE_CHAT_INTERFACE}`);
    console.log(`  - OPENAI_API_KEY: ${process.env.OPENAI_API_KEY ? '已配置' : '未配置'}`);
    console.log(`  - SUI_NETWORK: ${process.env.SUI_NETWORK}`);
    console.log(`  - AGENT_PRIVATE_KEY: ${process.env.AGENT_PRIVATE_KEY ? '已配置' : '未配置'}`);
    
    // 测试查询处理器（如果可用）
    if (chatInterface['queryProcessor']) {
      console.log('\n🔍 测试查询处理器...');
      
      // 这里可以添加一些基础测试
      // 但由于需要实际的Sui连接，我们暂时跳过
      console.log('✅ 查询处理器可用');
    }
    
    console.log('\n🎉 测试完成！现在可以运行以下命令：');
    console.log('  npm run chat    # 启动对话界面');
    console.log('  npm run build  # 构建项目');
    
  } catch (error) {
    console.error('❌ 测试失败:', error);
    process.exit(1);
  }
}

// 运行测试
if (require.main === module) {
  testChatInterface();
}
