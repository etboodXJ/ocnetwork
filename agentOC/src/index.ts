import dotenv from 'dotenv';
import { SuiClient } from '@mysten/sui/client';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { Transaction } from '@mysten/sui/transactions';
import cron from 'node-cron';
import { logger } from './utils/logger';
import { ObjectMonitor } from './services/objectMonitor';
import { AutoTrader } from './services/autoTrader';
import { TransferManager } from './services/transferManager';

// 加载环境变量
dotenv.config();

class AgentOC {
  private suiClient: SuiClient;
  private keypair: Ed25519Keypair;
  private objectMonitor: ObjectMonitor;
  private autoTrader: AutoTrader;
  private transferManager: TransferManager;

  constructor() {
    // 初始化Sui客户端
    this.suiClient = new SuiClient({
      url: process.env.SUI_RPC_URL || 'https://fullnode.mainnet.sui.io:443',
    });

    // 初始化密钥对
    const privateKey = process.env.AGENT_PRIVATE_KEY;
    if (!privateKey) {
      throw new Error('AGENT_PRIVATE_KEY environment variable is required');
    }

    // 验证私钥格式
    try {
      this.keypair = Ed25519Keypair.fromSecretKey(privateKey);
    } catch (error) {
      if (error instanceof Error && error.message.includes('Invalid checksum')) {
        throw new Error(`Invalid private key format: ${error.message}. Please check your AGENT_PRIVATE_KEY in .env file.`);
      }
      throw new Error(`Failed to initialize keypair: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // 初始化服务
    this.objectMonitor = new ObjectMonitor(this.suiClient);
    this.autoTrader = new AutoTrader(this.suiClient, this.keypair);
    this.transferManager = new TransferManager(this.suiClient, this.keypair);

    logger.info('Agent OC initialized');
  }

  async start() {
    logger.info('Starting Agent OC...');

    // 启动对象监控
    this.objectMonitor.start();

    // 启动自动交易
    this.autoTrader.start();

    // 启动转账管理器
    this.transferManager.start();

    // 设置定时任务
    this.setupCronJobs();

    logger.info('Agent OC started successfully');
  }

  private setupCronJobs() {
    // 每分钟检查一次市场状态
    cron.schedule('* * * * *', async () => {
      try {
        await this.checkMarketStatus();
      } catch (error) {
        logger.error('Error in market status check:', error);
      }
    });

    // 每5分钟执行一次自动交易策略
    cron.schedule('*/5 * * * *', async () => {
      try {
        await this.executeTradingStrategy();
      } catch (error) {
        logger.error('Error in trading strategy:', error);
      }
    });

    // 每小时清理过期订单
    cron.schedule('0 * * * *', async () => {
      try {
        await this.cleanupExpiredOrders();
      } catch (error) {
        logger.error('Error in cleanup:', error);
      }
    });

    logger.info('Cron jobs scheduled');
  }

  private async checkMarketStatus() {
    logger.info('Checking market status...');
    const marketData = await this.objectMonitor.getMarketData();
    logger.info(`Market status: ${marketData.totalObjects} objects, ${marketData.activeListings} active listings`);
  }

  private async executeTradingStrategy() {
    logger.info('Executing trading strategy...');
    const opportunities = await this.autoTrader.findOpportunities();
    
    if (opportunities.length > 0) {
      logger.info(`Found ${opportunities.length} trading opportunities`);
      for (const opportunity of opportunities) {
        try {
          await this.autoTrader.executeOpportunity(opportunity);
        } catch (error) {
          logger.error(`Failed to execute opportunity:`, error);
        }
      }
    } else {
      logger.info('No trading opportunities found');
    }
  }

  private async cleanupExpiredOrders() {
    logger.info('Cleaning up expired orders...');
    const cleaned = await this.objectMonitor.cleanupExpiredOrders();
    logger.info(`Cleaned up ${cleaned} expired orders`);
  }

  async stop() {
    logger.info('Stopping Agent OC...');
    this.objectMonitor.stop();
    this.autoTrader.stop();
    this.transferManager.stop();
    logger.info('Agent OC stopped');
  }
}

// 启动应用
async function main() {
  const agent = new AgentOC();

  // 优雅关闭处理
  process.on('SIGINT', async () => {
    logger.info('Received SIGINT, shutting down gracefully...');
    await agent.stop();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    logger.info('Received SIGTERM, shutting down gracefully...');
    await agent.stop();
    process.exit(0);
  });

  try {
    await agent.start();
  } catch (error) {
    logger.error('Failed to start Agent OC:', error);
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

if (require.main === module) {
  main();
}

export { AgentOC };
