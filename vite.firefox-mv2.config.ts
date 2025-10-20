import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { writeFileSync, mkdirSync, copyFileSync, readdirSync, statSync, readFileSync, existsSync } from 'fs'
import { resolve } from 'path'
import type { Plugin } from 'vite'

// Firefox-specific MV2 manifest (Firefox doesn't fully support MV3 service workers yet)
const manifest = {
  manifest_version: 2,  // Use MV2 for Firefox compatibility
  name: 'Woolsocks',
  version: '0.10.3',
  description: 'Activate cashback automatically and discover gift cards at checkout on supported merchants.',
  
  // MV2 uses browser_specific_settings instead of applications
  browser_specific_settings: {
    gecko: {
      id: 'woolsocks@woolsocks.eu'
    }
  },
  
  // MV2 uses browser_action instead of action
  browser_action: {
    default_title: 'Woolsocks',
    default_popup: 'src/popup/index.html',
    default_icon: {
      16: 'icons/icon-grey-16.png',
      32: 'icons/icon-grey-32.png',
      48: 'icons/icon-grey-48.png',
    },
  },
  
  // MV2 uses background.scripts instead of service_worker
  background: {
    scripts: ['background.js'],
    persistent: true  // For simplicity, make it persistent
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
  
  // MV2 permissions (no offscreen, no scripting - use content_scripts instead)
  permissions: ['tabs', 'storage', 'notifications', 'cookies', 'webNavigation', 'https://*/*', 'http://*/*', 'https://woolsocks.eu/*', 'https://api.woolsocks.eu/*'],
  
  content_scripts: [
    {
      matches: ['<all_urls>'],
      js: ['content/checkout.js'],
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
      js: ['content/entrance.js'],
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
      js: ['assets/i18n-PLACEHOLDER.js', 'content/oc-panel.js'],
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
      js: ['content/relay.js'],
      run_at: 'document_start'
    },
    {
      matches: ['<all_urls>'],
      js: ['content/injector.js'],
      run_at: 'document_end',
      exclude_matches: [
        'https://woolsocks.eu/*',
        'https://*.woolsocks.eu/*',
        'http://woolsocks.eu/*',
        'http://*.woolsocks.eu/*',
      ]
    },
  ],
  
  // MV2 web_accessible_resources format
  web_accessible_resources: [
    'content/*.css',
    'content/*.js',
    'icons/state-*.png',
    'icons/icon-*.png',
    'public/icons/*.svg',
    'public/icons/*.png',
    'public/fonts/*.otf',
    'public/fonts/*.ttf',
    'assets/content-*.js',
    'assets/entrance-*.js',
    'assets/i18n-*.js',
    'assets/ocpanel-*.js',
    'assets/relay-*.js',
    'assets/voucher-popup-page.js'
  ],
  
  content_security_policy: "script-src 'self'; object-src 'self'; connect-src 'self' https:;"
}

// Function to recursively copy directory
function copyDir(src: string, dest: string) {
  mkdirSync(dest, { recursive: true })
  const entries = readdirSync(src, { withFileTypes: true })
  
  for (const entry of entries) {
    const srcPath = resolve(src, entry.name)
    const destPath = resolve(dest, entry.name)
    
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath)
    } else {
      copyFileSync(srcPath, destPath)
    }
  }
}

// Custom plugin to write manifest.json and copy public assets for MV2
function writeManifestPlugin() {
  return {
    name: 'write-manifest',
    writeBundle() {
      const outDir = resolve('dist-firefox-mv2')
      mkdirSync(outDir, { recursive: true })
      
      // Write manifest.json
      writeFileSync(
        resolve(outDir, 'manifest.json'),
        JSON.stringify(manifest, null, 2)
      )
      
      // Copy public directory to maintain same structure as Chrome build
      const publicSrc = resolve('public')
      const publicDest = resolve(outDir, 'public')
      if (statSync(publicSrc).isDirectory()) {
        copyDir(publicSrc, publicDest)
        console.log('✅ Copied public assets to Firefox build')
      }
    }
  }
}

