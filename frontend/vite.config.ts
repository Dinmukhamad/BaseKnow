// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// Note: install vite-plugin-compression for gzip/brotli output
// npm install -D vite-plugin-compression

export default defineConfig(({ mode }) => ({
  plugins: [
    react({
      // Faster HMR in dev
      fastRefresh: true,
    }),
    // Uncomment after installing vite-plugin-compression:
    // compression({ algorithm: 'brotliCompress', ext: '.br' }),
    // compression({ algorithm: 'gzip', ext: '.gz' }),
  ],

  base: './',

  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },

  server: {
    host: '0.0.0.0',
    port: 5173,
    // Proxy API in dev (adjust to your backend URL)
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },

  css: {
    // PostCSS config handled separately
    devSourcemap: true,
  },

  build: {
    target: 'es2020',
    chunkSizeWarningLimit: 500,
    minify: 'esbuild',
    sourcemap: mode === 'development',
    rollupOptions: {
      output: {
        // Fine-grained code splitting
        manualChunks: (id) => {
          // React core
          if (id.includes('node_modules/react') ||
              id.includes('node_modules/react-dom') ||
              id.includes('node_modules/react-router-dom') ||
              id.includes('node_modules/scheduler')) {
            return 'react-vendor'
          }
          // TanStack Query
          if (id.includes('@tanstack/react-query')) {
            return 'query-vendor'
          }
          // Markdown editor (heaviest chunk, ~300KB)
          if (id.includes('@uiw/react-md-editor') ||
              id.includes('@uiw/react-markdown-preview') ||
              id.includes('codemirror') ||
              id.includes('rehype') ||
              id.includes('remark')) {
            return 'md-editor'
          }
          // State + routing utilities
          if (id.includes('zustand') ||
              id.includes('lucide-react') ||
              id.includes('date-fns') ||
              id.includes('clsx') ||
              id.includes('axios')) {
            return 'ui-vendor'
          }
        },
        // Hashed filenames for long-term caching
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
      },
    },
  },

  // Optimise deps pre-bundling
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      '@tanstack/react-query',
      'zustand',
      'axios',
      'lucide-react',
      'date-fns',
      'clsx',
    ],
    exclude: [
      '@uiw/react-md-editor', // lazy-loaded, don't pre-bundle
    ],
  },
}))
