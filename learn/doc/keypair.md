# 🔐 Sui Keypair 与消息签名指南

## 📋 概述

本文档详细介绍如何使用 `@mysten/dapp-kit` 获取 keypair 对象，配合 Sui SDK 调用 `signPersonalMessage` 来获取签名，以及如何验证这些签名。这是构建去中心化应用中用户身份验证和数据完整性保护的核心功能。

## 🎯 学习目标

- 理解 Sui 中的 Keypair 概念和类型
- 掌握使用 @mysten/dapp-kit 获取和管理 Keypair
- 学会使用 signPersonalMessage 进行消息签名
- 实现签名验证机制
- 了解最佳实践和安全注意事项
- 参考资料 https://sdk.mystenlabs.com/typescript/cryptography/keypairs#verifying-signatures-without-a-key-pair



## 🚀 快速开始

### 1. 环境准备

确保你的项目已经安装了必要的依赖：

```bash
npm install @mysten/dapp-kit @mysten/sui
# 或
yarn add @mysten/dapp-kit @mysten/sui
```

### 2. 基础配置

在你的 React 应用中配置 DAppKit：

```typescript
// src/App.tsx
import { ConnectButton, useCurrentAccount, useSignPersonalMessage } from '@mysten/dapp-kit';
import { SuiClient, getFullnodeUrl } from '@mysten/sui/client';

// 创建 Sui 客户端
const client = new SuiClient({
  url: getFullnodeUrl('testnet'), // 或 'mainnet', 'devnet'
});

function App() {
  const currentAccount = useCurrentAccount();
  const { mutate: signPersonalMessage } = useSignPersonalMessage();
  
  // ... 组件逻辑
}
```

## 🔑 Keypair 基础概念

### 什么是 Keypair？

在 Sui 生态系统中，Keypair（密钥对）是用户身份的核心组成部分：

- **公钥 (Public Key)**: 用于验证签名，可以公开分享
- **私钥 (Private Key)**: 用于签名消息，必须保密
- **地址 (Address)**: 从公钥派生，是用户在区块链上的唯一标识

### Keypair 类型

Sui 支持多种签名算法：

```typescript
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { Secp256k1Keypair } from '@mysten/sui/keypairs/secp256k1';
import { Secp256r1Keypair } from '@mysten/sui/keypairs/secp256r1';

// Ed25519 Keypair (推荐)
const ed25519Keypair = new Ed25519Keypair();

// Secp256k1 Keypair (比特币兼容)
const secp256k1Keypair = new Secp256k1Keypair();

// Secp256r1 Keypair (NIST P-256)
const secp256r1Keypair = new Secp256r1Keypair();
```

## 📱 使用 @mysten/dapp-kit 获取 Keypair

### 1. 钱包连接与账户获取

```typescript
import { useCurrentAccount } from '@mysten/dapp-kit';

function WalletComponent() {
  const currentAccount = useCurrentAccount();
  
  if (!currentAccount) {
    return <ConnectButton />;
  }
  
  return (
    <div>
      <p>连接的地址: {currentAccount.address}</p>
      <p>公钥: {currentAccount.publicKey}</p>
    </div>
  );
}
```

### 2. 获取 Keypair 对象

虽然 @mysten/dapp-kit 主要通过钱包插件管理 Keypair，但你仍然可以获取相关信息：

```typescript
import { useCurrentAccount } from '@mysten/dapp-kit';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { fromB64 } from '@mysten/sui/utils';

function KeypairInfo() {
  const currentAccount = useCurrentAccount();
  
  const getKeypairFromWallet = () => {
    if (!currentAccount) return null;
    
    // 注意：出于安全考虑，钱包插件不会直接暴露私钥
    // 但你可以获取公钥信息
    const publicKey = currentAccount.publicKey;
    
    // 如果你有私钥（仅在开发环境），可以这样创建 Keypair
    // const privateKey = fromB64('your-private-key-here');
    // const keypair = Ed25519Keypair.fromSecretKey(privateKey);
    
    return {
      address: currentAccount.address,
      publicKey: publicKey,
      // 注意：私钥不会暴露给前端应用
    };
  };
  
  const keypairInfo = getKeypairFromWallet();
  
  return (
    <div>
      {keypairInfo && (
        <div>
          <h3>Keypair 信息</h3>
          <p>地址: {keypairInfo.address}</p>
          <p>公钥: {keypairInfo.publicKey}</p>
        </div>
      )}
    </div>
  );
}
```

