import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.js',
      base: '/teste/',
      scope: '/teste/',
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
      },
      manifest: {
        name: 'KanbanCRM',
        short_name: 'KanbanCRM',
        description: 'Sistema de CRM com pipeline Kanban',
        start_url: '/teste/#/app',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#0f172a',
        theme_color: '#6366f1',
        icons: [
          { src: '/teste/pwa-192.png', sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
          { src: '/teste/pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
      },
    }),
  ],
  base: '/teste/',
  define: {
    __VAPID_PUBLIC_KEY__: JSON.stringify('BLdQsjFMh7Av246obw_cl4a4ggOD4bATABaeFJgQaauRVSD1ucqnkMsvlgw48t4NrpMj-U2sgjG0zwT4MIRi2Do'),
  },
})
