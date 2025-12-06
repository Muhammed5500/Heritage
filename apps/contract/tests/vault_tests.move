/// Tests for the SuiLegacy Vault Module
#[test_only]
module suilegacy::vault_tests {
    use sui::test_scenario::{Self as ts, Scenario};
    use sui::clock::{Self, Clock};
    use sui::coin;
    use sui::sui::SUI;
    use std::string;
    use suilegacy::vault::{Self, LegacyBox};

    // Test addresses
    const OWNER: address = @0xA;
    const BENEFICIARY: address = @0xB;
    const STRANGER: address = @0xC;

    // Test constants
    const UNLOCK_TIME_MS: u64 = 86400000; // 1 day in milliseconds
    const DEPOSIT_AMOUNT: u64 = 1000000000; // 1 SUI

    fun setup_test(): Scenario {
        ts::begin(OWNER)
    }

    #[test]
    fun test_create_vault() {
        let mut scenario = setup_test();
        
        ts::next_tx(&mut scenario, OWNER);
        {
            let mut clock = clock::create_for_testing(ts::ctx(&mut scenario));
            clock::set_for_testing(&mut clock, 1000);
            
            let deposit = coin::mint_for_testing<SUI>(DEPOSIT_AMOUNT, ts::ctx(&mut scenario));
            
            vault::create_vault(
                BENEFICIARY,
                UNLOCK_TIME_MS,
                string::utf8(b"walrus_blob_id_123"),
                string::utf8(b"encrypted_share_3"),
                string::utf8(b"encrypted_share_4"),
                string::utf8(b"encrypted_share_5"),
                deposit,
                &clock,
                ts::ctx(&mut scenario),
            );
            
            clock::destroy_for_testing(clock);
        };

        // Verify vault was created as shared object
        ts::next_tx(&mut scenario, OWNER);
        {
            assert!(ts::has_most_recent_shared<LegacyBox>(), 0);
        };

        ts::end(scenario);
    }

    #[test]
    fun test_im_alive_updates_heartbeat() {
        let mut scenario = setup_test();
        
        // Create vault
        ts::next_tx(&mut scenario, OWNER);
        {
            let mut clock = clock::create_for_testing(ts::ctx(&mut scenario));
            clock::set_for_testing(&mut clock, 1000);
            
            let deposit = coin::mint_for_testing<SUI>(DEPOSIT_AMOUNT, ts::ctx(&mut scenario));
            
            vault::create_vault(
                BENEFICIARY,
                UNLOCK_TIME_MS,
                string::utf8(b"blob_id"),
                string::utf8(b"share_3"),
                string::utf8(b"share_4"),
                string::utf8(b"share_5"),
                deposit,
                &clock,
                ts::ctx(&mut scenario),
            );
            
            clock::destroy_for_testing(clock);
        };

        // Send heartbeat
        ts::next_tx(&mut scenario, OWNER);
        {
            let mut vault = ts::take_shared<LegacyBox>(&scenario);
            let mut clock = clock::create_for_testing(ts::ctx(&mut scenario));
            clock::set_for_testing(&mut clock, 50000);
            
            vault::im_alive(&mut vault, &clock, ts::ctx(&mut scenario));
            
            // Verify heartbeat was updated
            assert!(vault::get_last_heartbeat(&vault) == 50000, 0);
            
            ts::return_shared(vault);
            clock::destroy_for_testing(clock);
        };

        ts::end(scenario);
    }

    #[test]
    #[expected_failure(abort_code = vault::ENotOwner)]
    fun test_im_alive_fails_for_non_owner() {
        let mut scenario = setup_test();
        
        // Create vault
        ts::next_tx(&mut scenario, OWNER);
        {
            let mut clock = clock::create_for_testing(ts::ctx(&mut scenario));
            clock::set_for_testing(&mut clock, 1000);
            
            let deposit = coin::mint_for_testing<SUI>(DEPOSIT_AMOUNT, ts::ctx(&mut scenario));
            
            vault::create_vault(
                BENEFICIARY,
                UNLOCK_TIME_MS,
                string::utf8(b"blob_id"),
                string::utf8(b"share_3"),
                string::utf8(b"share_4"),
                string::utf8(b"share_5"),
                deposit,
                &clock,
                ts::ctx(&mut scenario),
            );
            
            clock::destroy_for_testing(clock);
        };

        // Stranger tries to send heartbeat (should fail)
        ts::next_tx(&mut scenario, STRANGER);
        {
            let mut vault = ts::take_shared<LegacyBox>(&scenario);
            let mut clock = clock::create_for_testing(ts::ctx(&mut scenario));
            clock::set_for_testing(&mut clock, 50000);
            
            vault::im_alive(&mut vault, &clock, ts::ctx(&mut scenario));
            
            ts::return_shared(vault);
            clock::destroy_for_testing(clock);
        };

        ts::end(scenario);
    }

