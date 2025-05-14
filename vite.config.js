import { defineConfig } from 'vite';

console.log('✅ Vite config loaded!');

export default defineConfig({
  server: {
    mimeTypes: {
      'model/gltf-binary': ['glb'], // Ensuring GLB files are recognized
    }
  },

  base: '/threejs-website/',

  build: {
    outDir: 'dist',
    rollupOptions: {
      input: 'index.html',
    },
  },

  optimizeDeps: {
    include: ['three']
  }
});
