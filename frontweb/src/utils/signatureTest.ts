/**
 * 签名功能测试工具
 * 用于演示和测试消息签名功能
 */

import { SignatureService, MessageFormatter, SignatureStorage } from '../services/signatureService';
import type { SignatureData } from '../services/signatureService';

/**
 * 测试基础签名功能
 */
export function testBasicSignature() {
  console.log('🧪 测试基础签名功能...');
  
  // 模拟数据
  const testAddress = '0x1234567890abcdef1234567890abcdef12345678';
  const testMessage = '这是一条测试消息';
  const testPublicKey = 'test-public-key';
  const testSignature = 'test-signature';
  
  // 测试消息生成
  const standardMessage = SignatureService.generateStandardMessage(testMessage, testAddress);
  console.log('✅ 标准消息生成成功:', standardMessage);
  
  // 测试消息格式验证
  const isValidFormat = SignatureService.validateMessageFormat(standardMessage);
  console.log('✅ 消息格式验证:', isValidFormat);
  
  // 测试签名数据创建
  const signatureData = SignatureService.createSignatureData(
    testSignature,
    standardMessage,
    testPublicKey,
    testAddress
  );
  console.log('✅ 签名数据创建成功:', signatureData);
  
  // 测试序列化
  const serialized = SignatureService.serializeSignatureData(signatureData);
  console.log('✅ 序列化成功:', serialized);
  
  // 测试反序列化
  const deserialized = SignatureService.deserializeSignatureData(serialized);
  console.log('✅ 反序列化成功:', deserialized);
  
  return { standardMessage, signatureData, serialized, deserialized };
}

/**
 * 测试消息格式化工具
 */
export function testMessageFormatter() {
  console.log('🧪 测试消息格式化工具...');
  
  const testAddress = '0x1234567890abcdef1234567890abcdef12345678';
  
  // 测试交易消息格式化
  const transactionMessage = MessageFormatter.formatTransactionMessage(
    testAddress,
    '0xabcdef1234567890abcdef1234567890abcdef12',
    '1000',
    'SUI'
  );
  console.log('✅ 交易消息格式化:', transactionMessage);
  
  // 测试投票消息格式化
  const voteMessage = MessageFormatter.formatVoteMessage(
    testAddress,
    'proposal-001',
    true
  );
  console.log('✅ 投票消息格式化:', voteMessage);
  
  // 测试授权消息格式化
  const authMessage = MessageFormatter.formatAuthorizationMessage(
    testAddress,
    'transfer',
    '0xabcdef1234567890abcdef1234567890abcdef12'
  );
  console.log('✅ 授权消息格式化:', authMessage);
  
  return { transactionMessage, voteMessage, authMessage };
}

/**
 * 测试签名存储功能
 */
export function testSignatureStorage() {
  console.log('🧪 测试签名存储功能...');
  
  // 创建测试签名数据
  const testSignatureData: SignatureData = {
    signature: 'test-signature-123',
    message: '{"domain":"OC Network DApp","message":"test"}',
    publicKey: 'test-public-key',
    address: '0x1234567890abcdef1234567890abcdef12345678',
    timestamp: Date.now(),
  };
  
  // 测试保存
  SignatureStorage.saveSignature(testSignatureData, 'test-key');
  console.log('✅ 签名数据保存成功');
  
  // 测试获取
  const retrieved = SignatureStorage.getSignature('test-key');
  console.log('✅ 签名数据获取成功:', retrieved);
  
  // 测试获取所有签名
  const allSignatures = SignatureStorage.getAllSignatures();
  console.log('✅ 所有签名数据:', allSignatures);
  
  // 测试按地址获取
  const addressSignatures = SignatureStorage.getSignaturesByAddress(testSignatureData.address);
  console.log('✅ 按地址获取签名:', addressSignatures);
  
  // 测试删除
  SignatureStorage.deleteSignature('test-key');
  console.log('✅ 签名数据删除成功');
  
  return { testSignatureData, retrieved, allSignatures, addressSignatures };
}

/**
 * 测试时间戳验证
 */
export function testTimestampValidation() {
  console.log('🧪 测试时间戳验证...');
  
  const now = Date.now();
  
  // 测试有效时间戳
  const validTimestamp = now - 2 * 60 * 1000; // 2分钟前
  const isValid = SignatureService.isTimestampValid(validTimestamp);
  console.log('✅ 有效时间戳验证:', isValid);
  
  // 测试过期时间戳
  const expiredTimestamp = now - 10 * 60 * 1000; // 10分钟前
  const isExpired = SignatureService.isTimestampValid(expiredTimestamp);
  console.log('✅ 过期时间戳验证:', isExpired);
  
  return { validTimestamp, isValid, expiredTimestamp, isExpired };
}

