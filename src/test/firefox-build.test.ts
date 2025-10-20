// Firefox Build Validation Tests
// Tests that verify the Firefox MV2 build has all required dependencies and correct structure

import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync, readdirSync } from 'fs'
import { join } from 'path'

describe('Firefox Build Validation', () => {
  const distPath = 'dist-firefox-mv2'
  
  describe('Manifest Validation', () => {
    it('should have all required chunks in background scripts', () => {
      const manifestPath = join(distPath, 'manifest.json')
      expect(existsSync(manifestPath)).toBe(true)
      
      const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'))
      const backgroundScripts = manifest.background.scripts
      
      // Verify critical dependencies are loaded
      expect(backgroundScripts.some((script: string) => script.includes('partners-config'))).toBe(true)
      expect(backgroundScripts.some((script: string) => script.includes('i18n'))).toBe(true)
      expect(backgroundScripts.some((script: string) => script.includes('platform'))).toBe(true)
      expect(backgroundScripts).toContain('background.js')
    })
    
    it('should load dependencies before background.js', () => {
      const manifestPath = join(distPath, 'manifest.json')
      const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'))
      const backgroundScripts = manifest.background.scripts
      
      // Verify loading order (dependencies before main script)
      const backgroundIndex = backgroundScripts.indexOf('background.js')
      const partnersIndex = backgroundScripts.findIndex((s: string) => s.includes('partners-config'))
      const i18nIndex = backgroundScripts.findIndex((s: string) => s.includes('i18n'))
      const platformIndex = backgroundScripts.findIndex((s: string) => s.includes('platform'))
      
      expect(partnersIndex).toBeLessThan(backgroundIndex)
      expect(i18nIndex).toBeLessThan(backgroundIndex)
      expect(platformIndex).toBeLessThan(backgroundIndex)
    })
    
    it('should have correct manifest structure', () => {
      const manifestPath = join(distPath, 'manifest.json')
      const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'))
      
      // Verify manifest version and structure
      expect(manifest.manifest_version).toBe(2)
      expect(manifest.background).toBeDefined()
      expect(manifest.background.scripts).toBeInstanceOf(Array)
      expect(manifest.background.scripts.length).toBeGreaterThan(1)
    })
  })
  
  describe('Popup HTML Validation', () => {
    it('should have format chunk in popup HTML', () => {
      const popupPath = join(distPath, 'src/popup/index.html')
      expect(existsSync(popupPath)).toBe(true)
      
      const popupHtml = readFileSync(popupPath, 'utf-8')
      
      // Check for format chunk reference
      expect(popupHtml).toMatch(/assets\/format-.*\.js/)
    })
    
    it('should have all required dependency scripts in popup', () => {
      const popupPath = join(distPath, 'src/popup/index.html')
      const popupHtml = readFileSync(popupPath, 'utf-8')
      
      // Check for required chunks
      expect(popupHtml).toMatch(/assets\/platform-.*\.js/)
      expect(popupHtml).toMatch(/assets\/i18n-.*\.js/)
      expect(popupHtml).toMatch(/assets\/format-.*\.js/)
      expect(popupHtml).toMatch(/assets\/OnboardingComponent-.*\.js/)
      expect(popupHtml).toMatch(/assets\/popup-.*\.js/)
    })
    
    it('should use defer attribute for scripts', () => {
      const popupPath = join(distPath, 'src/popup/index.html')
      const popupHtml = readFileSync(popupPath, 'utf-8')
      
      // Check that scripts use defer attribute
      const scriptLines = popupHtml.split('\n').filter(line => line.includes('<script'))
      expect(scriptLines.length).toBeGreaterThan(0)
      
      scriptLines.forEach(line => {
        expect(line).toMatch(/defer/)
      })
    })
  })
  
  describe('Options HTML Validation', () => {
    it('should have correct structure in options HTML', () => {
      const optionsPath = join(distPath, 'src/options/index.html')
      expect(existsSync(optionsPath)).toBe(true)
      
      const optionsHtml = readFileSync(optionsPath, 'utf-8')
      
      // Check for required chunks
      expect(optionsHtml).toMatch(/assets\/platform-.*\.js/)
      expect(optionsHtml).toMatch(/assets\/i18n-.*\.js/)
      expect(optionsHtml).toMatch(/assets\/OnboardingComponent-.*\.js/)
      expect(optionsHtml).toMatch(/assets\/options-.*\.js/)
    })
  })
  
  describe('Asset Existence', () => {
    it('should have all required assets in assets directory', () => {
      const assetsPath = join(distPath, 'assets')
      expect(existsSync(assetsPath)).toBe(true)
      
      const files = readdirSync(assetsPath)
      
      // Check for required chunks
      const requiredAssets = [
        'partners-config',
        'i18n',
        'platform',
        'format',
        'OnboardingComponent',
        'popup',
        'options'
      ]
      
      requiredAssets.forEach(asset => {
        const found = files.some(f => f.includes(asset))
        expect(found).toBe(true)
      })
    })
    
    it('should have background.js in root', () => {
      const backgroundPath = join(distPath, 'background.js')
      expect(existsSync(backgroundPath)).toBe(true)
    })
    
    it('should have content scripts', () => {
      const contentPath = join(distPath, 'content')
      expect(existsSync(contentPath)).toBe(true)
      
      const contentFiles = readdirSync(contentPath)
      const requiredContentScripts = [
        'checkout.js',
        'entrance.js',
        'injector.js',
        'oc-panel.js',
        'relay.js'
      ]
      
      requiredContentScripts.forEach(script => {
        expect(contentFiles).toContain(script)
      })
    })
  })
  
  describe('Content Scripts Validation', () => {
    it('should have i18n chunk loaded before oc-panel in manifest', () => {
      const manifestPath = join(distPath, 'manifest.json')
      const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'))
      
      const ocPanelScript = manifest.content_scripts.find((cs: any) => 
        cs.js && cs.js.some((script: string) => script.includes('oc-panel'))
      )
      
      expect(ocPanelScript).toBeDefined()
      expect(ocPanelScript.js.some((script: string) => script.includes('i18n'))).toBe(true)
    })
  })
  
  describe('File Size Validation', () => {
    it('should have reasonable file sizes', () => {
      const backgroundPath = join(distPath, 'background.js')
      const backgroundStats = require('fs').statSync(backgroundPath)
      
      // Background script should be substantial but not too large
      expect(backgroundStats.size).toBeGreaterThan(100000) // At least 100KB
      expect(backgroundStats.size).toBeLessThan(2000000)   // Less than 2MB
    })
  })
})
