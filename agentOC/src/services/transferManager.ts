import { SuiClient } from '@mysten/sui/client';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { Transaction } from '@mysten/sui/transactions';
import { logger } from '../utils/logger';

export interface TransferRequest {
  to: string;
  amount: number;
  currency: 'SUI' | 'USDC';
  memo?: string;
}

export interface TransferHistory {
  id: string;
  from: string;
  to: string;
  amount: number;
  currency: string;
  timestamp: number;
  txHash: string;
  status: 'pending' | 'completed' | 'failed';
  memo?: string;
}

export class TransferManager {
  private suiClient: SuiClient;
  private keypair: Ed25519Keypair;
  private isRunning: boolean = false;
  private pendingTransfers: Map<string, TransferRequest> = new Map();
  private transferHistory: TransferHistory[] = [];

  constructor(suiClient: SuiClient, keypair: Ed25519Keypair) {
    this.suiClient = suiClient;
    this.keypair = keypair;
  }

  start() {
    if (this.isRunning) {
      logger.warn('TransferManager is already running');
      return;
    }

    this.isRunning = true;
    logger.info('Starting TransferManager...');
  }

  stop() {
    if (!this.isRunning) {
      logger.warn('TransferManager is not running');
      return;
    }

    this.isRunning = false;
    logger.info('TransferManager stopped');
  }

