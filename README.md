# Airtable Scripts - Local Development Environment

> A production-ready TypeScript development environment for writing, testing, and deploying Airtable Automation Scripts locally before deploying to Airtable.

---

## 📋 Executive Summary

This project provides a **local development workflow** for Airtable Scripts that enables:

1. **Local Development** - Write scripts in TypeScript with full IDE support (autocomplete, type checking)
2. **Local Testing** - Test scripts with mocks (no API calls) or against real Airtable data
3. **One-Click Deployment** - Bundle into a single JavaScript file ready to paste into Airtable

### Key Benefits

| Benefit                   | Description                                                       |
| ------------------------- | ----------------------------------------------------------------- |
| 🔷 **Type Safety**        | Catch errors at compile time, not runtime in Airtable             |
| 🧪 **Testable**           | Unit test with mocks, integration test with real API              |
| 🔄 **Version Control**    | Track changes with Git, enable code review                        |
| 👥 **Team Collaboration** | Share code, review PRs, maintain standards                        |
| 🚀 **Faster Development** | No need to paste code into Airtable repeatedly during development |

---

## 🏗️ Architecture Overview

### High-Level Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         DEVELOPMENT WORKFLOW                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   ┌──────────────┐     ┌──────────────┐     ┌──────────────┐               │
│   │   Write      │     │    Test      │     │   Deploy     │               │
│   │  TypeScript  │ ──▶ │   Locally    │ ──▶ │  to Airtable │               │
│   │    Code      │     │              │     │              │               │
│   └──────────────┘     └──────────────┘     └──────────────┘               │
│         │                    │                    │                         │
│         ▼                    ▼                    ▼                         │
│   src/core/main-logic.ts npm test (mocks)  dist/script.js                  │
│                       npm run local        (paste into Airtable)           │
│                       (real API)                                            │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Design Patterns Used

#### 1. Dependency Injection (DI)

The core script logic receives its dependencies as parameters rather than creating them internally:

```typescript
// The main function accepts dependencies as arguments
export async function runScript(
  base: IAirtableBase, // Injected: real Airtable or mock
  logger: ILogger // Injected: console or Airtable output
): Promise<void> {
  // Script logic here...
}
```

**Why?** This allows us to:

- Pass **mock objects** during testing (no API calls)
- Pass **real Airtable SDK** during local integration testing
- Pass **real Airtable globals** when running in Airtable

#### 2. Adapter Pattern

We create adapters that wrap different implementations behind a common interface:

```
┌─────────────────────────────────────────────────────────────────┐
│                        ILogger Interface                         │
├─────────────────────────────────────────────────────────────────┤
│  log(message)  │  inspect(data)  │  error(message)  │  warn()  │
└────────┬───────────────┬─────────────────┬──────────────────────┘
         │               │                 │
         ▼               ▼                 ▼
   ┌──────────┐   ┌─────────────┐   ┌──────────────┐
   │NodeLogger│   │AirtableLogger│   │ MockLogger   │
   │console.* │   │ output.*    │   │ (captures)   │
   └──────────┘   └─────────────┘   └──────────────┘
       │                │                  │
       ▼                ▼                  ▼
   Local Dev      Airtable Prod       Unit Tests
```

#### 3. Interface Segregation

We define TypeScript interfaces that match Airtable's API:

```typescript
interface IAirtableBase {
  tables: IAirtableTable[];
  getTable(name: string): IAirtableTable;
}

interface IAirtableTable {
  selectRecordsAsync(): Promise<IAirtableQueryResult>;
  updateRecordAsync(id: string, fields: object): Promise<void>;
  createRecordAsync(fields: object): Promise<string>;
  // ...
}

interface IAirtableRecord {
  id: string;
  getCellValue(field: string): unknown;
  // ...
}
```

---

## 📁 Project Structure

