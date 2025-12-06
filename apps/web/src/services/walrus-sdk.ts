import axios, { AxiosError } from 'axios';

// Walrus HTTP Client using upload-relay for better reliability
class WalrusClient {
  private readonly UPLOAD_RELAY = 'https://upload-relay.testnet.walrus.space';
  private readonly AGGREGATOR = 'https://aggregator.walrus-testnet.walrus.space';

  /**
   * Store encrypted blob data to Walrus
   * @param data The encrypted string to store
   * @returns The blob ID
   */
  async storeBlob(data: string): Promise<string> {
    // Try multiple endpoints: upload-relay, publishers, HTTP publishers
    const endpoints = [
      { url: `${this.UPLOAD_RELAY}/v1/blob-upload-relay`, useFormData: true },
      { url: `https://publisher.walrus-testnet.walrus.space/v1/store`, useFormData: false },
      { url: `https://sui-walrus-testnet-publisher.bwarelabs.com/v1/store`, useFormData: false },
      { url: `https://publisher.walrus-testnet.h2o-nodes.com/v1/store`, useFormData: false },
      { url: `/walrus-http/v1/store`, useFormData: false },
    ];

    for (const endpoint of endpoints) {
      try {
        let response;
        if (endpoint.useFormData) {
          // Upload-relay expects multipart/form-data with epochs query param
          const formData = new FormData();
          formData.append('file', new Blob([data], { type: 'text/plain' }), 'payload.txt');
          response = await axios.post(`${endpoint.url}?epochs=5`, formData, {
            timeout: 30000,
          });
        } else {
          // Publishers expect raw text
          response = await axios.post(endpoint.url, data, {
            headers: { 'Content-Type': 'text/plain' },
            timeout: 30000,
          });
        }

        const result = response.data;

        // Parse Walrus response - return blobId from newlyCreated or alreadyCertified
        if (result.newlyCreated?.blobObject?.blobId) {
          return result.newlyCreated.blobObject.blobId;
        } else if (result.alreadyCertified?.blobId) {
          return result.alreadyCertified.blobId;
        } else {
          throw new Error('Unexpected Walrus response format - no blobId found');
        }
      } catch (error) {
        // Try next endpoint
        continue;
      }
    }

    throw new Error('All Walrus testnet endpoints failed - testnet may be unavailable or API has changed');
  }

  /**
   * Read blob data from Walrus
   * @param blobId The blob ID to retrieve
   * @returns The data as string
   */
  async readBlob(blobId: string): Promise<string> {
    // Check if it's a mock blob first
    if (blobId.startsWith('walrus_mock_')) {
      const data = localStorage.getItem(blobId);
      if (data) {
        console.warn('[Walrus] Reading from mock storage');
        return data;
      }
      throw new Error(`Mock blob not found: ${blobId}`);
    }

    // Try real aggregator
    try {
      const url = `${this.AGGREGATOR}/v1/${blobId}`;
      const response = await axios.get(url, {
        timeout: 30000,
        responseType: 'text',
      });
      return response.data;
    } catch (error) {
      if (error instanceof AxiosError) {
        if (error.response?.status === 404) {
          throw new Error(`Blob not found: ${blobId}`);
        }
        const msg = `Walrus read failed: ${error.message} (${error.response?.status || 'no status'})`;
        if (error.response?.data) {
          throw new Error(`${msg} - ${JSON.stringify(error.response.data)}`);
        }
        throw new Error(msg);
      }
      throw new Error(`Walrus read failed: ${String(error)}`);
    }
  }
}

// Export singleton instance
export const walrusClient = new WalrusClient();


