import { defineConfig } from 'wxt';

export default defineConfig({
  manifest: {
    name: 'BirdSong - Continuous Bird Sounds',
    description: 'Listen to beautiful bird songs continuously',
    version: '1.0.0',
    permissions: [
      'storage',
      'offscreen'  // 🔥 追加: offscreen権限
    ],
    host_permissions: [
      'https://search.macaulaylibrary.org/*'
    ]
  },
  dev: {
    server: {
      host: '0.0.0.0',
      port: 3001
    }
  }
});
