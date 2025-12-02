import React, { useState } from 'react';
import { useCurrentAccount, useSignPersonalMessage } from '@mysten/dapp-kit';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { fromB64 } from '@mysten/sui/utils';

interface SignatureResult {
  signature: string;
  message: string;
  publicKey: string;
  address: string;
  timestamp: number;
}

interface VerificationResult {
  isValid: boolean;
  error?: string;
}

const MessageSigner: React.FC = () => {
  const currentAccount = useCurrentAccount();
  const { mutate: signPersonalMessage } = useSignPersonalMessage();
  
  const [message, setMessage] = useState('');
  const [signatureResult, setSignatureResult] = useState<SignatureResult | null>(null);
  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // 生成标准化的消息格式
  const generateStandardMessage = (customMessage: string): string => {
    const standardData = {
      domain: 'OC Network DApp',
      version: '1.0.0',
      chainId: 'testnet',
      message: customMessage,
      address: currentAccount?.address || '',
      timestamp: Date.now(),
      nonce: Math.random().toString(36).substring(2, 15),
    };
    
    return JSON.stringify(standardData, Object.keys(standardData).sort());
  };

  // 处理消息签名
  const handleSignMessage = async () => {
    if (!currentAccount) {
      alert('请先连接钱包');
      return;
    }

    if (!message.trim()) {
      alert('请输入要签名的消息');
      return;
    }

    setIsLoading(true);
    setVerificationResult(null);

    try {
      // 生成标准化消息
      const standardMessage = generateStandardMessage(message);
      const messageBytes = new TextEncoder().encode(standardMessage);

      signPersonalMessage(
        { message: messageBytes },
        {
          onSuccess: (result) => {
            const signatureData: SignatureResult = {
              signature: result.signature,
              message: standardMessage,
              publicKey: currentAccount.publicKey,
              address: currentAccount.address,
              timestamp: Date.now(),
            };

            setSignatureResult(signatureData);
            setIsLoading(false);
            console.log('✅ 消息签名成功:', signatureData);
          },
          onError: (error) => {
            console.error('❌ 消息签名失败:', error);
            alert(`签名失败: ${error.message}`);
            setIsLoading(false);
          },
        }
      );
    } catch (error) {
      console.error('❌ 签名过程出错:', error);
      alert(`签名过程出错: ${(error as Error).message}`);
      setIsLoading(false);
    }
  };

  // 验证签名
  const verifySignature = () => {
    if (!signatureResult) {
      alert('没有签名数据可验证');
      return;
    }

    try {
      const messageBytes = new TextEncoder().encode(signatureResult.message);
      const signatureBytes = fromB64(signatureResult.signature);
      const publicKeyBytes = fromB64(signatureResult.publicKey);

      // 创建公钥对象进行验证
      const publicKey = Ed25519Keypair.fromSecretKey(new Uint8Array(32)).getPublicKey();
      const isValid = publicKey.verify(messageBytes, signatureBytes);

      // 验证时间戳（5分钟内有效）
      const isTimestampValid = Date.now() - signatureResult.timestamp < 5 * 60 * 1000;

      // 验证地址匹配
      const isAddressValid = signatureResult.address === currentAccount?.address;

      const finalResult = isValid && isTimestampValid && isAddressValid;

      setVerificationResult({
        isValid: finalResult,
        error: !finalResult ? 
          (!isValid ? '签名验证失败' : 
           !isTimestampValid ? '签名已过期' : 
           !isAddressValid ? '地址不匹配' : '未知错误') : undefined,
      });

      console.log('🔍 签名验证结果:', {
        isValid,
        isTimestampValid,
        isAddressValid,
        finalResult,
      });
    } catch (error) {
      console.error('❌ 验证过程出错:', error);
      setVerificationResult({
        isValid: false,
        error: `验证过程出错: ${(error as Error).message}`,
      });
    }
  };

  // 复制到剪贴板
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      alert('已复制到剪贴板');
    }).catch(() => {
      alert('复制失败');
    });
  };

  // 清除结果
  const clearResults = () => {
    setSignatureResult(null);
    setVerificationResult(null);
    setMessage('');
  };

  return (
    <div style={{ 
      padding: '20px', 
      maxWidth: '800px', 
      margin: '0 auto',
      fontFamily: 'Arial, sans-serif'
    }}>
      <div style={{ 
        backgroundColor: '#f8f9fa', 
        padding: '20px', 
        borderRadius: '10px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
      }}>
        <h2 style={{ 
          color: '#333', 
          marginBottom: '20px',
          textAlign: 'center'
        }}>
          🔐 Sui 消息签名演示
        </h2>

        {/* 钱包连接状态 */}
        <div style={{ 
          marginBottom: '20px', 
          padding: '15px',
          backgroundColor: currentAccount ? '#d4edda' : '#f8d7da',
          borderRadius: '5px',
          border: `1px solid ${currentAccount ? '#c3e6cb' : '#f5c6cb'}`
        }}>
          <h4 style={{ margin: '0 0 10px 0' }}>
            钱包状态: {currentAccount ? '✅ 已连接' : '❌ 未连接'}
          </h4>
          {currentAccount && (
            <div style={{ fontSize: '14px', wordBreak: 'break-all' }}>
              <p><strong>地址:</strong> {currentAccount.address}</p>
              <p><strong>公钥:</strong> {currentAccount.publicKey}</p>
            </div>
          )}
        </div>

        {/* 消息输入区域 */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
            要签名的消息:
          </label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="请输入要签名的消息内容..."
            rows={4}
            style={{
              width: '100%',
              padding: '10px',
              border: '1px solid #ddd',
              borderRadius: '5px',
              fontSize: '14px',
              resize: 'vertical'
            }}
            disabled={!currentAccount || isLoading}
          />
        </div>

        {/* 操作按钮 */}
        <div style={{ 
          display: 'flex', 
          gap: '10px', 
          marginBottom: '20px',
          flexWrap: 'wrap'
        }}>
          <button
            onClick={handleSignMessage}
            disabled={!currentAccount || !message.trim() || isLoading}
            style={{
              padding: '10px 20px',
              backgroundColor: currentAccount && !isLoading ? '#007bff' : '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: currentAccount && !isLoading ? 'pointer' : 'not-allowed',
              fontSize: '14px'
            }}
          >
            {isLoading ? '签名中...' : '🔐 签名消息'}
          </button>

          {signatureResult && (
            <>
              <button
                onClick={verifySignature}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#28a745',
                  color: 'white',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                🔍 验证签名
              </button>

              <button
                onClick={clearResults}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#dc3545',
                  color: 'white',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                🗑️ 清除结果
              </button>
            </>
          )}
        </div>

        {/* 签名结果 */}
        {signatureResult && (
          <div style={{
            marginBottom: '20px',
            padding: '15px',
            backgroundColor: '#e8f5e8',
            borderRadius: '5px',
            border: '1px solid #c3e6cb'
          }}>
            <h4 style={{ margin: '0 0 10px 0', color: '#155724' }}>
              ✅ 签名结果
            </h4>
            
            <div style={{ marginBottom: '10px' }}>
              <strong>签名:</strong>
              <div style={{ 
                display: 'flex', 
                gap: '5px',
                alignItems: 'center',
                marginTop: '5px'
              }}>
                <textarea
                  value={signatureResult.signature}
                  readOnly
                  rows={3}
                  style={{
                    flex: 1,
                    padding: '8px',
                    border: '1px solid #ddd',
                    borderRadius: '3px',
                    fontSize: '12px',
                    fontFamily: 'monospace',
                    backgroundColor: '#fff'
                  }}
                />
                <button
                  onClick={() => copyToClipboard(signatureResult.signature)}
                  style={{
                    padding: '5px 10px',
                    backgroundColor: '#007bff',
                    color: 'white',
                    border: 'none',
                    borderRadius: '3px',
                    cursor: 'pointer',
                    fontSize: '12px'
                  }}
                >
                  📋
                </button>
              </div>
            </div>

            <div style={{ marginBottom: '10px' }}>
              <strong>原始消息:</strong>
              <textarea
                value={signatureResult.message}
                readOnly
                rows={4}
                style={{
                  width: '100%',
                  padding: '8px',
                  border: '1px solid #ddd',
                  borderRadius: '3px',
                  fontSize: '12px',
                  fontFamily: 'monospace',
                  backgroundColor: '#fff',
                  marginTop: '5px'
                }}
              />
            </div>

            <div style={{ fontSize: '12px', color: '#666' }}>
              <p><strong>地址:</strong> {signatureResult.address}</p>
              <p><strong>时间戳:</strong> {new Date(signatureResult.timestamp).toLocaleString()}</p>
            </div>
          </div>
        )}

        {/* 验证结果 */}
        {verificationResult && (
          <div style={{
            padding: '15px',
            borderRadius: '5px',
            border: '1px solid',
            backgroundColor: verificationResult.isValid ? '#d4edda' : '#f8d7da',
            borderColor: verificationResult.isValid ? '#c3e6cb' : '#f5c6cb'
          }}>
            <h4 style={{ 
              margin: '0 0 10px 0',
              color: verificationResult.isValid ? '#155724' : '#721c24'
            }}>
              {verificationResult.isValid ? '✅ 签名验证成功' : '❌ 签名验证失败'}
            </h4>
            
            {verificationResult.error && (
              <p style={{ 
                margin: '0',
                color: verificationResult.isValid ? '#155724' : '#721c24',
                fontSize: '14px'
              }}>
                <strong>错误信息:</strong> {verificationResult.error}
              </p>
            )}
          </div>
        )}

        {/* 使用说明 */}
        <div style={{
          marginTop: '30px',
          padding: '15px',
          backgroundColor: '#fff3cd',
          borderRadius: '5px',
          border: '1px solid #ffeaa7'
        }}>
          <h4 style={{ margin: '0 0 10px 0', color: '#856404' }}>
            📖 使用说明
          </h4>
          <ul style={{ margin: '0', paddingLeft: '20px', fontSize: '14px', color: '#856404' }}>
            <li>确保钱包已连接到正确的网络</li>
            <li>输入要签名的消息内容</li>
            <li>点击"签名消息"按钮，在钱包中确认签名</li>
            <li>签名完成后可以验证签名的有效性</li>
            <li>签名有效期为5分钟，过期后需要重新签名</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default MessageSigner;
