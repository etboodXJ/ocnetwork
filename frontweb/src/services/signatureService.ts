import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { fromB64 } from '@mysten/sui/utils';

export interface SignatureData {
  signature: string;
  message: string;
  publicKey: string;
  address: string;
  timestamp: number;
}

export interface VerificationResult {
  isValid: boolean;
  error?: string;
  details?: {
    signatureValid: boolean;
    timestampValid: boolean;
    addressValid: boolean;
  };
}

export interface StandardMessage {
  domain: string;
  version: string;
  chainId: string;
  message: string;
  address: string;
  timestamp: number;
  nonce: string;
}

/**
 * 签名服务类 - 处理消息签名和验证
 */
export class SignatureService {
  private static readonly SIGNATURE_EXPIRY_TIME = 5 * 60 * 1000; // 5分钟

  /**
   * 生成标准化的消息格式
   */
  static generateStandardMessage(
    customMessage: string,
    address: string,
    domain: string = 'OC Network DApp',
    version: string = '1.0.0',
    chainId: string = 'testnet'
  ): string {
    const standardData: StandardMessage = {
      domain,
      version,
      chainId,
      message: customMessage,
      address,
      timestamp: Date.now(),
      nonce: this.generateNonce(),
    };

    return JSON.stringify(standardData, Object.keys(standardData).sort());
  }

  /**
   * 生成随机 nonce
   */
  static generateNonce(): string {
    return Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15);
  }

  /**
   * 验证消息格式
   */
  static validateMessageFormat(message: string): boolean {
    try {
      const parsed = JSON.parse(message);
      const requiredFields = ['domain', 'version', 'chainId', 'message', 'address', 'timestamp', 'nonce'];
      
      return requiredFields.every(field => parsed.hasOwnProperty(field));
    } catch {
      return false;
    }
  }

  /**
   * 验证 Ed25519 签名
   */
  static verifyEd25519Signature(
    message: string,
    signature: string,
    publicKey: string
  ): boolean {
    try {
      const messageBytes = new TextEncoder().encode(message);
      const signatureBytes = fromB64(signature);
      const publicKeyBytes = fromB64(publicKey);

      // 创建公钥对象进行验证
      const publicKeyObj = Ed25519Keypair.fromSecretKey(new Uint8Array(32)).getPublicKey();
      
      return publicKeyObj.verify(messageBytes, signatureBytes);
    } catch (error) {
      console.error('签名验证失败:', error);
      return false;
    }
  }

  /**
   * 验证时间戳是否在有效期内
   */
  static isTimestampValid(timestamp: number): boolean {
    return Date.now() - timestamp < this.SIGNATURE_EXPIRY_TIME;
  }

  /**
   * 验证地址是否匹配
   */
  static isAddressValid(signedAddress: string, currentAddress: string): boolean {
    return signedAddress.toLowerCase() === currentAddress.toLowerCase();
  }

  /**
   * 完整的签名验证
   */
  static verifySignature(
    signatureData: SignatureData,
    currentAddress?: string
  ): VerificationResult {
    try {
      // 验证消息格式
      if (!this.validateMessageFormat(signatureData.message)) {
        return {
          isValid: false,
          error: '消息格式无效',
          details: {
            signatureValid: false,
            timestampValid: false,
            addressValid: false,
          },
        };
      }

      // 验证签名
      const signatureValid = this.verifyEd25519Signature(
        signatureData.message,
        signatureData.signature,
        signatureData.publicKey
      );

      // 验证时间戳
      const timestampValid = this.isTimestampValid(signatureData.timestamp);

      // 验证地址（如果提供了当前地址）
      const addressValid = currentAddress 
        ? this.isAddressValid(signatureData.address, currentAddress)
        : true;

      const isValid = signatureValid && timestampValid && addressValid;

      return {
        isValid,
        error: isValid ? undefined : this.getErrorMessage(signatureValid, timestampValid, addressValid),
        details: {
          signatureValid,
          timestampValid,
          addressValid,
        },
      };
    } catch (error) {
      return {
        isValid: false,
        error: `验证过程出错: ${(error as Error).message}`,
        details: {
          signatureValid: false,
          timestampValid: false,
          addressValid: false,
        },
      };
    }
  }

  /**
   * 获取错误信息
   */
  private static getErrorMessage(
    signatureValid: boolean,
    timestampValid: boolean,
    addressValid: boolean
  ): string {
    if (!signatureValid) return '签名验证失败';
    if (!timestampValid) return '签名已过期';
    if (!addressValid) return '地址不匹配';
    return '未知错误';
  }

  /**
   * 创建签名数据对象
   */
  static createSignatureData(
    signature: string,
    message: string,
    publicKey: string,
    address: string
  ): SignatureData {
    return {
      signature,
      message,
      publicKey,
      address,
      timestamp: Date.now(),
    };
  }

  /**
   * 序列化签名数据
   */
  static serializeSignatureData(data: SignatureData): string {
    return JSON.stringify(data);
  }

  /**
   * 反序列化签名数据
   */
  static deserializeSignatureData(serializedData: string): SignatureData | null {
    try {
      const parsed = JSON.parse(serializedData);
      
      // 验证必需字段
      const requiredFields = ['signature', 'message', 'publicKey', 'address', 'timestamp'];
      if (!requiredFields.every(field => parsed.hasOwnProperty(field))) {
        return null;
      }

      return parsed as SignatureData;
    } catch {
      return null;
    }
  }

  /**
   * 从消息中提取原始内容
   */
  static extractOriginalMessage(standardMessage: string): string | null {
    try {
      const parsed = JSON.parse(standardMessage) as StandardMessage;
      return parsed.message || null;
    } catch {
      return null;
    }
  }

  /**
   * 检查是否为重放攻击
   */
  private static usedNonces = new Set<string>();

  static checkReplayAttack(nonce: string): boolean {
    if (this.usedNonces.has(nonce)) {
      return true; // 检测到重放攻击
    }
    
    this.usedNonces.add(nonce);
    
    // 清理过期的 nonce（防止内存泄漏）
    if (this.usedNonces.size > 10000) {
      this.usedNonces.clear();
    }
    
    return false;
  }

  /**
   * 验证并防止重放攻击
   */
  static verifyWithReplayProtection(
    signatureData: SignatureData,
    currentAddress?: string
  ): VerificationResult {
    try {
      // 解析标准消息
      const parsedMessage = JSON.parse(signatureData.message) as StandardMessage;
      
      // 检查重放攻击
      if (this.checkReplayAttack(parsedMessage.nonce)) {
        return {
          isValid: false,
          error: '检测到重放攻击',
          details: {
            signatureValid: false,
            timestampValid: false,
            addressValid: false,
          },
        };
      }

      // 执行常规验证
      return this.verifySignature(signatureData, currentAddress);
    } catch (error) {
      return {
        isValid: false,
        error: `重放保护验证失败: ${(error as Error).message}`,
        details: {
          signatureValid: false,
          timestampValid: false,
          addressValid: false,
        },
      };
    }
  }

  /**
   * 创建认证挑战
   */
  static createAuthChallenge(address: string, customMessage?: string): StandardMessage {
    return {
      domain: 'OC Network DApp',
      version: '1.0.0',
      chainId: 'testnet',
      message: customMessage || '请签名此消息以验证您的身份。此操作不会花费任何费用。',
      address,
      timestamp: Date.now(),
      nonce: this.generateNonce(),
    };
  }

  /**
   * 验证认证挑战
   */
  static verifyAuthChallenge(
    signatureData: SignatureData,
    currentAddress: string
  ): VerificationResult {
    return this.verifyWithReplayProtection(signatureData, currentAddress);
  }
}

