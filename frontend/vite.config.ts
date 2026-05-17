// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
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
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },

  build: {
    target: 'es2020',
    chunkSizeWarningLimit: 600,
    minify: 'esbuild',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // React core — must be first
          if (
            id.includes('node_modules/react/') ||
            id.includes('node_modules/react-dom/') ||
            id.includes('node_modules/react-router-dom/') ||
            id.includes('node_modules/scheduler/')
          ) {
            return 'react-vendor'
          }
          // TanStack Query
          if (id.includes('@tanstack/react-query')) {
            return 'query-vendor'
          }
          // UI utilities
          if (
            id.includes('node_modules/zustand/') ||
            id.includes('node_modules/lucide-react/') ||
            id.includes('node_modules/date-fns/') ||
            id.includes('node_modules/clsx/') ||
            id.includes('node_modules/axios/')
          ) {
            return 'ui-vendor'
          }
          // NOTE: @uiw/react-md-editor is intentionally NOT listed here.
          // It is lazy-loaded via React.lazy() in KBEditorPage and KBArticlePage.
          // Putting it in manualChunks causes circular dependency ReferenceError.
        },
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
      },
    },
  },

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
      '@uiw/react-md-editor',
      '@uiw/react-markdown-preview',
    ],
  },
}))
