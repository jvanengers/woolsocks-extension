#!/usr/bin/env node

/**
 * Pull translations from Lokalise
 * Downloads translations from Lokalise and updates the local i18n.ts file
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Lokalise configuration
const API_TOKEN = '20bd46d4f8b65481b7e320ca8d661aef7ee8c714';
const PROJECT_ID = '6845218768e96a14d01c05.51631454';
const API_BASE_URL = 'https://api.lokalise.com/api2';

// Supported languages
const languages = ['en', 'nl', 'de', 'fr', 'it', 'es'];

// Create translations directory
const translationsDir = path.join(__dirname, '..', 'translations');
if (!fs.existsSync(translationsDir)) {
  fs.mkdirSync(translationsDir, { recursive: true });
}

// Function to download translations from Lokalise
async function downloadTranslations() {
  try {
    console.log('📥 Downloading translations from Lokalise...');
    
    // Create export request payload
    const exportPayload = {
      format: 'json',
      original_filenames: true,
      directory_prefix: '',
      all_platforms: false,
      filter_langs: languages,
      export_empty_as: 'skip'
    };
    
    // Trigger export
    const exportResponse = await fetch(`${API_BASE_URL}/projects/${PROJECT_ID}/files/export`, {
      method: 'POST',
      headers: {
        'X-Api-Token': API_TOKEN,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(exportPayload)
    });
    
    if (!exportResponse.ok) {
      throw new Error(`Export request failed: ${exportResponse.status} ${exportResponse.statusText}`);
    }
    
    const exportData = await exportResponse.json();
    console.log('📦 Export triggered successfully');
    
    // Check if we have files directly in the response
    if (exportData.files && exportData.files['.']) {
      console.log('📂 Processing files from direct response...');
      
      const files = exportData.files['.'];
      let fileCount = 0;
      
      // Save each language file
      for (const [filename, fileData] of Object.entries(files)) {
        if (filename.endsWith('.json')) {
          const lang = filename.replace('.json', '');
          if (languages.includes(lang)) {
            const filePath = path.join(translationsDir, filename);
            fs.writeFileSync(filePath, fileData.content, 'utf8');
            console.log(`💾 Saved ${filename}`);
            fileCount++;
          }
        }
      }
      
      console.log(`✅ Downloaded ${fileCount} translation files`);
      
      // List downloaded files
      const downloadedFiles = fs.readdirSync(translationsDir);
      console.log('📋 Downloaded files:');
      downloadedFiles.forEach(file => {
        if (file.endsWith('.json')) {
          console.log(`   - ${file}`);
        }
      });
    } else {
      // Fallback to bundle URL approach (if needed in the future)
      const bundleUrl = exportData.bundle_url;
      if (!bundleUrl) {
        console.error('❌ No files or bundle URL in response. Available keys:', Object.keys(exportData));
        throw new Error('No files or bundle URL received from export response');
      }
      
      console.log(`🔗 Bundle URL: ${bundleUrl}`);
      
      // Download the bundle
      console.log('⬇️  Downloading translation bundle...');
      const bundleResponse = await fetch(bundleUrl);
      
      if (!bundleResponse.ok) {
        throw new Error(`Bundle download failed: ${bundleResponse.status} ${bundleResponse.statusText}`);
      }
      
      const bundleBuffer = await bundleResponse.arrayBuffer();
      const bundlePath = path.join(translationsDir, 'translations_bundle.zip');
      
      // Save bundle to file
      fs.writeFileSync(bundlePath, Buffer.from(bundleBuffer));
      console.log(`💾 Bundle saved to ${bundlePath}`);
      
      // Extract the bundle
      console.log('📂 Extracting translation files...');
      
      // Use Node.js built-in zlib for extraction (simple approach)
      const AdmZip = await import('adm-zip');
      const zip = new AdmZip.default(bundlePath);
      
      // Extract all files to translations directory
      zip.extractAllTo(translationsDir, true);
      
      // Clean up bundle file
      fs.unlinkSync(bundlePath);
      
      console.log('✅ Translations downloaded and extracted successfully');
      
      // List downloaded files
      const files = fs.readdirSync(translationsDir);
      console.log('📋 Downloaded files:');
      files.forEach(file => {
        if (file.endsWith('.json')) {
          console.log(`   - ${file}`);
        }
      });
    }
    
    return true;
  } catch (error) {
    console.error('❌ Error downloading translations:', error.message);
    return false;
  }
}

// Function to convert JSON object to TypeScript object string
function jsonToTsObject(obj, indent = 2) {
  const spaces = ' '.repeat(indent);
  const nextSpaces = ' '.repeat(indent + 2);
  
  if (typeof obj === 'string') {
    // Escape quotes and handle template literals
    return `'${obj.replace(/'/g, "\\'")}'`;
  }
  
  if (typeof obj === 'boolean') {
    return obj.toString();
  }
  
  if (typeof obj === 'number') {
    return obj.toString();
  }
  
  if (Array.isArray(obj)) {
    const items = obj.map(item => `${nextSpaces}${jsonToTsObject(item, indent + 2)}`).join(',\n');
    return `[\n${items}\n${spaces}]`;
  }
  
  if (typeof obj === 'object' && obj !== null) {
    const entries = Object.entries(obj).map(([key, value]) => {
      return `${nextSpaces}${key}: ${jsonToTsObject(value, indent + 2)}`;
    }).join(',\n');
    return `{\n${entries}\n${spaces}}`;
  }
  
  return 'null';
}

// Function to update i18n.ts with new translations
function updateI18nFile() {
  try {
    console.log('📝 Updating i18n.ts with new translations...');
    
    // Read translations from downloaded files
    const translations = {};
    
    languages.forEach(lang => {
      const filePath = path.join(translationsDir, `${lang}.json`);
      if (fs.existsSync(filePath)) {
        try {
          translations[lang] = JSON.parse(fs.readFileSync(filePath, 'utf8'));
          console.log(`✅ Loaded ${lang} translations from Lokalise`);
        } catch (error) {
          console.warn(`⚠️  Could not load ${lang} translations:`, error.message);
        }
      }
    });
    
    if (Object.keys(translations).length === 0) {
      throw new Error('No translations found from Lokalise');
    }
    
    // Read the current i18n.ts file
    const i18nPath = path.join(__dirname, '..', 'src', 'shared', 'i18n.ts');
    let i18nContent = fs.readFileSync(i18nPath, 'utf8');
    
    // Find the translations object and replace it
    const translationsStart = i18nContent.indexOf('const translations: Record<Language, Translations> = {');
    if (translationsStart === -1) {
      throw new Error('Could not find translations object in i18n.ts');
    }
    
    // Find the end of the translations object
    let braceCount = 0;
    let inString = false;
    let escapeNext = false;
    let i = translationsStart + 'const translations: Record<Language, Translations> = {'.length;
    let translationsEnd = -1;
    
    while (i < i18nContent.length) {
      const char = i18nContent[i];
      
      if (escapeNext) {
        escapeNext = false;
        i++;
        continue;
      }
      
      if (char === '\\') {
        escapeNext = true;
        i++;
        continue;
      }
      
      if (char === '"' || char === "'") {
        inString = !inString;
      } else if (!inString) {
        if (char === '{') {
          braceCount++;
        } else if (char === '}') {
          if (braceCount === 0) {
            translationsEnd = i + 1;
            break;
          }
          braceCount--;
        }
      }
      
      i++;
    }
    
    if (translationsEnd === -1) {
      throw new Error('Could not find end of translations object');
    }
    
    // Generate new translations object
    let newTranslations = 'const translations: Record<Language, Translations> = {\n';
    
    languages.forEach((lang, index) => {
      if (translations[lang]) {
        newTranslations += `  ${lang}: ${jsonToTsObject(translations[lang], 2)}`;
        if (index < languages.length - 1) {
          newTranslations += ',';
        }
        newTranslations += '\n';
      }
    });
    
    newTranslations += '}';
    
    // Replace the translations object in the file
    const beforeTranslations = i18nContent.substring(0, translationsStart);
    const afterTranslations = i18nContent.substring(translationsEnd);
    
    const updatedContent = beforeTranslations + newTranslations + afterTranslations;
    
    // Write the updated file
    fs.writeFileSync(i18nPath, updatedContent, 'utf8');
    
    console.log('✅ Updated i18n.ts with translations from Lokalise');
    console.log(`✅ Updated ${Object.keys(translations).length} languages`);
    
    return true;
  } catch (error) {
    console.error('❌ Error updating i18n.ts:', error.message);
    return false;
  }
}

// Function to clean up temporary files
function cleanup() {
  console.log('🧹 Cleaning up temporary files...');
  
  const files = fs.readdirSync(translationsDir);
  files.forEach(file => {
    if (file.endsWith('.json')) {
      const filePath = path.join(translationsDir, file);
      fs.unlinkSync(filePath);
      console.log(`🗑️  Removed ${file}`);
    }
  });
}

// Main execution
async function main() {
  console.log('🚀 Starting pull from Lokalise...');
  console.log(`📁 Project ID: ${PROJECT_ID}`);
  console.log(`🔑 API Token: ${API_TOKEN.substring(0, 10)}...`);
  console.log('');
  
  try {
    // Download translations
    const downloadSuccess = await downloadTranslations();
    if (!downloadSuccess) {
      console.error('❌ Failed to download translations');
      process.exit(1);
    }
    
    // Update i18n.ts
    const updateSuccess = updateI18nFile();
    if (!updateSuccess) {
      console.error('❌ Failed to update i18n.ts');
      process.exit(1);
    }
    
    // Clean up
    cleanup();
    
    console.log('\n🎉 Successfully pulled translations from Lokalise!');
    console.log('📝 Your i18n.ts file has been updated with the latest translations.');
    
  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
    process.exit(1);
  }
}

// Run the main function
main();
