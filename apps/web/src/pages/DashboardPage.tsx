/**
 * Dashboard Page
 * Manage owned vaults and send heartbeats
 */

import { useState, useEffect } from 'react';
import { useCurrentAccount } from '@mysten/dapp-kit';
import { motion } from 'framer-motion';
import {
  Shield,
  Heart,
  Clock,
  Wallet,
  Plus,
  Loader2,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';
import { useLegacyContract } from '@/hooks/useLegacyContract';
import { Link } from 'react-router-dom';

interface VaultCard {
  id: string;
  beneficiary: string;
  balance: number;
  lastHeartbeat: number;
  unlockTimeMs: number;
  timeRemaining: number;
  isExpired: boolean;
}

export function DashboardPage() {
  const account = useCurrentAccount();
  const { getOwnedVaults, sendHeartbeat, packageId } = useLegacyContract();

  const [vaults, setVaults] = useState<VaultCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [heartbeatLoading, setHeartbeatLoading] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadVaults = async () => {
    if (!account) return;
    
    try {
      console.log('[Dashboard] Loading vaults for:', account.address);
      const ownedVaults = await getOwnedVaults();
      console.log('[Dashboard] Found vaults:', ownedVaults);
      
      const now = Date.now();
      
      const vaultCards: VaultCard[] = ownedVaults.map((v) => {
        const unlockAt = v.lastHeartbeat + v.unlockTimeMs;
        const timeRemaining = Math.max(0, unlockAt - now);
        
        return {
          id: v.id,
          beneficiary: v.beneficiary,
          balance: v.balance,
          lastHeartbeat: v.lastHeartbeat,
          unlockTimeMs: v.unlockTimeMs,
          timeRemaining,
          isExpired: timeRemaining === 0,
        };
      });

      setVaults(vaultCards);
    } catch (error) {
      console.error('[Dashboard] Failed to load vaults:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadVaults();
  }, [account]);

  // Update time remaining every second
  useEffect(() => {
    const interval = setInterval(() => {
      setVaults((prev) =>
        prev.map((v) => {
          const now = Date.now();
          const unlockAt = v.lastHeartbeat + v.unlockTimeMs;
          const timeRemaining = Math.max(0, unlockAt - now);
          return {
            ...v,
            timeRemaining,
            isExpired: timeRemaining === 0,
          };
        })
      );
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const handleHeartbeat = async (vaultId: string) => {
    setHeartbeatLoading(vaultId);
    try {
      await sendHeartbeat(vaultId);
      // Refresh vaults after heartbeat
      await loadVaults();
    } catch (error) {
      console.error('Failed to send heartbeat:', error);
    } finally {
      setHeartbeatLoading(null);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadVaults();
    setRefreshing(false);
  };

  const formatTimeRemaining = (ms: number): string => {
    if (ms <= 0) return 'Expired';
    
    const days = Math.floor(ms / (1000 * 60 * 60 * 24));
    const hours = Math.floor((ms % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((ms % (1000 * 60)) / 1000);
    
    if (days > 0) return `${days}d ${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
    return `${minutes}m ${seconds}s`;
  };

  const formatDate = (timestamp: number): string => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (!account) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="w-20 h-20 rounded-2xl bg-gradient-to-br from-sui-primary/20 to-purple-500/20 flex items-center justify-center mb-6"
        >
          <Shield className="w-10 h-10 text-sui-primary" />
        </motion.div>
        <h1 className="text-2xl font-bold text-white mb-2">Connect Your Wallet</h1>
        <p className="text-gray-400 max-w-md">
          Please connect your Sui wallet to view your legacy vaults.
        </p>
      </div>
    );
  }

  // Stats calculation
  const totalVaults = vaults.length;
  const totalValueLocked = vaults.reduce((sum, v) => sum + v.balance, 0) / 1_000_000_000;
  const expiredVaults = vaults.filter((v) => v.isExpired).length;
  const nearestDeadline = vaults.length > 0
    ? Math.min(...vaults.filter((v) => !v.isExpired).map((v) => v.timeRemaining))
    : null;

  return (
    <div className="space-y-8">
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Your Dashboard</h1>
          <p className="text-gray-400">
            Manage your legacy vaults and send heartbeats.
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="btn-secondary"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </motion.div>

      {/* Stats */}
      <div className="grid md:grid-cols-4 gap-4">
        {[
          { label: 'Active Vaults', value: totalVaults.toString(), icon: Shield, color: 'text-sui-primary' },
          { label: 'Total Value Locked', value: `${totalValueLocked.toFixed(2)} SUI`, icon: Wallet, color: 'text-green-400' },
          { label: 'Expired Vaults', value: expiredVaults.toString(), icon: AlertTriangle, color: 'text-red-400' },
          { 
            label: 'Nearest Deadline', 
            value: nearestDeadline !== null ? formatTimeRemaining(nearestDeadline) : 'N/A', 
            icon: Clock, 
            color: 'text-amber-400' 
          },
        ].map((stat, i) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="card"
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-5 h-5 ${stat.color}`} />
                <span className="text-sm text-gray-400">{stat.label}</span>
              </div>
              <p className="text-2xl font-bold text-white mt-2">{stat.value}</p>
            </motion.div>
          );
        })}
      </div>

      {/* Package not deployed warning */}
      {packageId === '0x0' && (
        <div className="card bg-amber-500/10 border-amber-500/30">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-amber-200 font-medium">Contract Not Deployed</p>
              <p className="text-amber-200/70 text-sm mt-1">
                Deploy the contract first to create vaults.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Vaults List */}
      {loading ? (
        <div className="card text-center py-16">
          <Loader2 className="w-12 h-12 text-sui-primary mx-auto mb-4 animate-spin" />
          <p className="text-gray-400">Loading your vaults...</p>
        </div>
      ) : vaults.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="card text-center py-16"
        >
          <div className="w-16 h-16 rounded-2xl bg-sui-dark mx-auto flex items-center justify-center mb-6">
            <Shield className="w-8 h-8 text-gray-600" />
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">No Legacy Vaults Yet</h3>
          <p className="text-gray-400 mb-6 max-w-md mx-auto">
            You haven't created any legacy vaults. Create one to secure your digital inheritance.
          </p>
          <Link to="/create" className="btn-primary inline-flex">
            <Plus className="w-4 h-4" />
            Create Your First Legacy
          </Link>
        </motion.div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Your Vaults</h2>
            <Link to="/create" className="btn-secondary text-sm">
              <Plus className="w-4 h-4" />
              Create New
            </Link>
          </div>

          <div className="grid gap-4">
            {vaults.map((vault, i) => (
              <motion.div
                key={vault.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className={`card ${
                  vault.isExpired 
                    ? 'bg-red-500/5 border-red-500/20' 
                    : 'hover:border-sui-primary/20'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                        vault.isExpired ? 'bg-red-500/20' : 'bg-sui-primary/20'
                      }`}>
                        <Shield className={`w-5 h-5 ${vault.isExpired ? 'text-red-500' : 'text-sui-primary'}`} />
                      </div>
                      <div>
                        <p className="text-white font-mono text-sm">{vault.id.slice(0, 16)}...</p>
                        <p className="text-gray-500 text-xs">
                          Heir: {vault.beneficiary.slice(0, 12)}...
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-6 text-sm">
                      <div>
                        <p className="text-gray-500">Balance</p>
                        <p className="text-white font-medium">
                          {(vault.balance / 1_000_000_000).toFixed(4)} SUI
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-500">Last Heartbeat</p>
                        <p className="text-white font-medium">{formatDate(vault.lastHeartbeat)}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Time Remaining</p>
                        <p className={`font-medium ${vault.isExpired ? 'text-red-400' : 'text-green-400'}`}>
                          {formatTimeRemaining(vault.timeRemaining)}
                        </p>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleHeartbeat(vault.id)}
                    disabled={heartbeatLoading === vault.id}
                    className={`btn ${
                      vault.isExpired
                        ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                        : 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                    } px-4 py-2`}
                  >
                    {heartbeatLoading === vault.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <Heart className="w-4 h-4" />
                        {vault.isExpired ? 'Expired' : "I'm Alive"}
                      </>
                    )}
                  </button>
                </div>

                {vault.isExpired && (
                  <div className="mt-4 pt-4 border-t border-red-500/20">
                    <div className="flex items-center gap-2 text-red-400 text-sm">
                      <AlertTriangle className="w-4 h-4" />
                      This vault has expired. The beneficiary can now claim the legacy.
                    </div>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
