#!/usr/bin/env node

/**
 * Push translations to Lokalise
 * Extracts translations from i18n.ts and uploads them to Lokalise via API
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

// Read the i18n.ts file
const i18nPath = path.join(__dirname, '..', 'src', 'shared', 'i18n.ts');
const i18nContent = fs.readFileSync(i18nPath, 'utf8');

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

// Function to upload file to Lokalise
async function uploadToLokalise(lang, filePath) {
  try {
    console.log(`📤 Uploading ${lang} translations...`);
    
    // Read and base64 encode the file
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const base64Content = Buffer.from(fileContent).toString('base64');
    
    // Create the payload
    const payload = {
      data: base64Content,
      filename: `${lang}.json`,
      lang_iso: lang,
      replace_modified: true,
      convert_placeholders: true
    };
    
    // Make the API call
    const response = await fetch(`${API_BASE_URL}/projects/${PROJECT_ID}/files/upload`, {
      method: 'POST',
      headers: {
        'X-Api-Token': API_TOKEN,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    
    const responseData = await response.json();
    
    if (response.ok) {
      console.log(`✅ Successfully uploaded ${lang} translations`);
      console.log(`   Process ID: ${responseData.process?.process_id}`);
      return true;
    } else {
      console.error(`❌ Failed to upload ${lang} translations`);
      console.error(`   Status: ${response.status}`);
      console.error(`   Response:`, responseData);
      return false;
    }
  } catch (error) {
    console.error(`❌ Error uploading ${lang} translations:`, error.message);
    return false;
  }
}

// Main execution
console.log('🚀 Starting push to Lokalise...');
console.log(`📁 Project ID: ${PROJECT_ID}`);
console.log(`🔑 API Token: ${API_TOKEN.substring(0, 10)}...`);
console.log('');

let successCount = 0;
let totalCount = 0;

// Extract and upload translations for each language
for (const lang of languages) {
  console.log(`\n📝 Processing ${lang}...`);
  
  // Extract language block
  const langBlock = extractLanguageBlock(lang);
  if (!langBlock) {
    console.warn(`⚠️  No translations found for language: ${lang}`);
    continue;
  }
  
  // Parse to JSON
  const jsonData = parseTsObject(langBlock, lang);
  if (!jsonData) {
    console.warn(`⚠️  Failed to convert ${lang} translations to JSON`);
    continue;
  }
  
  // Save to temporary file
  const outputPath = path.join(outputDir, `${lang}.json`);
  fs.writeFileSync(outputPath, JSON.stringify(jsonData, null, 2), 'utf8');
  console.log(`💾 Saved ${lang} translations to ${outputPath}`);
  
  // Upload to Lokalise
  totalCount++;
  const success = await uploadToLokalise(lang, outputPath);
  if (success) {
    successCount++;
  }
}

// Clean up temporary files
console.log('\n🧹 Cleaning up temporary files...');
for (const lang of languages) {
  const filePath = path.join(outputDir, `${lang}.json`);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
}

// Summary
console.log('\n📊 Summary:');
console.log(`✅ Successfully uploaded: ${successCount}/${totalCount} languages`);
if (successCount === totalCount) {
  console.log('🎉 All translations pushed to Lokalise successfully!');
  process.exit(0);
} else {
  console.log('⚠️  Some uploads failed. Check the logs above.');
  process.exit(1);
}
