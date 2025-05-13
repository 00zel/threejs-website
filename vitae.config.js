import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    mimeTypes: {
      'model/gltf-binary': ['glb'], // Ensuring GLB files are recognized
    }
  },
  build: {
    outDir: 'dist', // Output folder for the production build
    rollupOptions: {
      input: 'index.html', // Make sure index.html is used as the entry point
      
    }
  }
});
