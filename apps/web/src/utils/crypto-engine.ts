/**
 * SuiLegacy Cryptography Engine
 * 
 * Pure TypeScript functions for encryption, secret sharing, and asymmetric encryption.
 * No React hooks - just pure functions.
 */

import nacl from 'tweetnacl';
import naclUtil from 'tweetnacl-util';
import secrets from 'secrets.js-grempe';

const { encodeBase64, decodeBase64, encodeUTF8, decodeUTF8 } = naclUtil;

// ============================================================
// MODULE 1: AES-like Encryption using NaCl SecretBox
// (NaCl's secretbox uses XSalsa20-Poly1305, more secure than AES-GCM)
// ============================================================

/**
 * Generates a random 32-byte key for symmetric encryption
 * @returns Base64 encoded 32-byte key
 */
export function generateAESKey(): string {
  const key = nacl.randomBytes(32);
  return encodeBase64(key);
}

/**
 * Encrypts plaintext using NaCl SecretBox (XSalsa20-Poly1305)
 * @param text - The plaintext to encrypt
 * @param aesKey - Base64 encoded 32-byte key
 * @returns Base64 encoded ciphertext with nonce prepended
 */
export function encryptPayload(text: string, aesKey: string): string {
  const keyBytes = decodeBase64(aesKey);
  const textBytes = decodeUTF8(text);
  const nonce = nacl.randomBytes(nacl.secretbox.nonceLength);
  
  const ciphertext = nacl.secretbox(textBytes, nonce, keyBytes);
  
  if (!ciphertext) {
    throw new Error('Encryption failed');
  }
  
  // Prepend nonce to ciphertext for easy decryption
  const combined = new Uint8Array(nonce.length + ciphertext.length);
  combined.set(nonce);
  combined.set(ciphertext, nonce.length);
  
  return encodeBase64(combined);
}

/**
 * Decrypts ciphertext using NaCl SecretBox
 * @param encryptedString - Base64 encoded ciphertext with nonce prepended
 * @param aesKey - Base64 encoded 32-byte key
 * @returns Original plaintext
 */
export function decryptPayload(encryptedString: string, aesKey: string): string {
  const keyBytes = decodeBase64(aesKey);
  const combined = decodeBase64(encryptedString);
  
  // Extract nonce and ciphertext
  const nonce = combined.slice(0, nacl.secretbox.nonceLength);
  const ciphertext = combined.slice(nacl.secretbox.nonceLength);
  
  const decrypted = nacl.secretbox.open(ciphertext, nonce, keyBytes);
  
  if (!decrypted) {
    throw new Error('Decryption failed - invalid key or corrupted data');
  }
  
  return encodeUTF8(decrypted);
}

// ============================================================
// MODULE 2: Shamir's Secret Sharing (5-3 Scheme)
// ============================================================

/**
 * Splits an AES key into 5 shares using Shamir's Secret Sharing
 * Threshold: 3 shares needed to reconstruct
 * 
 * @param aesKey - Base64 encoded key to split
 * @returns Array of 5 share strings
 */
export function splitKey(aesKey: string): string[] {
  // Convert Base64 key to hex for secrets.js
  const hexKey = secrets.str2hex(aesKey);
  
  // Split into 5 shares with threshold of 3
  const shares = secrets.share(hexKey, 5, 3);
  
  if (shares.length !== 5) {
    throw new Error('Failed to generate 5 shares');
  }
  
  return shares;
}

/**
 * Recovers the original AES key from shares
 * Requires minimum 3 shares (threshold)
 * 
 * @param shares - Array of at least 3 share strings
 * @returns Original Base64 encoded AES key
 */
export function recoverKey(shares: string[]): string {
  if (shares.length < 3) {
    throw new Error('Minimum 3 shares required to recover key');
  }
  
  // Combine shares to get hex key
  const hexKey = secrets.combine(shares);
  
  // Convert hex back to original string (Base64 key)
  const aesKey = secrets.hex2str(hexKey);
  
  return aesKey;
}

// ============================================================
// MODULE 3: Asymmetric Encryption (Heir Protection)
// Uses NaCl Box for public-key encryption
// ============================================================

/**
 * Encrypted share package structure
 */
export interface EncryptedSharePackage {
  ciphertext: string;      // Base64 encoded encrypted share
  nonce: string;           // Base64 encoded nonce
  ephemeralPublicKey: string; // Base64 encoded ephemeral public key
}

/**
 * Encrypts a share for the heir using their public key
 * Uses ephemeral keypair for forward secrecy
 * 
 * @param share - The share string to encrypt
 * @param heirPublicKey - Base64 encoded public key of the heir
 * @returns JSON string containing encrypted package
 */
export function encryptShareForHeir(share: string, heirPublicKey: string): string {
  // Decode heir's public key
  const heirPubKeyBytes = decodeBase64(heirPublicKey);
  
  // Generate ephemeral keypair for this encryption
  const ephemeralKeyPair = nacl.box.keyPair();
  
  // Convert share to bytes
  const shareBytes = decodeUTF8(share);
  
  // Generate random nonce
  const nonce = nacl.randomBytes(nacl.box.nonceLength);
  
  // Encrypt using NaCl box
  const ciphertext = nacl.box(
    shareBytes,
    nonce,
    heirPubKeyBytes,
    ephemeralKeyPair.secretKey
  );
  
  if (!ciphertext) {
    throw new Error('Failed to encrypt share for heir');
  }
  
  // Package the encrypted data
  const package_: EncryptedSharePackage = {
    ciphertext: encodeBase64(ciphertext),
    nonce: encodeBase64(nonce),
    ephemeralPublicKey: encodeBase64(ephemeralKeyPair.publicKey),
  };
  
  return JSON.stringify(package_);
}

