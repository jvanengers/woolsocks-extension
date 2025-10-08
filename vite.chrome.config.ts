import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { crx } from '@crxjs/vite-plugin'
import { readFileSync } from 'fs'
import { join } from 'path'

// Load Chrome manifest
const chromeManifest = JSON.parse(
  readFileSync(join(__dirname, 'manifests/chrome.json'), 'utf-8')
)

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), crx({ manifest: chromeManifest })],
  build: {
    outDir: 'dist/chrome',
    rollupOptions: {
      input: {
        popup: 'src/popup/index.html',
        options: 'src/options/index.html',
        background: 'src/background/index.ts',
        content: 'src/content/checkout.ts',
        entrance: 'src/content/entrance.ts',
        ocpanel: 'src/content/oc-panel.ts',
        relay: 'src/content/relay.ts',
      },
    },
  },
})