```
airtable-local/
│
├── src/                              # Source code
│   ├── index.ts                      # Main barrel export (re-exports all modules)
│   │
│   ├── core/                         # Core application logic
│   │   ├── index.ts                  # Core module exports
│   │   ├── main-logic.ts             # Main script logic (your code goes here)
│   │   ├── entry.ts                  # Entry point for Airtable bundle
│   │   └── local.ts                  # Entry point for local execution
│   │
│   ├── types/                        # TypeScript interfaces & types
│   │   ├── index.ts                  # Types module exports
│   │   └── interfaces.ts             # All interface definitions
│   │
│   ├── adapters/                     # External service adapters
│   │   ├── index.ts                  # Adapters module exports
│   │   └── airtable-adapter.ts       # Airtable SDK adapter for local testing
│   │
│   └── utils/                        # Utility functions & helpers
│       ├── index.ts                  # Utils module exports
│       ├── loggers.ts                # Logger implementations (Node/Airtable)
│       └── scripts.ts                # Utility scripts (analysis, batch ops)
│
├── test/                             # Test files
│   ├── __mocks__/                    # Mock implementations
│   │   ├── index.ts                  # Mocks module exports
│   │   └── mocks.ts                  # MockBase, MockTable, MockLogger, etc.
│   └── script.test.ts                # Jest unit tests
│
├── dist/                             # Build output (git-ignored)
│   └── script.js                     # Bundled file to paste into Airtable
│
├── .env                              # API credentials (git-ignored)
├── .env.example                      # Template for .env
├── package.json                      # Dependencies and scripts
├── tsconfig.json                     # TypeScript configuration
├── jest.config.js                    # Jest test configuration
└── .gitignore                        # Git ignore rules
```

### Module Organization

| Directory         | Purpose                                       |
| ----------------- | --------------------------------------------- |
| `src/core/`       | Main script logic and entry points            |
| `src/types/`      | TypeScript interfaces and type definitions    |
| `src/adapters/`   | Adapters for external services (Airtable SDK) |
| `src/utils/`      | Logger implementations and utility scripts    |
| `test/__mocks__/` | Mock implementations for unit testing         |

---

## 🔄 Three Execution Environments

The same script code runs in three different environments:

### Environment 1: Unit Tests (Mocks)

```
┌─────────────────────────────────────────────────────────┐
│                    npm test                              │
├─────────────────────────────────────────────────────────┤
│                                                          │
│   core/main-logic.ts ────▶ MockBase ────▶ MockTable     │
│        │                                │                │
│        │                                ▼                │
│        │                          MockRecord             │
│        │                          (in-memory data)       │
│        ▼                                                 │
│   MockLogger ────▶ Captures logs for assertions         │
│                                                          │
│   ✅ No API calls                                        │
│   ✅ Fast execution                                      │
│   ✅ Deterministic results                               │
│   ✅ CI/CD friendly                                      │
└─────────────────────────────────────────────────────────┘
```

**Command:** `npm test`

### Environment 2: Local Integration (Real API)

```
┌─────────────────────────────────────────────────────────┐
│                  npm run local                           │
├─────────────────────────────────────────────────────────┤
│                                                          │
│   core/main-logic.ts ────▶ AirtableBaseAdapter          │
│        │                    │                            │
│        │                    ▼                            │
│        │             Airtable SDK                        │
│        │                    │                            │
│        │                    ▼                            │
│        │             Real Airtable API                   │
│        ▼              (HTTPS calls)                      │
│   NodeLogger ────▶ console.log()                        │
│                                                          │
│   ✅ Tests against real data                             │
│   ✅ Validates API interactions                          │
│   ✅ Debug locally before deployment                     │
└─────────────────────────────────────────────────────────┘
```

**Command:** `npm run local`

### Environment 3: Airtable Production

```
┌─────────────────────────────────────────────────────────┐
│              Airtable Scripting Block                    │
├─────────────────────────────────────────────────────────┤
│                                                          │
│   dist/script.js ────▶ global `base` object             │
│        │                    │                            │
│        │                    ▼                            │
│        │             Airtable Runtime                    │
│        │                    │                            │
│        │                    ▼                            │
│        │             Direct table access                 │
│        ▼                                                 │
│   AirtableLogger ────▶ output.text()                    │
│                                                          │
│   ✅ Runs inside Airtable                                │
│   ✅ Full access to base                                 │
│   ✅ Production execution                                │
└─────────────────────────────────────────────────────────┘
```

