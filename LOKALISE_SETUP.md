# Lokalise 2-Way Sync Setup Guide

This guide will help you set up fully automated 2-way synchronization between your GitHub repository and Lokalise for the Woolsocks extension translations.

## Prerequisites

1. **Lokalise Account**: You need a Lokalise account with API access
2. **GitHub Repository**: Your code should be in a GitHub repository
3. **GitHub Actions**: Enabled for your repository

## Step 1: Create Lokalise Project

1. Go to [Lokalise](https://lokalise.com) and create a new project
2. Name it "Woolsocks Extension" or similar
3. Set English (en) as the base language
4. Add the following languages:
   - Dutch (nl)
   - German (de)
   - French (fr)
   - Italian (it)
   - Spanish (es)

## Step 2: Get Lokalise API Credentials

1. In your Lokalise project, go to **Settings** → **API tokens**
2. Create a new API token with the following permissions:
   - `read`
   - `write`
   - `upload`
   - `download`
3. Copy the API token and project ID

## Step 3: Configure GitHub Secrets

1. Go to your GitHub repository
2. Navigate to **Settings** → **Secrets and variables** → **Actions**
3. Add the following secrets:
   - `LOKALISE_API_TOKEN`: Your Lokalise API token
   - `LOKALISE_PROJECT_ID`: Your Lokalise project ID

## Step 4: Initial Translation Import

### Option A: Import from GitHub (Recommended)

1. Run the extraction script locally:
   ```bash
   node scripts/extract-translations-for-sync.js
   ```

2. In Lokalise, go to **Upload** → **Files**
3. Upload the generated JSON files from the `translations/` directory
4. Configure import settings:
   - Format: JSON (nested)
   - Language detection: Auto-detect from file structure
   - Key naming: Keep original
   - Skip empty translations: ✓

### Option B: Manual Import

1. In Lokalise, go to **Upload** → **Files**
2. Upload the `translations/all-languages.json` file
3. Configure import settings as above

## Step 5: Configure Lokalise GitHub Integration

1. In your Lokalise project, go to **Apps** → **GitHub**
2. Click **Install** and connect your GitHub account
3. Select your repository and branch (main)
4. Configure the integration:
   - **Auto-pull**: Enable to automatically import changes from GitHub
   - **Auto-push**: Enable to automatically export changes to GitHub
   - **File path**: `translations/*.json`
   - **Base language**: English (en)

## Step 6: Set Up Webhooks (Optional but Recommended)

1. In your GitHub repository, go to **Settings** → **Webhooks**
2. Click **Add webhook**
3. Configure:
   - **Payload URL**: Copy from Lokalise GitHub integration settings
   - **Content type**: `application/json`
   - **Secret**: Copy from Lokalise GitHub integration settings
   - **Events**: Select "Push events"
   - **Active**: ✓

## Step 7: Test the Setup

### Test GitHub → Lokalise Sync

1. Make a small change to `src/shared/i18n.ts`
2. Commit and push to the main branch
3. Check that the GitHub Action runs successfully
4. Verify in Lokalise that the changes appear

### Test Lokalise → GitHub Sync

1. Make a small translation change in Lokalise
2. Wait for the scheduled sync (daily at 2 AM UTC) or trigger manually
3. Check that a pull request is created with the changes
4. Review and merge the pull request

## Workflow Overview

### GitHub → Lokalise (Push)
- **Trigger**: Push to main branch with changes to `src/shared/i18n.ts`
- **Process**: 
  1. Extract translations from TypeScript to JSON
  2. Upload JSON files to Lokalise
  3. Update existing translations in Lokalise

### Lokalise → GitHub (Pull)
- **Trigger**: Daily schedule (2 AM UTC) or manual trigger
- **Process**:
  1. Download updated translations from Lokalise
  2. Update `src/shared/i18n.ts` with new translations
  3. Create pull request with changes
  4. Review and merge manually

## File Structure

```
woolsocks-extension/
├── .github/
│   └── workflows/
│       └── lokalise-sync.yml          # GitHub Actions workflow
├── scripts/
│   ├── extract-translations-for-sync.js    # Extract TS → JSON
│   └── update-i18n-from-lokalise.js        # Update JSON → TS
├── translations/                      # Generated JSON files
│   ├── en.json
│   ├── nl.json
│   ├── de.json
│   ├── fr.json
│   ├── it.json
│   └── es.json
├── src/shared/
│   └── i18n.ts                       # Main translation file
└── lokalise.yml                      # Lokalise configuration
```

## Troubleshooting

### Common Issues

1. **API Token Permissions**
   - Ensure your API token has all required permissions
   - Regenerate token if needed

2. **GitHub Actions Failures**
   - Check the Actions tab for error details
   - Verify secrets are correctly set
   - Check file paths in the workflow

3. **Translation Format Issues**
   - Ensure JSON files are valid
   - Check for special characters that need escaping
   - Verify nested object structure

4. **Sync Conflicts**
   - If conflicts occur, resolve manually in Lokalise
   - Use the "Replace modified" option in import settings

### Manual Sync Commands

If you need to manually sync translations:

```bash
# Extract current translations
node scripts/extract-translations-for-sync.js

# Update i18n.ts from Lokalise files
node scripts/update-i18n-from-lokalise.js
```

## Best Practices

1. **Translation Keys**: Use descriptive, hierarchical keys (e.g., `voucher.title`, `options.settings`)
2. **Variables**: Use consistent variable naming (e.g., `{merchant}`, `{rate}`, `{name}`)
3. **Review Process**: Always review pull requests from Lokalise before merging
4. **Testing**: Test the extension with updated translations before releasing
5. **Backup**: Keep backups of your translation files

## Support

- **Lokalise Documentation**: https://docs.lokalise.com/
- **GitHub Actions**: https://docs.github.com/en/actions
- **Lokalise GitHub Integration**: https://docs.lokalise.com/en/articles/1400830-github-integration

## Next Steps

After setup is complete:

1. **Initial Import**: Import your current translations to Lokalise
2. **Team Setup**: Add translators to your Lokalise project
3. **Workflow Testing**: Test both push and pull workflows
4. **Documentation**: Document the process for your team
5. **Monitoring**: Set up monitoring for sync failures
