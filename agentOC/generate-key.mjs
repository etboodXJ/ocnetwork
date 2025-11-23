import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { encodeSuiPrivateKey } from '@mysten/sui/cryptography';
import { randomBytes } from 'crypto';

console.log('🔑 Generating Sui Ed25519 Keypair with proper bech32 encoding...\n');

try {
  // Method 1: Generate a new keypair and encode it properly
  console.log('=== METHOD 1: Using Ed25519Keypair.generate() + encodeSuiPrivateKey ===');
  const keypair = Ed25519Keypair.generate();
  console.log('✓ Key pair generated successfully');
  console.log('Address:', keypair.getPublicKey().toSuiAddress());
  
  // Get the raw secret key (32 bytes) - getSecretKey returns 70 bytes, we need first 32
  const fullSecretKey = keypair.getSecretKey();
  console.log('Full secret key length:', fullSecretKey.length);
  const secretKey = fullSecretKey.slice(0, 32);
  console.log('Extracted secret key length:', secretKey.length);
  
  // Encode it as bech32 format using encodeSuiPrivateKey
  const bech32PrivateKey = encodeSuiPrivateKey(secretKey, 'ED25519');
  console.log('✓ Successfully encoded to bech32 format');
  console.log('Bech32 private key:', bech32PrivateKey);
  
  // Test the encoded key
  try {
    const testKeypair = Ed25519Keypair.fromSecretKey(bech32PrivateKey);
    console.log('✓ Successfully recreated from bech32 key');
    console.log('Test address:', testKeypair.getPublicKey().toSuiAddress());
    console.log('Addresses match:', keypair.getPublicKey().toSuiAddress() === testKeypair.getPublicKey().toSuiAddress());
  } catch (error) {
    console.log('✗ Failed to recreate from bech32 key:', error.message);
  }
  
  console.log('\n=== VALID BECH32 PRIVATE KEY FOR .ENV ===');
  console.log('AGENT_PRIVATE_KEY=' + bech32PrivateKey);
  console.log('AGENT_ADDRESS=' + keypair.getPublicKey().toSuiAddress());
  
  console.log('\n' + '='.repeat(60) + '\n');
  
  // Method 2: Generate random 32 bytes and encode
  console.log('=== METHOD 2: Using random 32 bytes + encodeSuiPrivateKey ===');
  const randomSecretKey = randomBytes(32);
  const randomKeypair = Ed25519Keypair.fromSecretKey(randomSecretKey);
  console.log('✓ Random keypair created successfully');
  console.log('Random address:', randomKeypair.getPublicKey().toSuiAddress());
  
  // Encode the random key
  const randomBech32Key = encodeSuiPrivateKey(randomSecretKey, 'ED25519');
  console.log('✓ Random key encoded to bech32 format');
  console.log('Random bech32 private key:', randomBech32Key);
  
  // Test the random encoded key
  try {
    const testRandomKeypair = Ed25519Keypair.fromSecretKey(randomBech32Key);
    console.log('✓ Successfully recreated random key from bech32');
    console.log('Random test address:', testRandomKeypair.getPublicKey().toSuiAddress());
    console.log('Random addresses match:', randomKeypair.getPublicKey().toSuiAddress() === testRandomKeypair.getPublicKey().toSuiAddress());
  } catch (error) {
    console.log('✗ Failed to recreate random key from bech32:', error.message);
  }
  
  console.log('\n=== ALTERNATIVE RANDOM KEY FOR .ENV ===');
  console.log('AGENT_PRIVATE_KEY=' + randomBech32Key);
  console.log('AGENT_ADDRESS=' + randomKeypair.getPublicKey().toSuiAddress());
  
  console.log('\n✅ Key generation completed successfully!');
  console.log('\n📝 Copy one of the above AGENT_PRIVATE_KEY values to your .env file');
  console.log('💡 The key should start with "suiprivkey1q..."');
  
} catch (error) {
  console.error('❌ Error generating keypair:', error.message);
  console.error('Stack:', error.stack);
}
