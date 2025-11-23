import inquirer from 'inquirer';
import chalk from 'chalk';
import ora from 'ora';
import { logger } from '../utils/logger';
import { OpenAIService, ChatResponse } from './openaiService';
import { QueryProcessor, QueryResult } from './queryProcessor';
import { ObjectMonitor } from './objectMonitor';
import { AutoTrader } from './autoTrader';
import { TransferManager } from './transferManager';
import { SuiClient } from '@mysten/sui/client';

export interface ChatConfig {
  enableOpenAI: boolean;
  enableAutoTrading: boolean;
  userAddress?: string;
  showTimestamps: boolean;
  maxHistoryDisplay: number;
}

export class ChatInterface {
  private openaiService: OpenAIService | null = null;
  private queryProcessor: QueryProcessor | null = null;
  private config: ChatConfig;
  private isRunning: boolean = false;

  constructor() {
    this.config = {
      enableOpenAI: process.env.ENABLE_CHAT_INTERFACE === 'true',
      enableAutoTrading: process.env.ENABLE_AUTO_TRADING === 'true',
      showTimestamps: true,
      maxHistoryDisplay: 10
    };

    // 初始化服务
    this.initializeServices();
  }

  private initializeServices() {
    try {
      // 初始化OpenAI服务
      if (this.config.enableOpenAI) {
        this.openaiService = new OpenAIService();
        logger.info('OpenAI service initialized');
      } else {
        logger.warn('OpenAI service disabled');
      }

      // 初始化Sui客户端和其他服务
      const suiClient = new SuiClient({
        url: process.env.SUI_RPC_URL || 'https://fullnode.mainnet.sui.io:443'
      });

      const objectMonitor = new ObjectMonitor(suiClient);
      const autoTrader = new AutoTrader(suiClient, null as any); // 需要实际的keypair
      const transferManager = new TransferManager(suiClient, null as any); // 需要实际的keypair

      this.queryProcessor = new QueryProcessor(
        suiClient,
        objectMonitor,
        autoTrader,
        transferManager
      );

      logger.info('Query processor initialized');
    } catch (error) {
      logger.error('Failed to initialize services:', error);
    }
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      logger.warn('Chat interface is already running');
      return;
    }

    this.isRunning = true;
    logger.info('Starting Agent OC Chat Interface...');

    // 显示欢迎信息
    this.displayWelcome();

