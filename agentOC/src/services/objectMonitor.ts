import { SuiClient } from '@mysten/sui/client';
import { logger } from '../utils/logger';

export interface MarketData {
  totalObjects: number;
  activeListings: number;
  totalVolume: number;
  averagePrice: number;
}

export interface TradingObject {
  id: string;
  owner: string;
  bot: string;
  emoji: string;
  avatar: string;
  blobId: string;
  price: number;
  isForSale: boolean;
  createdAt: number;
}

export class ObjectMonitor {
  private suiClient: SuiClient;
  private isRunning: boolean = false;
  private monitoringInterval: NodeJS.Timeout | null = null;

  constructor(suiClient: SuiClient) {
    this.suiClient = suiClient;
  }

  start() {
    if (this.isRunning) {
      logger.warn('ObjectMonitor is already running');
      return;
    }

    this.isRunning = true;
    logger.info('Starting ObjectMonitor...');

    // 每30秒检查一次市场状态
    this.monitoringInterval = setInterval(async () => {
      try {
        await this.monitorMarket();
      } catch (error) {
        logger.error('Error in market monitoring:', error);
      }
    }, 30000);

    logger.info('ObjectMonitor started');
  }

  stop() {
    if (!this.isRunning) {
      logger.warn('ObjectMonitor is not running');
      return;
    }

    this.isRunning = false;
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    logger.info('ObjectMonitor stopped');
  }

  private async monitorMarket() {
    logger.debug('Monitoring market...');
    
    try {
      const marketData = await this.getMarketData();
      logger.info('Market update:', marketData);

      // 检查是否有新的对象上架
      const newObjects = await this.getNewObjects();
      if (newObjects.length > 0) {
        logger.info(`Found ${newObjects.length} new objects`);
        for (const obj of newObjects) {
          await this.handleNewObject(obj);
        }
      }

      // 检查价格变化
      const priceChanges = await this.getPriceChanges();
      if (priceChanges.length > 0) {
        logger.info(`Detected ${priceChanges.length} price changes`);
        for (const change of priceChanges) {
          await this.handlePriceChange(change);
        }
      }

    } catch (error) {
      logger.error('Error monitoring market:', error);
    }
  }

  async getMarketData(): Promise<MarketData> {
    try {
      // 这里应该调用合约获取市场数据
      // 暂时返回模拟数据
      return {
        totalObjects: 100,
        activeListings: 45,
        totalVolume: 150000,
        averagePrice: 3333
      };
    } catch (error) {
      logger.error('Error getting market data:', error);
      throw error;
    }
  }

  async getAllObjects(): Promise<TradingObject[]> {
    try {
      // 这里应该调用合约获取所有对象
      // 暂时返回模拟数据
      return [
        {
          id: '1',
          owner: '0x1234567890abcdef',
          bot: 'AI Assistant',
          emoji: '🤖',
          avatar: 'https://example.com/avatar1.jpg',
          blobId: 'blob_123',
          price: 100,
          isForSale: true,
          createdAt: Date.now() - 86400000 // 1天前
        },
        {
          id: '2',
          owner: '0xabcdef1234567890',
          bot: 'Chat Bot',
          emoji: '💬',
          avatar: 'https://example.com/avatar2.jpg',
          blobId: 'blob_456',
          price: 200,
          isForSale: true,
          createdAt: Date.now() - 172800000 // 2天前
        }
      ];
    } catch (error) {
      logger.error('Error getting all objects:', error);
      throw error;
    }
  }

  async getNewObjects(): Promise<TradingObject[]> {
    try {
      const allObjects = await this.getAllObjects();
      const oneHourAgo = Date.now() - 3600000;
      
      return allObjects.filter(obj => obj.createdAt > oneHourAgo);
    } catch (error) {
      logger.error('Error getting new objects:', error);
      throw error;
    }
  }

  async getPriceChanges(): Promise<Array<{objectId: string, oldPrice: number, newPrice: number}>> {
    try {
      // 这里应该实现价格变化检测逻辑
      // 暂时返回空数组
      return [];
    } catch (error) {
      logger.error('Error getting price changes:', error);
      throw error;
    }
  }

  private async handleNewObject(obj: TradingObject) {
    logger.info(`New object listed: ${obj.bot} (${obj.emoji}) - ${obj.price} USDC`);
    
    // 这里可以实现新对象的通知逻辑
    // 例如：发送通知、记录到数据库等
  }

  private async handlePriceChange(change: {objectId: string, oldPrice: number, newPrice: number}) {
    logger.info(`Price change detected for object ${change.objectId}: ${change.oldPrice} -> ${change.newPrice} USDC`);
    
    // 这里可以实现价格变化的通知逻辑
  }

  async cleanupExpiredOrders(): Promise<number> {
    try {
      logger.info('Cleaning up expired orders...');
      
      // 这里应该实现过期订单清理逻辑
      // 暂时返回模拟数据
      const cleanedCount = 0;
      
      logger.info(`Cleaned up ${cleanedCount} expired orders`);
      return cleanedCount;
    } catch (error) {
      logger.error('Error cleaning up expired orders:', error);
      throw error;
    }
  }

  async getObjectById(objectId: string): Promise<TradingObject | null> {
    try {
      const allObjects = await this.getAllObjects();
      return allObjects.find(obj => obj.id === objectId) || null;
    } catch (error) {
      logger.error(`Error getting object ${objectId}:`, error);
      throw error;
    }
  }

  async getObjectsByOwner(owner: string): Promise<TradingObject[]> {
    try {
      const allObjects = await this.getAllObjects();
      return allObjects.filter(obj => obj.owner === owner);
    } catch (error) {
      logger.error(`Error getting objects for owner ${owner}:`, error);
      throw error;
    }
  }

  async getObjectsInPriceRange(minPrice: number, maxPrice: number): Promise<TradingObject[]> {
    try {
      const allObjects = await this.getAllObjects();
      return allObjects.filter(obj => 
        obj.isForSale && obj.price >= minPrice && obj.price <= maxPrice
      );
    } catch (error) {
      logger.error(`Error getting objects in price range ${minPrice}-${maxPrice}:`, error);
      throw error;
    }
  }
}
