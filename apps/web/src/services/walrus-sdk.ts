import axios, { AxiosError } from 'axios';

class WalrusClient {
  private readonly PUBLISHER = 'https://publisher.walrus-testnet.walrus.space';
  private readonly AGGREGATOR = 'https://aggregator.walrus-testnet.walrus.space';

  async storeBlob(data: string): Promise<string> {
    try {
      // Walrus HTTP API: PUT /v1/blobs?epochs=1 with raw body
      const url = `${this.PUBLISHER}/v1/blobs?epochs=1`;
      const response = await axios.put(url, data, {
        headers: {
          'Content-Type': 'application/octet-stream',
        },
        timeout: 30000,
      });

      const result = response.data;

      // Parse Walrus response - return blobId from newlyCreated or alreadyCertified
      if (result?.newlyCreated?.blobObject?.blobId) {
        return result.newlyCreated.blobObject.blobId;
      } else if (result?.alreadyCertified?.blobId) {
        return result.alreadyCertified.blobId;
      } else {
        throw new Error('Unexpected Walrus response format - no blobId found');
      }
    } catch (error) {
      if (error instanceof AxiosError) {
        const msg = `Walrus store failed: ${error.message} (${error.response?.status || 'no status'})`;
        if (error.response?.data) {
          throw new Error(`${msg} - ${JSON.stringify(error.response.data)}`);
        }
        throw new Error(msg);
      }
      throw new Error(`Walrus store failed: ${String(error)}`);
    }
  }

  async readBlob(blobId: string): Promise<string> {
    const url = `${this.AGGREGATOR}/v1/blobs/${blobId}`;
    try {
      const response = await axios.get(url, {
        timeout: 30000,
        responseType: 'text',
      });
      return response.data;
    } catch (error) {
      if (error instanceof AxiosError) {
        if (error.response?.status === 404) {
          const requestedUrl = error.config?.url || url;
          throw new Error(`Blob not found at ${requestedUrl}`);
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

export const walrusClient = new WalrusClient();




