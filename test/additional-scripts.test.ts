import {
  archiveOldRecords,
  findDuplicatesByField,
  copyRecordsBetweenTables,
  bulkUpdateByCondition,
  generateTableStatistics,
  cleanupEmptyRecords,
} from "../src/core/main-logic";
import { MockBase, MockLogger } from "./__mocks__/mocks";

describe("Additional Scripts", () => {
  let mockBase: MockBase;
  let mockLogger: MockLogger;

  beforeEach(() => {
    mockBase = new MockBase();
    mockLogger = new MockLogger();
  });

  describe("archiveOldRecords", () => {
    beforeEach(() => {
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 100);
      const recentDate = new Date();
      recentDate.setDate(recentDate.getDate() - 5);

      mockBase.addTable("Tasks", [
        { id: "rec1", Name: "Old Task", Created: oldDate.toISOString() },
        { id: "rec2", Name: "Recent Task", Created: recentDate.toISOString() },
        { id: "rec3", Name: "Very Old Task", Created: "2020-01-01T00:00:00.000Z" },
      ]);
    });

    it("should archive records older than specified days", async () => {
      const result = await archiveOldRecords(mockBase, "Tasks", "Created", 30, mockLogger);
      expect(result.archived).toBe(2);
      expect(result.total).toBe(3);
    });

    it("should not archive recent records", async () => {
      const result = await archiveOldRecords(mockBase, "Tasks", "Created", 200, mockLogger);
      expect(result.archived).toBe(1);
    });
  });

  describe("findDuplicatesByField", () => {
    beforeEach(() => {
      mockBase.addTable("Users", [
        { id: "rec1", Name: "John", Email: "john@example.com" },
        { id: "rec2", Name: "Jane", Email: "jane@example.com" },
        { id: "rec3", Name: "John Doe", Email: "JOHN@EXAMPLE.COM" },
        { id: "rec4", Name: "Bob", Email: "bob@example.com" },
      ]);
    });

    it("should find duplicate emails (case-insensitive)", async () => {
      const result = await findDuplicatesByField(mockBase, "Users", "Email", mockLogger);
      expect(result.duplicates.size).toBe(1);
      expect(result.count).toBe(1);
    });

    it("should return empty map when no duplicates", async () => {
      mockBase.addTable("Unique", [
        { id: "rec1", Name: "A", Email: "a@test.com" },
        { id: "rec2", Name: "B", Email: "b@test.com" },
      ]);
      const result = await findDuplicatesByField(mockBase, "Unique", "Email", mockLogger);
      expect(result.duplicates.size).toBe(0);
      expect(result.count).toBe(0);
    });
  });

  describe("copyRecordsBetweenTables", () => {
    beforeEach(() => {
      mockBase.addTable("Source", [
        { id: "rec1", Name: "Task 1", Status: "Active", Priority: "High" },
        { id: "rec2", Name: "Task 2", Status: "Inactive", Priority: "Low" },
        { id: "rec3", Name: "Task 3", Status: "Active", Priority: "Medium" },
      ]);
      mockBase.addTable("Target", []);
    });

    it("should copy filtered records with field mapping", async () => {
      const fieldMapping = { Name: "Title", Priority: "Level" };
      const filterFn = (record: any) => record.getCellValue("Status") === "Active";

      const result = await copyRecordsBetweenTables(
        mockBase,
        "Source",
        "Target",
        fieldMapping,
        filterFn,
        mockLogger
      );

      expect(result.copied).toBe(2);
      expect(result.skipped).toBe(1);
    });

    it("should copy all records when filter allows all", async () => {
      const fieldMapping = { Name: "Name" };
      const filterFn = () => true;

      const result = await copyRecordsBetweenTables(
        mockBase,
        "Source",
        "Target",
        fieldMapping,
        filterFn,
        mockLogger
      );

      expect(result.copied).toBe(3);
      expect(result.skipped).toBe(0);
    });
  });

  describe("bulkUpdateByCondition", () => {
    beforeEach(() => {
      mockBase.addTable("Items", [
        { id: "rec1", Name: "Item 1", Status: "Pending", Priority: "High" },
        { id: "rec2", Name: "Item 2", Status: "Done", Priority: "Low" },
        { id: "rec3", Name: "Item 3", Status: "Pending", Priority: "Medium" },
      ]);
    });

    it("should update records matching conditions", async () => {
      const conditions = [
        { field: "Status", value: "Pending", updates: { Status: "In Progress" } },
        { field: "Status", value: "Done", updates: { Completed: true } },
      ];

      const result = await bulkUpdateByCondition(mockBase, "Items", conditions, mockLogger);
      expect(result.updated).toBe(3);
    });
  });

  describe("generateTableStatistics", () => {
    beforeEach(() => {
      mockBase.addTable("Projects", [
        { id: "rec1", Name: "Project 1", Status: "Active" },
        { id: "rec2", Name: "Project 2", Status: "Active" },
        { id: "rec3", Name: "Project 3", Status: "Completed" },
        { id: "rec4", Name: "Project 4", Status: "Active" },
        { id: "rec5", Name: "Project 5", Status: "On Hold" },
      ]);
    });

    it("should generate statistics grouped by field", async () => {
      const stats = await generateTableStatistics(mockBase, "Projects", "Status", mockLogger);
      expect(stats.get("Active")).toBe(3);
      expect(stats.get("Completed")).toBe(1);
      expect(stats.get("On Hold")).toBe(1);
    });

    it("should handle empty values", async () => {
      mockBase.addTable("Test", [
        { id: "rec1", Name: "A", Category: "X" },
        { id: "rec2", Name: "B", Category: "" },
        { id: "rec3", Name: "C", Category: null },
      ]);

      const stats = await generateTableStatistics(mockBase, "Test", "Category", mockLogger);
      expect(stats.get("X")).toBe(1);
      expect(stats.get("(empty)")).toBe(2);
    });
  });

  describe("cleanupEmptyRecords", () => {
    beforeEach(() => {
      mockBase.addTable("Contacts", [
        { id: "rec1", Name: "John", Email: "john@test.com", Phone: "123" },
        { id: "rec2", Name: "", Email: "", Phone: "" },
        { id: "rec3", Name: "Jane", Email: "", Phone: "" },
        { id: "rec4", Name: "", Email: "", Phone: "" },
      ]);
    });

    it("should delete records with all required fields empty", async () => {
      const result = await cleanupEmptyRecords(
        mockBase,
        "Contacts",
        ["Name", "Email", "Phone"],
        mockLogger
      );
      expect(result.deleted).toBe(2);
      expect(result.total).toBe(4);
    });

    it("should not delete records with at least one required field filled", async () => {
      const result = await cleanupEmptyRecords(mockBase, "Contacts", ["Name"], mockLogger);
      expect(result.deleted).toBe(2);
    });

    it("should handle table with no empty records", async () => {
      mockBase.addTable("Complete", [
        { id: "rec1", Name: "A", Email: "a@test.com" },
        { id: "rec2", Name: "B", Email: "b@test.com" },
      ]);

      const result = await cleanupEmptyRecords(mockBase, "Complete", ["Name"], mockLogger);
      expect(result.deleted).toBe(0);
    });
  });
});
