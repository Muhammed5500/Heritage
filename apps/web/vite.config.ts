import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { nodePolyfills } from 'vite-plugin-node-polyfills'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    nodePolyfills({
      // Enable polyfills for specific modules
      include: ['crypto', 'buffer', 'stream', 'util', 'process'],
      globals: {
        Buffer: true,
        global: true,
        process: true,
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  define: {
    global: 'globalThis',
  },
  optimizeDeps: {
    include: ['secrets.js-grempe'],
  },
  server: {
    proxy: {
      // Proxy Sui testnet RPC to avoid CORS in browser
      '/sui-proxy': {
        target: 'https://fullnode.testnet.sui.io',
        changeOrigin: true,
        secure: true,
        rewrite: (p) => p.replace(/^\/sui-proxy/, ''),
      },
      // Proxy HTTP Walrus publishers to avoid mixed content issues
      '/walrus-http': {
        target: 'http://publisher.testnet.sui.rpcpool.com:9001',
        changeOrigin: true,
        secure: false,
        rewrite: (p) => p.replace(/^\/walrus-http/, ''),
      },
    },
  },
})