/**
 * 测试地址验证
 */
export function testAddressValidation() {
  console.log('🧪 测试地址验证...');
  
  const address1 = '0x1234567890abcdef1234567890abcdef12345678';
  const address2 = '0x1234567890ABCDEF1234567890ABCDEF12345678'; // 大写版本
  const address3 = '0xabcdef1234567890abcdef1234567890abcdef12';
  
  // 测试相同地址（不同大小写）
  const isSameAddress = SignatureService.isAddressValid(address1, address2);
  console.log('✅ 相同地址验证（忽略大小写）:', isSameAddress);
  
  // 测试不同地址
  const isDifferentAddress = SignatureService.isAddressValid(address1, address3);
  console.log('✅ 不同地址验证:', isDifferentAddress);
  
  return { isSameAddress, isDifferentAddress };
}

/**
 * 测试 nonce 生成
 */
export function testNonceGeneration() {
  console.log('🧪 测试 nonce 生成...');
  
  // 生成多个 nonce
  const nonce1 = SignatureService.generateNonce();
  const nonce2 = SignatureService.generateNonce();
  const nonce3 = SignatureService.generateNonce();
  
  console.log('✅ 生成的 nonce:', { nonce1, nonce2, nonce3 });
  
  // 验证唯一性
  const areUnique = nonce1 !== nonce2 && nonce2 !== nonce3 && nonce1 !== nonce3;
  console.log('✅ nonce 唯一性验证:', areUnique);
  
  return { nonce1, nonce2, nonce3, areUnique };
}

/**
 * 测试认证挑战
 */
export function testAuthChallenge() {
  console.log('🧪 测试认证挑战...');
  
  const testAddress = '0x1234567890abcdef1234567890abcdef12345678';
  const customMessage = '请签名以登录 OC Network';
  
  // 创建认证挑战
  const challenge = SignatureService.createAuthChallenge(testAddress, customMessage);
  console.log('✅ 认证挑战创建成功:', challenge);
  
  // 验证挑战格式
  const challengeMessage = JSON.stringify(challenge);
  const isValidFormat = SignatureService.validateMessageFormat(challengeMessage);
  console.log('✅ 认证挑战格式验证:', isValidFormat);
  
  return { challenge, isValidFormat };
}

/**
 * 运行所有测试
 */
export function runAllTests() {
  console.log('🚀 开始运行所有签名功能测试...\n');
  
  try {
    testBasicSignature();
    console.log('\n');
    
    testMessageFormatter();
    console.log('\n');
    
    testSignatureStorage();
    console.log('\n');
    
    testTimestampValidation();
    console.log('\n');
    
    testAddressValidation();
    console.log('\n');
    
    testNonceGeneration();
    console.log('\n');
    
    testAuthChallenge();
    console.log('\n');
    
    console.log('✅ 所有测试完成！');
  } catch (error) {
    console.error('❌ 测试过程中出现错误:', error);
  }
}

/**
 * 创建演示用的签名数据
 */
export function createDemoSignatureData(): SignatureData {
  const demoAddress = '0x1234567890abcdef1234567890abcdef12345678';
  const demoMessage = '这是一条演示消息，用于展示签名功能';
  
  const standardMessage = SignatureService.generateStandardMessage(demoMessage, demoAddress);
  
  return SignatureService.createSignatureData(
    'demo-signature-' + Math.random().toString(36).substring(7),
    standardMessage,
    'demo-public-key',
    demoAddress
  );
}

/**
 * 验证演示签名数据
 */
export function verifyDemoSignature(signatureData: SignatureData, currentAddress?: string) {
  const result = SignatureService.verifySignature(signatureData, currentAddress);
  console.log('🔍 演示签名验证结果:', result);
  return result;
}

// 导出测试函数供外部调用
export const SignatureTests = {
  runAllTests,
  testBasicSignature,
  testMessageFormatter,
  testSignatureStorage,
  testTimestampValidation,
  testAddressValidation,
  testNonceGeneration,
  testAuthChallenge,
  createDemoSignatureData,
  verifyDemoSignature,
};

// 如果在开发环境中，自动运行测试
if (import.meta.env.DEV) {
  console.log('🔧 开发环境检测到，可以手动运行 SignatureTests.runAllTests() 来测试签名功能');
}
