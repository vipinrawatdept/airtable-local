# Airtable Local Development Environment

A production-ready local development environment for writing Airtable Scripts with TypeScript. Write code locally, test with Jest (mocks or real API), and bundle into a single JavaScript file for Airtable.

## Features

- 🔷 **TypeScript** - Full type safety and IntelliSense
- 🧪 **Jest Testing** - Test with mocks or real Airtable API
- 📦 **esbuild** - Fast bundling to single file for Airtable
- 💉 **Dependency Injection** - Easy testing and environment switching
- 🔌 **Adapter Pattern** - Swap between Node.js console and Airtable output
- 🔗 **Airtable SDK** - Run scripts locally against real Airtable bases

## Prerequisites

- Node.js 18+ (recommended: 20+)
- npm or yarn
- An Airtable account with API access

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Run tests (with mocks - no API key needed)
npm test

# 3. Build for Airtable
npm run build
# Output: dist/script.js - paste into Airtable Scripting block
```

## Running Locally Against Real Airtable

You can run your scripts locally against a real Airtable base using the official [Airtable SDK](https://github.com/Airtable/airtable.js).

### Step 1: Get Your API Credentials

1. **Personal Access Token (API Key)**:
   - Go to [airtable.com/create/tokens](https://airtable.com/create/tokens)
   - Click **"Create new token"**
   - Name it (e.g., "Local Dev")
   - Add scopes: `data.records:read`, `data.records:write`, `schema.bases:read`
   - Under "Access", add your base
   - Click **"Create token"**
   - ⚠️ **Copy the ENTIRE token** (starts with `pat`, ~60-80 characters long)

2. **Base ID**:
   - Go to [airtable.com/api](https://airtable.com/api)
   - Select your base
   - Find the Base ID in the URL: `https://airtable.com/appXXXXXXXXXX/api/docs`
   - Copy the part starting with `app`

### Step 2: Configure Environment

```bash
# Create your .env file from the template
cp .env.example .env
```

Edit `.env` with your credentials:

```env
# Your full Personal Access Token (60-80 characters, starts with 'pat')
AIRTABLE_API_KEY=patXXXXXXXXXXXXXX.XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX

# Your Base ID (starts with 'app')
AIRTABLE_BASE_ID=appXXXXXXXXXXXXXX

# Comma-separated list of your actual table names
AIRTABLE_TABLE_NAMES=Tasks,Projects,Users
```

> ⚠️ **Common Mistake**: Make sure you copy the **entire** API token. If it's only ~17 characters, you only copied part of it!

### Step 3: Run Your Script

```bash
npm run local
```

Expected output:
```
[Local Runner] 🔧 Starting local execution with Airtable SDK...
[Local Runner] 📋 Pre-loaded tables: Tasks, Projects, Users
[Local Runner] 🚀 Script started
[Local Runner] 📊 Found 3 table(s) in this base
[Local Runner]   - Tasks (Tasks)
...
[Local Runner] ✨ Script completed successfully!
🎉 Local execution completed!
```

## Project Structure

```
├── src/
│   ├── interfaces.ts       # TypeScript interfaces for Airtable objects
│   ├── loggers.ts          # NodeLogger & AirtableLogger (Adapter Pattern)
│   ├── mainLogic.ts        # Your script logic (Dependency Injection)
│   ├── airtableAdapter.ts  # Adapter for official Airtable SDK
│   ├── local.ts            # Local runner using real Airtable
│   └── index.ts            # Entry point for Airtable bundle
├── test/
│   ├── mocks.ts            # MockBase, MockTable, MockRecord
│   └── script.test.ts      # Jest tests
├── dist/
│   └── script.js           # Bundled output for Airtable
├── .env.example            # Template for environment variables
├── .env                    # Your API credentials (git-ignored)
└── .gitignore              # Excludes node_modules, dist, .env
```

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm test` | Run Jest tests with mocks |
| `npm run test:watch` | Run tests in watch mode |
| `npm run build` | Bundle to `dist/script.js` |
| `npm run watch` | Bundle in watch mode |
| `npm run local` | Run against real Airtable base |
| `npm run local:watch` | Run with auto-reload on changes |

## Writing Your Script

Edit `src/mainLogic.ts` with your script logic:

```typescript
import { IAirtableBase, ILogger } from './interfaces';

export async function runScript(
  base: IAirtableBase,
  logger: ILogger
): Promise<void> {
  // Your logic here
  const table = base.getTable('Tasks');
  const { records } = await table.selectRecordsAsync();
  
  for (const record of records) {
    const name = record.getCellValue('Name');
    logger.log(`Processing: ${name}`);
    
    await table.updateRecordAsync(record.id, {
      'Status': 'Processed'
    });
  }
}
```

## Testing

```typescript
// test/script.test.ts
import { runScript } from '../src/mainLogic';
import { MockBase, MockTable, MockRecord, MockLogger } from './mocks';

describe('runScript', () => {
  it('should process records', async () => {
    const records = [
      new MockRecord('rec001', { Name: 'Task 1', Status: 'Pending' }),
    ];
    const table = new MockTable('tbl001', 'Tasks', records);
    const base = new MockBase([table]);
    const logger = new MockLogger();

    await runScript(base, logger);

    expect(logger.hasLog('Processing')).toBe(true);
  });
});
```

## Deployment to Airtable

1. Run `npm run build`
2. Open `dist/script.js`
3. Copy entire contents
4. Paste into Airtable → Extensions → Scripting block
5. Click Run

## Three Ways to Run

| Method | Command | Use Case |
|--------|---------|----------|
| **Mocks** | `npm test` | Unit testing, CI/CD |
| **Real API** | `npm run local` | Integration testing, debugging |
| **Airtable** | Paste `dist/script.js` | Production |

## Troubleshooting

### "AUTHENTICATION_REQUIRED" Error

- **Cause**: Invalid or incomplete API token
- **Fix**: Ensure you copied the **entire** token from Airtable (should be 60-80 characters starting with `pat`)

### "Table not found" Error

- **Cause**: Table name in `AIRTABLE_TABLE_NAMES` doesn't match actual table name
- **Fix**: Check your Airtable base for exact table names (case-sensitive)

### Module Resolution Errors

- **Cause**: TypeScript/Node.js module conflict
- **Fix**: The `tsconfig.json` includes `ts-node` settings to handle this automatically

## API Reference

### Interfaces

- `IAirtableBase` - Base with tables
- `IAirtableTable` - Table with CRUD operations
- `IAirtableRecord` - Record with cell access
- `ILogger` - Logging abstraction

### Mock Classes

- `MockBase` - Simulates Airtable base
- `MockTable` - Simulates table with full CRUD
- `MockRecord` - Simulates record with fields
- `MockLogger` - Captures logs for assertions

## License

ISC
