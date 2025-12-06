/**
 * Type definitions for secrets.js-grempe
 */

declare module 'secrets.js-grempe' {
  /**
   * Convert a UTF string to hexadecimal
   */
  export function str2hex(str: string): string;

  /**
   * Convert hexadecimal to UTF string
   */
  export function hex2str(hex: string): string;

  /**
   * Split a secret into shares using Shamir's Secret Sharing
   * @param secret - The secret in hexadecimal format
   * @param numShares - Total number of shares to create
   * @param threshold - Minimum shares needed to reconstruct
   * @returns Array of share strings
   */
  export function share(secret: string, numShares: number, threshold: number): string[];

  /**
   * Combine shares to reconstruct the original secret
   * @param shares - Array of share strings
   * @returns The original secret in hexadecimal format
   */
  export function combine(shares: string[]): string;

  /**
   * Generate a random hexadecimal string
   * @param bits - Number of bits (must be multiple of 8)
   * @returns Random hexadecimal string
   */
  export function random(bits: number): string;

  /**
   * Create a new share from existing shares
   */
  export function newShare(id: number, shares: string[]): string;

  /**
   * Initialize the library with configuration
   */
  export function init(bits?: number, rngType?: string): void;

  /**
   * Get the configuration
   */
  export function getConfig(): {
    bits: number;
    radix: number;
    maxShares: number;
    hasCSPRNG: boolean;
    typeCSPRNG: string;
  };

  /**
   * Extract share components
   */
  export function extractShareComponents(share: string): {
    bits: number;
    id: number;
    data: string;
  };

  /**
   * Set random number generator
   */
  export function setRNG(rng?: (bits: number) => string): void;
}