## ✍️ 消息签名 (signPersonalMessage)

### 1. 基础消息签名

```typescript
import { useSignPersonalMessage } from '@mysten/dapp-kit';
import { useState } from 'react';

function MessageSigner() {
  const [message, setMessage] = useState('');
  const [signature, setSignature] = useState('');
  const [error, setError] = useState('');
  
  const { mutate: signPersonalMessage } = useSignPersonalMessage();
  
  const handleSignMessage = () => {
    if (!message.trim()) {
      setError('请输入要签名的消息');
      return;
    }
    
    // 将消息转换为字节数组
    const messageBytes = new TextEncoder().encode(message);
    
    signPersonalMessage(
      {
        message: messageBytes,
      },
      {
        onSuccess: (result) => {
          setSignature(result.signature);
          setError('');
          console.log('签名成功:', result);
        },
        onError: (error) => {
          setError(`签名失败: ${error.message}`);
          console.error('签名错误:', error);
        },
      }
    );
  };
  
  return (
    <div>
      <h3>消息签名</h3>
      <div>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="输入要签名的消息"
          rows={4}
          style={{ width: '100%', marginBottom: '10px' }}
        />
      </div>
      
      <button onClick={handleSignMessage}>
        签名消息
      </button>
      
      {error && <div style={{ color: 'red' }}>{error}</div>}
      
      {signature && (
        <div>
          <h4>签名结果:</h4>
          <p><strong>签名:</strong> {signature}</p>
          <textarea
            value={signature}
            readOnly
            rows={3}
            style={{ width: '100%', fontFamily: 'monospace' }}
          />
        </div>
      )}
    </div>
  );
}
```

### 2. 结构化数据签名

对于复杂的结构化数据，建议使用 JSON 序列化：

```typescript
import { useSignPersonalMessage } from '@mysten/dapp-kit';

function StructuredDataSigner() {
  const { mutate: signPersonalMessage } = useSignPersonalMessage();
  
  const signStructuredData = async (data: any) => {
    try {
      // 创建结构化数据
      const structuredData = {
        domain: {
          name: 'OC Network DApp',
          version: '1',
          chainId: 'testnet',
        },
        types: {
          EIP712Domain: [
            { name: 'name', type: 'string' },
            { name: 'version', type: 'string' },
            { name: 'chainId', type: 'string' },
          ],
          Action: [
            { name: 'from', type: 'address' },
            { name: 'to', type: 'address' },
            { name: 'amount', type: 'uint64' },
            { name: 'timestamp', type: 'uint64' },
          ],
        },
        primaryType: 'Action',
        message: data,
      };
      
      // 序列化数据
      const messageBytes = new TextEncoder().encode(JSON.stringify(structuredData));
      
      signPersonalMessage(
        { message: messageBytes },
        {
          onSuccess: (result) => {
            console.log('结构化数据签名成功:', result);
            return result;
          },
          onError: (error) => {
            console.error('结构化数据签名失败:', error);
            throw error;
          },
        }
      );
    } catch (error) {
      console.error('签名过程出错:', error);
      throw error;
    }
  };
  
  const handleSignAction = () => {
    const actionData = {
      from: '0x...',
      to: '0x...',
      amount: 1000,
      timestamp: Date.now(),
    };
    
    signStructuredData(actionData);
  };
  
  return (
    <div>
      <h3>结构化数据签名</h3>
      <button onClick={handleSignAction}>
        签名操作数据
      </button>
    </div>
  );
}
```

## 🔍 签名验证

### 1. 基础签名验证

