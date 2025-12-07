# 🛡️ Heritage

**Decentralized Dead Man's Switch Protocol on Sui**

A secure inheritance mechanism that transfers crypto assets and sensitive secrets to a designated heir if the owner becomes inactive.

## 🏗️ Project Structure

```
heritage/
├── apps/
│   ├── contract/          # Sui Move smart contract
│   │   ├── sources/
│   │   │   └── legacy_box.move
│   │   └── Move.toml
│   └── web/               # React frontend
│       ├── src/
│       │   ├── components/
│       │   ├── pages/
│       │   └── ...
│       └── package.json
├── packages/
│   └── tsconfig/          # Shared TypeScript configs
├── package.json           # Root workspace config
└── pnpm-workspace.yaml
```

## 🚀 Quick Start

### Prerequisites

- [Node.js](https://nodejs.org/) >= 18
- [pnpm](https://pnpm.io/) >= 8
- [Sui CLI](https://docs.sui.io/build/install)

### Installation

```bash
# Install dependencies
pnpm install

# Start the frontend development server
pnpm dev

# Build the smart contract
pnpm build:contract

# Run contract tests
pnpm test:contract
```

## 🔐 How It Works

Heritage uses **Shamir's Secret Sharing (5-3 scheme)** combined with **asymmetric encryption** to create a trustless inheritance system:

1. **Secret Encryption**: Your secret is AES encrypted client-side
2. **Key Splitting**: The AES key is split into 5 shares (any 3 can reconstruct)
3. **Distribution**:
   - Share 1 → Given directly to heir
   - Share 2 → Stored on Walrus (public but useless alone)
   - Shares 3, 4, 5 → Encrypted with heir's public key, stored on-chain
4. **Dead Man's Switch**: Owner sends periodic heartbeats
5. **Claim**: After timeout, heir claims and decrypts shares with their wallet

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React, TypeScript, Vite, Tailwind CSS |
| Blockchain | Sui Move (2024 Edition) |
| Storage | Walrus Protocol |
| Crypto | Shamir's Secret Sharing, NaCl |
| SDK | @mysten/sui.js, @mysten/dapp-kit |

## 📝 Core Philosophy

> **"Trust Code, Not People"**

No single party can reconstruct your secret. Not Walrus. Not the blockchain. Not even us. Only when the specific conditions are met (owner inactive + heir claims) can the secret be reconstructed.

## 📄 License

MIT





