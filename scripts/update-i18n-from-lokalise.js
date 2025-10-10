#!/usr/bin/env node

/**
 * Update i18n.ts with translations from Lokalise
 * This script is used in GitHub Actions to update the TypeScript file with new translations
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Supported languages
const languages = ['en', 'nl', 'de', 'fr', 'it', 'es'];

// Read translations from Lokalise
const translationsDir = path.join(__dirname, '..', 'translations');
const translations = {};

languages.forEach(lang => {
  const filePath = path.join(translationsDir, `${lang}.json`);
  if (fs.existsSync(filePath)) {
    try {
      translations[lang] = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      console.log(`✓ Loaded ${lang} translations from Lokalise`);
    } catch (error) {
      console.warn(`Warning: Could not load ${lang} translations:`, error.message);
    }
  }
});

if (Object.keys(translations).length === 0) {
  console.error('No translations found from Lokalise');
  process.exit(1);
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

// Read the current i18n.ts file
const i18nPath = path.join(__dirname, '..', 'src', 'shared', 'i18n.ts');
let i18nContent = fs.readFileSync(i18nPath, 'utf8');

// Find the translations object and replace it
const translationsStart = i18nContent.indexOf('const translations: Record<Language, Translations> = {');
if (translationsStart === -1) {
  console.error('Could not find translations object in i18n.ts');
  process.exit(1);
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
  console.error('Could not find end of translations object');
  process.exit(1);
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

console.log('✓ Updated i18n.ts with translations from Lokalise');
console.log(`✓ Updated ${Object.keys(translations).length} languages`);
