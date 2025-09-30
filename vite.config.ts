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
    default_popup: 'src/popup/index.html',
    default_icon: {
      16: 'icons/icon-grey-16.png',
      32: 'icons/icon-grey-32.png',
      48: 'icons/icon-grey-48.png',
    },
  },
  background: {
    service_worker: 'src/background/index.ts',
    type: 'module',
  },
  icons: {
    16: 'icons/icon-grey-16.png',
    32: 'icons/icon-grey-32.png',
    48: 'icons/icon-grey-48.png',
    128: 'icons/icon-yellow-128px16.png',
  },
  options_ui: {
    page: 'src/options/index.html',
    open_in_tab: false,
  },
  permissions: ['tabs', 'scripting', 'storage', 'alarms', 'notifications', 'cookies', 'webRequest', 'webRequestBlocking'],
  host_permissions: ['https://*/*', 'http://*/*', 'https://woolsocks.eu/*', 'https://api.woolsocks.eu/*'],
  content_scripts: [
    {
      matches: ['<all_urls>'],
      js: ['src/content/checkout.ts'],
      run_at: 'document_end',
      exclude_matches: [
        'https://woolsocks.eu/*',
        'https://*.woolsocks.eu/*',
        'http://woolsocks.eu/*',
        'http://*.woolsocks.eu/*'
      ]
    },
    {
      matches: ['<all_urls>'],
      js: ['src/content/entrance.ts'],
      run_at: 'document_end',
      exclude_matches: [
        'https://woolsocks.eu/*',
        'https://*.woolsocks.eu/*',
        'http://woolsocks.eu/*',
        'http://*.woolsocks.eu/*'
      ]
    },
    // Intentionally do not inject any content scripts on woolsocks.eu
  ],
  web_accessible_resources: [
    {
      resources: ['content/*.css', 'content/*.js', 'icons/state-*.png', 'icons/icon-*.png', 'public/icons/*.svg'],
      matches: ['<all_urls>'],
    },
  ],
  content_security_policy: {
    extension_pages: "script-src 'self'; object-src 'self'; connect-src 'self' https: https://woolsocks.eu https://api.woolsocks.eu;"
  },
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
        content: 'src/content/checkout.ts',
        entrance: 'src/content/entrance.ts',
      },
    },
  },
})
