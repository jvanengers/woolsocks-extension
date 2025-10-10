#!/usr/bin/env node

/**
 * Manual upload script for Lokalise
 * This script helps you upload your current translations to Lokalise for the first time
 * 
 * Usage:
 * 1. Run: npm run extract-translations
 * 2. Run: node scripts/manual-upload-to-lokalise.js
 * 3. Follow the instructions to upload via Lokalise web UI
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Your Lokalise project details
const LOKALISE_PROJECT_ID = '6845218768e96a14d01c05.51631454';
const LOKALISE_PROJECT_URL = `https://app.lokalise.com/project/${LOKALISE_PROJECT_ID}`;

// Supported languages
const languages = ['en', 'nl', 'de', 'fr', 'it', 'es'];

console.log('🌐 Lokalise Manual Upload Helper');
console.log('================================\n');

// Check if translations directory exists
const translationsDir = path.join(__dirname, '..', 'translations');
if (!fs.existsSync(translationsDir)) {
  console.log('❌ Translations directory not found!');
  console.log('Please run: npm run extract-translations');
  process.exit(1);
}

// Check which translation files exist
const existingFiles = [];
const missingFiles = [];

languages.forEach(lang => {
  const filePath = path.join(translationsDir, `${lang}.json`);
  if (fs.existsSync(filePath)) {
    const stats = fs.statSync(filePath);
    existingFiles.push({
      lang,
      path: filePath,
      size: stats.size,
      modified: stats.mtime
    });
  } else {
    missingFiles.push(lang);
  }
});

console.log('📁 Translation Files Status:');
console.log('----------------------------');

if (existingFiles.length > 0) {
  console.log('✅ Available files:');
  existingFiles.forEach(file => {
    console.log(`   ${file.lang}.json (${file.size} bytes, modified: ${file.modified.toLocaleString()})`);
  });
}

if (missingFiles.length > 0) {
  console.log('❌ Missing files:');
  missingFiles.forEach(lang => {
    console.log(`   ${lang}.json`);
  });
}

console.log('\n📋 Manual Upload Instructions:');
console.log('==============================');
console.log(`1. Go to your Lokalise project: ${LOKALISE_PROJECT_URL}`);
console.log('2. Click "Upload" button');
console.log('3. Upload the following files one by one:');

existingFiles.forEach(file => {
  console.log(`\n   📄 ${file.lang.toUpperCase()} (${file.lang}.json):`);
  console.log(`      - File: ${file.path}`);
  console.log(`      - Language: ${getLanguageName(file.lang)}`);
  console.log(`      - Format: JSON (nested)`);
  console.log(`      - Settings:`);
  console.log(`        ✓ Replace modified translations`);
  console.log(`        ✓ Detect language automatically`);
  console.log(`        ✓ Convert to universal placeholders`);
});

console.log('\n🔧 Upload Settings for Each File:');
console.log('---------------------------------');
console.log('• Format: JSON (nested)');
console.log('• Replace modified translations: ✓');
console.log('• Detect language automatically: ✓');
console.log('• Convert to universal placeholders: ✓');
console.log('• Replace \\n with line break: ✓');
console.log('• Detect ICU plurals: ✓');

console.log('\n📊 Project Structure:');
console.log('--------------------');
console.log('Your translations are organized in these categories:');
console.log('• voucher - Voucher panel translations');
console.log('• options - Settings/options panel translations');
console.log('• onboarding - Onboarding flow translations');
console.log('• ocPanel - Online cashback panel translations');
console.log('• debug - Debug/development translations');
console.log('• notifications - Notification messages');
console.log('• icons - Icon tooltip text');
console.log('• popup - Popup interface text');

console.log('\n🚀 After Upload:');
console.log('----------------');
console.log('1. Verify all translations appear correctly in Lokalise');
console.log('2. Test the automated sync by making a small change to src/shared/i18n.ts');
console.log('3. Push the change to GitHub to trigger the workflow');
console.log('4. Check that the change appears in Lokalise');

console.log('\n💡 Tips:');
console.log('--------');
console.log('• Start with English (en.json) as it\'s your base language');
console.log('• Upload files in order: en → nl → de → fr → it → es');
console.log('• If a language file is missing, the extension will fall back to English');
console.log('• You can always re-upload files if something goes wrong');

// Helper function to get language name
function getLanguageName(lang) {
  const names = {
    en: 'English',
    nl: 'Dutch',
    de: 'German',
    fr: 'French',
    it: 'Italian',
    es: 'Spanish'
  };
  return names[lang] || lang;
}

console.log('\n✨ Ready to upload! Good luck!');