**Deployment:** Copy `dist/script.js` → Paste into Airtable Scripting block

---

## 🧪 How Testing Works

### Mock Classes

We created mock implementations that simulate Airtable's behavior:

```typescript
// MockRecord - Simulates a record with field data
class MockRecord {
  id: string;
  private fields: Map<string, any>;

  getCellValue(field: string) {
    return this.fields.get(field);
  }
}

// MockTable - Simulates a table with CRUD operations
class MockTable {
  private records: MockRecord[];

  async selectRecordsAsync() {
    return { records: this.records };
  }

  async updateRecordAsync(id: string, fields: object) {
    // Updates record in memory
  }

  async createRecordAsync(fields: object) {
    // Creates record in memory, returns ID
  }
}

// MockBase - Simulates the Airtable base
class MockBase {
  tables: MockTable[];

  getTable(name: string): MockTable {
    return this.tables.find((t) => t.name === name);
  }
}
```

### Example Test

```typescript
describe("runScript", () => {
  it("should process pending records", async () => {
    // Arrange: Create mock data
    const records = [
      new MockRecord("rec001", { Name: "Task 1", Status: "Pending" }),
      new MockRecord("rec002", { Name: "Task 2", Status: "Completed" }),
    ];
    const table = new MockTable("tbl001", "Tasks", records);
    const base = new MockBase([table]);
    const logger = new MockLogger();

    // Act: Run the script
    await processTableRecords(base, "Tasks", logger);

    // Assert: Verify behavior
    expect(table._calls.updateRecordAsync).toHaveLength(1);
    expect(table._calls.updateRecordAsync[0].id).toBe("rec001");
    expect(logger.hasLog("Processed record")).toBe(true);
  });
});
```

### Test Results

```
 PASS  test/script.test.ts
  runScript
    ✓ should log script started message
    ✓ should list all tables in the base
    ✓ should fetch and display records
    ✓ should complete successfully
    ✓ should handle empty base gracefully
  processTableRecords
    ✓ should process pending records
    ✓ should update processed records status
    ✓ should skip non-pending records
    ...

Test Suites: 1 passed, 1 total
Tests:       33 passed, 33 total
```

---

## 🔗 Airtable SDK Integration

