import { SuiClient } from '@mysten/sui/client';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { Transaction } from '@mysten/sui/transactions';
import { logger } from '../utils/logger';
import { TradingObject } from './objectMonitor';

export interface TradingOpportunity {
  objectId: string;
  object: TradingObject;
  action: 'buy' | 'sell' | 'arbitrage';
  expectedProfit: number;
  confidence: number;
  reason: string;
}

export interface TradingConfig {
  maxBuyPrice: number;
  minSellPrice: number;
  maxPositions: number;
  riskTolerance: number;
  autoBuyEnabled: boolean;
  autoSellEnabled: boolean;
}

export class AutoTrader {
  private suiClient: SuiClient;
  private keypair: Ed25519Keypair;
  private isRunning: boolean = false;
  private config: TradingConfig;
  private positions: Map<string, TradingObject> = new Map();

  constructor(suiClient: SuiClient, keypair: Ed25519Keypair) {
    this.suiClient = suiClient;
    this.keypair = keypair;
    
    this.config = {
      maxBuyPrice: parseFloat(process.env.MAX_BUY_PRICE || '1000'),
      minSellPrice: parseFloat(process.env.MIN_SELL_PRICE || '100'),
      maxPositions: parseInt(process.env.MAX_POSITIONS || '10'),
      riskTolerance: parseFloat(process.env.RISK_TOLERANCE || '0.5'),
      autoBuyEnabled: process.env.AUTO_BUY_ENABLED === 'true',
      autoSellEnabled: process.env.AUTO_SELL_ENABLED === 'true',
    };
  }

  start() {
    if (this.isRunning) {
      logger.warn('AutoTrader is already running');
      return;
    }

    this.isRunning = true;
    logger.info('Starting AutoTrader...', this.config);
  }

  stop() {
    if (!this.isRunning) {
      logger.warn('AutoTrader is not running');
      return;
    }

    this.isRunning = false;
    logger.info('AutoTrader stopped');
  }

  async findOpportunities(): Promise<TradingOpportunity[]> {
    try {
      logger.debug('Searching for trading opportunities...');
      const opportunities: TradingOpportunity[] = [];

      // 获取市场中的所有对象
      const allObjects = await this.getAllMarketObjects();
      
      // 分析每个对象
      for (const obj of allObjects) {
        const opportunity = await this.analyzeObject(obj);
        if (opportunity) {
          opportunities.push(opportunity);
        }
      }

      // 按预期利润排序
      opportunities.sort((a, b) => b.expectedProfit - a.expectedProfit);

      logger.info(`Found ${opportunities.length} trading opportunities`);
      return opportunities;
    } catch (error) {
      logger.error('Error finding opportunities:', error);
      return [];
    }
  }

  async executeOpportunity(opportunity: TradingOpportunity): Promise<boolean> {
    try {
      logger.info(`Executing opportunity: ${opportunity.action} ${opportunity.objectId} - ${opportunity.reason}`);

      switch (opportunity.action) {
        case 'buy':
          return await this.executeBuy(opportunity);
        case 'sell':
          return await this.executeSell(opportunity);
        case 'arbitrage':
          return await this.executeArbitrage(opportunity);
        default:
          logger.warn(`Unknown action: ${opportunity.action}`);
          return false;
      }
    } catch (error) {
      logger.error(`Error executing opportunity:`, error);
      return false;
    }
  }

  private async analyzeObject(obj: TradingObject): Promise<TradingOpportunity | null> {
    // 检查是否已经持有该对象
    if (this.positions.has(obj.id)) {
      return null;
    }

    // 检查是否可购买
    if (!obj.isForSale) {
      return null;
    }

    // 价格检查
    if (obj.price > this.config.maxBuyPrice) {
      return null;
    }

    // 计算机会
    const opportunities = [
      this.checkUndervalued(obj),
      this.checkTrendOpportunity(obj),
      this.checkRarityOpportunity(obj),
    ];

    // 选择最佳机会
    const bestOpportunity = opportunities
      .filter(opp => opp !== null)
      .sort((a, b) => b!.expectedProfit - a!.expectedProfit)[0];

    return bestOpportunity;
  }

  private checkUndervalued(obj: TradingObject): TradingOpportunity | null {
    // 简单的估值逻辑：如果价格低于平均价格的30%，认为是低估
    const averagePrice = 500; // 这里应该从市场数据计算
    const undervaluationThreshold = averagePrice * 0.7;

    if (obj.price < undervaluationThreshold) {
      const expectedProfit = (averagePrice - obj.price) * 0.8; // 保守估计
      return {
        objectId: obj.id,
        object: obj,
        action: 'buy',
        expectedProfit,
        confidence: 0.7,
        reason: `Undervalued: ${obj.price} < ${undervaluationThreshold}`
      };
    }

    return null;
  }

