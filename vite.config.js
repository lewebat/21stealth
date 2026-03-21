import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@':        path.resolve(__dirname, './src'),
      '@ui':      path.resolve(__dirname, './src/components/ui'),
      '@layout':  path.resolve(__dirname, './src/components/layout'),
      '@styles':  path.resolve(__dirname, './src/styles'),
      '@config':  path.resolve(__dirname, './src/config'),
      '@hooks':   path.resolve(__dirname, './src/hooks'),
      '@store':   path.resolve(__dirname, './src/store'),
      '@lib':     path.resolve(__dirname, './src/lib'),
      '@utils':   path.resolve(__dirname, './src/utils'),
    },
  },
})
