/**
 * Jest Tests for Airtable Adapter
 *
 * Tests the AirtableBaseAdapter functionality including
 * the Metadata API for auto-discovering tables.
 */

// Mock the fetch function globally
const mockFetch = jest.fn();
global.fetch = mockFetch;

const mockSelectQuery = {
  all: jest.fn().mockResolvedValue([]),
  firstPage: jest.fn().mockResolvedValue([]),
};

const mockTable = {
  select: jest.fn().mockReturnValue(mockSelectQuery),
  find: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  destroy: jest.fn(),
};

const mockAirtableBase = jest.fn().mockReturnValue(mockTable);

// Mock Airtable SDK
jest.mock("airtable", () => {
  const mockConfigure = jest.fn();
  const mockBase = jest.fn().mockImplementation(() => mockAirtableBase);

  return {
    __esModule: true,
    default: {
      configure: mockConfigure,
      base: mockBase,
    },
  };
});

import {
  AirtableBaseAdapter,
  createAirtableBaseWithAutoLoad,
} from "../src/adapters/airtable-adapter";

describe("Airtable Adapter", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockReset();
  });

  describe("fetchTableNames (via Metadata API)", () => {
    it("should fetch table names from Metadata API", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          tables: [
            { id: "tbl1", name: "Tasks" },
            { id: "tbl2", name: "Users" },
            { id: "tbl3", name: "Projects" },
          ],
        }),
      });

      const adapter = new AirtableBaseAdapter("patXXX", "appXXX", []);
      const tables = await adapter.fetchTableNames();

      expect(tables).toEqual(["Tasks", "Users", "Projects"]);
      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.airtable.com/v0/meta/bases/appXXX/tables",
        expect.objectContaining({
          headers: {
            Authorization: "Bearer patXXX",
          },
        })
      );
    });

    it("should throw error on API failure", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: "Unauthorized",
        text: async () => "Invalid API key",
      });

      const adapter = new AirtableBaseAdapter("patXXX", "appXXX", []);

      await expect(adapter.fetchTableNames()).rejects.toThrow(
        "Failed to fetch table metadata"
      );
    });

    it("should handle network errors", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      const adapter = new AirtableBaseAdapter("patXXX", "appXXX", []);

      await expect(adapter.fetchTableNames()).rejects.toThrow("Network error");
    });

    it("should handle empty tables response", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          tables: [],
        }),
      });

      const adapter = new AirtableBaseAdapter("patXXX", "appXXX", []);
      const tables = await adapter.fetchTableNames();

      expect(tables).toEqual([]);
    });
  });

  describe("AirtableBaseAdapter", () => {
    it("should create adapter with provided table names", () => {
      const adapter = new AirtableBaseAdapter("patXXX", "appXXX", [
        "Tasks",
        "Users",
      ]);

      expect(adapter.tables).toHaveLength(2);
      expect(adapter.tables.map((t) => t.name)).toEqual(["Tasks", "Users"]);
    });

    it("should get table by name", () => {
      const adapter = new AirtableBaseAdapter("patXXX", "appXXX", [
        "Tasks",
        "Users",
      ]);

      const table = adapter.getTable("Tasks");

      expect(table).toBeDefined();
      expect(table.name).toBe("Tasks");
    });

    it("should create table on-the-fly for unknown name", () => {
      const adapter = new AirtableBaseAdapter("patXXX", "appXXX", ["Tasks"]);

      // Getting a non-existent table should create it on-the-fly
      const table = adapter.getTable("NewTable");

      expect(table).toBeDefined();
      expect(table.name).toBe("NewTable");
    });

    it("should add table using addTable method", () => {
      const adapter = new AirtableBaseAdapter("patXXX", "appXXX", []);

      adapter.addTable("AddedTable");

      expect(adapter.tables).toHaveLength(1);
      expect(adapter.tables[0].name).toBe("AddedTable");
    });

    it("should not duplicate tables in addTable", () => {
      const adapter = new AirtableBaseAdapter("patXXX", "appXXX", [
        "ExistingTable",
      ]);

      adapter.addTable("ExistingTable");

      expect(adapter.tables).toHaveLength(1);
    });

    it("should load all tables via Metadata API", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          tables: [
            { id: "tbl1", name: "Table1" },
            { id: "tbl2", name: "Table2" },
          ],
        }),
      });

      const adapter = new AirtableBaseAdapter("patXXX", "appXXX", []);
      await adapter.loadAllTables();

      expect(adapter.tables).toHaveLength(2);
      expect(adapter.tables.map((t) => t.name)).toEqual(["Table1", "Table2"]);
    });
  });

  describe("createAirtableBaseWithAutoLoad", () => {
    const originalEnv = process.env;

    beforeEach(() => {
      process.env = {
        ...originalEnv,
        AIRTABLE_API_KEY: "patTestKey",
        AIRTABLE_BASE_ID: "appTestBase",
      };
    });

    afterEach(() => {
      process.env = originalEnv;
    });

    it("should auto-discover tables via loadAllTables", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          tables: [
            { id: "tbl1", name: "AutoTable1" },
            { id: "tbl2", name: "AutoTable2" },
          ],
        }),
      });

      const adapter = await createAirtableBaseWithAutoLoad();

      expect(adapter.tables).toHaveLength(2);
      expect(adapter.tables.map((t) => t.name)).toEqual([
        "AutoTable1",
        "AutoTable2",
      ]);
    });
  });

  describe("AirtableTableAdapter", () => {
    let adapter: AirtableBaseAdapter;

    beforeEach(() => {
      adapter = new AirtableBaseAdapter("patXXX", "appXXX", ["TestTable"]);
      jest.clearAllMocks();
    });

    it("should call Airtable select for selectRecordsAsync", async () => {
      mockSelectQuery.all.mockResolvedValueOnce([
        {
          id: "rec1",
          fields: { Name: "Test" },
          get: (f: string) => (f === "Name" ? "Test" : null),
        },
      ]);

      const table = adapter.getTable("TestTable");
      const result = await table.selectRecordsAsync();

      expect(mockTable.select).toHaveBeenCalled();
      expect(result.records).toHaveLength(1);
    });

    it("should call Airtable create for createRecordAsync", async () => {
      mockTable.create.mockResolvedValueOnce({ id: "recNew" });

      const table = adapter.getTable("TestTable");
      const newId = await table.createRecordAsync({ Name: "New Record" });

      expect(mockTable.create).toHaveBeenCalledWith({ Name: "New Record" });
      expect(newId).toBe("recNew");
    });

    it("should call Airtable update for updateRecordAsync", async () => {
      mockTable.update.mockResolvedValueOnce({});

      const table = adapter.getTable("TestTable");
      await table.updateRecordAsync("rec1", { Name: "Updated" });

      expect(mockTable.update).toHaveBeenCalledWith("rec1", {
        Name: "Updated",
      });
    });

    it("should call Airtable destroy for deleteRecordAsync", async () => {
      mockTable.destroy.mockResolvedValueOnce({});

      const table = adapter.getTable("TestTable");
      await table.deleteRecordAsync("rec1");

      expect(mockTable.destroy).toHaveBeenCalledWith("rec1");
    });
  });
});

