/**
 * Walrus Storage Service
 * 
 * Handles off-chain blob storage via Walrus Protocol.
 * Provides upload and download functionality with testnet fallback.
 */

import axios, { AxiosError } from 'axios';
import { SuiClient, getFullnodeUrl } from '@mysten/sui/client';

// ============================================================
// Configuration Constants
// ============================================================

const WALRUS_CONFIG = {
  // Upload relay (CORS-friendly, preferred for browser)
  PUBLISHER_URL: 'https://upload-relay.testnet.walrus.space',
  // Fallback publishers (may block CORS or require different paths)
  ALT_PUBLISHER_URL: 'https://wal-publisher-testnet.staketab.org',
  ALT_PUBLISHER_URL_2: 'https://walrus-testnet-publisher.nodes.guru',
  ALT_PUBLISHER_URL_3: 'http://publisher.testnet.sui.rpcpool.com:9001',
  ALT_PUBLISHER_URL_4: 'http://walrus.krates.ai:9001',
  // Aggregators for downloads
  AGGREGATOR_URL: 'https://wal-aggregator-testnet.staketab.org',
  ALT_AGGREGATOR_URL: 'https://walrus-testnet-aggregator.nodes.guru',
  // Storage duration in epochs (1 epoch ≈ 1 day on testnet)
  DEFAULT_EPOCHS: 5,
  // Timeout for requests in milliseconds
  TIMEOUT: 30000,
} as const;

const AGGREGATOR_ENDPOINTS = Array.from(
  new Set(
    [
      import.meta.env.VITE_WALRUS_AGGREGATOR_URL,
      WALRUS_CONFIG.AGGREGATOR_URL,
      WALRUS_CONFIG.ALT_AGGREGATOR_URL,
    ].filter(Boolean)
  )
);

// ============================================================
// Types
// ============================================================

export interface UploadResult {
  blobId: string;
  isNewlyCreated: boolean;
  isMock: boolean;
}

interface UploadOptions {
  signer?: (args: { transaction: any }) => Promise<any>;
  owner?: string;
  epochs?: number;
}

type WalrusClient = any;

let walrusClient: WalrusClient | null = null;

async function getWalrusClient(): Promise<{ client: WalrusClient; WalrusFile: any }> {
  // Prefer cached client; re-import WalrusFile when needed
  const loadModule = async () => {
    const urls = [
      'https://cdn.jsdelivr.net/npm/@mysten/walrus/+esm',
      'https://cdn.jsdelivr.net/npm/@mystenlabs/walrus/+esm',
    ];
    let lastErr: unknown;
    for (const url of urls) {
      try {
        // @ts-ignore dynamic import from CDN
        const mod = await import(/* @vite-ignore */ url);
        const walrusFn = (mod as any).walrus ?? (mod as any).default?.walrus ?? (mod as any).default;
        const WalrusFile = (mod as any).WalrusFile ?? (mod as any).default?.WalrusFile;
        const RemoteSuiClient = (mod as any).SuiClient ?? (mod as any).default?.SuiClient ?? SuiClient;
        if (walrusFn && WalrusFile && RemoteSuiClient) {
          return { walrusFn, WalrusFile, RemoteSuiClient };
        }
        lastErr = new Error(`Missing exports from ${url}`);
      } catch (e) {
        lastErr = e;
      }
    }
    throw new Error(`Failed to load Walrus SDK from CDN: ${String(lastErr)}`);
  };

  if (walrusClient) {
    const { WalrusFile } = await loadModule();
    return { client: walrusClient, WalrusFile };
  }

  const { walrusFn, WalrusFile, RemoteSuiClient } = await loadModule();

  const wasmUrl = 'https://cdn.jsdelivr.net/npm/@mysten/walrus-wasm/web/walrus_wasm_bg.wasm';

  walrusClient = new RemoteSuiClient({
    url: getFullnodeUrl('testnet'),
    network: 'testnet',
  }).$extend(
    walrusFn({
      wasmUrl,
      uploadRelay: {
        host: WALRUS_CONFIG.PUBLISHER_URL,
      },
    })
  );

  return { client: walrusClient, WalrusFile };
}

// ============================================================
// Upload Function
// ============================================================

/**
 * Uploads encrypted data to Walrus storage
 * 
 * @param data - The encrypted payload string to upload
 * @param epochs - Number of epochs to store (default: 5)
 * @returns Upload result containing blobId and metadata
 * 
 * @example
 * ```ts
 * const result = await uploadBlob(encryptedPayload);
 * console.log('Blob ID:', result.blobId);
 * ```
 */
