/**
 * Crypto Engine Tests
 * Run with: npx tsx src/utils/crypto-engine.test.ts
 */

import {
  generateAESKey,
  encryptPayload,
  decryptPayload,
  splitKey,
  recoverKey,
  encryptShareForHeir,
  decryptShareAsHeir,
  generateKeyPair,
  createLegacyPayload,
  claimLegacy,
  isValidKey,
} from './crypto-engine';

// ANSI colors for console
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';

function test(name: string, fn: () => void) {
  try {
    fn();
    console.log(`${GREEN}✓${RESET} ${name}`);
  } catch (error) {
    console.log(`${RED}✗${RESET} ${name}`);
    console.error(`  ${RED}${error}${RESET}`);
    process.exit(1);
  }
}

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

console.log(`\n${BOLD}🔐 Heritage Crypto Engine Tests${RESET}\n`);

// ============================================================
// MODULE 1: AES Encryption Tests
// ============================================================

console.log(`${BOLD}Module 1: AES Encryption${RESET}`);

test('generateAESKey creates valid 32-byte key', () => {
  const key = generateAESKey();
  assert(isValidKey(key), 'Key should be valid');
  assert(key.length > 0, 'Key should not be empty');
});

test('encryptPayload encrypts text correctly', () => {
  const key = generateAESKey();
  const plaintext = 'Hello, World!';
  const encrypted = encryptPayload(plaintext, key);
  assert(encrypted !== plaintext, 'Encrypted should differ from plaintext');
  assert(encrypted.length > 0, 'Encrypted should not be empty');
});

test('decryptPayload recovers original text', () => {
  const key = generateAESKey();
  const plaintext = 'My secret seed phrase: abandon abandon abandon';
  const encrypted = encryptPayload(plaintext, key);
  const decrypted = decryptPayload(encrypted, key);
  assert(decrypted === plaintext, `Expected "${plaintext}", got "${decrypted}"`);
});

test('decryption fails with wrong key', () => {
  const key1 = generateAESKey();
  const key2 = generateAESKey();
  const plaintext = 'Secret message';
  const encrypted = encryptPayload(plaintext, key1);
  
  try {
    decryptPayload(encrypted, key2);
    throw new Error('Should have thrown');
  } catch (e) {
    assert(e instanceof Error && e.message.includes('Decryption failed'), 'Should throw decryption error');
  }
});

// ============================================================
// MODULE 2: Shamir's Secret Sharing Tests
// ============================================================

console.log(`\n${BOLD}Module 2: Shamir's Secret Sharing${RESET}`);

test('splitKey creates exactly 5 shares', () => {
  const key = generateAESKey();
  const shares = splitKey(key);
  assert(shares.length === 5, `Expected 5 shares, got ${shares.length}`);
});

test('recoverKey works with 3 shares', () => {
  const key = generateAESKey();
  const shares = splitKey(key);
  
  // Try with shares 1, 2, 3
  const recovered = recoverKey([shares[0], shares[1], shares[2]]);
  assert(recovered === key, 'Recovered key should match original');
});

test('recoverKey works with any 3 shares', () => {
  const key = generateAESKey();
  const shares = splitKey(key);
  
  // Try with shares 1, 3, 5
  const recovered = recoverKey([shares[0], shares[2], shares[4]]);
  assert(recovered === key, 'Recovered key should match original');
});

test('recoverKey fails with only 2 shares', () => {
  const key = generateAESKey();
  const shares = splitKey(key);
  
  try {
    recoverKey([shares[0], shares[1]]);
    throw new Error('Should have thrown');
  } catch (e) {
    assert(e instanceof Error && e.message.includes('3 shares'), 'Should require 3 shares');
  }
});

// ============================================================
// MODULE 3: Asymmetric Encryption Tests
// ============================================================

console.log(`\n${BOLD}Module 3: Asymmetric Encryption${RESET}`);

test('generateKeyPair creates valid keypair', () => {
  const { publicKey, secretKey } = generateKeyPair();
  assert(publicKey.length > 0, 'Public key should not be empty');
  assert(secretKey.length > 0, 'Secret key should not be empty');
  assert(publicKey !== secretKey, 'Keys should be different');
});

test('encryptShareForHeir creates valid package', () => {
  const { publicKey } = generateKeyPair();
  const share = 'test-share-string-12345';
  const encrypted = encryptShareForHeir(share, publicKey);
  const parsed = JSON.parse(encrypted);
  
  assert('ciphertext' in parsed, 'Should have ciphertext');
  assert('nonce' in parsed, 'Should have nonce');
  assert('ephemeralPublicKey' in parsed, 'Should have ephemeralPublicKey');
});

test('decryptShareAsHeir recovers original share', () => {
  const { publicKey, secretKey } = generateKeyPair();
  const share = 'my-secret-share-abc123';
  const encrypted = encryptShareForHeir(share, publicKey);
  const decrypted = decryptShareAsHeir(encrypted, secretKey);
  
  assert(decrypted === share, `Expected "${share}", got "${decrypted}"`);
});

test('decryption fails with wrong secret key', () => {
  const { publicKey } = generateKeyPair();
  const { secretKey: wrongKey } = generateKeyPair();
  const share = 'secret-share';
  const encrypted = encryptShareForHeir(share, publicKey);
  
  try {
    decryptShareAsHeir(encrypted, wrongKey);
    throw new Error('Should have thrown');
  } catch (e) {
    assert(e instanceof Error && e.message.includes('Failed to decrypt'), 'Should fail decryption');
  }
});

// ============================================================
// INTEGRATION: Complete Flow Tests
// ============================================================

console.log(`\n${BOLD}Integration: Complete Flow${RESET}`);

test('createLegacyPayload creates valid payload', () => {
  const { publicKey } = generateKeyPair();
  const secretNote = 'My seed phrase: abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
  
  const payload = createLegacyPayload(secretNote, publicKey);
  
  assert(payload.heirShare.length > 0, 'Heir share should exist');
  assert(payload.walrusShare.length > 0, 'Walrus share should exist');
  assert(payload.contractShares.length === 3, 'Should have 3 contract shares');
  assert(payload.encryptedBlob.length > 0, 'Encrypted blob should exist');
});

test('claimLegacy recovers original secret', () => {
  const { publicKey, secretKey } = generateKeyPair();
  const secretNote = 'My ultra secret seed phrase that must be protected!';
  
  // Owner creates legacy
  const payload = createLegacyPayload(secretNote, publicKey);
  
  // Heir claims legacy
  const recovered = claimLegacy(
    payload.heirShare,
    payload.walrusShare,
    payload.contractShares,
    secretKey,
    payload.encryptedBlob
  );
  
  assert(recovered === secretNote, `Expected "${secretNote}", got "${recovered}"`);
});

test('claimLegacy works without walrusShare', () => {
  const { publicKey, secretKey } = generateKeyPair();
  const secretNote = 'Another secret message';
  
  const payload = createLegacyPayload(secretNote, publicKey);
  
  // Claim without Walrus share (use heir share + 2 contract shares)
  const recovered = claimLegacy(
    payload.heirShare,
    null, // No Walrus share
    payload.contractShares.slice(0, 2), // Only 2 contract shares
    secretKey,
    payload.encryptedBlob
  );
  
  assert(recovered === secretNote, 'Should recover with 3 shares total');
});

// ============================================================
// Summary
// ============================================================

console.log(`\n${GREEN}${BOLD}All tests passed! ✓${RESET}\n`);