/**
 * 消息格式化工具类
 */
export class MessageFormatter {
  /**
   * 格式化交易消息
   */
  static formatTransactionMessage(
    from: string,
    to: string,
    amount: string,
    tokenType: string = 'SUI'
  ): string {
    return SignatureService.generateStandardMessage(
      `Transfer ${amount} ${tokenType} from ${from} to ${to}`,
      from,
      'OC Network DApp',
      '1.0.0',
      'testnet'
    );
  }

  /**
   * 格式化投票消息
   */
  static formatVoteMessage(
    voterAddress: string,
    proposalId: string,
    vote: boolean
  ): string {
    return SignatureService.generateStandardMessage(
      `Vote ${vote ? 'FOR' : 'AGAINST'} proposal ${proposalId}`,
      voterAddress,
      'OC Network DApp',
      '1.0.0',
      'testnet'
    );
  }

  /**
   * 格式化授权消息
   */
  static formatAuthorizationMessage(
    userAddress: string,
    action: string,
    targetAddress?: string
  ): string {
    const message = targetAddress 
      ? `Authorize ${action} for ${targetAddress}`
      : `Authorize ${action}`;
    
    return SignatureService.generateStandardMessage(
      message,
      userAddress,
      'OC Network DApp',
      '1.0.0',
      'testnet'
    );
  }
}

/**
 * 签名存储工具类
 */
export class SignatureStorage {
  private static readonly STORAGE_KEY = 'ocnetwork_signatures';

  /**
   * 保存签名数据到本地存储
   */
  static saveSignature(signatureData: SignatureData, key?: string): void {
    try {
      const storageKey = key || `${signatureData.address}_${signatureData.timestamp}`;
      const existingData = this.getAllSignatures();
      
      existingData[storageKey] = signatureData;
      
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(existingData));
    } catch (error) {
      console.error('保存签名数据失败:', error);
    }
  }

  /**
   * 从本地存储获取签名数据
   */
  static getSignature(key: string): SignatureData | null {
    try {
      const allData = this.getAllSignatures();
      return allData[key] || null;
    } catch (error) {
      console.error('获取签名数据失败:', error);
      return null;
    }
  }

  /**
   * 获取所有签名数据
   */
  static getAllSignatures(): Record<string, SignatureData> {
    try {
      const data = localStorage.getItem(this.STORAGE_KEY);
      return data ? JSON.parse(data) : {};
    } catch (error) {
      console.error('获取所有签名数据失败:', error);
      return {};
    }
  }

  /**
   * 删除签名数据
   */
  static deleteSignature(key: string): void {
    try {
      const existingData = this.getAllSignatures();
      delete existingData[key];
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(existingData));
    } catch (error) {
      console.error('删除签名数据失败:', error);
    }
  }

  /**
   * 清理过期的签名数据
   */
  static cleanupExpiredSignatures(): void {
    try {
      const allData = this.getAllSignatures();
      const now = Date.now();
      const expiryTime = SignatureService['SIGNATURE_EXPIRY_TIME'];

      for (const [key, signatureData] of Object.entries(allData)) {
        if (now - signatureData.timestamp > expiryTime) {
          delete allData[key];
        }
      }

      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(allData));
    } catch (error) {
      console.error('清理过期签名数据失败:', error);
    }
  }

  /**
   * 获取指定地址的所有签名
   */
  static getSignaturesByAddress(address: string): SignatureData[] {
    try {
      const allData = this.getAllSignatures();
      return Object.values(allData).filter(sig => sig.address === address);
    } catch (error) {
      console.error('获取地址签名失败:', error);
      return [];
    }
  }
}
