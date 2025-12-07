/// Heritage Vault Module
/// 
/// Manages the Dead Man's Switch vault logic with time-based verification.
/// Sui Move 2024 Edition
module heritage::vault {
    use std::string::String;
    use std::vector;
    use sui::balance::{Self, Balance};
    use sui::coin::{Self, Coin};
    use sui::clock::Clock;
    use sui::sui::SUI;
    use sui::event;
    use sui::object;
    use sui::transfer;

    // ============ Error Codes ============
    const ENotOwner: u64 = 0;
    const ENotBeneficiary: u64 = 1;
    const EUnlockTimeNotReached: u64 = 2;
    const EAlreadyClaimed: u64 = 3;
    const EInvalidShares: u64 = 4;

    // ============ Events ============
    
    /// Emitted when a legacy is successfully claimed by the beneficiary
    /// Contains all data needed for secret reconstruction
    public struct LegacyClaimed has copy, drop {
        beneficiary: address,
        blob_id: String,
        shares: vector<String>,
        amount: u64,
    }

    /// Emitted when a new vault is created
    public struct VaultCreated has copy, drop {
        vault_id: ID,
        owner: address,
        beneficiary: address,
        unlock_time_ms: u64,
    }

    /// Emitted when owner cancels and withdraws funds
    public struct VaultCancelled has copy, drop {
        vault_id: ID,
        owner: address,
        amount: u64,
    }

    /// Emitted when owner sends heartbeat
    public struct HeartbeatUpdated has copy, drop {
        vault_id: ID,
        timestamp: u64,
    }

    // ============ Core Struct ============

    /// The main vault storing encrypted shares and assets
    /// This is a shared object accessible by both owner and beneficiary
    public struct LegacyBox has key, store {
        id: UID,
        /// The owner who can send heartbeats
        owner: address,
        /// The heir who can claim after timeout
        beneficiary: address,
        /// Wait duration in milliseconds (e.g., 1 year = 31536000000)
        unlock_time_ms: u64,
        /// Last heartbeat timestamp in milliseconds
        last_heartbeat: u64,
        /// Walrus blob ID containing the encrypted secret
        encrypted_blob_id: String,
        /// Encrypted SSS Shares (3, 4, 5) - encrypted with beneficiary's public key
        locked_shares: vector<String>,
        /// Locked SUI funds to be transferred to beneficiary
        balance: Balance<SUI>,
    }

    // ============ Entry Functions ============

    /// Creates a new legacy vault with encrypted shares and optional SUI deposit
    /// 
    /// # Arguments
    /// * `beneficiary` - Address of the heir who can claim after timeout
    /// * `unlock_time_ms` - Duration in milliseconds before claim is possible
    /// * `blob_id` - Walrus blob ID containing encrypted secret
    /// * `share_3` - Encrypted SSS share 3
    /// * `share_4` - Encrypted SSS share 4  
    /// * `share_5` - Encrypted SSS share 5
    /// * `coin` - SUI to lock in the vault
    /// * `clock` - System clock for timestamp
    public entry fun create_vault(
        beneficiary: address,
        unlock_time_ms: u64,
        blob_id: String,
        share_3: String,
        share_4: String,
        share_5: String,
        coin: Coin<SUI>,
        clock: &Clock,
        ctx: &mut TxContext,
    ) {
        let owner = ctx.sender();
        let current_time = clock.timestamp_ms();
        
        // Build shares vector
        let mut locked_shares = vector::empty<String>();
        vector::push_back(&mut locked_shares, share_3);
        vector::push_back(&mut locked_shares, share_4);
        vector::push_back(&mut locked_shares, share_5);

        // Create the vault
        let vault = LegacyBox {
            id: object::new(ctx),
            owner,
            beneficiary,
            unlock_time_ms,
            last_heartbeat: current_time,
            encrypted_blob_id: blob_id,
            locked_shares,
            balance: coin::into_balance(coin),
        };

        let vault_id = object::id(&vault);

        // Emit creation event
        event::emit(VaultCreated {
            vault_id,
            owner,
            beneficiary,
            unlock_time_ms,
        });

        // Share the object so both owner and beneficiary can interact
        transfer::share_object(vault);
    }

    /// Owner sends a heartbeat to reset the unlock timer
    /// Must be called periodically to prevent beneficiary from claiming
    /// 
    /// # Arguments
    /// * `vault` - The legacy vault to update
    /// * `clock` - System clock for timestamp
    public entry fun im_alive(
        vault: &mut LegacyBox,
        clock: &Clock,
        ctx: &TxContext,
    ) {
        // Only owner can send heartbeat
        assert!(ctx.sender() == vault.owner, ENotOwner);
        
        // Update last heartbeat to current time
        let current_time = clock.timestamp_ms();
        vault.last_heartbeat = current_time;

        // Emit heartbeat event
        event::emit(HeartbeatUpdated {
            vault_id: object::id(vault),
            timestamp: current_time,
        });
    }