  private checkTrendOpportunity(obj: TradingObject): TradingOpportunity | null {
    // 趋势分析逻辑
    // 这里可以实现更复杂的技术分析
    return null;
  }

  private checkRarityOpportunity(obj: TradingObject): TradingOpportunity | null {
    // 稀有性分析逻辑
    // 这里可以根据表情包、机器人类型等判断稀有性
    const rareEmojis = ['🦄', '🐉', '🔮', '💎'];
    if (rareEmojis.includes(obj.emoji)) {
      const expectedProfit = obj.price * 0.5; // 预期50%利润
      return {
        objectId: obj.id,
        object: obj,
        action: 'buy',
        expectedProfit,
        confidence: 0.8,
        reason: `Rare emoji: ${obj.emoji}`
      };
    }

    return null;
  }

  private async executeBuy(opportunity: TradingOpportunity): Promise<boolean> {
    if (!this.config.autoBuyEnabled) {
      logger.info('Auto-buy is disabled, skipping buy opportunity');
      return false;
    }

    if (this.positions.size >= this.config.maxPositions) {
      logger.info('Max positions reached, skipping buy opportunity');
      return false;
    }

    try {
      // 创建交易
      const tx = new Transaction();
      
      // 这里应该调用合约的购买函数
      // tx.moveCall({
      //   target: `${PACKAGE_ID}::trading_object::purchase_object`,
      //   arguments: [
      //     tx.object(MARKETPLACE_ID),
      //     tx.pure(opportunity.objectId),
      //     tx.splitCoins(tx.gas, [tx.pure(opportunity.object.price)])
      //   ]
      // });

      // 执行交易
      const result = await this.suiClient.signAndExecuteTransaction({
        transaction: tx,
        signer: this.keypair,
        options: {
          showEffects: true,
          showObjectChanges: true,
        },
      });

      if (result.effects?.status.status === 'success') {
        logger.info(`Successfully bought object ${opportunity.objectId}`);
        this.positions.set(opportunity.objectId, opportunity.object);
        return true;
      } else {
        logger.error(`Failed to buy object ${opportunity.objectId}:`, result.effects?.status.error);
        return false;
      }
    } catch (error) {
      logger.error(`Error executing buy for ${opportunity.objectId}:`, error);
      return false;
    }
  }

  private async executeSell(opportunity: TradingOpportunity): Promise<boolean> {
    if (!this.config.autoSellEnabled) {
      logger.info('Auto-sell is disabled, skipping sell opportunity');
      return false;
    }

    try {
      // 创建交易
      const tx = new Transaction();
      
      // 这里应该调用合约的上架函数
      // tx.moveCall({
      //   target: `${PACKAGE_ID}::trading_object::list_object`,
      //   arguments: [
      //     tx.object(MARKETPLACE_ID),
      //     tx.object(opportunity.objectId)
      //   ]
      // });

      // 执行交易
      const result = await this.suiClient.signAndExecuteTransaction({
        transaction: tx,
        signer: this.keypair,
        options: {
          showEffects: true,
          showObjectChanges: true,
        },
      });

      if (result.effects?.status.status === 'success') {
        logger.info(`Successfully listed object ${opportunity.objectId} for sale`);
        return true;
      } else {
        logger.error(`Failed to list object ${opportunity.objectId}:`, result.effects?.status.error);
        return false;
      }
    } catch (error) {
      logger.error(`Error executing sell for ${opportunity.objectId}:`, error);
      return false;
    }
  }

  private async executeArbitrage(opportunity: TradingOpportunity): Promise<boolean> {
    // 套利逻辑
    logger.info('Arbitrage not implemented yet');
    return false;
  }

  private async getAllMarketObjects(): Promise<TradingObject[]> {
    // 这里应该从ObjectMonitor获取市场对象
    // 暂时返回空数组
    return [];
  }

  updateConfig(newConfig: Partial<TradingConfig>) {
    this.config = { ...this.config, ...newConfig };
    logger.info('Trading config updated:', this.config);
  }

  getPositions(): TradingObject[] {
    return Array.from(this.positions.values());
  }

  getConfig(): TradingConfig {
    return { ...this.config };
  }
}
