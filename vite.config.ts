/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath, URL } from 'node:url';

// base './' para que el build funcione cargado desde file:// dentro de Electron.
// En producción se añade una Content-Security-Policy estricta (todo es local, sin red).
const CSP =
  "default-src 'self'; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline'; " +
  "script-src 'self'; worker-src 'self' blob:; connect-src 'self' data: blob: https://*.supabase.co wss://*.supabase.co; font-src 'self' data:";

export default defineConfig(({ command }) => ({
  base: './',
  plugins: [
    react(),
    tailwindcss(),
    {
      name: 'homedesign-csp',
      transformIndexHtml(html) {
        if (command !== 'build') return html;
        return html.replace(
          '<meta charset="UTF-8" />',
          `<meta charset="UTF-8" />\n    <meta http-equiv="Content-Security-Policy" content="${CSP}" />`,
        );
      },
    },
  ],
  // Dependencias pesadas pre-empaquetadas para evitar recargas en desarrollo.
  optimizeDeps: {
    include: [
      'three',
      '@react-three/fiber',
      '@react-three/drei',
      '@react-three/postprocessing',
      'postprocessing',
      'three/examples/jsm/environments/RoomEnvironment.js',
      'three-gpu-pathtracer',
      'three/examples/jsm/geometries/RoundedBoxGeometry.js',
      'three/examples/jsm/loaders/GLTFLoader.js',
      'three/examples/jsm/exporters/GLTFExporter.js',
      'jspdf',
      'idb-keyval',
    ],
  },
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 2500,
    // El 3D (React Three Fiber) y el PDF se cargan bajo demanda mediante import() dinámico.
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
}));
