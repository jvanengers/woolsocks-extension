import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { crx } from '@crxjs/vite-plugin'

// Minimal MV3 manifest injected by CRXJS during build
const manifest = {
  manifest_version: 3,
  name: 'Woolsocks: Cashback & Vouchers',
  version: '0.1.0',
  description: 'Never miss cashback on partner sites and save at checkout with instant vouchers.',
  action: {
    default_title: 'Woolsocks',
    default_popup: 'popup/index.html',
    default_icon: {
      16: 'icons/icon-16.png',
      32: 'icons/icon-32.png',
      48: 'icons/icon-48.png',
      128: 'icons/icon-128.png',
    },
  },
  background: {
    service_worker: 'background/index.js',
    type: 'module',
  },
  icons: {
    16: 'icons/icon-16.png',
    32: 'icons/icon-32.png',
    48: 'icons/icon-48.png',
    128: 'icons/icon-128.png',
  },
  options_ui: {
    page: 'options/index.html',
    open_in_tab: false,
  },
  permissions: ['tabs', 'scripting', 'storage', 'alarms'],
  host_permissions: ['https://*/*', 'http://*/*'],
  web_accessible_resources: [
    {
      resources: ['content/*.css', 'icons/state-*.png'],
      matches: ['<all_urls>'],
    },
  ],
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), crx({ manifest })],
  build: {
    rollupOptions: {
      input: {
        popup: 'src/popup/index.html',
        options: 'src/options/index.html',
        background: 'src/background/index.ts',
      },
    },
  },
})
