# Airtable Local Development Environment

A production-ready local development environment for writing Airtable Scripts with TypeScript. Write code locally, test with Jest (mocks or real API), and bundle into a single JavaScript file for Airtable.

## Features

- 🔷 **TypeScript** - Full type safety and IntelliSense
- 🧪 **Jest Testing** - Test with mocks or real Airtable API
- 📦 **esbuild** - Fast bundling to single file for Airtable
- 💉 **Dependency Injection** - Easy testing and environment switching
- 🔌 **Adapter Pattern** - Swap between Node.js console and Airtable output

## Quick Start

```bash
# Install dependencies
npm install

# Run tests (with mocks)
npm test

# Build for Airtable
npm run build
# Output: dist/script.js - paste into Airtable Scripting block

# Run locally against real Airtable (see setup below)
npm run local
```

## Running Against Real Airtable

You can run your scripts locally against a real Airtable base using the official Airtable SDK.

### Setup

1. **Get your API credentials:**
   - Create a Personal Access Token at [airtable.com/create/tokens](https://airtable.com/create/tokens)
   - Get your Base ID from [airtable.com/api](https://airtable.com/api) (select a base, ID is in the URL like `appXXXXXXXXXX`)

2. **Create `.env` file:**
   ```bash
   cp .env.example .env
   ```

3. **Fill in your credentials in `.env`:**
   ```env
   AIRTABLE_API_KEY=pat_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   AIRTABLE_BASE_ID=appXXXXXXXXXXXXXX
   AIRTABLE_TABLE_NAMES=Tasks,Projects,Users
   ```

4. **Run your script:**
   ```bash
   npm run local
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
└── .env                    # Your API credentials (git-ignored)
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
