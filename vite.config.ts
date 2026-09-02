import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      // "autoUpdate": el SW se actualiza y activa automáticamente al detectar nueva versión
      // Sin banners, sin esperar confirmación del usuario
      registerType: 'autoUpdate',
      injectRegister: 'auto',

      // Cachear assets estáticos del build — NO cachear API de Supabase
      // Los datos de negocio son tiempo real: cachearlos provoca que distintos
      // dispositivos vean datos diferentes (inconsistencias entre sesiones).
      workbox: {
        // Aumentar límite a 4MB para el bundle principal
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        // Pre-cachear solo assets estáticos del build
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        // Sin runtimeCaching para Supabase — todas las queries van siempre a la red
        runtimeCaching: [],
        // Limpiar caché viejo automáticamente
        cleanupOutdatedCaches: true,
        skipWaiting: true,   // activar inmediatamente sin esperar
        clientsClaim: true,  // tomar control de todos los tabs abiertos
      },

      // Manifest — identidad de la app instalable
      manifest: {
        name: 'Zentra Alpina — BI Dashboard',
        short_name: 'Zentra Alpina',
        description: 'Dashboard de inteligencia comercial · Distribuidor Alpina Eje Cafetero',
        theme_color: '#0f172a',
        background_color: '#0f172a',
        display: 'standalone',
        orientation: 'any',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: '/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/icon-192.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },

      // Generar el SW solo en producción (en dev se usa el virtual)
      devOptions: {
        enabled: true,
        type: 'module',
      },
    }),
  ],
});