    /// Beneficiary claims the legacy after the unlock time has passed
    /// This destructures the vault and transfers all assets to the heir
    /// 
    /// # Arguments
    /// * `vault` - The legacy vault to claim
    /// * `clock` - System clock for timestamp verification
    public entry fun claim_legacy(
        vault: &mut LegacyBox,
        clock: &Clock,
        ctx: &mut TxContext,
    ) {
        let sender = ctx.sender();
        
        // Only beneficiary can claim
        assert!(sender == vault.beneficiary, ENotBeneficiary);
        
        // Check if unlock time has passed
        let current_time = clock.timestamp_ms();
        assert!(
            current_time > vault.last_heartbeat + vault.unlock_time_ms, 
            EUnlockTimeNotReached
        );

        // Get the balance amount
        let amount = vault.balance.value();
        
        // Transfer balance to beneficiary if any
        if (amount > 0) {
            let payment = coin::from_balance(
                balance::split(&mut vault.balance, amount),
                ctx
            );
            transfer::public_transfer(payment, sender);
        };

        // Emit the claim event with all necessary data for secret reconstruction
        // This is the critical step - shares become visible to beneficiary
        event::emit(LegacyClaimed {
            beneficiary: sender,
            blob_id: vault.encrypted_blob_id,
            shares: vault.locked_shares,
            amount,
        });
    }

    /// Owner can cancel the legacy, withdraw funds, and destroy the vault
    public entry fun cancel_legacy(
        vault: LegacyBox,
        ctx: &mut TxContext,
    ) {
        let sender = ctx.sender();
        let vault_id = object::id(&vault);

        // Destructure (consumes the shared object) and verify owner
        let LegacyBox {
            id,
            owner,
            beneficiary: _,
            unlock_time_ms: _,
            last_heartbeat: _,
            encrypted_blob_id: _,
            locked_shares: _,
            balance,
        } = vault;

        assert!(sender == owner, ENotOwner);

        // Convert balance to coin and transfer back to owner
        let amount = balance.value();
        if (amount > 0) {
            let payment = coin::from_balance(balance, ctx);
            transfer::public_transfer(payment, sender);
        } else {
            // Balance zero; still need to drop
            balance::destroy_zero(balance);
        };

        // Emit cancellation event
        event::emit(VaultCancelled {
            vault_id,
            owner,
            amount,
        });

        // Delete the UID to finalize destruction
        object::delete(id);
    }

    /// Owner can add more SUI to the vault
    public entry fun add_funds(
        vault: &mut LegacyBox,
        coin: Coin<SUI>,
        ctx: &TxContext,
    ) {
        assert!(ctx.sender() == vault.owner, ENotOwner);
        balance::join(&mut vault.balance, coin::into_balance(coin));
    }

    /// Owner can update the beneficiary address
    public entry fun update_beneficiary(
        vault: &mut LegacyBox,
        new_beneficiary: address,
        ctx: &TxContext,
    ) {
        assert!(ctx.sender() == vault.owner, ENotOwner);
        vault.beneficiary = new_beneficiary;
    }

    /// Owner can update the unlock time
    public entry fun update_unlock_time(
        vault: &mut LegacyBox,
        new_unlock_time_ms: u64,
        ctx: &TxContext,
    ) {
        assert!(ctx.sender() == vault.owner, ENotOwner);
        vault.unlock_time_ms = new_unlock_time_ms;
    }

    // ============ View Functions ============

    /// Get the locked shares (visible on-chain but encrypted)
    public fun get_locked_shares(vault: &LegacyBox): &vector<String> {
        &vault.locked_shares
    }

    /// Get the encrypted blob ID
    public fun get_blob_id(vault: &LegacyBox): &String {
        &vault.encrypted_blob_id
    }

    /// Get the current balance
    public fun get_balance(vault: &LegacyBox): u64 {
        vault.balance.value()
    }

    /// Get the last heartbeat timestamp
    public fun get_last_heartbeat(vault: &LegacyBox): u64 {
        vault.last_heartbeat
    }

    /// Get the unlock time duration
    public fun get_unlock_time(vault: &LegacyBox): u64 {
        vault.unlock_time_ms
    }

    /// Check if the vault can be claimed
    public fun can_claim(vault: &LegacyBox, clock: &Clock): bool {
        let current_time = clock.timestamp_ms();
        current_time > vault.last_heartbeat + vault.unlock_time_ms
    }

    /// Get time remaining until claim is possible (in ms)
    /// Returns 0 if already claimable
    public fun time_until_claim(vault: &LegacyBox, clock: &Clock): u64 {
        let current_time = clock.timestamp_ms();
        let unlock_at = vault.last_heartbeat + vault.unlock_time_ms;
        
        if (current_time >= unlock_at) {
            0
        } else {
            unlock_at - current_time
        }
    }

    /// Get owner address
    public fun get_owner(vault: &LegacyBox): address {
        vault.owner
    }

    /// Get beneficiary address
    public fun get_beneficiary(vault: &LegacyBox): address {
        vault.beneficiary
    }

    /// Get vault ID
    public fun get_vault_id(vault: &LegacyBox): ID {
        object::id(vault)
    }
}