    // 主循环
    await this.mainLoop();
  }

  private displayWelcome(): void {
    console.log(chalk.cyan('\n🤖 欢迎使用 Agent OC 对话助手'));
    console.log(chalk.gray('━'.repeat(50)));
    
    if (this.config.enableOpenAI) {
      console.log(chalk.green('✅ OpenAI AI 助手已启用'));
    } else {
      console.log(chalk.yellow('⚠️  OpenAI AI 助手未启用，仅支持基础查询'));
    }

    console.log(chalk.blue(`📡 网络: ${process.env.SUI_NETWORK || 'mainnet'}`));
    console.log(chalk.blue(`🔗 RPC: ${process.env.SUI_RPC_URL || 'https://fullnode.mainnet.sui.io:443'}`));
    
    if (this.config.enableAutoTrading) {
      console.log(chalk.green('🤖 自动交易已启用'));
    }

    console.log(chalk.gray('━'.repeat(50)));
    console.log(chalk.white('输入 "help" 查看可用命令，输入 "exit" 退出'));
    console.log(chalk.gray('━'.repeat(50) + '\n'));
  }

  private async mainLoop(): Promise<void> {
    while (this.isRunning) {
      try {
        const { action } = await inquirer.prompt([
          {
            type: 'input',
            name: 'action',
            message: chalk.cyan('👤 您想了解什么？'),
            prefix: ''
          }
        ]);

        const input = action.trim().toLowerCase();

        // 处理特殊命令
        if (this.handleSpecialCommands(input)) {
          continue;
        }

        // 处理查询
        await this.handleQuery(input);

      } catch (error) {
        logger.error('Error in main loop:', error);
        console.log(chalk.red('❌ 处理请求时发生错误，请重试'));
      }
    }
  }

  private handleSpecialCommands(input: string): boolean {
    switch (input) {
      case 'exit':
      case 'quit':
      case '退出':
        console.log(chalk.yellow('👋 再见！'));
        this.isRunning = false;
        process.exit(0);
        return true;

      case 'help':
      case '帮助':
        this.displayHelp();
        return true;

      case 'clear':
      case '清屏':
        console.clear();
        this.displayWelcome();
        return true;

      case 'status':
      case '状态':
        this.displayStatus();
        return true;

      case 'history':
      case '历史':
        this.displayHistory();
        return true;

      case 'config':
      case '配置':
        this.displayConfig();
        return true;

      default:
        return false;
    }
  }

  private async handleQuery(input: string): Promise<void> {
    const spinner = ora('🤔 正在处理您的查询...').start();

    try {
      let response: ChatResponse | QueryResult;

      if (this.openaiService && this.config.enableOpenAI) {
        // 使用OpenAI处理查询
        response = await this.openaiService.chat(input);
        
        if (response.success) {
          spinner.succeed('✅ AI 助手回复完成');
          this.displayMessage(response.message, 'assistant');
        } else {
          spinner.fail('❌ AI 助手回复失败');
          this.displayMessage(response.message, 'error');
          
          // 尝试使用查询处理器
          await this.fallbackToQueryProcessor(input);
        }
      } else {
        // 直接使用查询处理器
        spinner.text = '🔍 正在查询数据...';
        response = await this.queryProcessor!.processQuery(input, this.config.userAddress);
        
        spinner.succeed('✅ 查询完成');
        
        if (response.success) {
          this.displayMessage(response.message, 'success');
        } else {
          this.displayMessage(response.message, 'error');
        }
      }

    } catch (error) {
      spinner.fail('❌ 查询失败');
      logger.error('Error handling query:', error);
      this.displayMessage('查询时发生错误，请稍后重试。', 'error');
    }
  }

  private async fallbackToQueryProcessor(input: string): Promise<void> {
    if (!this.queryProcessor) {
      this.displayMessage('查询处理器未初始化', 'error');
      return;
    }

    const spinner = ora('🔍 正在使用备用查询处理器...').start();
    
    try {
      const result = await this.queryProcessor.processQuery(input, this.config.userAddress);
      
      spinner.succeed('✅ 备用查询完成');
      
      if (result.success) {
        this.displayMessage(result.message, 'success');
      } else {
        this.displayMessage(result.message, 'error');
      }
    } catch (error) {
      spinner.fail('❌ 备用查询失败');
      this.displayMessage('备用查询也失败了，请检查系统配置', 'error');
    }
  }

  private displayMessage(message: string, type: 'success' | 'error' | 'info' | 'assistant' = 'info'): void {
    const timestamp = this.config.showTimestamps ? 
      `[${new Date().toLocaleTimeString()}] ` : '';

    switch (type) {
      case 'success':
        console.log(chalk.green(`${timestamp}✅ ${message}`));
        break;
      case 'error':
        console.log(chalk.red(`${timestamp}❌ ${message}`));
        break;
      case 'assistant':
        console.log(chalk.blue(`${timestamp}🤖 ${message}`));
        break;
      default:
        console.log(chalk.white(`${timestamp}ℹ️  ${message}`));
    }
  }

  private displayHelp(): void {
    console.log(chalk.cyan('\n📖 Agent OC 助手命令指南'));
    console.log(chalk.gray('━'.repeat(50)));
    
    console.log(chalk.white('基础命令:'));
    console.log(chalk.gray('  help/帮助      - 显示此帮助信息'));
    console.log(chalk.gray('  status/状态    - 显示系统状态'));
    console.log(chalk.gray('  history/历史  - 显示聊天历史'));
    console.log(chalk.gray('  config/配置    - 显示配置信息'));
    console.log(chalk.gray('  clear/清屏    - 清空屏幕'));
    console.log(chalk.gray('  exit/退出      - 退出程序'));
    
    console.log(chalk.white('\n查询示例:'));
    console.log(chalk.gray('  市场概况'));
    console.log(chalk.gray('  有多少个对象在出售？'));
    console.log(chalk.gray('  价格低于100的对象'));
    console.log(chalk.gray('  我的账户余额'));
    console.log(chalk.gray('  有什么交易机会？'));
    console.log(chalk.gray('  价格分析'));
    
    if (this.config.enableOpenAI) {
      console.log(chalk.white('\nAI 助手功能:'));
      console.log(chalk.gray('  可以用自然语言询问任何关于市场、对象、账户的问题'));
      console.log(chalk.gray('  AI 会理解您的意图并提供详细回答'));
    }
    
    console.log(chalk.gray('━'.repeat(50) + '\n'));
  }

  private displayStatus(): void {
    console.log(chalk.cyan('\n📊 系统状态'));
    console.log(chalk.gray('━'.repeat(30)));
    
    console.log(chalk.white(`OpenAI: ${this.config.enableOpenAI ? chalk.green('启用') : chalk.red('禁用')}`));
    console.log(chalk.white(`自动交易: ${this.config.enableAutoTrading ? chalk.green('启用') : chalk.red('禁用')}`));
    console.log(chalk.white(`网络: ${chalk.blue(process.env.SUI_NETWORK || 'mainnet')}`));
    console.log(chalk.white(`用户地址: ${this.config.userAddress || chalk.gray('未设置')}`));
    
    if (this.openaiService) {
      console.log(chalk.white(`AI模型: ${chalk.blue(this.openaiService.getModel())}`));
    }
    
    console.log(chalk.gray('━'.repeat(30) + '\n'));
  }

  private displayHistory(): void {
    if (!this.openaiService) {
      console.log(chalk.yellow('OpenAI 服务未启用，无历史记录'));
      return;
    }

    const history = this.openaiService.getChatHistory();
    const displayHistory = history.slice(-this.config.maxHistoryDisplay);

    console.log(chalk.cyan('\n📜 聊天历史 (最近' + this.config.maxHistoryDisplay + '条)'));
    console.log(chalk.gray('━'.repeat(50)));

    displayHistory.forEach((msg, index) => {
      const timestamp = new Date(msg.timestamp).toLocaleTimeString();
      const role = msg.role === 'user' ? '👤 用户' : '🤖 助手';
      const color = msg.role === 'user' ? chalk.white : chalk.blue;
      
      console.log(chalk.gray(`[${timestamp}] ${role}:`));
      console.log(color(msg.content));
      
      if (index < displayHistory.length - 1) {
        console.log(chalk.gray('─'));
      }
    });

    console.log(chalk.gray('━'.repeat(50) + '\n'));
  }

  private displayConfig(): void {
    console.log(chalk.cyan('\n⚙️  配置信息'));
    console.log(chalk.gray('━'.repeat(30)));
    
    console.log(chalk.white(`ENABLE_CHAT_INTERFACE: ${process.env.ENABLE_CHAT_INTERFACE}`));
    console.log(chalk.white(`ENABLE_AUTO_TRADING: ${process.env.ENABLE_AUTO_TRADING}`));
    console.log(chalk.white(`OPENAI_MODEL: ${process.env.OPENAI_MODEL || 'gpt-3.5-turbo'}`));
    console.log(chalk.white(`OPENAI_MAX_TOKENS: ${process.env.OPENAI_MAX_TOKENS || '1000'}`));
    console.log(chalk.white(`CHAT_HISTORY_LIMIT: ${process.env.CHAT_HISTORY_LIMIT || '50'}`));
    console.log(chalk.white(`SUI_NETWORK: ${process.env.SUI_NETWORK || 'mainnet'}`));
    
    console.log(chalk.gray('━'.repeat(30) + '\n'));
  }

  updateConfig(newConfig: Partial<ChatConfig>): void {
    this.config = { ...this.config, ...newConfig };
    logger.info('Chat interface config updated:', newConfig);
  }

  setUserAddress(address: string): void {
    this.config.userAddress = address;
    if (this.queryProcessor) {
      this.queryProcessor.updateContext(address);
    }
    logger.info('User address updated:', address);
  }

  stop(): void {
    this.isRunning = false;
    logger.info('Chat interface stopped');
  }
}
