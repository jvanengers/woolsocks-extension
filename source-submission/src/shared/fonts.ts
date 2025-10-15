// Woolsocks Font Loading System
// Cross-browser compatible font loading for Chrome and Firefox

export interface FontVariant {
  family: string
  weight: number
  style: 'normal' | 'italic'
  file: string
}

export const WOOLSOCKS_FONTS: FontVariant[] = [
  // Main Woolsocks family
  { family: 'Woolsocks', weight: 300, style: 'normal', file: 'Woolsocks-Light.otf' },
  { family: 'Woolsocks', weight: 300, style: 'italic', file: 'Woolsocks-LightSlanted.otf' },
  { family: 'Woolsocks', weight: 400, style: 'normal', file: 'Woolsocks-Regular.otf' },
  { family: 'Woolsocks', weight: 400, style: 'italic', file: 'Woolsocks-RegularSlanted.otf' },
  { family: 'Woolsocks', weight: 500, style: 'normal', file: 'Woolsocks-Medium.otf' },
  { family: 'Woolsocks', weight: 500, style: 'italic', file: 'Woolsocks-MediumSlanted.otf' },
  { family: 'Woolsocks', weight: 700, style: 'normal', file: 'Woolsocks-Bold.otf' },
  
  // Alternative Woolsocks family
  { family: 'Woolsocks Alt', weight: 300, style: 'normal', file: 'Woolsocks-LightAlt.otf' },
  { family: 'Woolsocks Alt', weight: 300, style: 'italic', file: 'Woolsocks-LightAltSlanted.otf' },
  { family: 'Woolsocks Alt', weight: 400, style: 'normal', file: 'Woolsocks-RegularAlt.otf' },
  { family: 'Woolsocks Alt', weight: 400, style: 'italic', file: 'Woolsocks-RegularAltSlanted.otf' },
  { family: 'Woolsocks Alt', weight: 500, style: 'normal', file: 'Woolsocks-MediumAlt.otf' },
  { family: 'Woolsocks Alt', weight: 500, style: 'italic', file: 'Woolsocks-MediumAltSlanted.otf' },
  { family: 'Woolsocks Alt', weight: 700, style: 'normal', file: 'Woolsocks-BoldAlt.otf' },
  { family: 'Woolsocks Alt', weight: 700, style: 'italic', file: 'Woolsocks-BoldAltSlanted.ttf' },
]

// Get the extension URL for font files
function getExtensionUrl(path: string): string {
  if (typeof chrome !== 'undefined' && chrome.runtime) {
    return chrome.runtime.getURL(path)
  }
  // Fallback for Firefox or other browsers
  if (typeof (globalThis as any).browser !== 'undefined' && (globalThis as any).browser.runtime) {
    return (globalThis as any).browser.runtime.getURL(path)
  }
  // Final fallback
  return path
}

// Load a single font variant
async function loadFontVariant(variant: FontVariant): Promise<void> {
  const fontUrl = getExtensionUrl(`public/fonts/${variant.file}`)
  
  try {
    const fontFace = new FontFace(
      variant.family,
      `url(${fontUrl})`,
      {
        weight: variant.weight.toString(),
        style: variant.style,
        display: 'swap'
      }
    )
    
    await fontFace.load()
    document.fonts.add(fontFace)
    // console.log(`✅ Loaded font: ${variant.family} ${variant.weight} ${variant.style}`)
  } catch (error) {
    console.warn(`⚠️ Failed to load font: ${variant.family} ${variant.weight} ${variant.style}`, error)
  }
}

// Load all Woolsocks fonts
export async function loadWoolsocksFonts(): Promise<void> {
  console.log('🎨 Loading Woolsocks fonts...')
  
  try {
    // Load all font variants in parallel
    await Promise.all(WOOLSOCKS_FONTS.map(loadFontVariant))
    // console.log('✅ All Woolsocks fonts loaded successfully')
  } catch (error) {
    console.error('❌ Error loading Woolsocks fonts:', error)
  }
}

// Check if fonts are loaded
export function areWoolsocksFontsLoaded(): boolean {
  if (!document.fonts) return false
  
  // Check if at least the main Woolsocks family is loaded
  return document.fonts.check('16px Woolsocks')
}

// Get font family string with fallbacks
export function getWoolsocksFontFamily(variant: 'main' | 'alt' = 'main'): string {
  const family = variant === 'alt' ? 'Woolsocks Alt' : 'Woolsocks'
  return `${family}, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif`
}

// Preload fonts for better performance
export function preloadWoolsocksFonts(): void {
  const criticalFonts = [
    'Woolsocks-Regular.otf',
    'Woolsocks-Medium.otf',
    'Woolsocks-Bold.otf'
  ]
  
  criticalFonts.forEach(fontFile => {
    const link = document.createElement('link')
    link.rel = 'preload'
    link.as = 'font'
    link.type = 'font/otf'
    link.href = getExtensionUrl(`public/fonts/${fontFile}`)
    link.crossOrigin = 'anonymous'
    document.head.appendChild(link)
  })
}
