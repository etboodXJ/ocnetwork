import OpenAI from 'openai';
import { logger } from '../utils/logger';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export interface ChatResponse {
  message: string;
  success: boolean;
  error?: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export class OpenAIService {
  private openai: OpenAI;
  private chatHistory: ChatMessage[] = [];
  private maxHistorySize: number;
  private model: string;
  private maxTokens: number;
  private temperature: number;

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      logger.warn('OpenAI API key not found, OpenAI features will be disabled');
      throw new Error('OPENAI_API_KEY environment variable is required');
    }

    // 使用自定义的Base URL（支持OpenAI兼容的大模型）
    const baseURL = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';
    logger.info(`Using OpenAI compatible API at: ${baseURL}`);

    this.openai = new OpenAI({
      apiKey: apiKey,
      baseURL: baseURL
    });

    // 使用自定义模型（支持GLM-4.5-Flash等大模型）
    this.model = process.env.OPENAI_MODEL || 'gpt-3.5-turbo';
    logger.info(`Using model: ${this.model}`);
    
    this.maxTokens = parseInt(process.env.OPENAI_MAX_TOKENS || '1000');
    this.temperature = parseFloat(process.env.OPENAI_TEMPERATURE || '0.7');
    this.maxHistorySize = parseInt(process.env.CHAT_HISTORY_LIMIT || '50');

    // 初始化系统消息
    this.initializeSystemMessage();
  }

  private initializeSystemMessage() {
    const systemMessage: ChatMessage = {
      role: 'system',
      content: `你是一个专业的Sui区块链交易助手，专门帮助用户查询和分析OC（Object Collection）项目的信息。

你的主要功能包括：
1. 查询市场信息和统计数据
2. 分析交易对象和价格趋势
3. 提供账户余额和持仓信息
4. 解释交易策略和风险
5. 回答关于Sui区块链和OC项目的问题

请用中文回答，保持专业、准确、友好的语调。如果遇到不确定的信息，请诚实地说明。

当前环境配置：
- 网络: ${process.env.SUI_NETWORK || 'mainnet'}
- 合约包ID: ${process.env.CONTRACT_PACKAGE_ID || '未配置'}
- 市场ID: ${process.env.MARKETPLACE_OBJECT_ID || '未配置'}`,
      timestamp: Date.now()
    };

    this.chatHistory.push(systemMessage);
  }

  async chat(userMessage: string): Promise<ChatResponse> {
    try {
      logger.info(`User message: ${userMessage}`);

      // 添加用户消息到历史记录
      const userChatMessage: ChatMessage = {
        role: 'user',
        content: userMessage,
        timestamp: Date.now()
      };

      this.chatHistory.push(userChatMessage);

      // 准备发送给OpenAI的消息
      const messages = this.chatHistory.map(msg => ({
        role: msg.role,
        content: msg.content
      }));

      // 调用OpenAI API
      const completion = await this.openai.chat.completions.create({
        model: this.model,
        messages: messages,
        max_tokens: this.maxTokens,
        temperature: this.temperature,
      });

      const assistantMessage = completion.choices[0]?.message?.content || '抱歉，我无法处理您的请求。';

      // 添加助手回复到历史记录
      const assistantChatMessage: ChatMessage = {
        role: 'assistant',
        content: assistantMessage,
        timestamp: Date.now()
      };

      this.chatHistory.push(assistantChatMessage);

      // 清理历史记录，保持在限制范围内
      this.cleanupHistory();

      logger.info(`Assistant response: ${assistantMessage}`);

      return {
        message: assistantMessage,
        success: true,
        usage: completion.usage ? {
          prompt_tokens: completion.usage.prompt_tokens,
          completion_tokens: completion.usage.completion_tokens,
          total_tokens: completion.usage.total_tokens
        } : undefined
      };

    } catch (error) {
      logger.error('OpenAI API error:', error);
      
      let errorMessage = '抱歉，处理您的请求时出现了错误。';
      
      if (error instanceof Error) {
        if (error.message.includes('API key')) {
          errorMessage = 'OpenAI API密钥配置错误，请检查环境变量。';
        } else if (error.message.includes('quota')) {
          errorMessage = 'API配额已用完，请检查您的OpenAI账户。';
        } else if (error.message.includes('rate limit')) {
          errorMessage = '请求频率过高，请稍后再试。';
        } else {
          errorMessage = `错误: ${error.message}`;
        }
      }

      return {
        message: errorMessage,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private cleanupHistory() {
    // 保留系统消息和最近的对话记录
    const systemMessages = this.chatHistory.filter(msg => msg.role === 'system');
    const otherMessages = this.chatHistory.filter(msg => msg.role !== 'system');
    
    // 如果消息数量超过限制，删除最旧的消息
    if (otherMessages.length > this.maxHistorySize) {
      const excessCount = otherMessages.length - this.maxHistorySize;
      const startIndex = this.chatHistory.findIndex(msg => msg.role !== 'system');
      
      if (startIndex !== -1) {
        this.chatHistory.splice(startIndex, excessCount);
      }
    }
  }

  getChatHistory(): ChatMessage[] {
    return [...this.chatHistory];
  }

  clearHistory() {
    this.chatHistory = [];
    this.initializeSystemMessage();
    logger.info('Chat history cleared');
  }

  isConfigured(): boolean {
    return !!process.env.OPENAI_API_KEY;
  }

  getModel(): string {
    return this.model;
  }

  updateConfig(config: {
    model?: string;
    maxTokens?: number;
    temperature?: number;
  }) {
    if (config.model) {
      this.model = config.model;
    }
    if (config.maxTokens) {
      this.maxTokens = config.maxTokens;
    }
    if (config.temperature !== undefined) {
      this.temperature = config.temperature;
    }
    
    logger.info('OpenAI service configuration updated:', config);
  }
}