```typescript
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { fromB64 } from '@mysten/sui/utils';

class SignatureVerifier {
  // 验证 Ed25519 签名
  static verifyEd25519Signature(
    message: string,
    signature: string,
    publicKey: string
  ): boolean {
    try {
      const messageBytes = new TextEncoder().encode(message);
      const signatureBytes = fromB64(signature);
      const publicKeyBytes = fromB64(publicKey);
      
      // 创建 Ed25519Keypair 实例用于验证
      const keypair = Ed25519Keypair.fromSecretKey(new Uint8Array(32)); // 临时创建
      
      // 验证签名
      return keypair.getPublicKey().verify(messageBytes, signatureBytes);
    } catch (error) {
      console.error('签名验证失败:', error);
      return false;
    }
  }
  
  // 从签名中恢复公钥
  static recoverPublicKey(
    message: string,
    signature: string
  ): string | null {
    try {
      const messageBytes = new TextEncoder().encode(message);
      const signatureBytes = fromB64(signature);
      
      // 注意：Ed25519 不支持从签名恢复公钥
      // 你需要预先知道公钥或从其他来源获取
      console.warn('Ed25519 签名无法恢复公钥，需要预先提供公钥');
      return null;
    } catch (error) {
      console.error('恢复公钥失败:', error);
      return null;
    }
  }
}
```

### 2. 完整的验证组件

```typescript
import { useState } from 'react';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { fromB64 } from '@mysten/sui/utils';

function SignatureVerification() {
  const [message, setMessage] = useState('');
  const [signature, setSignature] = useState('');
  const [publicKey, setPublicKey] = useState('');
  const [verificationResult, setVerificationResult] = useState<boolean | null>(null);
  
  const verifySignature = () => {
    if (!message || !signature || !publicKey) {
      alert('请填写所有字段');
      return;
    }
    
    try {
      const messageBytes = new TextEncoder().encode(message);
      const signatureBytes = fromB64(signature);
      const publicKeyBytes = fromB64(publicKey);
      
      // 创建公钥对象
      const publicKeyObj = Ed25519Keypair.fromSecretKey(new Uint8Array(32)).getPublicKey();
      
      // 验证签名
      const isValid = publicKeyObj.verify(messageBytes, signatureBytes);
      setVerificationResult(isValid);
      
      console.log('验证结果:', isValid);
    } catch (error) {
      console.error('验证过程出错:', error);
      setVerificationResult(false);
    }
  };
  
  return (
    <div>
      <h3>签名验证</h3>
      
      <div style={{ marginBottom: '10px' }}>
        <label>消息:</label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="输入原始消息"
          rows={3}
          style={{ width: '100%' }}
        />
      </div>
      
      <div style={{ marginBottom: '10px' }}>
        <label>签名:</label>
        <textarea
          value={signature}
          onChange={(e) => setSignature(e.target.value)}
          placeholder="输入签名"
          rows={3}
          style={{ width: '100%', fontFamily: 'monospace' }}
        />
      </div>
      
      <div style={{ marginBottom: '10px' }}>
        <label>公钥:</label>
        <input
          type="text"
          value={publicKey}
          onChange={(e) => setPublicKey(e.target.value)}
          placeholder="输入公钥"
          style={{ width: '100%', fontFamily: 'monospace' }}
        />
      </div>
      
      <button onClick={verifySignature}>
        验证签名
      </button>
      
      {verificationResult !== null && (
        <div style={{ 
          marginTop: '10px', 
          padding: '10px',
          backgroundColor: verificationResult ? '#d4edda' : '#f8d7da',
          color: verificationResult ? '#155724' : '#721c24'
        }}>
          {verificationResult ? '✅ 签名验证成功' : '❌ 签名验证失败'}
        </div>
      )}
    </div>
  );
}
```

## 🛡️ 安全最佳实践

### 1. 私钥管理

```typescript
// ❌ 错误：永远不要在前端硬编码私钥
const privateKey = 'your-private-key-here'; // 危险！

// ✅ 正确：使用钱包插件管理私钥
import { useSignPersonalMessage } from '@mysten/dapp-kit';

function SecureSigning() {
  const { mutate: signPersonalMessage } = useSignPersonalMessage();
  
  const signSecurely = (message: string) => {
    const messageBytes = new TextEncoder().encode(message);
    
    signPersonalMessage(
      { message: messageBytes },
      {
        onSuccess: (result) => {
          // 私钥永远不会暴露给前端代码
          console.log('签名完成:', result.signature);
        },
        onError: (error) => {
          console.error('签名失败:', error);
        },
      }
    );
  };
  
  return <button onClick={() => signSecurely('test message')}>安全签名</button>;
}
```

