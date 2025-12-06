/**
 * Heir Dashboard ("Varis" View)
 * Claim legacy vaults and decrypt secrets
 */

import { useState, useEffect } from 'react';
import { useCurrentAccount } from '@mysten/dapp-kit';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Key,
  Shield,
  Search,
  Loader2,
  CheckCircle,
  Clock,
  Lock,
  Unlock,
  Copy,
  Check,
  Eye,
  EyeOff,
  Download,
} from 'lucide-react';
import { useLegacyContract } from '@/hooks/useLegacyContract';
import { walrusClient } from '@/services/walrus-sdk';
import {
  decryptShareAsHeir,
  recoverKey,
  decryptPayload,
  generateKeyPair,
} from '@/utils/crypto-engine';

type ClaimStep = 'search' | 'found' | 'claiming' | 'reconstruct' | 'success';

interface VaultInfo {
  id: string;
  owner: string;
  beneficiary: string;
  unlockTimeMs: number;
  lastHeartbeat: number;
  encryptedBlobId: string;
  lockedShares: string[];
  balance: number;
  canClaim: boolean;
  timeRemaining: number;
}

export function ClaimPage() {
  const account = useCurrentAccount();
  const { getVault, claimLegacy } = useLegacyContract();

  // Form state
  const [vaultId, setVaultId] = useState('');
  const [heirShare, setHeirShare] = useState('');
  const [heirSecretKey, setHeirSecretKey] = useState('');
  
  // UI state
  const [step, setStep] = useState<ClaimStep>('search');
  const [vaultInfo, setVaultInfo] = useState<VaultInfo | null>(null);
  const [decryptedSecret, setDecryptedSecret] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [showKey, setShowKey] = useState(false);

  // Demo keypair for testing
  const [demoKeyPair] = useState(() => generateKeyPair());
  const [storedDemoSecret, setStoredDemoSecret] = useState<string | null>(null);

  // Load stored demo secret (if user used demo keypair during creation)
  useEffect(() => {
    try {
      const secret = localStorage.getItem('suilegacy_demo_secret');
      if (secret) {
        setStoredDemoSecret(secret);
      }
    } catch (e) {
      console.warn('Could not read stored demo secret', e);
    }
  }, []);

  // Update time remaining
  useEffect(() => {
    if (!vaultInfo) return;
    
    const interval = setInterval(() => {
      const now = Date.now();
      const unlockAt = vaultInfo.lastHeartbeat + vaultInfo.unlockTimeMs;
      const remaining = Math.max(0, unlockAt - now);
      
      setVaultInfo((prev) => prev ? {
        ...prev,
        timeRemaining: remaining,
        canClaim: remaining === 0,
      } : null);
    }, 1000);

    return () => clearInterval(interval);
  }, [vaultInfo?.lastHeartbeat, vaultInfo?.unlockTimeMs]);

  const formatTimeRemaining = (ms: number): string => {
    if (ms <= 0) return 'Ready to claim';
    
    const days = Math.floor(ms / (1000 * 60 * 60 * 24));
    const hours = Math.floor((ms % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    
    if (days > 0) return `${days}d ${hours}h remaining`;
    if (hours > 0) return `${hours}h ${minutes}m remaining`;
    return `${minutes}m remaining`;
  };

  const handleSearch = async () => {
    if (!vaultId) return;
    
    setLoading(true);
    setError('');

    try {
      const vault = await getVault(vaultId);
      
      if (!vault) {
        setError('Vault not found. Please check the ID.');
        return;
      }

      const now = Date.now();
      const unlockAt = vault.lastHeartbeat + vault.unlockTimeMs;
      const timeRemaining = Math.max(0, unlockAt - now);

      setVaultInfo({
        ...vault,
        canClaim: timeRemaining === 0,
        timeRemaining,
      });
      setStep('found');

    } catch (err) {
      console.error('Failed to fetch vault:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch vault');
    } finally {
      setLoading(false);
    }
  };

  const handleClaim = async () => {
    if (!vaultInfo || !account) return;

    setStep('claiming');
    setError('');

    try {
      // Execute claim transaction
      await claimLegacy(vaultInfo.id);
      
      // Move to reconstruction step
      setStep('reconstruct');

    } catch (err) {
      console.error('Failed to claim:', err);
      setError(err instanceof Error ? err.message : 'Failed to claim legacy');
      setStep('found');
    }
  };

  const handleReconstruct = async () => {
    if (!vaultInfo || !heirShare) return;

    setLoading(true);
    setError('');

    try {
      // Get the secret key (use demo key or user-provided)
      const secretKey = heirSecretKey || storedDemoSecret || demoKeyPair.secretKey;

      // Decrypt the contract shares (3, 4, 5)
      const decryptedShares = vaultInfo.lockedShares.map((encrypted) => {
        try {
          return decryptShareAsHeir(encrypted, secretKey);
        } catch {
          throw new Error('Failed to decrypt shares. Invalid secret key.');
        }
      });

      // Combine shares: User's share (1) + Contract shares (3, 4)
      // We only need 3 shares to reconstruct
      const sharesToCombine = [heirShare, decryptedShares[0], decryptedShares[1]];
      
      // Recover the AES key
      const aesKey = recoverKey(sharesToCombine);

      // Download encrypted blob from Walrus
      const encryptedBlob = await walrusClient.readBlob(vaultInfo.encryptedBlobId);

      // Decrypt the secret
      const secret = decryptPayload(encryptedBlob, aesKey);

      setDecryptedSecret(secret);
      setStep('success');

    } catch (err) {
      console.error('Failed to reconstruct:', err);
      setError(err instanceof Error ? err.message : 'Failed to reconstruct secret');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!account) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="w-20 h-20 rounded-2xl bg-gradient-to-br from-sui-primary/20 to-purple-500/20 flex items-center justify-center mb-6"
        >
          <Key className="w-10 h-10 text-sui-primary" />
        </motion.div>
        <h1 className="text-2xl font-bold text-white mb-2">Connect Your Wallet</h1>
        <p className="text-gray-400 max-w-md">
          Please connect your Sui wallet to claim an inheritance.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <motion.div
        className="text-center"
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
      >
        <h1 className="text-3xl font-bold text-white mb-2">Claim Inheritance</h1>
        <p className="text-gray-400">
          Retrieve your inherited assets and decrypt the secret message.
        </p>
      </motion.div>

      <AnimatePresence mode="wait">
        {/* Step 1: Search for Vault */}
        {step === 'search' && (
          <motion.div
            key="search"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="space-y-6"
          >
            {/* Instructions */}
            <div className="card bg-sui-primary/5 border-sui-primary/20">
              <h3 className="text-sui-primary font-medium mb-3 flex items-center gap-2">
                <Shield className="w-4 h-4" />
                How to Claim
              </h3>
              <ol className="text-sm text-gray-300 space-y-2 list-decimal list-inside">
                <li>Enter the Legacy Vault ID</li>
                <li>Wait for the unlock period to pass</li>
                <li>Enter your heir share (Share 1)</li>
                <li>The secret will be reconstructed automatically</li>
              </ol>
            </div>

            {/* Demo Key Notice */}
            <div className="card bg-purple-500/5 border-purple-500/20">
              <p className="text-purple-300 text-sm">
                <strong>Demo Mode:</strong> Using auto-generated keypair for testing.
                Your public key: <code className="text-xs">{demoKeyPair.publicKey.slice(0, 20)}...</code>
              </p>
            </div>

            {/* Search Form */}
            <div className="card space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Legacy Vault ID
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={vaultId}
                    onChange={(e) => setVaultId(e.target.value)}
                    placeholder="0x..."
                    className="input font-mono pr-12"
                  />
                  <button
                    onClick={handleSearch}
                    disabled={!vaultId || loading}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-gray-500 hover:text-sui-primary transition-colors disabled:opacity-50"
                  >
                    {loading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Search className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>

              {error && (
                <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
                  {error}
                </div>
              )}

              <button
                onClick={handleSearch}
                disabled={!vaultId || loading}
                className="btn-primary w-full"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Searching...
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4" />
                    Find Vault
                  </>
                )}
              </button>
            </div>
          </motion.div>
        )}

        {/* Step 2: Vault Found */}
        {step === 'found' && vaultInfo && (
          <motion.div
            key="found"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="space-y-6"
          >
            {/* Vault Status Card */}
            <div className={`card ${vaultInfo.canClaim ? 'bg-green-500/5 border-green-500/20' : 'bg-amber-500/5 border-amber-500/20'}`}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">Vault Status</h3>
                <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm ${
                  vaultInfo.canClaim
                    ? 'bg-green-500/20 text-green-400'
                    : 'bg-amber-500/20 text-amber-400'
                }`}>
                  {vaultInfo.canClaim ? (
                    <>
                      <Unlock className="w-4 h-4" />
                      Ready to Claim
                    </>
                  ) : (
                    <>
                      <Lock className="w-4 h-4" />
                      Locked
                    </>
                  )}
                </div>
              </div>

              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Owner</span>
                  <span className="text-white font-mono">{vaultInfo.owner.slice(0, 16)}...</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Balance</span>
                  <span className="text-white">{(vaultInfo.balance / 1_000_000_000).toFixed(4)} SUI</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Time Remaining</span>
                  <span className={vaultInfo.canClaim ? 'text-green-400' : 'text-amber-400'}>
                    {formatTimeRemaining(vaultInfo.timeRemaining)}
                  </span>
                </div>
              </div>

              {!vaultInfo.canClaim && (
                <div className="mt-4 flex items-center gap-2 text-amber-400 text-sm">
                  <Clock className="w-4 h-4" />
                  The owner is still active. Wait for the unlock period.
                </div>
              )}
            </div>

            {/* Claim Button or Wait Message */}
            {vaultInfo.canClaim ? (
              <button
                onClick={handleClaim}
                className="btn-primary w-full"
              >
                <Key className="w-4 h-4" />
                Claim Legacy
              </button>
            ) : (
              <button
                disabled
                className="btn-secondary w-full opacity-50 cursor-not-allowed"
              >
                <Lock className="w-4 h-4" />
                Vault Still Locked
              </button>
            )}

            <button
              onClick={() => {
                setStep('search');
                setVaultInfo(null);
              }}
              className="btn-secondary w-full"
            >
              Search Another Vault
            </button>
          </motion.div>
        )}

        {/* Step 3: Claiming */}
        {step === 'claiming' && (
          <motion.div
            key="claiming"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="card text-center py-12"
          >
            <Loader2 className="w-16 h-16 text-sui-primary mx-auto mb-6 animate-spin" />
            <h2 className="text-xl font-bold text-white mb-2">Claiming Legacy...</h2>
            <p className="text-gray-400">
              Processing your claim on the Sui blockchain.
            </p>
          </motion.div>
        )}

        {/* Step 4: Reconstruct Secret */}
        {step === 'reconstruct' && vaultInfo && (
          <motion.div
            key="reconstruct"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="space-y-6"
          >
            <div className="card bg-green-500/5 border-green-500/20 text-center">
              <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-white mb-2">Legacy Claimed!</h2>
              <p className="text-gray-400">
                Now enter your heir share to decrypt the secret.
              </p>
            </div>

            <div className="card space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Your Heir Share (Share 1)
                </label>
                <textarea
                  value={heirShare}
                  onChange={(e) => setHeirShare(e.target.value)}
                  placeholder="Paste the share string given to you..."
                  rows={3}
                  className="input resize-none font-mono text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Your Secret Key (Optional)
                </label>
                <div className="relative">
                  <input
                    type={showKey ? 'text' : 'password'}
                    value={heirSecretKey}
                    onChange={(e) => setHeirSecretKey(e.target.value)}
                    placeholder="Leave empty to use demo key"
                    className="input font-mono text-sm pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey(!showKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
                  >
                    {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Eğer kasayı oluştururken kendi public key'inle şifrelediysen, private key'ini buraya gir.
                  Demo anahtar kullandıysan boş bırak, tarayıcıda saklanan demo anahtarı otomatik kullanılacak.
                </p>
              </div>

              {error && (
                <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
                  {error}
                </div>
              )}

              <button
                onClick={handleReconstruct}
                disabled={!heirShare || loading}
                className="btn-primary w-full"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Decrypting...
                  </>
                ) : (
                  <>
                    <Unlock className="w-4 h-4" />
                    Decrypt Secret
                  </>
                )}
              </button>
            </div>
          </motion.div>
        )}

        {/* Step 5: Success */}
        {step === 'success' && (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="space-y-6"
          >
            <div className="card bg-gradient-to-br from-green-500/10 to-sui-primary/10 border-green-500/30 text-center">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-green-500 to-sui-primary mx-auto mb-6 flex items-center justify-center">
                <Key className="w-10 h-10 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Secret Recovered!</h2>
              <p className="text-gray-400">
                The legacy has been successfully decrypted.
              </p>
            </div>

            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">Decrypted Secret</h3>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowSecret(!showSecret)}
                    className="p-2 bg-white/5 rounded-lg hover:bg-white/10 transition-colors"
                  >
                    {showSecret ? <EyeOff className="w-4 h-4 text-gray-400" /> : <Eye className="w-4 h-4 text-gray-400" />}
                  </button>
                  <button
                    onClick={() => copyToClipboard(decryptedSecret)}
                    className="p-2 bg-white/5 rounded-lg hover:bg-white/10 transition-colors"
                  >
                    {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4 text-gray-400" />}
                  </button>
                </div>
              </div>

              <div className="bg-black/30 rounded-xl p-4 min-h-[100px]">
                {showSecret ? (
                  <p className="text-green-400 font-mono text-sm whitespace-pre-wrap break-all">
                    {decryptedSecret}
                  </p>
                ) : (
                  <p className="text-gray-500 text-sm">
                    Click the eye icon to reveal the secret
                  </p>
                )}
              </div>
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => {
                  // Download as text file
                  const blob = new Blob([decryptedSecret], { type: 'text/plain' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = 'legacy-secret.txt';
                  a.click();
                  URL.revokeObjectURL(url);
                }}
                className="btn-secondary flex-1"
              >
                <Download className="w-4 h-4" />
                Download
              </button>
              <button
                onClick={() => {
                  setStep('search');
                  setVaultId('');
                  setHeirShare('');
                  setVaultInfo(null);
                  setDecryptedSecret('');
                }}
                className="btn-primary flex-1"
              >
                Claim Another
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
