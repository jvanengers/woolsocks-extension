import AdmZip from 'adm-zip'
import { readFileSync, existsSync } from 'fs'
import { join } from 'path'

const version = JSON.parse(readFileSync('package.json', 'utf8')).version

console.log('Packaging Woolsocks extension...')
console.log(`Version: ${version}`)

// Check if build directories exist
if (!existsSync('dist')) {
  console.error('❌ Chrome build not found. Run "npm run build:chrome" first.')
  process.exit(1)
}

if (!existsSync('dist-firefox-mv2')) {
  console.error('❌ Firefox MV2 build not found. Run "npm run build:firefox" first.')
  process.exit(1)
}

try {
  // Chrome .zip
  console.log('📦 Creating Chrome package...')
  const chromeZip = new AdmZip()
  chromeZip.addLocalFolder('dist')
  // Remove system files after adding
  chromeZip.getEntries().forEach(entry => {
    if (entry.entryName.includes('.DS_Store') || 
        entry.entryName.includes('Thumbs.db') ||
        entry.entryName.includes('.git') ||
        entry.entryName.includes('node_modules')) {
      chromeZip.deleteFile(entry.entryName)
    }
  })
  const chromeFilename = `woolsocks-extension-chrome-${version}.zip`
  chromeZip.writeZip(chromeFilename)
  console.log(`✅ Chrome package created: ${chromeFilename}`)

  // Firefox .xpi (MV2 build)
  console.log('📦 Creating Firefox MV2 package...')
  const firefoxZip = new AdmZip()
  firefoxZip.addLocalFolder('dist-firefox-mv2')
  // Remove system files after adding
  firefoxZip.getEntries().forEach(entry => {
    if (entry.entryName.includes('.DS_Store') || 
        entry.entryName.includes('Thumbs.db') ||
        entry.entryName.includes('.git') ||
        entry.entryName.includes('node_modules')) {
      firefoxZip.deleteFile(entry.entryName)
    }
  })
  const firefoxFilename = `woolsocks-extension-firefox-mv2-${version}.xpi`
  firefoxZip.writeZip(firefoxFilename)
  console.log(`✅ Firefox MV2 package created: ${firefoxFilename}`)

  console.log('\n🎉 Packaging complete!')
  console.log(`Chrome: ${chromeFilename}`)
  console.log(`Firefox: ${firefoxFilename}`)
  console.log('\nNext steps:')
  console.log('- Chrome: Upload .zip to Chrome Web Store')
  console.log('- Firefox: Upload .xpi to AMO (Add-ons.mozilla.org)')
  console.log('\nNote: Firefox build uses Manifest V2 for compatibility')

} catch (error) {
  console.error('❌ Packaging failed:', error.message)
  process.exit(1)
}
