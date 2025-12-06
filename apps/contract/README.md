# SuiLegacy Smart Contract

Sui Move smart contract for the decentralized dead man's switch protocol.

## Prerequisites

- [Sui CLI](https://docs.sui.io/build/install) installed
- Sui wallet configured

## Commands

```bash
# Build the contract
pnpm build

# Run tests
pnpm test

# Publish to testnet (ensure you're connected to testnet)
pnpm publish
```

## Contract Overview

### LegacyBox

The main shared object that stores:
- **owner**: Address that can send heartbeats
- **beneficiary**: Address that can claim after timeout
- **unlock_time_ms**: Duration before claim is possible
- **last_heartbeat**: Last heartbeat timestamp
- **encrypted_blob_id**: Walrus blob ID
- **locked_shares**: Encrypted SSS shares (3, 4, 5)
- **balance**: SUI balance for inheritance

### Entry Functions

| Function | Caller | Description |
|----------|--------|-------------|
| `create_legacy` | Owner | Create a new legacy box |
| `im_alive` | Owner | Send heartbeat to reset timer |
| `claim_legacy` | Beneficiary | Claim after timeout |
| `add_funds` | Owner | Add more SUI to the box |