// Plugin to handle background script and HTML files for MV2 compatibility
function handleMV2CompatibilityPlugin(): Plugin {
  return {
    name: 'handle-mv2-compatibility',
    writeBundle() {
      // Find required chunks and update manifest
      const assetsDirPath = 'dist-firefox-mv2/assets'
      let analyticsChunkFilename: string | null = null
      let i18nChunkFilename: string | null = null
      let partnersConfigChunkFilename: string | null = null
      let platformChunkFilename: string | null = null
      
      if (existsSync(assetsDirPath)) {
        const files = readdirSync(assetsDirPath)
        for (const file of files) {
          if (file.includes('analytics') && file.endsWith('.js')) {
            analyticsChunkFilename = `assets/${file}`
          }
          if (file.includes('i18n') && file.endsWith('.js')) {
            i18nChunkFilename = `assets/${file}`
          }
          if (file.includes('partners-config') && file.endsWith('.js')) {
            partnersConfigChunkFilename = `assets/${file}`
          }
          if (file.includes('platform') && file.endsWith('.js')) {
            platformChunkFilename = `assets/${file}`
          }
        }
      }
      
      const manifestPath = 'dist-firefox-mv2/manifest.json'
      if (existsSync(manifestPath)) {
        let manifestContent = readFileSync(manifestPath, 'utf-8')
        let manifestJson = JSON.parse(manifestContent)
        
        // Update background scripts to load dependencies first
        const backgroundScripts: string[] = []
        if (analyticsChunkFilename) {
          backgroundScripts.push(analyticsChunkFilename)
        }
        if (partnersConfigChunkFilename) {
          backgroundScripts.push(partnersConfigChunkFilename)
        }
        if (i18nChunkFilename) {
          backgroundScripts.push(i18nChunkFilename)
        }
        if (platformChunkFilename) {
          backgroundScripts.push(platformChunkFilename)
        }
        backgroundScripts.push('background.js')
        
        if (backgroundScripts.length > 1) {
          manifestJson.background.scripts = backgroundScripts
          console.log(`✅ Updated manifest to load dependencies before background.js:`, backgroundScripts)
        }
        
        // Replace i18n placeholder in content_scripts
        if (i18nChunkFilename) {
          manifestContent = JSON.stringify(manifestJson, null, 2)
          manifestContent = manifestContent.replace(/assets\/i18n-PLACEHOLDER\.js/g, i18nChunkFilename)
          manifestJson = JSON.parse(manifestContent) // Re-parse for consistency
          console.log(`✅ Updated manifest to load ${i18nChunkFilename} before oc-panel.js`)
        }
        
        writeFileSync(manifestPath, JSON.stringify(manifestJson, null, 2))
      }
      
      // Handle background script - wrap in IIFE with CommonJS shims
      const backgroundPath = 'dist-firefox-mv2/background.js'
      if (existsSync(backgroundPath)) {
        let content = readFileSync(backgroundPath, 'utf-8')
        
        // Wrap the entire content in an IIFE with CommonJS shims
        // Provide exports and module objects for CommonJS compatibility
        const wrappedContent = `window.__woolsocksBackgroundExports = (function() {
  var exports = {};
  var module = { exports: exports };
  
  // Background script require() - provides fallbacks for external modules
  // Background runs in a different context and can't load window.__woolsocksXXXExports
      var require = function(path) {
        // Check if the module is already loaded via globalThis (shared chunks)
        if (path.includes('analytics')) {
          return (typeof globalThis !== 'undefined' ? globalThis.__woolsocksAnalyticsExports : undefined) || {};
        }
        // partners-config fallback
        if (path.includes('partners-config')) {
          return (typeof globalThis !== 'undefined' ? globalThis.__woolsocksPartnersConfigExports : undefined) || {};
        }
        // i18n fallback (background only uses for console.log)
        if (path.includes('i18n')) {
          return (typeof globalThis !== 'undefined' ? globalThis.__woolsocksI18nExports : undefined) || {
            t: () => ({ 
              voucher: {}, 
              debug: {}, 
              options: {}, 
              onboarding: {}, 
              popup: {},
              icons: { noDeals: 'No deals', dealActive: 'Deal active', dealAvailable: 'Deal available' }
            }),
            translate: (key, vars) => key, // Return key as fallback
            initLanguage: () => {},
            setLanguageFromAPI: () => {},
            translateTransactionStatus: (status) => status
          };
        }
        // Platform detection fallback
        if (path.includes('platform')) {
          return (typeof globalThis !== 'undefined' ? globalThis.__woolsocksPlatformExports : undefined) || {
            getPlatform: () => 'unknown',
            isDesktop: () => false,
            isMobile: () => false
          };
        }
        return {};
      };
  
  // Firefox MV2 API compatibility shims
  if (typeof browser !== 'undefined' && typeof chrome === 'undefined') {
    // Use browser API if chrome is not defined
    window.chrome = browser;
  }
  
  // Map chrome.action to browser.browserAction for Firefox MV2
  if (typeof chrome !== 'undefined' && !chrome.action && chrome.browserAction) {
    chrome.action = {
      setIcon: function(details) {
        // Firefox browserAction.setIcon expects { path: {...} } or { path: "..." }
        // Chrome action.setIcon is the same, so we can pass through directly
        return chrome.browserAction.setIcon(details);
      },
      setTitle: chrome.browserAction.setTitle.bind(chrome.browserAction),
      onClicked: chrome.browserAction.onClicked,
      openPopup: chrome.browserAction.openPopup ? chrome.browserAction.openPopup.bind(chrome.browserAction) : function() {
        console.warn('[Woolsocks] openPopup not supported in Firefox');
      }
    };
  }
  
  // Fix chrome.storage.local.get() to handle Firefox's callback-based API in MV2
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    const originalGet = chrome.storage.local.get;
    // Check if it's callback-based (MV2) or Promise-based (MV3)
    chrome.storage.local.get = function(keys, callback) {
      // If callback is provided, use callback-based API (original behavior)
      if (callback) {
        return originalGet.call(chrome.storage.local, keys, callback);
      }
      // Otherwise, wrap in a Promise
      return new Promise((resolve, reject) => {
        originalGet.call(chrome.storage.local, keys, (result) => {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError);
          } else {
            resolve(result || {});
          }
        });
      });
    };
  }
  
  // Polyfill chrome.storage.session for Firefox MV2 (doesn't exist in MV2)
  // Map to chrome.storage.local with a __session_ prefix
  if (typeof chrome !== 'undefined' && chrome.storage && !chrome.storage.session) {
    chrome.storage.session = {
      get: function(keys) {
        return chrome.storage.local.get(keys);
      },
      set: function(items) {
        return chrome.storage.local.set(items);
      },
      remove: function(keys) {
        return chrome.storage.local.remove(keys);
      },
      clear: function() {
        // Don't clear all local storage, just return a resolved promise
        return Promise.resolve();
      }
    };
  }
  
${content}
  
  // Return module.exports so other scripts can require() from background
  return module.exports;
})();`
        
        writeFileSync(backgroundPath, wrappedContent)
        console.log('✅ Wrapped background script with CommonJS shims and exposed exports for MV2 compatibility')
      }
      
      // Wrap popup, options, content scripts, and all asset scripts with CommonJS shims
      const assetsDir = 'dist-firefox-mv2/assets'
      const contentDir = 'dist-firefox-mv2/content'
      const scriptFiles: string[] = []
      
      // Add asset scripts
      if (existsSync(assetsDir)) {
        const files = readdirSync(assetsDir)
        files.forEach(file => {
          if (file.endsWith('.js')) {
            scriptFiles.push(`${assetsDir}/${file}`)
          }
        })
      }
      
      // Add content scripts (they also need wrapping for require() support)
      if (existsSync(contentDir)) {
        const files = readdirSync(contentDir)
        files.forEach(file => {
          if (file.endsWith('.js') && !file.endsWith('.map')) {
            scriptFiles.push(`${contentDir}/${file}`)
          }
        })
      }
      
      scriptFiles.forEach(scriptPath => {
        if (existsSync(scriptPath)) {
          let content = readFileSync(scriptPath, 'utf-8')
          
          // Only wrap if it uses CommonJS (has "use strict" or require/exports)
          // BUT exclude voucher-popup-page.js as it needs to work in page context
          const filename = scriptPath.split('/').pop() || ''
          const isVoucherPopupPage = filename.includes('voucher-popup-page')
          
          if (!isVoucherPopupPage && (content.includes('"use strict"') || content.includes('require(') || content.includes('exports.'))) {
            const isOnboardingComponent = filename.includes('OnboardingComponent')
            const isI18n = filename.includes('i18n')
            const isPlatform = filename.includes('platform')
            const isPartnersConfig = filename.includes('partners-config')
            const isFormat = filename.includes('format')
            const isAnalytics = filename.includes('analytics')
            const isClient = filename.includes('client') // React/ReactDOM chunk
            
            // Determine the window global name for this module
            let globalName = ''
            if (isOnboardingComponent) globalName = 'window.__woolsocksOnboardingExports'
            else if (isI18n) globalName = 'window.__woolsocksI18nExports'
            else if (isPlatform) globalName = 'window.__woolsocksPlatformExports'
            else if (isPartnersConfig) globalName = 'window.__woolsocksPartnersConfigExports'
            else if (isFormat) globalName = 'window.__woolsocksFormatExports'
            else if (isAnalytics) globalName = 'window.__woolsocksAnalyticsExports'
            else if (isClient) globalName = 'window.__woolsocksClientExports'
            
            // For shared modules (analytics, i18n, platform), we need to support BOTH:
            // 1. Assignment to window global (for popup/options context)
            // 2. CommonJS module.exports (for background context via require())
            const wrappedContent = `(function() {
  var exports = {};
  var module = { exports: exports };
  
  // Firefox MV2 API compatibility shims (for all scripts)
  if (typeof window !== 'undefined' && typeof browser !== 'undefined' && typeof chrome === 'undefined') {
    window.chrome = browser;
  }
  if (typeof chrome !== 'undefined' && !chrome.action && chrome.browserAction) {
    chrome.action = {
      setIcon: function(details) {
        return chrome.browserAction.setIcon(details);
      },
      setTitle: chrome.browserAction.setTitle.bind(chrome.browserAction),
      onClicked: chrome.browserAction.onClicked,
      openPopup: chrome.browserAction.openPopup ? chrome.browserAction.openPopup.bind(chrome.browserAction) : function() {}
    };
  }
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    const originalGet = chrome.storage.local.get;
    chrome.storage.local.get = function(keys, callback) {
      if (callback) {
        return originalGet.call(chrome.storage.local, keys, callback);
      }
      return new Promise((resolve, reject) => {
        originalGet.call(chrome.storage.local, keys, (result) => {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError);
          } else {
            resolve(result || {});
          }
        });
      });
    };
  }
  
  var require = function(modulePath) {
    // Import from background script (different context)
    if (modulePath.includes('background.js') || modulePath.includes('analytics')) {
      return (typeof window !== 'undefined' ? window.__woolsocksAnalyticsExports : undefined) || {};
    }
    // Import i18n
    if (modulePath.includes('i18n')) {
      return (typeof window !== 'undefined' ? window.__woolsocksI18nExports : undefined) || {};
    }
    // Import platform
    if (modulePath.includes('platform')) {
      return (typeof window !== 'undefined' ? window.__woolsocksPlatformExports : undefined) || {};
    }
    // Import format
    if (modulePath.includes('format')) {
      return (typeof window !== 'undefined' ? window.__woolsocksFormatExports : undefined) || {};
    }
    // Import OnboardingComponent
    if (modulePath.includes('OnboardingComponent')) {
      return (typeof window !== 'undefined' ? window.__woolsocksOnboardingExports : undefined) || {};
    }
    // Import options/SettingsPanel
    if (modulePath.includes('options')) {
      return (typeof window !== 'undefined' ? window.__woolsocksOptionsExports : undefined) || {};
    }
    // Import React/ReactDOM (client chunk)
    if (modulePath.includes('client')) {
      return (typeof window !== 'undefined' ? window.__woolsocksClientExports : undefined) || {};
    }
    return {};
  };
  
${content}
  
  // Assign to both window (for popup/options) and globalThis (for background)
  ${globalName ? `
  if (typeof window !== 'undefined') { ${globalName} = module.exports; }
  if (typeof globalThis !== 'undefined') { ${globalName.replace('window.', 'globalThis.')} = module.exports; }
  ` : ''}
  
  // Return module.exports for consumption by other scripts or for CommonJS require()
  return module.exports;
})();`
            
            writeFileSync(scriptPath, wrappedContent)
            console.log(`✅ Wrapped ${scriptPath} with CommonJS shims`)
          }

          // SPECIAL CASE: Wrap voucher-popup-page.js in a safe IIFE with local exports
          if (isVoucherPopupPage) {
            const safeWrapped = `(function(){
  // Isolate all declarations to avoid leaking globals or colliding with site scripts
  // Provide a benign local 'exports' so module boilerplate doesn't crash
  var exports = {};
  try {
${content}
  } catch (e) {
    try { console.error('[WS Page Script] initialization failed:', e); } catch(_) {}
  }
})();`
            writeFileSync(scriptPath, safeWrapped)
            console.log(`✅ Safely wrapped ${scriptPath} in isolated IIFE`)
          }
        }
      })
      
      // Fix HTML files to remove type="module" and update script references
      const htmlFiles = [
        'dist-firefox-mv2/src/popup/index.html',
        'dist-firefox-mv2/src/options/index.html'
      ]
      
      // Find the actual filenames of generated chunks
      const chunkFiles: Record<string, string> = {}
      if (existsSync(assetsDir)) {
        readdirSync(assetsDir).forEach(file => {
          if (file.includes('OnboardingComponent')) chunkFiles.onboarding = file
          if (file.includes('popup')) chunkFiles.popup = file
          if (file.includes('options')) chunkFiles.options = file
          if (file.includes('i18n')) chunkFiles.i18n = file
          if (file.includes('platform')) chunkFiles.platform = file
          if (file.includes('format')) chunkFiles.format = file
          if (file.includes('client')) chunkFiles.client = file
        })
      }
      
      htmlFiles.forEach(htmlPath => {
        if (existsSync(htmlPath)) {
          let content = readFileSync(htmlPath, 'utf-8')
          
          // Remove type="module" and crossorigin attributes
          content = content.replace(/\s+type="module"\s+crossorigin/g, '')
          content = content.replace(/\s+crossorigin\s+type="module"/g, '')
          content = content.replace(/\s+type="module"/g, '')
          content = content.replace(/\s+crossorigin/g, '')
          
          // Remove modulepreload links as they're not needed for CommonJS
          content = content.replace(/<link\s+rel="modulepreload"[^>]*>/g, '')
          
          // Inject dependency scripts before the main script
          const isPopup = htmlPath.includes('popup')
          const mainScriptPattern = /<script\s+src="\/assets\/(popup|options)-[^"]+\.js"><\/script>/
          const match = content.match(mainScriptPattern)
          
          if (match) {
            const mainScriptTag = match[0]
            
            // Build list of dependency scripts to load before the main script
            // Use defer to ensure scripts execute in order after parsing
            const depScripts: string[] = []
            
            // Load React/ReactDOM first (needed by OnboardingComponent and popup/options)
            if (chunkFiles.client) depScripts.push(`<script defer src="/assets/${chunkFiles.client}"></script>`)
            
            // Load shared dependencies
            if (chunkFiles.platform) depScripts.push(`<script defer src="/assets/${chunkFiles.platform}"></script>`)
            if (chunkFiles.i18n) depScripts.push(`<script defer src="/assets/${chunkFiles.i18n}"></script>`)
            if (chunkFiles.format) depScripts.push(`<script defer src="/assets/${chunkFiles.format}"></script>`)
            
            // Load OnboardingComponent (needed by both popup and options)
            if (chunkFiles.onboarding) depScripts.push(`<script defer src="/assets/${chunkFiles.onboarding}"></script>`)
            
            // Update main script to also use defer
            const deferredMainScript = mainScriptTag.replace('<script ', '<script defer ')
            
            // Replace main script tag with dependencies + main script
            content = content.replace(mainScriptTag, `${depScripts.join('\n    ')}\n    ${deferredMainScript}`)
          }
          
          writeFileSync(htmlPath, content)
          console.log(`✅ Fixed ${htmlPath} for CommonJS compatibility`)
        }
      })
    }
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), writeManifestPlugin(), handleMV2CompatibilityPlugin()],
  // Cast build block to any to accommodate Firefox MV2 specific options
  build: ({
    outDir: 'dist-firefox-mv2',
    rollupOptions: {
      input: {
        popup: 'src/popup/index.html',
        options: 'src/options/index.html',
        background: 'src/background/index.ts',  // Will be bundled as background.js
        content: 'src/content/checkout.ts',     // Will be bundled as content/checkout.js
        entrance: 'src/content/entrance.ts',    // Will be bundled as content/entrance.js
        ocpanel: 'src/content/oc-panel.ts',     // Will be bundled as content/oc-panel.js
        relay: 'src/content/relay.ts',          // Will be bundled as content/relay.js
        injector: 'src/content/injector.ts',    // Content injector for voucher popup
        'voucher-popup-page': 'src/shared/voucher-popup-page.ts',
        // Note: no offscreen for MV2
      },
      output: {
        format: 'cjs',
        // Customize output for MV2 structure
        entryFileNames: (chunkInfo) => {
          if (chunkInfo.name === 'background') {
            return 'background.js'
          }
          if (chunkInfo.name === 'content') {
            return 'content/checkout.js'
          }
          if (chunkInfo.name === 'entrance') {
            return 'content/entrance.js'
          }
          if (chunkInfo.name === 'ocpanel') {
            return 'content/oc-panel.js'
          }
          if (chunkInfo.name === 'relay') {
            return 'content/relay.js'
          }
          if (chunkInfo.name === 'injector') {
            return 'content/injector.js'
          }
          if (chunkInfo.name === 'voucher-popup-page') {
            return 'assets/voucher-popup-page.js'
          }
          return 'assets/[name]-[hash].js'
        },
        // Manual chunking to prevent code-splitting for content scripts
        manualChunks: (id, { getModuleInfo }) => {
          // Force voucher-popup-page to bundle everything inline (no external chunks)
          if (id.includes('/shared/voucher-popup-page.ts') || 
              id.includes('/shared/voucher-popup.ts') || 
              id.includes('/shared/voucher-popup-styles.ts') ||
              id.includes('/shared/voucher-popup-types.ts')) {
            return 'voucher-popup-page' // Bundle all popup-related code together
          }
          
          // If this is i18n/platform/analytics and it's imported by a content script,
          // don't split it - let it bundle with the content script
          if (id.includes('/shared/i18n.ts') || id.includes('/shared/platform.ts')) {
            const moduleInfo = getModuleInfo(id)
            if (moduleInfo) {
              // Check if any content script imports this
              const importedByContentScript = moduleInfo.importers.some(imp => 
                imp.includes('/content/oc-panel.ts') || 
                imp.includes('/content/checkout.ts') ||
                imp.includes('/content/entrance.ts') ||
                imp.includes('/content/relay.ts')
              )
              // If imported ONLY by content scripts, don't create a separate chunk
              // Let it bundle with the content script
              const importedByBackground = moduleInfo.importers.some(imp => imp.includes('/background/'))
              const importedByPopup = moduleInfo.importers.some(imp => imp.includes('/popup/') || imp.includes('/options/'))
              
              // If imported by both content AND (background OR popup), keep as shared chunk
              // Otherwise, bundle it inline
              if (importedByContentScript && !importedByBackground && !importedByPopup) {
                return undefined // Don't create a separate chunk - inline it
              }
            }
          }
          // Analytics should be in its own chunk (loaded by background)
          // Everything else follows Vite's default chunking
          return undefined
        }
      }
    },
    // Ensure proper bundling for MV2 - use ES2017 for async/await support
    target: 'es2017',
    minify: 'esbuild',
    esbuild: {
      target: 'es2017'
    }
  } as any),
})