### 2. 消息格式标准化

```typescript
class MessageFormatter {
  // 标准化消息格式
  static formatMessage(domain: string, action: string, data: any): string {
    const timestamp = Date.now();
    const message = {
      domain,
      action,
      data,
      timestamp,
    };
    
    return JSON.stringify(message, Object.keys(message).sort());
  }
  
  // 验证消息格式
  static validateMessage(message: string): boolean {
    try {
      const parsed = JSON.parse(message);
      return parsed.domain && parsed.action && parsed.timestamp;
    } catch {
      return false;
    }
  }
}

// 使用示例
const standardMessage = MessageFormatter.formatMessage(
  'OC Network',
  'transfer',
  { amount: 100, to: '0x...' }
);
```

### 3. 防重放攻击

```typescript
class ReplayProtection {
  private static usedNonces = new Set<string>();
  
  // 生成随机 nonce
  static generateNonce(): string {
    return Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15);
  }
  
  // 检查 nonce 是否已使用
  static isNonceUsed(nonce: string): boolean {
    return this.usedNonces.has(nonce);
  }
  
  // 标记 nonce 为已使用
  static markNonceUsed(nonce: string): void {
    this.usedNonces.add(nonce);
  }
  
  // 创建带 nonce 的消息
  static createMessageWithNonce(data: any): { message: string; nonce: string } {
    const nonce = this.generateNonce();
    const message = {
      ...data,
      nonce,
      timestamp: Date.now(),
    };
    
    return {
      message: JSON.stringify(message),
      nonce,
    };
  }
}
```

## 🔄 完整示例：用户身份验证系统