    #[test]
    #[expected_failure(abort_code = vault::EUnlockTimeNotReached)]
    fun test_claim_fails_before_unlock_time() {
        let mut scenario = setup_test();
        
        // Create vault
        ts::next_tx(&mut scenario, OWNER);
        {
            let mut clock = clock::create_for_testing(ts::ctx(&mut scenario));
            clock::set_for_testing(&mut clock, 1000);
            
            let deposit = coin::mint_for_testing<SUI>(DEPOSIT_AMOUNT, ts::ctx(&mut scenario));
            
            vault::create_vault(
                BENEFICIARY,
                UNLOCK_TIME_MS,
                string::utf8(b"blob_id"),
                string::utf8(b"share_3"),
                string::utf8(b"share_4"),
                string::utf8(b"share_5"),
                deposit,
                &clock,
                ts::ctx(&mut scenario),
            );
            
            clock::destroy_for_testing(clock);
        };

        // Beneficiary tries to claim too early (should fail)
        ts::next_tx(&mut scenario, BENEFICIARY);
        {
            let mut vault = ts::take_shared<LegacyBox>(&scenario);
            let mut clock = clock::create_for_testing(ts::ctx(&mut scenario));
            clock::set_for_testing(&mut clock, 2000); // Only 1 second passed
            
            vault::claim_legacy(&mut vault, &clock, ts::ctx(&mut scenario));
            
            ts::return_shared(vault);
            clock::destroy_for_testing(clock);
        };

        ts::end(scenario);
    }

    #[test]
    fun test_successful_claim_after_unlock() {
        let mut scenario = setup_test();
        
        // Create vault
        ts::next_tx(&mut scenario, OWNER);
        {
            let mut clock = clock::create_for_testing(ts::ctx(&mut scenario));
            clock::set_for_testing(&mut clock, 1000);
            
            let deposit = coin::mint_for_testing<SUI>(DEPOSIT_AMOUNT, ts::ctx(&mut scenario));
            
            vault::create_vault(
                BENEFICIARY,
                UNLOCK_TIME_MS,
                string::utf8(b"blob_id"),
                string::utf8(b"share_3"),
                string::utf8(b"share_4"),
                string::utf8(b"share_5"),
                deposit,
                &clock,
                ts::ctx(&mut scenario),
            );
            
            clock::destroy_for_testing(clock);
        };

        // Beneficiary claims after unlock time
        ts::next_tx(&mut scenario, BENEFICIARY);
        {
            let mut vault = ts::take_shared<LegacyBox>(&scenario);
            let mut clock = clock::create_for_testing(ts::ctx(&mut scenario));
            // Set time past unlock threshold: 1000 + 86400000 + 1
            clock::set_for_testing(&mut clock, 1000 + UNLOCK_TIME_MS + 1);
            
            // Verify can_claim returns true
            assert!(vault::can_claim(&vault, &clock), 0);
            
            // Claim the legacy
            vault::claim_legacy(&mut vault, &clock, ts::ctx(&mut scenario));
            
            // Verify balance is now 0
            assert!(vault::get_balance(&vault) == 0, 1);
            
            ts::return_shared(vault);
            clock::destroy_for_testing(clock);
        };

        ts::end(scenario);
    }

    #[test]
    #[expected_failure(abort_code = vault::ENotBeneficiary)]
    fun test_claim_fails_for_non_beneficiary() {
        let mut scenario = setup_test();
        
        // Create vault
        ts::next_tx(&mut scenario, OWNER);
        {
            let mut clock = clock::create_for_testing(ts::ctx(&mut scenario));
            clock::set_for_testing(&mut clock, 1000);
            
            let deposit = coin::mint_for_testing<SUI>(DEPOSIT_AMOUNT, ts::ctx(&mut scenario));
            
            vault::create_vault(
                BENEFICIARY,
                UNLOCK_TIME_MS,
                string::utf8(b"blob_id"),
                string::utf8(b"share_3"),
                string::utf8(b"share_4"),
                string::utf8(b"share_5"),
                deposit,
                &clock,
                ts::ctx(&mut scenario),
            );
            
            clock::destroy_for_testing(clock);
        };

        // Stranger tries to claim (should fail)
        ts::next_tx(&mut scenario, STRANGER);
        {
            let mut vault = ts::take_shared<LegacyBox>(&scenario);
            let mut clock = clock::create_for_testing(ts::ctx(&mut scenario));
            clock::set_for_testing(&mut clock, 1000 + UNLOCK_TIME_MS + 1);
            
            vault::claim_legacy(&mut vault, &clock, ts::ctx(&mut scenario));
            
            ts::return_shared(vault);
            clock::destroy_for_testing(clock);
        };

        ts::end(scenario);
    }

