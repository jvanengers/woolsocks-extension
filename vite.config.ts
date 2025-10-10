import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { crx } from '@crxjs/vite-plugin'

// Minimal MV3 manifest injected by CRXJS during build
const manifest = {
  manifest_version: 3,
  name: 'Woolsocks',
  version: '0.91.0',
  description: 'Activate cashback automatically and discover gift cards at checkout on supported merchants.',
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
  permissions: ['tabs', 'scripting', 'storage', 'notifications', 'cookies', 'webRequest', 'webNavigation', 'offscreen'],
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
        'http://*.woolsocks.eu/*',
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
        'http://*.woolsocks.eu/*',
      ]
    },
    {
      matches: ['<all_urls>'],
      js: ['src/content/oc-panel.ts'],
      run_at: 'document_start',
      exclude_matches: [
        'https://woolsocks.eu/*',
        'https://*.woolsocks.eu/*',
        'http://woolsocks.eu/*',
        'http://*.woolsocks.eu/*',
      ]
    },
    {
      // Relay script runs only on Woolsocks pages to enable API proxying via page context
      matches: ['https://woolsocks.eu/*', 'https://*.woolsocks.eu/*'],
      js: ['src/content/relay.ts'],
      run_at: 'document_start'
    },
    // Intentionally do not inject any content scripts on woolsocks.eu
  ],
  web_accessible_resources: [
    {
      resources: ['content/*.css', 'content/*.js', 'icons/state-*.png', 'icons/icon-*.png', 'public/icons/*.svg', 'public/icons/*.png'],
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
        ocpanel: 'src/content/oc-panel.ts',
        relay: 'src/content/relay.ts',
        offscreen: 'src/offscreen/relay.html',
      },
    },
  },
})