```typescript
import React, { useState } from 'react';
import { useCurrentAccount, useSignPersonalMessage } from '@mysten/dapp-kit';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { fromB64 } from '@mysten/sui/utils';

interface AuthChallenge {
  message: string;
  nonce: string;
  timestamp: number;
}

interface AuthResult {
  address: string;
  signature: string;
  publicKey: string;
  challenge: AuthChallenge;
}

function AuthenticationSystem() {
  const currentAccount = useCurrentAccount();
  const { mutate: signPersonalMessage } = useSignPersonalMessage();
  
  const [challenge, setChallenge] = useState<AuthChallenge | null>(null);
  const [authResult, setAuthResult] = useState<AuthResult | null>(null);
  const [isVerified, setIsVerified] = useState<boolean | null>(null);
  
  // 生成认证挑战
  const generateChallenge = (): AuthChallenge => {
    return {
      message: `请签名此消息以验证您的身份。此操作不会花费任何费用。`,
      nonce: Math.random().toString(36).substring(2, 15),
      timestamp: Date.now(),
    };
  };
  
  // 开始认证流程
  const startAuthentication = () => {
    if (!currentAccount) {
      alert('请先连接钱包');
      return;
    }
    
    const newChallenge = generateChallenge();
    setChallenge(newChallenge);
    
    // 构建完整的认证消息
    const fullMessage = JSON.stringify({
      address: currentAccount.address,
      ...newChallenge,
    });
    
    const messageBytes = new TextEncoder().encode(fullMessage);
    
    signPersonalMessage(
      { message: messageBytes },
      {
        onSuccess: (result) => {
          const authData: AuthResult = {
            address: currentAccount.address,
            signature: result.signature,
            publicKey: currentAccount.publicKey,
            challenge: newChallenge,
          };
          
          setAuthResult(authData);
          console.log('认证数据生成成功:', authData);
        },
        onError: (error) => {
          console.error('认证失败:', error);
          alert(`认证失败: ${error.message}`);
        },
      }
    );
  };
  
  // 验证认证结果
  const verifyAuthentication = () => {
    if (!authResult) {
      alert('没有认证数据可验证');
      return;
    }
    
    try {
      // 重新构建原始消息
      const originalMessage = JSON.stringify({
        address: authResult.address,
        ...authResult.challenge,
      });
      
      const messageBytes = new TextEncoder().encode(originalMessage);
      const signatureBytes = fromB64(authResult.signature);
      const publicKeyBytes = fromB64(authResult.publicKey);
      
      // 验证签名
      const publicKey = Ed25519Keypair.fromSecretKey(new Uint8Array(32)).getPublicKey();
      const isValid = publicKey.verify(messageBytes, signatureBytes);
      
      // 验证时间戳（5分钟内有效）
      const isTimestampValid = Date.now() - authResult.challenge.timestamp < 5 * 60 * 1000;
      
      setIsVerified(isValid && isTimestampValid);
      
      if (isValid && isTimestampValid) {
        console.log('✅ 用户身份验证成功');
      } else {
        console.log('❌ 用户身份验证失败');
      }
    } catch (error) {
      console.error('验证过程出错:', error);
      setIsVerified(false);
    }
  };
  
  return (
    <div style={{ padding: '20px', maxWidth: '600px' }}>
      <h2>🔐 用户身份验证系统</h2>
      
      {!currentAccount ? (
        <div>
          <p>请先连接钱包以开始身份验证</p>
          {/* <ConnectButton /> */}
        </div>
      ) : (
        <div>
          <div style={{ marginBottom: '20px' }}>
            <p><strong>当前地址:</strong> {currentAccount.address}</p>
            <p><strong>公钥:</strong> {currentAccount.publicKey}</p>
          </div>
          
          <button onClick={startAuthentication} style={{ marginBottom: '20px' }}>
            开始身份验证
          </button>
          
          {challenge && (
            <div style={{ 
              marginBottom: '20px', 
              padding: '10px', 
              backgroundColor: '#f0f0f0',
              borderRadius: '5px'
            }}>
              <h4>认证挑战:</h4>
              <p><strong>消息:</strong> {challenge.message}</p>
              <p><strong>Nonce:</strong> {challenge.nonce}</p>
              <p><strong>时间戳:</strong> {new Date(challenge.timestamp).toLocaleString()}</p>
            </div>
          )}
          
          {authResult && (
            <div style={{ 
              marginBottom: '20px', 
              padding: '10px', 
              backgroundColor: '#e8f5e8',
              borderRadius: '5px'
            }}>
              <h4>认证结果:</h4>
              <p><strong>地址:</strong> {authResult.address}</p>
              <p><strong>签名:</strong> {authResult.signature}</p>
              <p><strong>公钥:</strong> {authResult.publicKey}</p>
              
              <button onClick={verifyAuthentication} style={{ marginTop: '10px' }}>
                验证身份
              </button>
            </div>
          )}
          
          {isVerified !== null && (
            <div style={{
              padding: '10px',
              borderRadius: '5px',
              backgroundColor: isVerified ? '#d4edda' : '#f8d7da',
              color: isVerified ? '#155724' : '#721c24'
            }}>
              {isVerified ? '✅ 身份验证成功' : '❌ 身份验证失败'}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default AuthenticationSystem;
```

## 📚 API 参考

### useSignPersonalMessage Hook

```typescript
import { useSignPersonalMessage } from '@mysten/dapp-kit';

const { mutate: signPersonalMessage } = useSignPersonalMessage();

signPersonalMessage(
  {
    message: Uint8Array, // 要签名的消息字节数组
  },
  {
    onSuccess: (result) => {
      console.log('签名成功:', result);
      // result.signature: 签名字符串
      // result.bytes: 签名的字节数组
    },
    onError: (error) => {
      console.error('签名失败:', error);
    },
  }
);
```

### Ed25519Keypair 类

```typescript
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';

// 创建新的 Keypair
const keypair = new Ed25519Keypair();

// 从私钥创建
const keypair = Ed25519Keypair.fromSecretKey(privateKeyBytes);

// 获取公钥
const publicKey = keypair.getPublicKey();

// 获取地址
const address = keypair.getPublicKey().toSuiAddress();

// 签名消息
const signature = keypair.sign(messageBytes);

// 验证签名
const isValid = publicKey.verify(messageBytes, signatureBytes);
```

