/**
 * Network Configuration Hook
 * Manages testnet/mainnet switching and contract addresses
 */

import { getFullnodeUrl } from '@mysten/sui/client';

export type NetworkType = 'testnet' | 'mainnet' | 'devnet';

interface NetworkConfig {
  name: NetworkType;
  url: string;
  packageId: string;
  walrusPublisher: string;
  walrusAggregator: string;
}

// Deployed contract package ID
const PACKAGE_ID = '0x9f743e354e06bd1b358190b94e5ae5ab670512a314f7d12b4dd26514f94a3a73';

const NETWORK_CONFIGS: Record<NetworkType, NetworkConfig> = {
  devnet: {
    name: 'devnet',
    url: getFullnodeUrl('devnet'),
    packageId: import.meta.env.VITE_PACKAGE_ID_DEVNET || PACKAGE_ID,
    walrusPublisher: 'https://publisher.walrus-testnet.walrus.space',
    walrusAggregator: 'https://aggregator.walrus-testnet.walrus.space',
  },
  testnet: {
    name: 'testnet',
    url: getFullnodeUrl('testnet'),
    packageId: import.meta.env.VITE_PACKAGE_ID_TESTNET || PACKAGE_ID,
    walrusPublisher: 'https://publisher.walrus-testnet.walrus.space',
    walrusAggregator: 'https://aggregator.walrus-testnet.walrus.space',
  },
  mainnet: {
    name: 'mainnet',
    url: getFullnodeUrl('mainnet'),
    packageId: import.meta.env.VITE_PACKAGE_ID_MAINNET || PACKAGE_ID,
    walrusPublisher: 'https://publisher.walrus.walrus.space',
    walrusAggregator: 'https://aggregator.walrus.walrus.space',
  },
};

export function useNetworkConfig(network: NetworkType = 'testnet'): NetworkConfig {
  return NETWORK_CONFIGS[network];
}

export function getNetworkVariable<T extends keyof NetworkConfig>(
  network: NetworkType,
  key: T
): NetworkConfig[T] {
  return NETWORK_CONFIGS[network][key];
}

export const DEFAULT_NETWORK: NetworkType = 'testnet';

