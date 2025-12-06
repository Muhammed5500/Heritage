/**
 * Walrus Service Tests
 * Run with: npx tsx src/services/walrus.test.ts
 */

import {
  uploadBlob,
  downloadBlob,
  checkWalrusHealth,
  getExplorerUrl,
  uploadLegacyData,
  downloadLegacyData,
} from './walrus';

// ANSI colors
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';

async function test(name: string, fn: () => Promise<void>) {
  try {
    await fn();
    console.log(`${GREEN}✓${RESET} ${name}`);
  } catch (error) {
    console.log(`${RED}✗${RESET} ${name}`);
    console.error(`  ${RED}${error}${RESET}`);
  }
}

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

async function runTests() {
  console.log(`\n${BOLD}🐋 Walrus Service Tests${RESET}\n`);

  // Check testnet health first
  console.log(`${YELLOW}Checking Walrus testnet availability...${RESET}`);
  const isHealthy = await checkWalrusHealth();
  console.log(isHealthy 
    ? `${GREEN}✓ Walrus testnet is available${RESET}` 
    : `${RED}✗ Walrus testnet unavailable (tests will likely fail)${RESET}`
  );
  console.log();

  // ============================================================
  // Basic URL check
  await test('getExplorerUrl returns URL for real blobs', async () => {
    const url = getExplorerUrl('abc123');
    assert(url !== null, 'Should return URL for real blob');
    assert(url!.includes('abc123'), 'URL should contain blob ID');
  });

  // ============================================================
  // Upload/Download Tests
  // ============================================================

  console.log(`\n${BOLD}Upload/Download Tests${RESET}`);

  let testBlobId: string = '';

  await test('uploadBlob uploads data and returns blob ID', async () => {
    const testData = 'Test encrypted payload: ' + Date.now();
    const result = await uploadBlob(testData);
    
    assert(result.blobId.length > 0, 'Should return blob ID');
    assert(typeof result.isNewlyCreated === 'boolean', 'Should have isNewlyCreated flag');
    assert(typeof result.isMock === 'boolean', 'Should have isMock flag');
    
    testBlobId = result.blobId;
    console.log(`    Blob ID: ${testBlobId.slice(0, 30)}...`);
    console.log(`    Mock: ${result.isMock}`);
  });

  await test('downloadBlob retrieves uploaded data', async () => {
    if (!testBlobId) {
      throw new Error('No blob ID from previous test');
    }
    
    const testData = 'Test encrypted payload for download: ' + Date.now();
    const uploadResult = await uploadBlob(testData);
    const downloaded = await downloadBlob(uploadResult.blobId);
    
    assert(downloaded === testData, 'Downloaded data should match uploaded data');
  });

  // ============================================================
  // Legacy Flow Tests
  // ============================================================

  console.log(`\n${BOLD}Legacy Flow Tests${RESET}`);

  await test('uploadLegacyData uploads both blob and share', async () => {
    const encryptedBlob = 'encrypted_secret_note_' + Date.now();
    const walrusShare = 'share_2_hex_value_' + Date.now();
    
    const result = await uploadLegacyData(encryptedBlob, walrusShare);
    
    assert(result.blobId.length > 0, 'Should return blob ID');
    assert(result.walrusShareBlobId.length > 0, 'Should return share blob ID');
    console.log(`    Blob ID: ${result.blobId.slice(0, 25)}...`);
    console.log(`    Share ID: ${result.walrusShareBlobId.slice(0, 25)}...`);
  });

  await test('downloadLegacyData retrieves both blob and share', async () => {
    const encryptedBlob = 'encrypted_for_download_' + Date.now();
    const walrusShare = 'share_for_download_' + Date.now();
    
    const uploadResult = await uploadLegacyData(encryptedBlob, walrusShare);
    const downloadResult = await downloadLegacyData(
      uploadResult.blobId, 
      uploadResult.walrusShareBlobId
    );
    
    assert(downloadResult.encryptedBlob === encryptedBlob, 'Encrypted blob should match');
    assert(downloadResult.walrusShare === walrusShare, 'Walrus share should match');
  });

  // ============================================================
  // Error Handling Tests
  // ============================================================

  console.log(`\n${BOLD}Error Handling Tests${RESET}`);

  await test('downloadBlob throws for non-existent mock blob', async () => {
    try {
      await downloadBlob('MOCK_nonexistent_blob_id');
      throw new Error('Should have thrown');
    } catch (error) {
      assert(
        error instanceof Error && error.message.includes('not found'),
        'Should throw not found error'
      );
    }
  });

  // ============================================================
  // Summary
  // ============================================================

  console.log(`\n${GREEN}${BOLD}All Walrus tests completed! ✓${RESET}\n`);
}

runTests().catch(console.error);

