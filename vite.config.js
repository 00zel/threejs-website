import { defineConfig } from 'vite';

console.log('Vite config loaded!');

export default defineConfig({
  server: {
    mimeTypes: {
      'model/gltf-binary': ['glb'], 
    }
  },

  base: './',

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
