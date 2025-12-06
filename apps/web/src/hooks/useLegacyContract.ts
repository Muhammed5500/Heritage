/**
 * Legacy Contract Hook
 * Handles all interactions with the SuiLegacy smart contract
 */

import { useCallback } from 'react';
import { useSignAndExecuteTransaction, useSuiClient, useCurrentAccount } from '@mysten/dapp-kit';
import { useNetworkConfig } from './useNetworkConfig';

const MODULE_NAME = 'vault';
const CLOCK_ID = '0x6';

interface CreateVaultParams {
  beneficiary: string;
  unlockTimeMs: number;
  blobId: string;
  share3: string;
  share4: string;
  share5: string;
  suiAmount: number; // in MIST (1 SUI = 1_000_000_000 MIST)
}

interface VaultData {
  id: string;
  owner: string;
  beneficiary: string;
  unlockTimeMs: number;
  lastHeartbeat: number;
  encryptedBlobId: string;
  lockedShares: string[];
  balance: number;
}

export function useLegacyContract() {
  const client = useSuiClient();
  const account = useCurrentAccount();
  const { mutateAsync: signAndExecute } = useSignAndExecuteTransaction();
  const networkConfig = useNetworkConfig();

  const packageId = networkConfig.packageId;

  /**
   * Create a new legacy vault
   */
  const createVault = useCallback(
    async (params: CreateVaultParams) => {
      if (!account) throw new Error('Wallet not connected');

      // Import Transaction dynamically to avoid version conflicts
      const { Transaction } = await import('@mysten/sui/transactions');
      const tx = new Transaction();

      // Split coins for the deposit
      const [coin] = tx.splitCoins(tx.gas, [params.suiAmount]);

      tx.moveCall({
        target: `${packageId}::${MODULE_NAME}::create_vault`,
        arguments: [
          tx.pure.address(params.beneficiary),
          tx.pure.u64(params.unlockTimeMs),
          tx.pure.string(params.blobId),
          tx.pure.string(params.share3),
          tx.pure.string(params.share4),
          tx.pure.string(params.share5),
          coin,
          tx.object(CLOCK_ID),
        ],
      });

      const result = await signAndExecute({
        transaction: tx as never,
      });

      return result;
    },
    [account, packageId, signAndExecute]
  );

  /**
   * Send heartbeat to keep vault locked
   */
  const sendHeartbeat = useCallback(
    async (vaultId: string) => {
      if (!account) throw new Error('Wallet not connected');

      const { Transaction } = await import('@mysten/sui/transactions');
      const tx = new Transaction();

      tx.moveCall({
        target: `${packageId}::${MODULE_NAME}::im_alive`,
        arguments: [
          tx.object(vaultId),
          tx.object(CLOCK_ID),
        ],
      });

      const result = await signAndExecute({
        transaction: tx as never,
      });

      return result;
    },
    [account, packageId, signAndExecute]
  );

  /**
   * Claim legacy as beneficiary
   */
  const claimLegacy = useCallback(
    async (vaultId: string) => {
      if (!account) throw new Error('Wallet not connected');

      const { Transaction } = await import('@mysten/sui/transactions');
      const tx = new Transaction();

      tx.moveCall({
        target: `${packageId}::${MODULE_NAME}::claim_legacy`,
        arguments: [
          tx.object(vaultId),
          tx.object(CLOCK_ID),
        ],
      });

      const result = await signAndExecute({
        transaction: tx as never,
      });

      return result;
    },
    [account, packageId, signAndExecute]
  );

  /**
   * Add funds to existing vault
   */
  const addFunds = useCallback(
    async (vaultId: string, amount: number) => {
      if (!account) throw new Error('Wallet not connected');

      const { Transaction } = await import('@mysten/sui/transactions');
      const tx = new Transaction();

      const [coin] = tx.splitCoins(tx.gas, [amount]);

      tx.moveCall({
        target: `${packageId}::${MODULE_NAME}::add_funds`,
        arguments: [
          tx.object(vaultId),
          coin,
        ],
      });

      const result = await signAndExecute({
        transaction: tx as never,
      });

      return result;
    },
    [account, packageId, signAndExecute]
  );

  /**
   * Fetch vault data by ID
   */
  const getVault = useCallback(
    async (vaultId: string): Promise<VaultData | null> => {
      try {
        const object = await client.getObject({
          id: vaultId,
          options: {
            showContent: true,
          },
        });

        if (!object.data?.content || object.data.content.dataType !== 'moveObject') {
          return null;
        }

        const fields = object.data.content.fields as Record<string, unknown>;

        return {
          id: vaultId,
          owner: fields.owner as string,
          beneficiary: fields.beneficiary as string,
          unlockTimeMs: Number(fields.unlock_time_ms),
          lastHeartbeat: Number(fields.last_heartbeat),
          encryptedBlobId: fields.encrypted_blob_id as string,
          lockedShares: fields.locked_shares as string[],
          balance: Number((fields.balance as string) || 0),
        };
      } catch (error) {
        console.error('Failed to fetch vault:', error);
        return null;
      }
    },
    [client]
  );

  /**
   * Get vaults created by current user (via events)
   */
  const getOwnedVaults = useCallback(
    async (): Promise<VaultData[]> => {
      if (!account) return [];

      try {
        // Query VaultCreated events to find vaults created by this user
        const events = await client.queryEvents({
          query: {
            MoveEventType: `${packageId}::${MODULE_NAME}::VaultCreated`,
          },
          limit: 50,
        });

        // Filter events by owner and get vault IDs
        const userVaultIds: string[] = [];
        
        for (const event of events.data) {
          const parsed = event.parsedJson as {
            vault_id: string;
            owner: string;
            beneficiary: string;
            unlock_time_ms: string;
          };
          
          if (parsed.owner === account.address) {
            userVaultIds.push(parsed.vault_id);
          }
        }

        // Fetch each vault's current state
        const vaults: VaultData[] = [];
        
        for (const vaultId of userVaultIds) {
          const vault = await getVault(vaultId);
          if (vault) {
            vaults.push(vault);
          }
        }

        return vaults;
      } catch (error) {
        console.error('Failed to fetch owned vaults:', error);
        return [];
      }
    },
    [account, client, packageId, getVault]
  );

  /**
   * Get vaults where current user is beneficiary (via events)
   */
  const getBeneficiaryVaults = useCallback(
    async (): Promise<VaultData[]> => {
      if (!account) return [];

      try {
        // Query VaultCreated events
        const events = await client.queryEvents({
          query: {
            MoveEventType: `${packageId}::${MODULE_NAME}::VaultCreated`,
          },
          limit: 50,
        });

        // Filter events by beneficiary
        const beneficiaryVaultIds: string[] = [];
        
        for (const event of events.data) {
          const parsed = event.parsedJson as {
            vault_id: string;
            owner: string;
            beneficiary: string;
            unlock_time_ms: string;
          };
          
          if (parsed.beneficiary === account.address) {
            beneficiaryVaultIds.push(parsed.vault_id);
          }
        }

        // Fetch each vault's current state
        const vaults: VaultData[] = [];
        
        for (const vaultId of beneficiaryVaultIds) {
          const vault = await getVault(vaultId);
          if (vault) {
            vaults.push(vault);
          }
        }

        return vaults;
      } catch (error) {
        console.error('Failed to fetch beneficiary vaults:', error);
        return [];
      }
    },
    [account, client, packageId, getVault]
  );

  /**
   * Query events for LegacyClaimed
   */
  const getLegacyClaimedEvents = useCallback(
    async (_vaultId?: string) => {
      try {
        const events = await client.queryEvents({
          query: {
            MoveEventType: `${packageId}::${MODULE_NAME}::LegacyClaimed`,
          },
          limit: 50,
        });

        return events.data.map((event) => event.parsedJson as {
          beneficiary: string;
          blob_id: string;
          shares: string[];
          amount: string;
        });
      } catch (error) {
        console.error('Failed to fetch events:', error);
        return [];
      }
    },
    [client, packageId]
  );

  return {
    createVault,
    sendHeartbeat,
    claimLegacy,
    addFunds,
    getVault,
    getOwnedVaults,
    getBeneficiaryVaults,
    getLegacyClaimedEvents,
    packageId,
  };
}
