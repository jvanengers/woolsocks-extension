import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { crx } from '@crxjs/vite-plugin'
import { writeFileSync, existsSync, readFileSync } from 'fs'
import { join } from 'path'

// Minimal MV3 manifest injected by CRXJS during build
const manifest = {
  manifest_version: 3,
  name: 'Woolsocks',
  version: '0.10.0',
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
  permissions: ['tabs', 'scripting', 'storage', 'notifications', 'cookies', 'webNavigation', 'offscreen'],
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
      // Injector listens for background message and injects page script popup
      matches: ['<all_urls>'],
      js: ['src/content/injector.ts'],
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
      resources: ['content/*.css', 'content/*.js', 'assets/*.js', 'icons/state-*.png', 'icons/icon-*.png', 'public/icons/*.svg', 'public/icons/*.png', 'public/fonts/*.otf', 'public/fonts/*.ttf'],
      matches: ['<all_urls>'],
    },
  ],
  content_security_policy: {
    extension_pages: "script-src 'self'; object-src 'self'; connect-src 'self' https: https://woolsocks.eu https://api.woolsocks.eu;"
  },
}

// Plugin to wrap voucher-popup-page.js in IIFE to prevent variable conflicts
function wrapVoucherPopupPagePlugin(): Plugin {
  return {
    name: 'wrap-voucher-popup-page',
    writeBundle() {
      const voucherPopupPath = join('dist', 'assets', 'voucher-popup-page.js')
      if (existsSync(voucherPopupPath)) {
        const content = readFileSync(voucherPopupPath, 'utf8')
        const wrappedContent = `(function(){
  // Isolate all declarations to avoid leaking globals or colliding with site scripts
  // Provide a benign local 'exports' so module boilerplate doesn't crash
  var exports = {};
  try {
${content}
  } catch (e) {
    try { console.error('[WS Page Script] initialization failed:', e); } catch(_) {}
  }
})();`
        writeFileSync(voucherPopupPath, wrappedContent)
        console.log('✅ Wrapped voucher-popup-page.js in IIFE')
      }
    }
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), crx({ manifest }), wrapVoucherPopupPagePlugin()],
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
        'voucher-popup-page': 'src/shared/voucher-popup-page.ts',
      },
      output: {
        entryFileNames: (chunkInfo) => {
          if (chunkInfo.name === 'voucher-popup-page') {
            return 'assets/voucher-popup-page.js'
          }
          return 'assets/[name]-[hash].js'
        }
      }
    },
  },
})
