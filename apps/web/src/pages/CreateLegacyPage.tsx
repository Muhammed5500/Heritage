/**
 * Creator Dashboard ("Baba" View)
 * Create legacy vaults with encrypted secrets
 */

import { useState } from 'react';
import { useCurrentAccount } from '@mysten/dapp-kit';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Shield, 
  AlertTriangle, 
  Copy, 
  Check, 
  Loader2, 
  Lock,
  ArrowRight,
  CheckCircle,
  Eye,
  EyeOff
} from 'lucide-react';
import { 
  generateAESKey, 
  encryptPayload, 
  splitKey, 
  encryptShareForHeir,
  generateKeyPair,
} from '@/utils/crypto-engine';
import { walrusClient } from '@/services/walrus-sdk';
import { useLegacyContract } from '@/hooks/useLegacyContract';

type Step = 'input' | 'processing' | 'share' | 'complete';

interface ProcessingStep {
  id: string;
  label: string;
  status: 'pending' | 'active' | 'done' | 'error';
}

export function CreateLegacyPage() {
  const account = useCurrentAccount();
  const { createVault, packageId } = useLegacyContract();

  // Form state
  const [beneficiary, setBeneficiary] = useState('');
  const [secretNote, setSecretNote] = useState('');
  const [unlockDays, setUnlockDays] = useState('30');
  const [unlockHours, setUnlockHours] = useState('0');
  const [unlockMinutes, setUnlockMinutes] = useState('0');
  const [unlockSeconds, setUnlockSeconds] = useState('0');
  const [suiAmount, setSuiAmount] = useState('0.1');
  const [showSecret, setShowSecret] = useState(false);
  const [demoSecretKey, setDemoSecretKey] = useState('');

  // Process state
  const [step, setStep] = useState<Step>('input');
  const [heirShare, setHeirShare] = useState('');
  const [vaultId, setVaultId] = useState('');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  // Processing steps
  const [processingSteps, setProcessingSteps] = useState<ProcessingStep[]>([
    { id: 'encrypt', label: 'Encrypting secret note...', status: 'pending' },
    { id: 'upload', label: 'Uploading to Walrus...', status: 'pending' },
    { id: 'split', label: 'Splitting encryption key...', status: 'pending' },
    { id: 'heir', label: 'Encrypting shares for heir...', status: 'pending' },
    { id: 'contract', label: 'Creating vault on Sui...', status: 'pending' },
  ]);

  const updateStep = (id: string, status: ProcessingStep['status']) => {
    setProcessingSteps((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status } : s))
    );
  };

  const handleCreate = async () => {
    if (!account) return;
    
    setStep('processing');
    setError('');

    try {
      // Step 1: Generate AES key and encrypt the note
      updateStep('encrypt', 'active');
      const aesKey = generateAESKey();
      const encryptedNote = encryptPayload(secretNote, aesKey);
      updateStep('encrypt', 'done');

      // Step 2: Upload encrypted note to Walrus
      updateStep('upload', 'active');
      const blobId = await walrusClient.storeBlob(encryptedNote);
      updateStep('upload', 'done');

      // Step 3: Split the AES key into 5 shares
      updateStep('split', 'active');
      const shares = splitKey(aesKey);
      const [s1, s2, s3, s4, s5] = shares;
      
      // Upload Share 2 to Walrus as public backup
      await walrusClient.storeBlob(s2);
      updateStep('split', 'done');

      // Step 4: Encrypt shares 3,4,5 for the heir
      updateStep('heir', 'active');
      
      // For demo: Generate a keypair for the heir
      // In production, you'd get the heir's actual public key
      const heirKeyPair = generateKeyPair();
      // Persist demo keypair so heir can reuse
      try {
        localStorage.setItem('heritage_demo_secret', heirKeyPair.secretKey);
        localStorage.setItem('heritage_demo_public', heirKeyPair.publicKey);
        setDemoSecretKey(heirKeyPair.secretKey);
      } catch (e) {
        console.warn('Could not persist demo keys', e);
      }
      
      const encryptedShare3 = encryptShareForHeir(s3, heirKeyPair.publicKey);
      const encryptedShare4 = encryptShareForHeir(s4, heirKeyPair.publicKey);
      const encryptedShare5 = encryptShareForHeir(s5, heirKeyPair.publicKey);
      updateStep('heir', 'done');

      // Step 5: Create vault on Sui
      updateStep('contract', 'active');
      
      const days = parseInt(unlockDays || '0', 10);
      const hours = parseInt(unlockHours || '0', 10);
      const minutes = parseInt(unlockMinutes || '0', 10);
      const seconds = parseInt(unlockSeconds || '0', 10);

      const unlockTimeMs =
        days * 24 * 60 * 60 * 1000 +
        hours * 60 * 60 * 1000 +
        minutes * 60 * 1000 +
        seconds * 1000;
      const suiAmountMist = Math.floor(parseFloat(suiAmount) * 1_000_000_000);

      const result = await createVault({
        beneficiary,
        unlockTimeMs,
        blobId,
        share3: encryptedShare3,
        share4: encryptedShare4,
        share5: encryptedShare5,
        suiAmount: suiAmountMist,
      });

      updateStep('contract', 'done');

      // Extract vault ID from result
      const createdVaultId = result.digest;
      setVaultId(createdVaultId);
      setHeirShare(s1);
      setStep('share');

    } catch (err) {
      console.error('Failed to create legacy:', err);
      setError(err instanceof Error ? err.message : 'Failed to create legacy vault');
      
      // Mark current active step as error
      setProcessingSteps((prev) =>
        prev.map((s) => (s.status === 'active' ? { ...s, status: 'error' } : s))
      );
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
          <Shield className="w-10 h-10 text-sui-primary" />
        </motion.div>
        <h1 className="text-2xl font-bold text-white mb-2">Connect Your Wallet</h1>
        <p className="text-gray-400 max-w-md">
          Please connect your Sui wallet to create a legacy vault and secure your inheritance.
        </p>
      </div>
    );
  }

  // Package not configured warning
  if (packageId === '0x0') {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="card bg-amber-500/10 border-amber-500/30 text-center py-12">
          <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Contract Not Deployed</h2>
          <p className="text-gray-400 mb-4">
            The smart contract has not been deployed yet. Please deploy the contract first.
          </p>
          <code className="text-sm text-amber-300 bg-black/30 px-4 py-2 rounded-lg">
            cd apps/contract && sui client publish --gas-budget 100000000
          </code>
        </div>
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
        <h1 className="text-3xl font-bold text-white mb-2">Create Your Legacy</h1>
        <p className="text-gray-400">
          Secure your secrets and assets for your designated heir.
        </p>
      </motion.div>

      <AnimatePresence mode="wait">
        {/* Step 1: Input Form */}
        {step === 'input' && (
          <motion.div
            key="input"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="space-y-6"
          >
            {/* Warning banner */}
            <div className="card bg-amber-500/5 border-amber-500/20 flex items-start gap-4">
              <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-amber-200 font-medium text-sm">Important Security Notice</p>
                <p className="text-amber-200/70 text-sm mt-1">
                  Your secret is encrypted client-side and never leaves your browser in plaintext.
                  Make sure to securely share Share 1 with your beneficiary.
                </p>
              </div>
            </div>

            {/* Form */}
            <div className="card space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Beneficiary Address
                </label>
                <input
                  type="text"
                  value={beneficiary}
                  onChange={(e) => setBeneficiary(e.target.value)}
                  placeholder="0x..."
                  className="input font-mono"
                />
                <p className="text-xs text-gray-500 mt-2">
                  The Sui address of your heir who will receive the inheritance.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Secret Note
                </label>
                <div className="relative">
                  <textarea
                    value={secretNote}
                    onChange={(e) => setSecretNote(e.target.value)}
                    placeholder="Enter your seed phrase, passwords, or any secret message..."
                    rows={4}
                    className="input resize-none pr-12"
                    style={{ fontFamily: showSecret ? 'inherit' : 'monospace' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowSecret(!showSecret)}
                    className="absolute right-3 top-3 text-gray-500 hover:text-white transition-colors"
                  >
                    {showSecret ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  This will be AES encrypted and the key split using Shamir's Secret Sharing.
                </p>
              </div>

              <div className="grid md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Unlock Days
                  </label>
                  <input
                    type="number"
                    value={unlockDays}
                    onChange={(e) => setUnlockDays(e.target.value)}
                    min="0"
                    className="input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Hours
                  </label>
                  <input
                    type="number"
                    value={unlockHours}
                    onChange={(e) => setUnlockHours(e.target.value)}
                    min="0"
                    max="23"
                    className="input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Minutes
                  </label>
                  <input
                    type="number"
                    value={unlockMinutes}
                    onChange={(e) => setUnlockMinutes(e.target.value)}
                    min="0"
                    max="59"
                    className="input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Seconds
                  </label>
                  <input
                    type="number"
                    value={unlockSeconds}
                    onChange={(e) => setUnlockSeconds(e.target.value)}
                    min="0"
                    max="59"
                    className="input"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  SUI Amount
                </label>
                <input
                  type="number"
                  value={suiAmount}
                  onChange={(e) => setSuiAmount(e.target.value)}
                  min="0"
                  step="0.1"
                  className="input"
                />
              </div>

              <p className="text-xs text-gray-500">
                Your heir can claim after {unlockDays || '0'}d {unlockHours || '0'}h {unlockMinutes || '0'}m {unlockSeconds || '0'}s of no heartbeat from you.
              </p>

              {error && (
                <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
                  {error}
                </div>
              )}

              <button
                onClick={handleCreate}
                disabled={!beneficiary || !secretNote}
                className="btn-primary w-full"
              >
                <Lock className="w-4 h-4" />
                Create Legacy Vault
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}

        {/* Step 2: Processing */}
        {step === 'processing' && (
          <motion.div
            key="processing"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="card"
          >
            <div className="text-center mb-8">
              <Loader2 className="w-12 h-12 text-sui-primary mx-auto mb-4 animate-spin" />
              <h2 className="text-xl font-bold text-white">Creating Your Legacy</h2>
              <p className="text-gray-400 text-sm mt-1">Please wait while we secure your inheritance...</p>
            </div>

            <div className="space-y-4">
              {processingSteps.map((s, i) => (
                <motion.div
                  key={s.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className={`flex items-center gap-3 p-3 rounded-lg ${
                    s.status === 'active' ? 'bg-sui-primary/10' :
                    s.status === 'done' ? 'bg-green-500/10' :
                    s.status === 'error' ? 'bg-red-500/10' :
                    'bg-white/5'
                  }`}
                >
                  {s.status === 'pending' && <div className="w-5 h-5 rounded-full border-2 border-gray-600" />}
                  {s.status === 'active' && <Loader2 className="w-5 h-5 text-sui-primary animate-spin" />}
                  {s.status === 'done' && <CheckCircle className="w-5 h-5 text-green-500" />}
                  {s.status === 'error' && <AlertTriangle className="w-5 h-5 text-red-500" />}
                  <span className={`text-sm ${
                    s.status === 'active' ? 'text-sui-primary' :
                    s.status === 'done' ? 'text-green-400' :
                    s.status === 'error' ? 'text-red-400' :
                    'text-gray-500'
                  }`}>
                    {s.label}
                  </span>
                </motion.div>
              ))}
            </div>

            {error && (
              <div className="mt-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
                <p className="text-red-400 text-sm">{error}</p>
                <button
                  onClick={() => setStep('input')}
                  className="mt-3 text-sm text-red-400 underline hover:text-red-300"
                >
                  Go back and try again
                </button>
              </div>
            )}
          </motion.div>
        )}

        {/* Step 3: Share with Heir */}
        {step === 'share' && (
          <motion.div
            key="share"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="space-y-6"
          >
            <div className="card bg-green-500/5 border-green-500/20 text-center">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-white mb-2">Legacy Created!</h2>
              <p className="text-gray-400">
                Your vault has been created successfully.
              </p>
            </div>

            <div className="card bg-amber-500/5 border-amber-500/20">
              <div className="flex items-start gap-3 mb-4">
                <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-amber-200 font-medium">Critical: Share with Your Heir</p>
                  <p className="text-amber-200/70 text-sm mt-1">
                    Securely transmit this share to your heir. Without it, they cannot recover your secret.
                  </p>
                </div>
              </div>

              <div className="relative">
                <div className="bg-black/30 rounded-xl p-4 font-mono text-xs text-green-400 break-all">
                  {heirShare}
                </div>
                <button
                  onClick={() => copyToClipboard(heirShare)}
                  className="absolute top-2 right-2 p-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors"
                >
                  {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4 text-gray-400" />}
                </button>
              </div>
            </div>

            {demoSecretKey && (
              <div className="card bg-blue-500/5 border-blue-500/20">
                <p className="text-blue-200 font-medium mb-2">Demo Secret Key (sadece demo anahtarı kullandıysan)</p>
                <p className="text-blue-200/70 text-sm mb-2">
                  Kasayı oluştururken varsayılan demo anahtarını kullandıysan, varis bu gizli anahtarı Claim ekranında girmeli (boş bırakırsan depolanan demo anahtarı kullanılacak).
                </p>
                <div className="relative">
                  <div className="bg-black/30 rounded-xl p-4 font-mono text-xs text-blue-200 break-all">
                    {demoSecretKey}
                  </div>
                  <button
                    onClick={() => copyToClipboard(demoSecretKey)}
                    className="absolute top-2 right-2 p-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors"
                  >
                    {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4 text-gray-400" />}
                  </button>
                </div>
              </div>
            )}

            <div className="card">
              <h3 className="text-lg font-semibold text-white mb-4">Vault Details</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Transaction</span>
                  <span className="text-white font-mono">{vaultId.slice(0, 16)}...</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Beneficiary</span>
                  <span className="text-white font-mono">{beneficiary.slice(0, 16)}...</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Unlock Period</span>
                  <span className="text-white">
                    {unlockDays || '0'}d {unlockHours || '0'}h {unlockMinutes || '0'}m {unlockSeconds || '0'}s
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Locked Amount</span>
                  <span className="text-white">{suiAmount} SUI</span>
                </div>
              </div>
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => {
                  setStep('complete');
                }}
                className="btn-primary flex-1"
              >
                I've Saved the Share
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}

        {/* Step 4: Complete */}
        {step === 'complete' && (
          <motion.div
            key="complete"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="card text-center py-12"
          >
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-sui-primary to-purple-500 mx-auto mb-6 flex items-center justify-center">
              <Shield className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Your Legacy is Secured</h2>
            <p className="text-gray-400 max-w-md mx-auto mb-8">
              Remember to send heartbeats regularly to keep your vault locked.
              Your heir can claim after {unlockDays} days of inactivity.
            </p>
            <div className="flex gap-4 justify-center">
              <a href="/dashboard" className="btn-primary">
                Go to Dashboard
              </a>
              <button
                onClick={() => {
                  setStep('input');
                  setBeneficiary('');
                  setSecretNote('');
                  setHeirShare('');
                  setVaultId('');
                  setProcessingSteps((prev) => prev.map((s) => ({ ...s, status: 'pending' })));
                }}
                className="btn-secondary"
              >
                Create Another
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
