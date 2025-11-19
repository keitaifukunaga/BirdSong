import { defineConfig } from 'wxt';
import path from 'path';

export default defineConfig({
  manifest: {
    name: 'BirdSong - Continuous Bird Sounds',
    description: 'Listen to beautiful bird songs continuously',
    version: '1.0.0',
    permissions: [
      'storage',
      'offscreen',  // 🔥 追加: offscreen権限
      'downloads'   // 💾 ダウンロード権限
    ],
    host_permissions: [
      'https://search.macaulaylibrary.org/*',
      'https://cdn.download.ams.birds.cornell.edu/*',
      'https://api.ebird.org/*'
    ]
  },
  vite: () => ({
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
  }),
  dev: {
    server: {
      // hostname: '0.0.0.0',
      port: 3100
    }
  }
});
