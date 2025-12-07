# Heritage · Decentralized Dead Man’s Switch on Sui

Heritage is a Sui-based solution that transfers a legacy (SUI funds + encrypted secret) to the designated heir if the owner stops sending “heartbeats” for a set period.

## Table of Contents
- [Architecture](#architecture)
- [Features](#features)
- [Prerequisites](#prerequisites)
- [Setup & Run](#setup--run)
- [Environment Variables](#environment-variables)
- [Frontend Commands](#frontend-commands)
- [Flows](#flows)
- [Sui Move Smart Contract](#sui-move-smart-contract)
- [Storage (Walrus)](#storage-walrus)
- [Security Notes](#security-notes)
- [License](#license)

## Architecture
```
heritage/
├── apps/
│   ├── contract/      # Sui Move smart contract
│   └── web/           # React + Vite frontend
├── packages/tsconfig/ # Shared TS configs
└── package.json       # Root scripts
```

- Frontend: React, TypeScript, Vite, Tailwind.
- Blockchain: Sui Move.
- Storage: Walrus (blob upload/download).
- Crypto: Shamir’s Secret Sharing (5-3), NaCl-based encryption.

## Features
- Legacy creation: Owner encrypts the secret with AES, splits the key into 5 shares (5-3).
- Walrus integration: Encrypted payload and shares stored on Walrus; on-chain only unusable single shares + references.
- Heartbeat (“I’m Alive”): Owner refreshes lock before timeout.
- Claim flow: After timeout, heir combines shares to decrypt the secret.
- SuiNS support: Beneficiary field resolves `.sui` / `.sol` names automatically (`useSuiClient.resolveNameServiceAddress`).
- Direct RPC: Testnet uses `https://fullnode.testnet.sui.io:443` by default (no proxy).

## Prerequisites
- Node.js ≥ 18
- npm (repo uses `package-lock.json`)
- Sui CLI (for contract build/test)

## Setup & Run
From repo root:
```bash
# Install deps
npm install

# Frontend dev
npm run dev

# Frontend build
npm run build
```

## Environment Variables
For frontend (`apps/web`) in `.env.local`:
```
# Optional: custom RPC, else public testnet is used
VITE_SUI_RPC_URL=https://fullnode.testnet.sui.io:443

# Optional: package ID overrides
VITE_PACKAGE_ID_TESTNET=0x...
VITE_PACKAGE_ID_MAINNET=0x...
VITE_PACKAGE_ID_DEVNET=0x...

# Optional: Walrus aggregator override
VITE_WALRUS_AGGREGATOR_URL=https://...
```

## Frontend Commands
(From root or within `apps/web`)
```bash
npm run dev      # Vite dev server
npm run build    # tsc -b && vite build
npm run lint     # eslint .
```

## Flows

### 1) Create Legacy (`CreateLegacyPage.tsx`)
- Generate AES key, encrypt secret.
- Split key into 5 shares (5-3).
- Upload Share 2 to Walrus as backup; shares 3,4,5 encrypted with heir public key and stored on-chain.
- Create Legacy Box on-chain with Walrus blob IDs and unlock period.
- Beneficiary SuiNS names resolve automatically.

### 2) Heartbeat / Dashboard (`DashboardPage.tsx`)
- Owner lists legacies, refreshes data.
- Sends “I’m Alive” heartbeat to reset the lock.
- Can “Cancel & Withdraw” if needed.

### 3) Claim & Decrypt (`ClaimPage.tsx`)
- Heir searches by vault ID; if unlocked, claims.
- Decrypts with Heir Share + Walrus share + on-chain encrypted shares.
- If encrypted with heir’s public key, heir must provide the matching private key; demo-key flows use the stored demo secret when available.

## Sui Move Smart Contract (`apps/contract`)
- Main object: LegacyBox
- Fields: owner, beneficiary, unlock_time_ms, last_heartbeat, encrypted_blob_id, locked_shares, balance.
- Entry functions: `create_legacy`, `im_alive`, `claim_legacy`, `add_funds`.
- Commands (inside `apps/contract`):
```bash
npm run build   # Sui Move build
npm run test    # Move tests
```

## Storage (Walrus)
- Simple SDK (`apps/web/src/services/walrus-sdk.ts`): Aggregator GET `.../v1/blobs/{blobId}`, Publisher PUT `.../v1/blobs?epochs=1` (default).
- Advanced integration (`apps/web/src/services/walrus.ts`): Loads Walrus SDK from CDN, uses upload relay + multiple aggregator fallbacks, `DEFAULT_EPOCHS = 5`.
- WASM fetched from jsDelivr; `@mysten/walrus-wasm` npm package is not used.

## Security Notes
- Fully client-side encryption; secrets never sent in plaintext.
- Shamir 5-3: single shares are useless alone.
- If encrypted with heir’s public key, the matching private key is required to decrypt.
- Public testnet/fullnode RPC used; no proxy required.

## License
MIT