    #[test]
    fun test_add_funds() {
        let mut scenario = setup_test();
        
        // Create vault
        ts::next_tx(&mut scenario, OWNER);
        {
            let mut clock = clock::create_for_testing(ts::ctx(&mut scenario));
            clock::set_for_testing(&mut clock, 1000);
            
            let deposit = coin::mint_for_testing<SUI>(DEPOSIT_AMOUNT, ts::ctx(&mut scenario));
            
            vault::create_vault(
                BENEFICIARY,
                UNLOCK_TIME_MS,
                string::utf8(b"blob_id"),
                string::utf8(b"share_3"),
                string::utf8(b"share_4"),
                string::utf8(b"share_5"),
                deposit,
                &clock,
                ts::ctx(&mut scenario),
            );
            
            clock::destroy_for_testing(clock);
        };

        // Add more funds
        ts::next_tx(&mut scenario, OWNER);
        {
            let mut vault = ts::take_shared<LegacyBox>(&scenario);
            let additional = coin::mint_for_testing<SUI>(500000000, ts::ctx(&mut scenario));
            
            vault::add_funds(&mut vault, additional, ts::ctx(&mut scenario));
            
            // Verify balance increased
            assert!(vault::get_balance(&vault) == DEPOSIT_AMOUNT + 500000000, 0);
            
            ts::return_shared(vault);
        };

        ts::end(scenario);
    }

    #[test]
    fun test_time_until_claim() {
        let mut scenario = setup_test();
        
        // Create vault
        ts::next_tx(&mut scenario, OWNER);
        {
            let mut clock = clock::create_for_testing(ts::ctx(&mut scenario));
            clock::set_for_testing(&mut clock, 1000);
            
            let deposit = coin::mint_for_testing<SUI>(DEPOSIT_AMOUNT, ts::ctx(&mut scenario));
            
            vault::create_vault(
                BENEFICIARY,
                UNLOCK_TIME_MS,
                string::utf8(b"blob_id"),
                string::utf8(b"share_3"),
                string::utf8(b"share_4"),
                string::utf8(b"share_5"),
                deposit,
                &clock,
                ts::ctx(&mut scenario),
            );
            
            clock::destroy_for_testing(clock);
        };

        // Check time remaining
        ts::next_tx(&mut scenario, OWNER);
        {
            let vault = ts::take_shared<LegacyBox>(&scenario);
            let mut clock = clock::create_for_testing(ts::ctx(&mut scenario));
            
            // At creation time + 1000ms
            clock::set_for_testing(&mut clock, 2000);
            let remaining = vault::time_until_claim(&vault, &clock);
            // Should be: (1000 + 86400000) - 2000 = 86399000
            assert!(remaining == 86399000, 0);
            
            // After unlock time
            clock::set_for_testing(&mut clock, 1000 + UNLOCK_TIME_MS + 1);
            let remaining_after = vault::time_until_claim(&vault, &clock);
            assert!(remaining_after == 0, 1);
            
            ts::return_shared(vault);
            clock::destroy_for_testing(clock);
        };

        ts::end(scenario);
    }

    #[test]
    fun test_update_beneficiary() {
        let mut scenario = setup_test();
        
        // Create vault
        ts::next_tx(&mut scenario, OWNER);
        {
            let mut clock = clock::create_for_testing(ts::ctx(&mut scenario));
            clock::set_for_testing(&mut clock, 1000);
            
            let deposit = coin::mint_for_testing<SUI>(DEPOSIT_AMOUNT, ts::ctx(&mut scenario));
            
            vault::create_vault(
                BENEFICIARY,
                UNLOCK_TIME_MS,
                string::utf8(b"blob_id"),
                string::utf8(b"share_3"),
                string::utf8(b"share_4"),
                string::utf8(b"share_5"),
                deposit,
                &clock,
                ts::ctx(&mut scenario),
            );
            
            clock::destroy_for_testing(clock);
        };

        // Update beneficiary
        ts::next_tx(&mut scenario, OWNER);
        {
            let mut vault = ts::take_shared<LegacyBox>(&scenario);
            
            vault::update_beneficiary(&mut vault, STRANGER, ts::ctx(&mut scenario));
            
            assert!(vault::get_beneficiary(&vault) == STRANGER, 0);
            
            ts::return_shared(vault);
        };

        ts::end(scenario);
    }
}





