import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['logo-21stealth.png', 'logo-21stealth-dark.png'],
      manifest: {
        name: '21stealth',
        short_name: '21stealth',
        description: 'Your crypto portfolio — private by default.',
        theme_color: '#d4f042',
        background_color: '#0d110a',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/dashboard',
        icons: [
          {
            src: 'logo-21stealth-dark.png',
            sizes: '2500x2500',
            type: 'image/png',
          },
          {
            src: 'logo-21stealth-dark.png',
            sizes: '2500x2500',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
      },
    }),
  ],
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
