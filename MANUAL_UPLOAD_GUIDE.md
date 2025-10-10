# Manual Upload Guide for Lokalise

This guide helps you upload your current translations to Lokalise for the first time, before setting up automated sync.

## Quick Start

1. **Extract translations:**
   ```bash
   npm run extract-translations
   ```

2. **Get upload instructions:**
   ```bash
   npm run manual-upload
   ```

3. **Follow the instructions** to upload via Lokalise web UI

## Step-by-Step Process

### Step 1: Extract Your Translations

Run the extraction script to convert your TypeScript translations to JSON format:

```bash
npm run extract-translations
```

This creates JSON files in the `translations/` directory:
- `en.json` - English (base language)
- `nl.json` - Dutch
- `de.json` - German
- `fr.json` - French
- `it.json` - Italian
- `es.json` - Spanish

### Step 2: Get Upload Instructions

Run the manual upload helper:

```bash
npm run manual-upload
```

This will show you:
- Which translation files are available
- Exact upload instructions for each file
- Recommended settings for Lokalise

### Step 3: Upload to Lokalise

1. **Go to your Lokalise project:**
   - URL: https://app.lokalise.com/project/6845218768e96a14d01c05.51631454
   - Or navigate to your project in the Lokalise dashboard

2. **Click "Upload" button**

3. **Upload each language file** with these settings:
   - **Format:** JSON (nested)
   - **Replace modified translations:** ✓
   - **Detect language automatically:** ✓
   - **Convert to universal placeholders:** ✓
   - **Replace \n with line break:** ✓
   - **Detect ICU plurals:** ✓

4. **Upload order (recommended):**
   - Start with `en.json` (English - base language)
   - Then upload other languages: `nl.json`, `de.json`, `fr.json`, `it.json`, `es.json`

### Step 4: Verify Upload

After uploading all files:

1. **Check in Lokalise:**
   - Verify all languages appear in your project
   - Check that translation keys are organized correctly
   - Ensure no translations are missing

2. **Test automated sync:**
   - Make a small change to `src/shared/i18n.ts`
   - Commit and push to GitHub
   - Check that the change appears in Lokalise

## Translation Structure

Your translations are organized in these categories:

- **voucher** - Voucher panel translations
- **options** - Settings/options panel translations  
- **onboarding** - Onboarding flow translations
- **ocPanel** - Online cashback panel translations
- **debug** - Debug/development translations
- **notifications** - Notification messages
- **icons** - Icon tooltip text
- **popup** - Popup interface text

## Troubleshooting

### Missing Translation Files

If some language files are missing:
- The extension will fall back to English for missing translations
- You can upload them later when available
- The automated sync will handle them when they exist

### Upload Errors

If you get upload errors:
- Check that the file format is set to "JSON (nested)"
- Ensure the language is detected correctly
- Try uploading one file at a time
- Check your Lokalise project permissions

### File Format Issues

If translations don't appear correctly:
- Make sure "Convert to universal placeholders" is enabled
- Check that "Replace \n with line break" is enabled
- Verify the JSON structure is valid

## Next Steps

After successful manual upload:

1. **Test the automated workflow** by making a small change
2. **Set up your team** in Lokalise for translation management
3. **Configure translation workflows** in Lokalise if needed
4. **Monitor the automated sync** to ensure it's working correctly

## Support

- **Lokalise Documentation:** https://docs.lokalise.com/
- **Upload Guide:** https://docs.lokalise.com/en/articles/1400492-uploading-translation-files
- **Project Settings:** https://app.lokalise.com/project/6845218768e96a14d01c05.51631454/settings
