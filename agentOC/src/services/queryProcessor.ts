import { SuiClient } from '@mysten/sui/client';
import { logger } from '../utils/logger';
import { ObjectMonitor, TradingObject, MarketData } from './objectMonitor';
import { AutoTrader } from './autoTrader';
import { TransferManager } from './transferManager';

export interface QueryResult {
  success: boolean;
  message: string;
  data?: any;
  error?: string;
}

export interface QueryContext {
  userAddress?: string;
  network: string;
  timestamp: number;
}

export class QueryProcessor {
  private suiClient: SuiClient;
  private objectMonitor: ObjectMonitor;
  private autoTrader: AutoTrader;
  private transferManager: TransferManager;
  private context: QueryContext;

  constructor(
    suiClient: SuiClient,
    objectMonitor: ObjectMonitor,
    autoTrader: AutoTrader,
    transferManager: TransferManager
  ) {
    this.suiClient = suiClient;
    this.objectMonitor = objectMonitor;
    this.autoTrader = autoTrader;
    this.transferManager = transferManager;
    
    this.context = {
      network: process.env.SUI_NETWORK || 'mainnet',
      timestamp: Date.now()
    };
  }

  async processQuery(query: string, userAddress?: string): Promise<QueryResult> {
    try {
      logger.info(`Processing query: ${query}`);
      
      // 更新上下文
      this.context.userAddress = userAddress;
      this.context.timestamp = Date.now();

      // 解析查询意图
      const intent = this.parseIntent(query);
      
      // 根据意图执行相应的操作
      switch (intent.type) {
        case 'market_info':
          return await this.handleMarketInfoQuery(intent.params);
        
        case 'object_info':
          return await this.handleObjectInfoQuery(intent.params);
        
        case 'account_info':
          return await this.handleAccountInfoQuery(intent.params);
        
        case 'trading_info':
          return await this.handleTradingInfoQuery(intent.params);
        
        case 'price_analysis':
          return await this.handlePriceAnalysisQuery(intent.params);
        
        case 'help':
          return this.handleHelpQuery();
        
        default:
          return {
            success: false,
            message: '抱歉，我无法理解您的查询。请尝试询问关于市场信息、对象详情、账户余额或交易策略的问题。'
          };
      }
    } catch (error) {
      logger.error('Error processing query:', error);
      return {
        success: false,
        message: '处理查询时发生错误，请稍后重试。',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private parseIntent(query: string): { type: string; params: any } {
    const lowerQuery = query.toLowerCase();

    // 市场信息查询
    if (lowerQuery.includes('市场') || lowerQuery.includes('market') || 
        lowerQuery.includes('统计') || lowerQuery.includes('数据')) {
      return { type: 'market_info', params: { query } };
    }

    // 对象信息查询
    if (lowerQuery.includes('对象') || lowerQuery.includes('object') || 
        lowerQuery.includes('商品') || lowerQuery.includes('物品')) {
      return { type: 'object_info', params: { query } };
    }

    // 账户信息查询
    if (lowerQuery.includes('账户') || lowerQuery.includes('余额') || 
        lowerQuery.includes('balance') || lowerQuery.includes('持仓')) {
      return { type: 'account_info', params: { query } };
    }

    // 交易信息查询
    if (lowerQuery.includes('交易') || lowerQuery.includes('trading') || 
        lowerQuery.includes('策略') || lowerQuery.includes('机会')) {
      return { type: 'trading_info', params: { query } };
    }

    // 价格分析查询
    if (lowerQuery.includes('价格') || lowerQuery.includes('price') || 
        lowerQuery.includes('分析') || lowerQuery.includes('趋势')) {
      return { type: 'price_analysis', params: { query } };
    }

    // 帮助查询
    if (lowerQuery.includes('帮助') || lowerQuery.includes('help') || 
        lowerQuery.includes('怎么') || lowerQuery.includes('如何')) {
      return { type: 'help', params: { query } };
    }

    return { type: 'unknown', params: { query } };
  }

  private async handleMarketInfoQuery(params: any): Promise<QueryResult> {
    try {
      const marketData = await this.objectMonitor.getMarketData();
      const allObjects = await this.objectMonitor.getAllObjects();
      
      // 计算额外统计信息
      const activeListings = allObjects.filter(obj => obj.isForSale).length;
      const averagePrice = allObjects.reduce((sum, obj) => sum + obj.price, 0) / allObjects.length;
      
      const priceRanges = this.calculatePriceRanges(allObjects);
      const recentActivity = await this.getRecentActivity();

      return {
        success: true,
        message: `当前市场概况：
📊 总对象数量: ${marketData.totalObjects}
🏪 在售对象: ${activeListings}
💰 平均价格: ${averagePrice.toFixed(2)} USDC
📈 总交易量: ${marketData.totalVolume} USDC

价格分布：
${priceRanges}

最近活动：
${recentActivity}`,
        data: {
          marketData,
          activeListings,
          averagePrice,
          priceRanges,
          recentActivity
        }
      };
    } catch (error) {
      logger.error('Error getting market info:', error);
      return {
        success: false,
        message: '获取市场信息失败，请稍后重试。',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private async handleObjectInfoQuery(params: any): Promise<QueryResult> {
    try {
      const query = params.query.toLowerCase();
      const allObjects = await this.objectMonitor.getAllObjects();
      
      // 根据查询条件筛选对象
      let filteredObjects = allObjects;
      
      // 价格筛选
      if (query.includes('低于') || query.includes('小于')) {
        const priceMatch = query.match(/(\d+)/);
        if (priceMatch) {
          const maxPrice = parseInt(priceMatch[1]);
          filteredObjects = filteredObjects.filter(obj => obj.price <= maxPrice);
        }
      }
      
      if (query.includes('高于') || query.includes('大于')) {
        const priceMatch = query.match(/(\d+)/);
        if (priceMatch) {
          const minPrice = parseInt(priceMatch[1]);
          filteredObjects = filteredObjects.filter(obj => obj.price >= minPrice);
        }
      }
      
      // 表情筛选
      const emojiMatch = query.match(/[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu);
      if (emojiMatch) {
        const emoji = emojiMatch[0];
        filteredObjects = filteredObjects.filter(obj => obj.emoji === emoji);
      }
      
      // 在售状态筛选
      if (query.includes('在售') || query.includes('出售')) {
        filteredObjects = filteredObjects.filter(obj => obj.isForSale);
      }

      if (filteredObjects.length === 0) {
        return {
          success: true,
          message: '没有找到符合条件的对象。'
        };
      }

      // 格式化结果
      const objectList = filteredObjects.slice(0, 10).map(obj => 
        `${obj.emoji} ${obj.bot} - ${obj.price} USDC ${obj.isForSale ? '(在售)' : '(未在售)'}`
      ).join('\n');

      return {
        success: true,
        message: `找到 ${filteredObjects.length} 个符合条件的对象：

${objectList}

${filteredObjects.length > 10 ? `... 还有 ${filteredObjects.length - 10} 个对象未显示` : ''}`,
        data: { objects: filteredObjects.slice(0, 10), total: filteredObjects.length }
      };
    } catch (error) {
      logger.error('Error getting object info:', error);
      return {
        success: false,
        message: '获取对象信息失败，请稍后重试。',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private async handleAccountInfoQuery(params: any): Promise<QueryResult> {
    try {
      if (!this.context.userAddress) {
        return {
          success: false,
          message: '请先提供您的钱包地址以查询账户信息。'
        };
      }

      // 获取用户拥有的对象
      const userObjects = await this.objectMonitor.getObjectsByOwner(this.context.userAddress);
      const userListings = userObjects.filter(obj => obj.isForSale);
      
      // 计算总价值
      const totalValue = userObjects.reduce((sum, obj) => sum + obj.price, 0);
      const listingValue = userListings.reduce((sum, obj) => sum + obj.price, 0);

      // 获取交易持仓信息
      const positions = this.autoTrader.getPositions();
      const positionValue = positions.reduce((sum, pos) => sum + pos.price, 0);

      return {
        success: true,
        message: `账户信息：
👛 钱包地址: ${this.context.userAddress}
🎯 持有对象: ${userObjects.length} 个
🏪 在售对象: ${userListings.length} 个
💰 持有对象总价值: ${totalValue.toFixed(2)} USDC
📈 在售对象价值: ${listingValue.toFixed(2)} USDC
🤖 自动交易持仓: ${positions.length} 个
💎 持仓总价值: ${positionValue.toFixed(2)} USDC

总资产价值: ${(totalValue + positionValue).toFixed(2)} USDC`,
        data: {
          userAddress: this.context.userAddress,
          userObjects,
          userListings,
          totalValue,
          listingValue,
          positions,
          positionValue
        }
      };
    } catch (error) {
      logger.error('Error getting account info:', error);
      return {
        success: false,
        message: '获取账户信息失败，请稍后重试。',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private async handleTradingInfoQuery(params: any): Promise<QueryResult> {
    try {
      // 获取交易机会
      const opportunities = await this.autoTrader.findOpportunities();
      const config = this.autoTrader.getConfig();
      const positions = this.autoTrader.getPositions();

      const opportunityList = opportunities.slice(0, 5).map(opp => 
        `${opp.action.toUpperCase()}: ${opp.object.bot} (${opp.object.emoji}) - 预期收益: ${opp.expectedProfit.toFixed(2)} USDC - 置信度: ${(opp.confidence * 100).toFixed(0)}%`
      ).join('\n');

      return {
        success: true,
        message: `交易信息：
🔍 发现机会: ${opportunities.length} 个
🤖 当前持仓: ${positions.length} 个
⚙️ 自动买入: ${config.autoBuyEnabled ? '启用' : '禁用'}
⚙️ 自动卖出: ${config.autoSellEnabled ? '启用' : '禁用'}
⚠️ 最大持仓数: ${config.maxPositions}
💰 最大买入价: ${config.maxBuyPrice} USDC

${opportunities.length > 0 ? `最佳交易机会：
${opportunityList}` : '当前暂无交易机会。'}`,
        data: {
          opportunities,
          config,
          positions
        }
      };
    } catch (error) {
      logger.error('Error getting trading info:', error);
      return {
        success: false,
        message: '获取交易信息失败，请稍后重试。',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private async handlePriceAnalysisQuery(params: any): Promise<QueryResult> {
    try {
      const allObjects = await this.objectMonitor.getAllObjects();
      const soldObjects = allObjects.filter(obj => !obj.isForSale);
      const activeObjects = allObjects.filter(obj => obj.isForSale);

      // 计算价格统计
      const prices = allObjects.map(obj => obj.price);
      const avgPrice = prices.reduce((sum, price) => sum + price, 0) / prices.length;
      const minPrice = Math.min(...prices);
      const maxPrice = Math.max(...prices);
      const medianPrice = this.calculateMedian(prices);

      // 价格分布
      const priceDistribution = this.calculatePriceDistribution(allObjects);

      return {
        success: true,
        message: `价格分析报告：
📊 平均价格: ${avgPrice.toFixed(2)} USDC
📉 最低价格: ${minPrice} USDC
📈 最高价格: ${maxPrice} USDC
🎯 中位价格: ${medianPrice.toFixed(2)} USDC
🏪 在售对象: ${activeObjects.length} 个
✅ 已售对象: ${soldObjects.length} 个

价格分布：
${priceDistribution}

市场趋势: ${avgPrice > medianPrice ? '📈 价格偏高，可能存在泡沫' : '📉 价格偏低，可能存在机会'}`,
        data: {
          avgPrice,
          minPrice,
          maxPrice,
          medianPrice,
          activeCount: activeObjects.length,
          soldCount: soldObjects.length,
          priceDistribution
        }
      };
    } catch (error) {
      logger.error('Error analyzing prices:', error);
      return {
        success: false,
        message: '价格分析失败，请稍后重试。',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private handleHelpQuery(): QueryResult {
    return {
      success: true,
      message: `🤖 Agent OC 助手使用指南

我可以帮您查询以下信息：

📊 市场信息：
- "市场概况" / "市场统计" / "市场数据"
- "有多少个对象在出售？"
- "总交易量是多少？"

🎯 对象信息：
- "显示所有对象" / "有哪些对象？"
- "价格低于100的对象"
- "表情为🤖的对象"
- "在售的对象"

👛 账户信息：
- "我的账户余额" / "我的持仓"
- "我拥有多少个对象？"
- "我的在售对象"

🤖 交易信息：
- "交易机会" / "有什么好机会？"
- "我的持仓情况"
- "自动交易状态"

💰 价格分析：
- "价格分析" / "价格趋势"
- "价格分布情况"
- "市场估值如何？"

❓ 其他：
- "帮助" / "怎么使用"
- 直接用自然语言描述您想了解的信息

请随时用自然语言向我提问！`
    };
  }

  private calculatePriceRanges(objects: TradingObject[]): string {
    const ranges = [
      { min: 0, max: 50, label: '0-50 USDC' },
      { min: 50, max: 100, label: '50-100 USDC' },
      { min: 100, max: 500, label: '100-500 USDC' },
      { min: 500, max: 1000, label: '500-1000 USDC' },
      { min: 1000, max: Infinity, label: '1000+ USDC' }
    ];

    return ranges.map(range => {
      const count = objects.filter(obj => obj.price >= range.min && obj.price < range.max).length;
      return `${range.label}: ${count} 个对象`;
    }).join('\n');
  }

  private calculateMedian(prices: number[]): number {
    const sorted = [...prices].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0 
      ? (sorted[mid - 1] + sorted[mid]) / 2 
      : sorted[mid];
  }

  private calculatePriceDistribution(objects: TradingObject[]): string {
    const total = objects.length;
    if (total === 0) return '暂无数据';

    const prices = objects.map(obj => obj.price).sort((a, b) => a - b);
    const p25 = prices[Math.floor(total * 0.25)];
    const p50 = prices[Math.floor(total * 0.5)];
    const p75 = prices[Math.floor(total * 0.75)];

    return `25%分位数: ${p25.toFixed(2)} USDC
50%分位数: ${p50.toFixed(2)} USDC
75%分位数: ${p75.toFixed(2)} USDC`;
  }

  private async getRecentActivity(): Promise<string> {
    try {
      // 这里可以实现最近活动的获取逻辑
      // 暂时返回模拟数据
      return `📈 最近1小时: 12笔交易
💰 最近24小时: 156笔交易
🎯 新上架对象: 8个
✅ 已售对象: 15个`;
    } catch (error) {
      logger.error('Error getting recent activity:', error);
      return '暂无最近活动数据';
    }
  }

  updateContext(userAddress?: string) {
    this.context.userAddress = userAddress;
    this.context.timestamp = Date.now();
  }

  getContext(): QueryContext {
    return { ...this.context };
  }
}
