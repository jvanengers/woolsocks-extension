#!/usr/bin/env node

/**
 * Extract translations from i18n.ts for Lokalise sync
 * This script is used in GitHub Actions to prepare translations for pushing to Lokalise
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read the i18n.ts file
const i18nPath = path.join(__dirname, '..', 'src', 'shared', 'i18n.ts');
const i18nContent = fs.readFileSync(i18nPath, 'utf8');

// Supported languages
const languages = ['en', 'nl', 'de', 'fr', 'it', 'es'];

// Create translations directory
const outputDir = path.join(__dirname, '..', 'translations');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Function to extract language block
function extractLanguageBlock(lang) {
  const langStart = i18nContent.indexOf(`${lang}: {`);
  if (langStart === -1) {
    return null;
  }
  
  let braceCount = 0;
  let inString = false;
  let escapeNext = false;
  let i = langStart + `${lang}: {`.length;
  
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
          return i18nContent.substring(langStart + `${lang}: {`.length, i);
        }
        braceCount--;
      }
    }
    
    i++;
  }
  
  return null;
}

// Function to parse TypeScript object to JSON
function parseTsObject(tsContent, lang) {
  try {
    // Remove comments
    let content = tsContent
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\/\/.*$/gm, '');
    
    const lines = content.split('\n');
    const result = {};
    const stack = [result];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      if (!line || line === ',' || line === '}') {
        continue;
      }
      
      // Handle object opening
      if (line.endsWith('{')) {
        const key = line.replace(/[:\s{]+$/, '').replace(/^["']|["']$/g, '');
        const newObj = {};
        stack[stack.length - 1][key] = newObj;
        stack.push(newObj);
        continue;
      }
      
      // Handle object closing
      if (line === '},' || line === '}') {
        stack.pop();
        continue;
      }
      
      // Handle key-value pairs
      const colonIndex = line.indexOf(':');
      if (colonIndex > 0) {
        const key = line.substring(0, colonIndex).trim().replace(/^["']|["']$/g, '');
        let value = line.substring(colonIndex + 1).trim();
        
        // Remove trailing comma
        value = value.replace(/,$/, '');
        
        // Handle string values
        if ((value.startsWith("'") && value.endsWith("'")) || 
            (value.startsWith('"') && value.endsWith('"'))) {
          const stringContent = value.slice(1, -1);
          const escapedContent = stringContent
            .replace(/\\/g, '\\\\')
            .replace(/"/g, '\\"')
            .replace(/\n/g, '\\n')
            .replace(/\r/g, '\\r')
            .replace(/\t/g, '\\t');
          
          stack[stack.length - 1][key] = escapedContent;
        }
        // Handle boolean values
        else if (value === 'true' || value === 'false') {
          stack[stack.length - 1][key] = value === 'true';
        }
        // Handle number values
        else if (!isNaN(value)) {
          stack[stack.length - 1][key] = parseFloat(value);
        }
      }
    }
    
    return result;
  } catch (error) {
    console.error(`Error parsing ${lang} translations:`, error.message);
    return null;
  }
}

// Extract and save translations for each language
console.log('Extracting translations for Lokalise sync...');

languages.forEach(lang => {
  console.log(`Processing ${lang}...`);
  
  const langBlock = extractLanguageBlock(lang);
  if (!langBlock) {
    console.warn(`No translations found for language: ${lang}`);
    return;
  }
  
  const jsonData = parseTsObject(langBlock, lang);
  if (!jsonData) {
    console.warn(`Failed to convert ${lang} translations to JSON`);
    return;
  }
  
  // Save to file
  const outputPath = path.join(outputDir, `${lang}.json`);
  fs.writeFileSync(outputPath, JSON.stringify(jsonData, null, 2), 'utf8');
  console.log(`✓ Saved ${lang} translations to ${outputPath}`);
});

console.log('✓ Translation extraction complete for Lokalise sync');
