# Airtable Local Development

TypeScript development environment for Airtable Scripts with local testing and one-click deployment.

## Quick Start

```bash
npm install
npm test                    # Run tests with mocks
cp .env.example .env        # Configure API credentials
npm run local               # Test against real Airtable
npm run build               # Bundle for deployment
```

## Commands

| Command             | Description                        |
| ------------------- | ---------------------------------- |
| `npm test`          | Run unit tests with mocks          |
| `npm run test:watch`| Run tests in watch mode            |
| `npm run local`     | Run against real Airtable API      |
| `npm run local:csv` | Run against local CSV files        |
| `npm run build`     | Bundle for Airtable deployment     |
| `npm run watch`     | Bundle with auto-rebuild           |

## Project Structure

```
src/
├── core/
│   ├── main-logic.ts    # Your script logic goes here
│   ├── entry.ts         # Airtable bundle entry point
│   └── local.ts         # Local execution entry point
├── adapters/
│   ├── airtable-adapter.ts  # Real Airtable SDK wrapper
│   └── csv-adapter.ts       # CSV file adapter for testing
├── types/
│   └── interfaces.ts    # TypeScript interfaces
└── utils/
    ├── loggers.ts       # NodeLogger, AirtableLogger
    └── scripts.ts       # Utility functions

test/
├── __mocks__/           # Mock implementations
└── *.test.ts            # Test files

data/                    # CSV files for local testing
dist/                    # Built output (git-ignored)
```

## Configuration

Create `.env` from `.env.example`:

```env
AIRTABLE_API_KEY=patXXXXXXXX.XXXXXXXX
AIRTABLE_BASE_ID=appXXXXXXXXXXXXXX
AIRTABLE_TABLE_NAMES=Tasks,Projects    # Optional: auto-discovers if empty

# CSV Mode (optional)
USE_CSV_DATA=false
CSV_DATA_DIR=./data
CSV_AUTO_SAVE=false
```

### Getting Credentials

1. **API Token**: [airtable.com/create/tokens](https://airtable.com/create/tokens)
   - Scopes: `data.records:read`, `data.records:write`, `schema.bases:read`
2. **Base ID**: Found in your base URL (`https://airtable.com/appXXXXX/...`)

## Development Workflow

1. Write code in `src/core/main-logic.ts`
2. Run `npm test` to verify with mocks
3. Run `npm run local` to test against real data
4. Run `npm run build` to create bundle
5. Copy `dist/script.js` into Airtable Scripting block

## CSV Testing

For fast iteration without API calls:

```bash
npm run local:csv
```

Place CSV files in `data/` directory. Filename becomes table name:

```csv
id,Name,Status,Priority
rec001,Task 1,Pending,High
rec002,Task 2,Completed,Medium
```

## Utility Functions

```typescript
import { findDuplicates, generateTableReport, searchAllTables } from './utils';

// Find duplicates by field
await findDuplicates(base, 'Tasks', 'Email', logger);

// Generate table report
await generateTableReport(base, 'Tasks', ['Name', 'Status'], logger);

// Search across all tables
await searchAllTables(base, 'searchTerm', logger);
```

## Writing Tests

```typescript
import { MockBase, MockTable, MockRecord, MockLogger } from './__mocks__';

it('should process records', async () => {
  const records = [new MockRecord('rec001', { Name: 'Task', Status: 'Pending' })];
  const table = new MockTable('tbl001', 'Tasks', records);
  const base = new MockBase([table]);
  const logger = new MockLogger();

  await runScript(base, logger);

  expect(logger.hasLog('Script completed')).toBe(true);
});
```

## Troubleshooting

| Error | Solution |
| ----- | -------- |
| `AUTHENTICATION_REQUIRED` | Check API token is complete (~60-80 chars starting with `pat`) |
| `Table not found` | Verify exact table name (case-sensitive) |
| `Could not auto-discover tables` | Add `schema.bases:read` scope to token |