For local testing against real Airtable data, we use the official [Airtable SDK](https://github.com/Airtable/airtable.js).

### Adapter Implementation

The `AirtableBaseAdapter` wraps the SDK to match our interfaces:

```typescript
class AirtableBaseAdapter implements IAirtableBase {
  private airtableBase: Airtable.Base;

  constructor(apiKey: string, baseId: string) {
    Airtable.configure({ apiKey });
    this.airtableBase = Airtable.base(baseId);
  }

  getTable(name: string): IAirtableTable {
    return new AirtableTableAdapter(name, this.airtableBase);
  }
}

class AirtableTableAdapter implements IAirtableTable {
  async selectRecordsAsync() {
    const records = await this.table.select().all();
    return new AirtableQueryResultAdapter(records);
  }

  async updateRecordAsync(id: string, fields: object) {
    await this.table.update(id, fields);
  }
}
```

### Environment Configuration

Create a `.env` file (copy from `.env.example`):

```env
# .env file (git-ignored for security)
AIRTABLE_API_KEY=patXXXXXXXX.XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
AIRTABLE_BASE_ID=appXXXXXXXXXXXXXX
AIRTABLE_TABLE_NAMES=Tasks,Projects,Users
```

### Getting API Credentials

1. **Personal Access Token**:

   - Go to [airtable.com/create/tokens](https://airtable.com/create/tokens)
   - Create token with scopes: `data.records:read`, `data.records:write`
   - Copy the **entire** token (~60-80 characters)

2. **Base ID**:
   - Go to [airtable.com/api](https://airtable.com/api)
   - Select your base
   - Copy the ID from URL (starts with `app`)

---

## 📦 Build & Bundle Process

We use **esbuild** to bundle TypeScript into a single JavaScript file:

```
┌─────────────────────────────────────────────────────────────────┐
│                       npm run build                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   src/core/entry.ts ─────────────────────────────────────────▶  │
│       │                                                          │
│       ├── imports core/main-logic.ts                             │
│       ├── imports utils/loggers.ts                               │
│       ├── imports types/interfaces.ts                            │
│       └── imports utils/scripts.ts                               │
│                                                                  │
│                         esbuild                                  │
│                           │                                      │
│                           ▼                                      │
│                                                                  │
│   dist/script.js  ◀──────────────────────────────────────────── │
│   (single file, ~3KB, ready to paste)                           │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

The entry point (`src/index.ts`) detects the environment:

```typescript
// Detects if running inside Airtable
function isAirtableEnvironment(): boolean {
  return typeof globalThis.base !== "undefined";
}

// Auto-executes when pasted into Airtable
(async () => {
  if (isAirtableEnvironment()) {
    const base = globalThis.base; // Airtable's global
    const logger = new AirtableLogger(); // Uses output.text()
    await runScript(base, logger);
  }
})();
```

---

## 🛠️ Available Commands

| Command               | Description                   | Use Case            |
| --------------------- | ----------------------------- | ------------------- |
| `npm install`         | Install dependencies          | Initial setup       |
| `npm test`            | Run unit tests with mocks     | Development, CI/CD  |
| `npm run test:watch`  | Run tests in watch mode       | Active development  |
| `npm run local`       | Run against real Airtable API | Integration testing |
| `npm run local:csv`   | Run against local CSV files   | Fast local testing  |
| `npm run local:watch` | Run with auto-reload          | Active development  |
| `npm run build`       | Bundle for Airtable           | Deployment          |
| `npm run watch`       | Bundle in watch mode          | Active development  |

---

## 📂 Local CSV Testing

For faster iteration without API calls, you can test against local CSV files.

### Setup

1. Create CSV files in the `data/` directory (one file per table)
2. Run with CSV mode: `npm run local:csv`

### CSV Format

```csv
id,Name,Status,Priority,Created
rec001,Task 1,Pending,High,2026-01-10
rec002,Task 2,Completed,Medium,2026-01-11
```

- First row = field names
- `id` column is optional (auto-generated if missing)
- Filename (without `.csv`) = table name

### Environment Variables

| Variable        | Default  | Description                    |
| --------------- | -------- | ------------------------------ |
| `USE_CSV_DATA`  | `false`  | Set to `true` to use CSV mode  |
| `CSV_DATA_DIR`  | `./data` | Directory containing CSV files |
| `CSV_AUTO_SAVE` | `false`  | Save changes back to CSV files |

### Example Workflow

```bash
# Fast testing with CSV (no API calls)
npm run local:csv

# Integration testing with real Airtable
npm run local
```

---

## 🚀 Deployment Workflow

```
┌────────────────────────────────────────────────────────────────────────────┐
│                        DEPLOYMENT CHECKLIST                                 │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   1. ☐ Write/modify code in src/core/main-logic.ts                         │
│                                                                             │
│   2. ☐ Run unit tests                                                       │
│         $ npm test                                                          │
│         ✓ All 33 tests passed                                               │
│                                                                             │
│   3. ☐ Test locally against real Airtable (optional but recommended)       │
│         $ npm run local                                                     │
│         ✓ Script completed successfully                                     │
│                                                                             │
│   4. ☐ Build the bundle                                                     │
│         $ npm run build                                                     │
│         ✓ dist/script.js created                                           │
│                                                                             │
│   5. ☐ Deploy to Airtable                                                   │
│         • Open Airtable base                                                │
│         • Go to Extensions → Scripting                                      │
│         • Paste contents of dist/script.js                                  │
│         • Click Run                                                         │
│                                                                             │
│   6. ☐ Commit changes                                                       │
│         $ git add . && git commit -m "feat: description"                   │
│                                                                             │
└────────────────────────────────────────────────────────────────────────────┘
```

---

## 📊 Included Script Functions

### Analysis & Reporting

| Function                | Description                                                        |
| ----------------------- | ------------------------------------------------------------------ |
| `generateFieldAnalysis` | Groups records by field value, shows distribution with percentages |
| `calculateNumericStats` | Calculates sum, avg, min, max, median for numeric fields           |
| `generateTableReport`   | Creates formatted text report of table contents                    |

### Data Quality

| Function              | Description                                    |
| --------------------- | ---------------------------------------------- |
| `findDuplicates`      | Finds records with duplicate values in a field |
| `findOrphanedRecords` | Cross-references tables to find broken links   |

### Operations

| Function                  | Description                           |
| ------------------------- | ------------------------------------- |
| `batchUpdateWithProgress` | Batch updates with progress tracking  |
| `searchAllTables`         | Searches for a term across all tables |

---

## 🔒 Security Considerations

| Item              | Status         | Notes                                   |
| ----------------- | -------------- | --------------------------------------- |
| API Key Storage   | ✅ Secure      | Stored in `.env`, git-ignored           |
| `.env.example`    | ✅ Safe        | Contains placeholders only              |
| `dist/` folder    | ✅ Git-ignored | Build artifacts not committed           |
| Token Permissions | ⚠️ Configure   | Set minimum required scopes in Airtable |

---

## 📈 Benefits Summary

### For Developers

- **IDE Support**: Full TypeScript autocomplete and error checking
- **Fast Iteration**: Test locally without pasting into Airtable repeatedly
- **Debugging**: Use Node.js debugging tools
- **Refactoring**: Safely rename and restructure with type checking

### For Teams

- **Code Review**: Review Airtable scripts like any other code
- **Version Control**: Track changes, rollback if needed
- **Standards**: Enforce coding standards with linting
- **Documentation**: Self-documenting TypeScript interfaces

### For Operations

- **Testing**: Automated tests catch bugs before deployment
- **Reliability**: Test against real API before production
- **Maintainability**: Modular code easier to maintain
- **Onboarding**: Clear structure helps new team members

---

## 📚 Technology Stack

| Technology   | Purpose               | Version |
| ------------ | --------------------- | ------- |
| Node.js      | Runtime               | 18+     |
| TypeScript   | Language              | 5.x     |
| Jest         | Testing Framework     | 29+     |
| ts-jest      | TypeScript for Jest   | 29+     |
| esbuild      | Bundler               | 0.19+   |
| Airtable SDK | API Client            | 0.12+   |
| dotenv       | Environment Variables | 16+     |

---

## 🚦 Quick Start Guide

```bash
# Clone and setup
git clone <repository-url>
cd airtable-local
npm install

# Run tests (no API key needed)
npm test

# Configure for real Airtable testing
cp .env.example .env
# Edit .env with your API key and Base ID

# Test against real Airtable
npm run local

# Build for deployment
npm run build

# Copy dist/script.js contents into Airtable Scripting block
```

---

## 🔧 Troubleshooting

### "AUTHENTICATION_REQUIRED" Error

- **Cause**: Invalid or incomplete API token
- **Fix**: Copy the **entire** token (~60-80 characters starting with `pat`)

### "Table not found" Error

- **Cause**: Table name doesn't match exactly
- **Fix**: Check exact table names in Airtable (case-sensitive)

### Module Resolution Errors

- **Cause**: TypeScript/Node.js module conflict
- **Fix**: Already handled in `tsconfig.json` with `ts-node` settings

---

## 🤝 Contributing

1. Create a feature branch
2. Make changes in `src/`
3. Add/update tests in `test/`
4. Run `npm test` to verify
5. Run `npm run local` to integration test
6. Submit pull request for review

### Key Files for Development

| File                      | Purpose                    |
| ------------------------- | -------------------------- |
| `src/core/main-logic.ts`  | Add your script logic here |
| `src/types/interfaces.ts` | Define new interfaces      |
| `src/utils/scripts.ts`    | Add utility functions      |
| `test/__mocks__/mocks.ts` | Add/update test mocks      |

---

## 📞 Contact

For questions about this implementation, contact the development team.

---

_Last Updated: January 2026_
