import dotenv from 'dotenv';
import { SuiClient } from '@mysten/sui/client';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { logger } from './utils/logger';
import { ObjectMonitor } from './services/objectMonitor';
import { AutoTrader } from './services/autoTrader';
import { TransferManager } from './services/transferManager';
import { ChatInterface } from './services/chatInterface';
import { AgentOC } from './index';

// 加载环境变量
dotenv.config();

class ChatMode {
  private chatInterface: ChatInterface | null = null;
  private suiClient: SuiClient;
  private keypair: Ed25519Keypair | null = null;

  constructor() {
    // 初始化Sui客户端
    this.suiClient = new SuiClient({
      url: process.env.SUI_RPC_URL || 'https://fullnode.mainnet.sui.io:443',
    });

    // 初始化密钥对
    const privateKey = process.env.AGENT_PRIVATE_KEY;
    if (!privateKey) {
      logger.warn('AGENT_PRIVATE_KEY not found, some features may be limited');
      this.keypair = null;
    } else {
      try {
        this.keypair = Ed25519Keypair.fromSecretKey(privateKey);
      } catch (error) {
        if (error instanceof Error && error.message.includes('Invalid checksum')) {
          throw new Error(`Invalid private key format: ${error.message}. Please check your AGENT_PRIVATE_KEY in .env file.`);
        }
        throw new Error(`Failed to initialize keypair: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // 初始化聊天界面
    this.chatInterface = new ChatInterface();
  }

  async start(): Promise<void> {
    logger.info('Starting Agent OC Chat Mode...');

    try {
      // 检查是否启用了聊天界面
      if (process.env.ENABLE_CHAT_INTERFACE !== 'true') {
        console.log('❌ Chat interface is disabled. Please set ENABLE_CHAT_INTERFACE=true in your .env file.');
        process.exit(1);
      }

      // 检查OpenAI配置
      if (!process.env.OPENAI_API_KEY) {
        console.log('⚠️  OpenAI API key not found. AI features will be disabled.');
        console.log('   Please set OPENAI_API_KEY in your .env file to enable AI features.');
        console.log('   You can still use basic query commands without AI.');
      }

      // 设置用户地址（如果有的话）
      if (this.keypair && this.chatInterface) {
        const userAddress = this.keypair.getPublicKey().toSuiAddress();
        this.chatInterface.setUserAddress(userAddress);
        console.log(`👛 User address: ${userAddress}`);
      }

      // 启动聊天界面
      if (this.chatInterface) {
        await this.chatInterface.start();
      }

    } catch (error) {
      logger.error('Failed to start chat mode:', error);
      console.error('❌ Failed to start chat mode:', error instanceof Error ? error.message : 'Unknown error');
      process.exit(1);
    }
  }

  async stop(): Promise<void> {
    logger.info('Stopping Agent OC Chat Mode...');
    if (this.chatInterface) {
      this.chatInterface.stop();
    }
  }
}

// 启动聊天模式
async function main() {
  const chatMode = new ChatMode();

  // 优雅关闭处理
  process.on('SIGINT', async () => {
    logger.info('Received SIGINT, shutting down gracefully...');
    await chatMode.stop();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    logger.info('Received SIGTERM, shutting down gracefully...');
    await chatMode.stop();
    process.exit(0);
  });

  try {
    await chatMode.start();
  } catch (error) {
    logger.error('Failed to start chat mode:', error);
    process.exit(1);
  }
}

// 错误处理
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  if (reason instanceof Error) {
    console.error('Stack trace:', reason.stack);
  }
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  console.error('Stack trace:', error.stack);
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

// 检查是否直接运行此文件
if (require.main === module) {
  main();
}

export { ChatMode };