export async function uploadBlob(
  data: string,
  _epochs: number = WALRUS_CONFIG.DEFAULT_EPOCHS,
  options: UploadOptions = {}
): Promise<UploadResult> {
  if (!options.signer || !options.owner) {
    throw new Error('Walrus upload requires signer and owner (testnet).');
  }

  try {
    const { client, WalrusFile } = await getWalrusClient();
    const file = WalrusFile.from({
      contents: new TextEncoder().encode(data),
      identifier: 'payload.txt',
      tags: { 'content-type': 'text/plain' },
    });

    const flow = client.walrus.writeFilesFlow({
      files: [file],
    });

    await flow.encode();

    const registerTx = flow.register({
      epochs: options.epochs ?? _epochs,
      owner: options.owner,
      deletable: false,
    });
      
    const { digest } = await options.signer({ transaction: registerTx });

    await flow.upload({ digest });

    const certifyTx = flow.certify();
    await options.signer({ transaction: certifyTx });

    const files = await flow.listFiles();
    const first = files?.[0];
    if (first?.blobId) {
      console.log('[Walrus] ✓ Blob created via SDK');
        return {
        blobId: first.blobId,
          isNewlyCreated: true,
          isMock: false,
        };
      }

    throw new Error('Unexpected response: no blobId returned from Walrus SDK');
    } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`Walrus upload failed: ${msg}`);
  }
}

// ============================================================
// Download Function
// ============================================================

/**
 * Downloads encrypted data from Walrus storage
 * 
 * @param blobId - The blob ID to retrieve
 * @returns The encrypted payload string
 * 
 * @example
 * ```ts
 * const encryptedData = await downloadBlob(blobId);
 * const decrypted = decryptPayload(encryptedData, aesKey);
 * ```
 */
export async function downloadBlob(blobId: string): Promise<string> {
  for (const baseUrl of AGGREGATOR_ENDPOINTS) {
    try {
      console.log(`[Walrus] Downloading blob from ${baseUrl} ...`);
      const url = `${baseUrl}/v1/${blobId}`;
      const response = await axios.get<string>(url, {
        timeout: WALRUS_CONFIG.TIMEOUT,
        responseType: 'text',
      });
      console.log('[Walrus] ✓ Blob downloaded successfully');
      return response.data;
    } catch (error) {
      if (error instanceof AxiosError) {
        if (error.response?.status === 404) {
          throw new Error(`Blob not found: ${blobId}`);
        }
        const msg = `${error.message} (${error.response?.status || 'no status'})`;
        console.warn(`[Walrus] Download failed on ${baseUrl}: ${msg}`);
      } else {
        console.warn(`[Walrus] Download failed on ${baseUrl}: ${String(error)}`);
      }
      continue; // try next endpoint
    }
  }

  throw new Error(`Walrus download failed on all endpoints`);
}

// ============================================================
// Utility Functions
// ============================================================

/**
 * Checks if Walrus testnet is available
 * @returns true if testnet is reachable
 */
export async function checkWalrusHealth(): Promise<boolean> {
  try {
    await axios.get(`${WALRUS_CONFIG.AGGREGATOR_URL}/v1/status`, {
      timeout: 5000,
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Gets the Walrus explorer URL for a blob
 */
export function getExplorerUrl(blobId: string): string | null {
  return `https://walrus.sui.io/blob/${blobId}`;
}

// ============================================================
// Combined Upload with Share (Helper)
// ============================================================

/**
 * Uploads both the encrypted blob and the walrus share
 * Returns both blob IDs for the legacy creation flow
 * 
 * @param encryptedBlob - The AES encrypted secret note
 * @param walrusShare - Share 2 (plaintext, stored on Walrus)
 */
export async function uploadLegacyData(
  encryptedBlob: string,
  walrusShare: string
): Promise<{ blobId: string; walrusShareBlobId: string; isMock: boolean }> {
  // Upload encrypted blob
  const blobResult = await uploadBlob(encryptedBlob);
  
  // Upload walrus share (Share 2)
  const shareResult = await uploadBlob(walrusShare);
  
  return {
    blobId: blobResult.blobId,
    walrusShareBlobId: shareResult.blobId,
    isMock: false,
  };
}

/**
 * Downloads legacy data for claiming
 * 
 * @param blobId - The encrypted blob ID
 * @param walrusShareBlobId - The walrus share blob ID (optional)
 */
export async function downloadLegacyData(
  blobId: string,
  walrusShareBlobId?: string
): Promise<{ encryptedBlob: string; walrusShare: string | null }> {
  // Download encrypted blob
  const encryptedBlob = await downloadBlob(blobId);
  
  // Download walrus share if provided
  let walrusShare: string | null = null;
  if (walrusShareBlobId) {
    try {
      walrusShare = await downloadBlob(walrusShareBlobId);
    } catch (error) {
      console.warn('[Walrus] Could not retrieve walrus share:', error);
    }
  }
  
  return { encryptedBlob, walrusShare };
}