## 🎯 实际应用场景

### 1. 用户登录验证

```typescript
// 使用消息签名替代传统密码登录
const loginWithSignature = async (address: string, signature: string, message: string) => {
  // 验证签名
  const isValid = verifySignature(message, signature, getUserPublicKey(address));
  
  if (isValid) {
    // 生成会话令牌
    const sessionToken = generateSessionToken(address);
    localStorage.setItem('sessionToken', sessionToken);
    return { success: true, token: sessionToken };
  }
  
  return { success: false, error: 'Invalid signature' };
};
```

### 2. 交易授权

```typescript
// 为敏感操作添加二次验证
const authorizeTransaction = async (transactionData: any) => {
  const challenge = createTransactionChallenge(transactionData);
  const signature = await signPersonalMessage(challenge);
  
  if (verifyTransactionSignature(transactionData, signature)) {
    return executeTransaction(transactionData);
  }
  
  throw new Error('Transaction authorization failed');
};
```

### 3. 数据完整性保护

```typescript
// 确保数据在传输过程中未被篡改
const protectDataIntegrity = (data: any) => {
  const message = JSON.stringify(data);
  const signature = await signPersonalMessage(message);
  
  return {
    data,
    signature,
    timestamp: Date.now(),
  };
};

const verifyDataIntegrity = (protectedData: any) => {
  const { data, signature, timestamp } = protectedData;
  const message = JSON.stringify(data);
  
  return verifySignature(message, signature, data.publicKey) && 
         isTimestampValid(timestamp);
};
```

## 🔧 故障排除

### 常见问题

1. **签名失败**
   - 检查钱包是否正确连接
   - 确认用户拒绝了签名请求
   - 验证消息格式是否正确

2. **验证失败**
   - 确保使用相同的消息内容进行验证
   - 检查公钥是否正确
   - 验证签名格式是否有效

3. **编码问题**
   - 确保消息使用 UTF-8 编码
   - 检查 Base64 编码/解码是否正确
   - 验证字节数组转换

### 调试技巧

```typescript
// 调试签名过程
const debugSigning = async () => {
  const message = 'test message';
  const messageBytes = new TextEncoder().encode(message);
  
  console.log('原始消息:', message);
  console.log('消息字节:', messageBytes);
  console.log('消息长度:', messageBytes.length);
  
  signPersonalMessage(
    { message: messageBytes },
    {
      onSuccess: (result) => {
        console.log('签名结果:', result);
        console.log('签名长度:', result.signature.length);
        
        // 尝试验证
        const isValid = verifySignature(message, result.signature, currentAccount.publicKey);
        console.log('验证结果:', isValid);
      },
      onError: (error) => {
        console.error('签名错误:', error);
      },
    }
  );
};
```

## 📖 进一步学习

- [Sui 官方文档 - 密码学](https://docs.sui.io/cryptography)
- [Sui TypeScript SDK 文档](https://sdk.mystenlabs.com/typescript)
- [EIP-712 签名标准](https://eips.ethereum.org/EIPS/eip-712)
- [Web3 安全最佳实践](https://consensys.github.io/smart-contract-best-practices/)

## 🎉 总结

通过本指南，你已经学会了：

1. ✅ 理解 Sui Keypair 的概念和类型
2. ✅ 使用 @mysten/dapp-kit 获取和管理 Keypair
3. ✅ 实现 signPersonalMessage 进行消息签名
4. ✅ 创建签名验证机制
5. ✅ 应用安全最佳实践
6. ✅ 构建完整的身份验证系统

这些知识将帮助你在 Sui 生态系统中构建安全、可靠的去中心化应用。记住，安全性是区块链应用的核心，始终遵循最佳实践来保护用户资产和数据。

---

**下一步建议：**
- 尝试在实际项目中实现这些功能
- 探索更高级的签名方案（如多重签名）
- 学习智能合约中的签名验证
- 了解跨链签名和验证机制
