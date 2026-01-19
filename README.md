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

| Command                 | Description                     |
| ----------------------- | ------------------------------- |
| `npm test`              | Run unit tests with mocks       |
| `npm run test:watch`    | Run tests in watch mode         |
| `npm run test:coverage` | Run tests with coverage report  |
| `npm run local`         | Run against real Airtable API   |
| `npm run local:csv`     | Run against local CSV files     |
| `npm run download`      | Download Airtable tables as CSV |
| `npm run build`         | Bundle for Airtable deployment  |
| `npm run watch`         | Bundle with auto-rebuild        |
| `npm run lint`          | Run ESLint                      |
| `npm run lint:fix`      | Run ESLint with auto-fix        |
| `npm run format`        | Format code with Prettier       |
| `npm run format:check`  | Check code formatting           |

## Project Structure

```
src/
├── config/
│   └── index.ts         # Centralized configuration
├── core/
│   ├── main-logic.ts    # Your script logic goes here
│   ├── entry.ts         # Airtable bundle entry point
│   └── local.ts         # Local execution entry point
├── adapters/
│   ├── airtable-adapter.ts  # Real Airtable SDK wrapper
│   └── csv-adapter.ts       # CSV file adapter for testing
├── types/
│   ├── interfaces.ts    # TypeScript interfaces
│   └── errors.ts        # Custom error classes
└── utils/
    ├── loggers.ts       # NodeLogger, AirtableLogger
    ├── loggers-enhanced.ts  # EnhancedNodeLogger with log levels
    ├── type-guards.ts   # Runtime type checking utilities
    └── scripts.ts       # Utility functions

test/
├── __mocks__/           # Mock implementations
└── *.test.ts            # Test files

data/                    # CSV files for local testing
dist/                    # Built output (git-ignored)
.github/workflows/       # CI/CD workflows
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

# Logging
LOG_LEVEL=info    # debug, info, warn, error
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

Download your Airtable tables as CSV files:

```bash
npm run download
```

This creates CSV files in `data/` directory (one file per table). Then run:

```bash
npm run local:csv
```

CSV files use the table name as filename. Format:

```csv
id,Name,Status,Priority
rec001,Task 1,Pending,High
rec002,Task 2,Completed,Medium
```

## Available Scripts

The project includes several ready-to-use scripts for common operations:

### Archive Old Records

```typescript
import { archiveOldRecords } from "./core/main-logic";

await archiveOldRecords(base, "Tasks", "Created", 90, logger);
```

### Find Duplicates

```typescript
import { findDuplicatesByField } from "./core/main-logic";

const { duplicates, count } = await findDuplicatesByField(base, "Users", "Email", logger);
```

### Copy Records Between Tables

```typescript
import { copyRecordsBetweenTables } from "./core/main-logic";

await copyRecordsBetweenTables(
  base,
  "Tasks",
  "Archive",
  { Name: "TaskName", Status: "Status" },
  (record) => record.getCellValue("Completed") === true,
  logger
);
```

### Bulk Update by Condition

```typescript
import { bulkUpdateByCondition } from "./core/main-logic";

await bulkUpdateByCondition(
  base,
  "Tasks",
  [
    { field: "Priority", value: "High", updates: { Urgent: true } },
    { field: "Status", value: "Overdue", updates: { "Needs Review": true } },
  ],
  logger
);
```

### Generate Statistics

```typescript
import { generateTableStatistics } from "./core/main-logic";

const stats = await generateTableStatistics(base, "Projects", "Status", logger);
```

### Cleanup Empty Records

```typescript
import { cleanupEmptyRecords } from "./core/main-logic";

await cleanupEmptyRecords(base, "Contacts", ["Name", "Email"], logger);
```

## Utility Functions

```typescript
import { findDuplicates, generateTableReport, searchAllTables } from "./utils";

// Find duplicates by field
await findDuplicates(base, "Tasks", "Email", logger);

// Generate table report
await generateTableReport(base, "Tasks", ["Name", "Status"], logger);

// Search across all tables
await searchAllTables(base, "searchTerm", logger);
```

## Writing Tests

```typescript
import { MockBase, MockTable, MockRecord, MockLogger } from "./__mocks__";

it("should process records", async () => {
  const records = [new MockRecord("rec001", { Name: "Task", Status: "Pending" })];
  const table = new MockTable("tbl001", "Tasks", records);
  const base = new MockBase([table]);
  const logger = new MockLogger();

  await runScript(base, logger);

  expect(logger.hasLog("Script completed")).toBe(true);
});
```

## Error Handling

The project includes custom error classes for better debugging:

```typescript
import {
  RecordNotFoundError,
  TableNotFoundError,
  ValidationError,
  ApiError,
  ConfigurationError,
} from "./types/errors";

try {
  await table.updateRecordAsync(recordId, fields);
} catch (error) {
  if (error instanceof RecordNotFoundError) {
    logger.warn(`Record ${error.recordId} not found in ${error.tableName}`);
  } else if (error instanceof ApiError) {
    logger.error(`API error (${error.statusCode}): ${error.message}`);
  }
}
```

## Type Guards & Validation

Runtime type checking utilities:

```typescript
import { isRecord, isValidRecordId, validateFieldSet, assertDefined } from "./utils/type-guards";

if (isValidRecordId(id)) {
  // id is guaranteed to match /^rec[a-zA-Z0-9]+$/
}

validateFieldSet(fields); // throws ValidationError if invalid
assertDefined(value, "Value is required"); // throws if null/undefined
```

## Configurable Scripts

The `updateRecordsScript` function accepts a configuration object:

```typescript
import { updateRecordsScript, UpdateRecordsConfig } from "./core/main-logic";

const config: UpdateRecordsConfig = {
  sourceField: "url",
  targetField: "processed_result",
  targetValue: "completed",
  skipCondition: (value) => !value, // skip if source field is empty
};

await updateRecordsScript(base, "MyTable", logger, config);
```

## Troubleshooting

| Error                            | Solution                                                       |
| -------------------------------- | -------------------------------------------------------------- |
| `AUTHENTICATION_REQUIRED`        | Check API token is complete (~60-80 chars starting with `pat`) |
| `Table not found`                | Verify exact table name (case-sensitive)                       |
| `Could not auto-discover tables` | Add `schema.bases:read` scope to token                         |
| `Rate limit exceeded`            | Batch operations include automatic 200ms delays                |

## CI/CD

GitHub Actions workflow runs on push/PR to main:

- Tests on Node.js 18.x and 20.x
- Linting and format checking
- Build verification