  async scheduleTransfer(request: TransferRequest): Promise<string> {
    const transferId = `transfer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    this.pendingTransfers.set(transferId, request);
    logger.info(`Transfer scheduled: ${transferId}`, request);

    // 立即执行转账
    try {
      await this.executeTransfer(transferId, request);
    } catch (error) {
      logger.error(`Failed to execute transfer ${transferId}:`, error);
      this.pendingTransfers.delete(transferId);
      throw error;
    }

    return transferId;
  }

  private async executeTransfer(transferId: string, request: TransferRequest): Promise<void> {
    try {
      logger.info(`Executing transfer ${transferId}:`, request);

      const tx = new Transaction();

      if (request.currency === 'SUI') {
        // 转账SUI
        const coin = tx.splitCoins(tx.gas, [tx.pure.u64(request.amount * 1_000_000_000)]);
        tx.transferObjects([coin], tx.pure.address(request.to));
      } else if (request.currency === 'USDC') {
        // 转账USDC (需要先获取USDC余额)
        const usdcCoins = await this.getUSDCBalance();
        if (usdcCoins < request.amount) {
          throw new Error(`Insufficient USDC balance: ${usdcCoins} < ${request.amount}`);
        }

        // 这里应该获取USDC coin对象并转账
        // tx.transferObjects([usdcCoin], tx.pure(request.to));
      }

      // 添加备注
      if (request.memo) {
        // 在Sui中可以通过其他方式添加备注
      }

      const result = await this.suiClient.signAndExecuteTransaction({
        transaction: tx,
        signer: this.keypair,
        options: {
          showEffects: true,
          showObjectChanges: true,
        },
      });

      if (result.effects?.status.status === 'success') {
        logger.info(`Transfer ${transferId} completed successfully`);
        
        // 记录到历史
        const history: TransferHistory = {
          id: transferId,
          from: this.keypair.getPublicKey().toSuiAddress(),
          to: request.to,
          amount: request.amount,
          currency: request.currency,
          timestamp: Date.now(),
          txHash: result.digest,
          status: 'completed',
          memo: request.memo,
        };

        this.transferHistory.push(history);
        this.pendingTransfers.delete(transferId);
      } else {
        logger.error(`Transfer ${transferId} failed:`, result.effects?.status.error);
        
        // 记录失败
        const history: TransferHistory = {
          id: transferId,
          from: this.keypair.getPublicKey().toSuiAddress(),
          to: request.to,
          amount: request.amount,
          currency: request.currency,
          timestamp: Date.now(),
          txHash: result.digest || '',
          status: 'failed',
          memo: request.memo,
        };

        this.transferHistory.push(history);
        this.pendingTransfers.delete(transferId);
        
        throw new Error(`Transfer failed: ${result.effects?.status.error}`);
      }
    } catch (error) {
      logger.error(`Error executing transfer ${transferId}:`, error);
      throw error;
    }
  }

  async getBalance(currency: 'SUI' | 'USDC'): Promise<number> {
    try {
      const address = this.keypair.getPublicKey().toSuiAddress();
      
      if (currency === 'SUI') {
        const balance = await this.suiClient.getBalance({
          owner: address,
        });
        return Number(balance.totalBalance) / 1_000_000_000; // 转换为SUI
      } else if (currency === 'USDC') {
        return await this.getUSDCBalance();
      }
      
      return 0;
    } catch (error) {
      logger.error(`Error getting ${currency} balance:`, error);
      throw error;
    }
  }

  private async getUSDCBalance(): Promise<number> {
    try {
      const address = this.keypair.getPublicKey().toSuiAddress();
      
      // 这里应该查询USDC代币余额
      // 暂时返回模拟数据
      return 1000;
    } catch (error) {
      logger.error('Error getting USDC balance:', error);
      return 0;
    }
  }

  async batchTransfer(requests: TransferRequest[]): Promise<string[]> {
    logger.info(`Executing batch transfer of ${requests.length} requests`);
    
    const transferIds: string[] = [];
    
    for (const request of requests) {
      try {
        const transferId = await this.scheduleTransfer(request);
        transferIds.push(transferId);
        
        // 添加延迟以避免网络拥堵
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        logger.error('Batch transfer failed for request:', request, error);
      }
    }
    
    logger.info(`Batch transfer completed: ${transferIds.length}/${requests.length} successful`);
    return transferIds;
  }

  async distributeFunds(recipients: string[], totalAmount: number, currency: 'SUI' | 'USDC'): Promise<string[]> {
    const amountPerRecipient = totalAmount / recipients.length;
    const requests: TransferRequest[] = recipients.map(to => ({
      to,
      amount: amountPerRecipient,
      currency,
      memo: 'Batch distribution'
    }));

    return await this.batchTransfer(requests);
  }

  async collectFunds(fromAddresses: string[], currency: 'SUI' | 'USDC'): Promise<void> {
    logger.info(`Collecting funds from ${fromAddresses.length} addresses`);
    
    // 这里应该实现资金收集逻辑
    // 需要从多个地址收集资金到主地址
    logger.info('Fund collection not fully implemented yet');
  }

  getPendingTransfers(): Map<string, TransferRequest> {
    return new Map(this.pendingTransfers);
  }

  getTransferHistory(limit?: number): TransferHistory[] {
    if (limit) {
      return this.transferHistory.slice(-limit);
    }
    return [...this.transferHistory];
  }

  getTransferHistoryByAddress(address: string, limit?: number): TransferHistory[] {
    const filtered = this.transferHistory.filter(
      transfer => transfer.from === address || transfer.to === address
    );
    
    if (limit) {
      return filtered.slice(-limit);
    }
    return filtered;
  }

  async retryFailedTransfers(): Promise<string[]> {
    const failedTransfers = this.transferHistory.filter(
      transfer => transfer.status === 'failed'
    );

    const retriedIds: string[] = [];

    for (const failedTransfer of failedTransfers) {
      try {
        const request: TransferRequest = {
          to: failedTransfer.to,
          amount: failedTransfer.amount,
          currency: failedTransfer.currency as 'SUI' | 'USDC',
          memo: `Retry: ${failedTransfer.memo || ''}`,
        };

        const transferId = await this.scheduleTransfer(request);
        retriedIds.push(transferId);
        
        logger.info(`Retried failed transfer: ${failedTransfer.id} -> ${transferId}`);
      } catch (error) {
        logger.error(`Failed to retry transfer ${failedTransfer.id}:`, error);
      }
    }

    return retriedIds;
  }

  async estimateTransferFee(amount: number, currency: 'SUI' | 'USDC'): Promise<number> {
    try {
      // 创建模拟交易来估算费用
      const tx = new Transaction();
      
      if (currency === 'SUI') {
        const coin = tx.splitCoins(tx.gas, [tx.pure.u64(amount * 1_000_000_000)]);
        tx.transferObjects([coin], tx.pure.address(this.keypair.getPublicKey().toSuiAddress()));
      }

      const result = await this.suiClient.dryRunTransactionBlock({
        transactionBlock: await tx.build({ client: this.suiClient }),
      });
      
      // 返回估算的gas费用
      return Number(result.effects?.gasUsed?.computationCost || 0) / 1_000_000_000;
    } catch (error) {
      logger.error('Error estimating transfer fee:', error);
      return 0.001; // 默认估算值
    }
  }

  getTransferStats(): {
    totalTransfers: number;
    successfulTransfers: number;
    failedTransfers: number;
    totalVolume: number;
    averageTransferAmount: number;
  } {
    const totalTransfers = this.transferHistory.length;
    const successfulTransfers = this.transferHistory.filter(t => t.status === 'completed').length;
    const failedTransfers = this.transferHistory.filter(t => t.status === 'failed').length;
    const totalVolume = this.transferHistory
      .filter(t => t.status === 'completed')
      .reduce((sum, t) => sum + t.amount, 0);
    const averageTransferAmount = successfulTransfers > 0 ? totalVolume / successfulTransfers : 0;

    return {
      totalTransfers,
      successfulTransfers,
      failedTransfers,
      totalVolume,
      averageTransferAmount,
    };
  }
}
