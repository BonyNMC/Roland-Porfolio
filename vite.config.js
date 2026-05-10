import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        portfolio: resolve(__dirname, 'portfolio.html'),
        blog: resolve(__dirname, 'blog.html'),
        blogDetail: resolve(__dirname, 'blog-detail.html'),
        podcast: resolve(__dirname, 'podcast.html'),
        admin: resolve(__dirname, 'admin.html'),
      },
    },
    cssCodeSplit: true,
  },
});
