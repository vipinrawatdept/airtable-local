/**
 * Jest Tests for CSV Adapter
 *
 * Tests the CsvBaseAdapter functionality for loading and
 * manipulating data from CSV files.
 */

import * as fs from "fs";
import * as path from "path";
import { CsvBaseAdapter } from "../src/adapters/csv-adapter";

describe("CsvBaseAdapter", () => {
  const testDataDir = path.join(__dirname, "__test_data__");
  const testCsvPath = path.join(testDataDir, "TestTable.csv");

  beforeAll(() => {
    // Create test data directory
    if (!fs.existsSync(testDataDir)) {
      fs.mkdirSync(testDataDir, { recursive: true });
    }
  });

  beforeEach(() => {
    // Create a test CSV file
    const csvContent = `id,Name,Status,Priority,Count
rec001,Task 1,Pending,High,10
rec002,Task 2,Completed,Medium,20
rec003,Task 3,In Progress,Low,30
rec004,Task 4,Pending,High,40
`;
    fs.writeFileSync(testCsvPath, csvContent, "utf-8");
  });

  afterAll(() => {
    // Clean up test data directory
    if (fs.existsSync(testDataDir)) {
      const files = fs.readdirSync(testDataDir);
      for (const file of files) {
        fs.unlinkSync(path.join(testDataDir, file));
      }
      fs.rmdirSync(testDataDir);
    }
  });

  describe("loading tables", () => {
    it("should load CSV files as tables", () => {
      const base = new CsvBaseAdapter(testDataDir);

      expect(base.tables).toHaveLength(1);
      expect(base.tables[0].name).toBe("TestTable");
    });

    it("should get table by name", () => {
      const base = new CsvBaseAdapter(testDataDir);

      const table = base.getTable("TestTable");
      expect(table).toBeDefined();
      expect(table.name).toBe("TestTable");
    });

    it("should throw error for non-existent table", () => {
      const base = new CsvBaseAdapter(testDataDir);

      expect(() => base.getTable("NonExistent")).toThrow(
        'Table "NonExistent" not found'
      );
    });
  });

  describe("reading records", () => {
    it("should load all records from CSV", async () => {
      const base = new CsvBaseAdapter(testDataDir);
      const table = base.getTable("TestTable");

      const result = await table.selectRecordsAsync();

      expect(result.records).toHaveLength(4);
    });

    it("should parse record IDs correctly", async () => {
      const base = new CsvBaseAdapter(testDataDir);
      const table = base.getTable("TestTable");

      const result = await table.selectRecordsAsync();
      const ids = result.records.map((r) => r.id);

      expect(ids).toContain("rec001");
      expect(ids).toContain("rec002");
      expect(ids).toContain("rec003");
      expect(ids).toContain("rec004");
    });

    it("should parse field values correctly", async () => {
      const base = new CsvBaseAdapter(testDataDir);
      const table = base.getTable("TestTable");

      const result = await table.selectRecordsAsync();
      const record = result.getRecord("rec001");

      expect(record?.getCellValue("Name")).toBe("Task 1");
      expect(record?.getCellValue("Status")).toBe("Pending");
      expect(record?.getCellValue("Priority")).toBe("High");
    });

    it("should parse numeric values as numbers", async () => {
      const base = new CsvBaseAdapter(testDataDir);
      const table = base.getTable("TestTable");

      const result = await table.selectRecordsAsync();
      const record = result.getRecord("rec001");

      expect(record?.getCellValue("Count")).toBe(10);
      expect(typeof record?.getCellValue("Count")).toBe("number");
    });

    it("should filter by recordIds", async () => {
      const base = new CsvBaseAdapter(testDataDir);
      const table = base.getTable("TestTable");

      const result = await table.selectRecordsAsync({
        recordIds: ["rec001", "rec003"],
      });

      expect(result.records).toHaveLength(2);
      expect(result.records.map((r) => r.id)).toEqual(["rec001", "rec003"]);
    });

    it("should sort records", async () => {
      const base = new CsvBaseAdapter(testDataDir);
      const table = base.getTable("TestTable");

      const result = await table.selectRecordsAsync({
        sorts: [{ field: "Name", direction: "desc" }],
      });

      const names = result.records.map((r) => r.getCellValue("Name"));
      expect(names).toEqual(["Task 4", "Task 3", "Task 2", "Task 1"]);
    });
  });

  describe("writing records", () => {
    it("should update a record", async () => {
      const base = new CsvBaseAdapter(testDataDir, false);
      const table = base.getTable("TestTable");

      await table.updateRecordAsync("rec001", { Status: "Completed" });

      const result = await table.selectRecordsAsync();
      const record = result.getRecord("rec001");
      expect(record?.getCellValue("Status")).toBe("Completed");
    });

    it("should create a new record", async () => {
      const base = new CsvBaseAdapter(testDataDir, false);
      const table = base.getTable("TestTable");

      const newId = await table.createRecordAsync({
        Name: "Task 5",
        Status: "New",
        Priority: "Medium",
      });

      expect(newId).toMatch(/^rec\d+$/);

      const result = await table.selectRecordsAsync();
      expect(result.records).toHaveLength(5);

      const newRecord = result.getRecord(newId);
      expect(newRecord?.getCellValue("Name")).toBe("Task 5");
    });

    it("should delete a record", async () => {
      const base = new CsvBaseAdapter(testDataDir, false);
      const table = base.getTable("TestTable");

      await table.deleteRecordAsync("rec001");

      const result = await table.selectRecordsAsync();
      expect(result.records).toHaveLength(3);
      expect(result.getRecord("rec001")).toBeUndefined();
    });

    it("should throw error when updating non-existent record", async () => {
      const base = new CsvBaseAdapter(testDataDir, false);
      const table = base.getTable("TestTable");

      await expect(
        table.updateRecordAsync("rec999", { Status: "Test" })
      ).rejects.toThrow('Record with ID "rec999" not found');
    });

    it("should throw error when deleting non-existent record", async () => {
      const base = new CsvBaseAdapter(testDataDir, false);
      const table = base.getTable("TestTable");

      await expect(table.deleteRecordAsync("rec999")).rejects.toThrow(
        'Record with ID "rec999" not found'
      );
    });
  });

  describe("auto-save functionality", () => {
    it("should save changes to CSV when autoSave is enabled", async () => {
      const base = new CsvBaseAdapter(testDataDir, true);
      const table = base.getTable("TestTable");

      await table.updateRecordAsync("rec001", { Status: "Updated" });

      // Read the file directly to verify
      const content = fs.readFileSync(testCsvPath, "utf-8");
      expect(content).toContain("Updated");
    });

    it("should not save changes when autoSave is disabled", async () => {
      // First, get original content
      const originalContent = fs.readFileSync(testCsvPath, "utf-8");

      const base = new CsvBaseAdapter(testDataDir, false);
      const table = base.getTable("TestTable");

      await table.updateRecordAsync("rec001", { Status: "NotSaved" });

      // Read the file directly - should be unchanged
      const currentContent = fs.readFileSync(testCsvPath, "utf-8");
      expect(currentContent).toBe(originalContent);
    });
  });

  describe("type parsing", () => {
    beforeEach(() => {
      // Create CSV with various types
      const csvContent = `id,Name,Active,Count,Tags,Empty
rec001,Test,true,42,"[""a"",""b""]",
rec002,Test2,false,0,{},null
`;
      fs.writeFileSync(testCsvPath, csvContent, "utf-8");
    });

    it("should parse boolean true", async () => {
      const base = new CsvBaseAdapter(testDataDir);
      const table = base.getTable("TestTable");
      const result = await table.selectRecordsAsync();
      const record = result.getRecord("rec001");

      expect(record?.getCellValue("Active")).toBe(true);
    });

    it("should parse boolean false", async () => {
      const base = new CsvBaseAdapter(testDataDir);
      const table = base.getTable("TestTable");
      const result = await table.selectRecordsAsync();
      const record = result.getRecord("rec002");

      expect(record?.getCellValue("Active")).toBe(false);
    });

    it("should parse JSON arrays", async () => {
      const base = new CsvBaseAdapter(testDataDir);
      const table = base.getTable("TestTable");
      const result = await table.selectRecordsAsync();
      const record = result.getRecord("rec001");

      expect(record?.getCellValue("Tags")).toEqual(["a", "b"]);
    });

    it("should handle empty values as null", async () => {
      const base = new CsvBaseAdapter(testDataDir);
      const table = base.getTable("TestTable");
      const result = await table.selectRecordsAsync();
      const record = result.getRecord("rec001");

      expect(record?.getCellValue("Empty")).toBeNull();
    });
  });

  describe("empty directory", () => {
    const emptyDir = path.join(__dirname, "__empty_test_data__");

    beforeAll(() => {
      if (!fs.existsSync(emptyDir)) {
        fs.mkdirSync(emptyDir, { recursive: true });
      }
    });

    afterAll(() => {
      if (fs.existsSync(emptyDir)) {
        fs.rmdirSync(emptyDir);
      }
    });

    it("should handle empty directory gracefully", () => {
      const base = new CsvBaseAdapter(emptyDir);

      expect(base.tables).toHaveLength(0);
    });
  });
});