/**
 * Decrypts a share using the heir's private key
 * 
 * @param encryptedPackage - JSON string containing encrypted package
 * @param heirSecretKey - Base64 encoded secret key of the heir
 * @returns Original share string
 */
export function decryptShareAsHeir(encryptedPackage: string, heirSecretKey: string): string {
  // Parse the encrypted package
  const package_: EncryptedSharePackage = JSON.parse(encryptedPackage);
  
  // Decode all components
  const ciphertext = decodeBase64(package_.ciphertext);
  const nonce = decodeBase64(package_.nonce);
  const ephemeralPublicKey = decodeBase64(package_.ephemeralPublicKey);
  const secretKey = decodeBase64(heirSecretKey);
  
  // Decrypt using NaCl box.open
  const decrypted = nacl.box.open(
    ciphertext,
    nonce,
    ephemeralPublicKey,
    secretKey
  );
  
  if (!decrypted) {
    throw new Error('Failed to decrypt share - invalid key or corrupted data');
  }
  
  return encodeUTF8(decrypted);
}

// ============================================================
// HELPER FUNCTIONS
// ============================================================

/**
 * Generates a new NaCl keypair for the heir
 * @returns Object containing Base64 encoded public and secret keys
 */
export function generateKeyPair(): { publicKey: string; secretKey: string } {
  const keyPair = nacl.box.keyPair();
  return {
    publicKey: encodeBase64(keyPair.publicKey),
    secretKey: encodeBase64(keyPair.secretKey),
  };
}

/**
 * Validates if a string is a valid Base64 encoded 32-byte key
 */
export function isValidKey(key: string): boolean {
  try {
    const decoded = decodeBase64(key);
    return decoded.length === 32;
  } catch {
    return false;
  }
}

/**
 * Validates if a string is a valid Shamir share
 */
export function isValidShare(share: string): boolean {
  try {
    // Shamir shares from secrets.js-grempe follow a specific format
    return share.length > 0 && /^[0-9a-f]+$/i.test(share);
  } catch {
    return false;
  }
}

// ============================================================
// COMPLETE FLOW HELPERS
// ============================================================

export interface LegacyPayload {
  heirShare: string;         // Share 1 - given to heir directly
  walrusShare: string;       // Share 2 - stored on Walrus (public backup)
  contractShares: string[];  // Shares 3, 4, 5 - encrypted for heir, stored on contract
  encryptedBlob: string;     // AES encrypted secret note
}

/**
 * Complete encryption flow for creating a legacy
 * 
 * @param secretNote - The secret message to protect
 * @param heirPublicKey - Heir's public key for encrypting contract shares
 * @returns LegacyPayload with all encrypted components
 */
export function createLegacyPayload(
  secretNote: string,
  heirPublicKey: string
): LegacyPayload {
  // Step 1: Generate AES key
  const aesKey = generateAESKey();
  
  // Step 2: Encrypt the secret note
  const encryptedBlob = encryptPayload(secretNote, aesKey);
  
  // Step 3: Split the AES key into 5 shares
  const shares = splitKey(aesKey);
  
  // Step 4: Encrypt shares 3, 4, 5 with heir's public key
  const contractShares = [
    encryptShareForHeir(shares[2], heirPublicKey), // Share 3
    encryptShareForHeir(shares[3], heirPublicKey), // Share 4
    encryptShareForHeir(shares[4], heirPublicKey), // Share 5
  ];
  
  return {
    heirShare: shares[0],      // Share 1 - plaintext for heir
    walrusShare: shares[1],    // Share 2 - plaintext for Walrus
    contractShares,            // Shares 3,4,5 - encrypted
    encryptedBlob,             // Encrypted secret note
  };
}

/**
 * Complete decryption flow for claiming a legacy
 * 
 * @param heirShare - Share 1 (from heir's possession)
 * @param walrusShare - Share 2 (from Walrus, optional)
 * @param encryptedContractShares - Encrypted shares 3,4,5 from contract
 * @param heirSecretKey - Heir's secret key for decryption
 * @param encryptedBlob - The encrypted secret note from Walrus
 * @returns The original secret note
 */
export function claimLegacy(
  heirShare: string,
  walrusShare: string | null,
  encryptedContractShares: string[],
  heirSecretKey: string,
  encryptedBlob: string
): string {
  // Step 1: Decrypt the contract shares
  const decryptedContractShares = encryptedContractShares.map(
    (encrypted) => decryptShareAsHeir(encrypted, heirSecretKey)
  );
  
  // Step 2: Collect enough shares (need 3)
  const availableShares: string[] = [heirShare];
  
  if (walrusShare) {
    availableShares.push(walrusShare);
  }
  
  availableShares.push(...decryptedContractShares);
  
  // Step 3: Take first 3 shares to recover the key
  const sharesToUse = availableShares.slice(0, 3);
  
  if (sharesToUse.length < 3) {
    throw new Error('Not enough shares to recover the secret');
  }
  
  // Step 4: Recover the AES key
  const aesKey = recoverKey(sharesToUse);
  
  // Step 5: Decrypt the secret note
  const secretNote = decryptPayload(encryptedBlob, aesKey);
  
  return secretNote;
}

