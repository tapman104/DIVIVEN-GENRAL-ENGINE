import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  worker: {
    format: 'es'
  },
  build: {
    target: 'es2020',
    minify: 'terser',
    terserOptions: {
      compress: {
        passes: 2,
        drop_console: false,
        pure_funcs: []
      },
      mangle: {
        keep_classnames: true,
        keep_fnames: false
      }
    },
    rollupOptions: {
      output: {
        manualChunks: {
          'chess-engine': [
            './src/engine/search.ts',
            './src/engine/eval.ts',
            './src/engine/movegen.ts',
            './src/engine/board.ts'
          ]
        }
      }
    },
    chunkSizeWarningLimit: 1000,
    sourcemap: false
  },
  optimizeDeps: {
    include: ['react', 'react-dom']
  }
})
// Force restart
