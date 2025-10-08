import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { crx } from '@crxjs/vite-plugin'
import { readFileSync } from 'fs'
import { join } from 'path'

// Load Safari manifest
const safariManifest = JSON.parse(
  readFileSync(join(__dirname, 'manifests/safari.json'), 'utf-8')
)

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), crx({ manifest: safariManifest })],
  build: {
    outDir: 'dist/safari',
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