describe("AirtableRecordAdapter", () => {
  let adapter: AirtableBaseAdapter;

  beforeEach(() => {
    adapter = new AirtableBaseAdapter("patXXX", "appXXX", ["TestTable"]);

    // Mock records with proper `get` method
    mockSelectQuery.all.mockResolvedValue([
      {
        id: "rec1",
        fields: {
          Name: "Test Record",
          Count: 42,
          Active: true,
          Tags: ["a", "b"],
        },
        get: (field: string) => {
          const fields: Record<string, unknown> = {
            Name: "Test Record",
            Count: 42,
            Active: true,
            Tags: ["a", "b"],
          };
          return fields[field];
        },
      },
    ]);
  });

  it("should get cell value by field name", async () => {
    const table = adapter.getTable("TestTable");
    const result = await table.selectRecordsAsync();
    const record = result.records[0];

    expect(record.getCellValue("Name")).toBe("Test Record");
    expect(record.getCellValue("Count")).toBe(42);
    expect(record.getCellValue("Active")).toBe(true);
  });

  it("should get cell value as string", async () => {
    const table = adapter.getTable("TestTable");
    const result = await table.selectRecordsAsync();
    const record = result.records[0];

    expect(record.getCellValueAsString("Name")).toBe("Test Record");
    expect(record.getCellValueAsString("Count")).toBe("42");
  });

  it("should return null for non-existent fields", async () => {
    const table = adapter.getTable("TestTable");
    const result = await table.selectRecordsAsync();
    const record = result.records[0];

    expect(record.getCellValue("NonExistent")).toBeNull();
  });

  it("should have correct record id", async () => {
    const table = adapter.getTable("TestTable");
    const result = await table.selectRecordsAsync();
    const record = result.records[0];

    expect(record.id).toBe("rec1");
  });
});
