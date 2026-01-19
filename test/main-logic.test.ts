import {
  runScript,
  processTableRecords,
  createSampleRecords,
  updateRecordsScript,
  UpdateRecordsConfig,
} from "../src/core/main-logic";
import { MockBase, MockLogger } from "./__mocks__/mocks";

describe("main-logic", () => {
  let mockBase: MockBase;
  let mockLogger: MockLogger;

  beforeEach(() => {
    mockBase = new MockBase();
    mockLogger = new MockLogger();
  });

  describe("runScript", () => {
    it("should log script started message", async () => {
      await runScript(mockBase, mockLogger);
      expect(mockLogger.logs).toContain("🚀 Script started");
    });

    it("should log table count", async () => {
      await runScript(mockBase, mockLogger);
      const tableCountLog = mockLogger.logs.find(
        (log) => log.includes("Found") && log.includes("table(s)")
      );
      expect(tableCountLog).toBeDefined();
    });

    it("should log completion message on success", async () => {
      await runScript(mockBase, mockLogger);
      const hasCompletion = mockLogger.logs.some((log) =>
        log.includes("Script completed successfully")
      );
      expect(hasCompletion).toBe(true);
    });

    it("should handle errors and log them", async () => {
      mockBase.addTable("ErrorTable", [{ id: "rec1", Name: "Test" }]);
      const errorTable = mockBase.getTable("ErrorTable");
      errorTable.selectRecordsAsync = jest.fn().mockRejectedValue(new Error("API Error"));
      mockBase.tables = [errorTable as any];

      await expect(runScript(mockBase, mockLogger)).rejects.toThrow("API Error");
      expect(mockLogger.errors.length).toBeGreaterThan(0);
    });
  });

  describe("processTableRecords", () => {
    beforeEach(() => {
      mockBase.addTable("Tasks", [
        { id: "rec1", Name: "Task 1", Status: "Pending" },
        { id: "rec2", Name: "Task 2", Status: "Completed" },
        { id: "rec3", Name: "Task 3", Status: "Pending" },
      ]);
    });

    it("should process pending records", async () => {
      const result = await processTableRecords(mockBase, "Tasks", mockLogger);
      expect(result.processed).toBe(2);
      expect(result.errors).toBe(0);
    });

    it("should skip non-pending records", async () => {
      const result = await processTableRecords(mockBase, "Tasks", mockLogger);
      expect(result.processed).toBe(2);
    });

    it("should handle update errors gracefully", async () => {
      const table = mockBase.getTable("Tasks");
      table.updateRecordAsync = jest.fn().mockRejectedValue(new Error("Update failed"));

      const result = await processTableRecords(mockBase, "Tasks", mockLogger);
      expect(result.errors).toBe(2);
    });
  });

  describe("createSampleRecords", () => {
    beforeEach(() => {
      mockBase.addTable("NewTable", []);
    });

    it("should create specified number of records", async () => {
      const ids = await createSampleRecords(mockBase, "NewTable", 3, mockLogger);
      expect(ids).toHaveLength(3);
    });

    it("should return created record IDs", async () => {
      const ids = await createSampleRecords(mockBase, "NewTable", 2, mockLogger);
      expect(ids.every((id) => id.startsWith("rec"))).toBe(true);
    });

    it("should log creation progress", async () => {
      await createSampleRecords(mockBase, "NewTable", 2, mockLogger);
      const creationLogs = mockLogger.logs.filter((log) => log.includes("Created record"));
      expect(creationLogs).toHaveLength(2);
    });
  });

  describe("updateRecordsScript", () => {
    beforeEach(() => {
      mockBase.addTable("Items", [
        { id: "rec1", Name: "Item 1", url: "https://example.com", llm_result: "" },
        { id: "rec2", Name: "Item 2", url: "", llm_result: "" },
        { id: "rec3", Name: "Item 3", url: "https://test.com", llm_result: "" },
      ]);
    });

    it("should update records with url field", async () => {
      const result = await updateRecordsScript(mockBase, "Items", mockLogger);
      expect(result.updated).toBe(2);
      expect(result.skipped).toBe(1);
    });

    it("should skip records without url", async () => {
      const result = await updateRecordsScript(mockBase, "Items", mockLogger);
      expect(result.skipped).toBe(1);
    });

    it("should use custom config when provided", async () => {
      mockBase.addTable("CustomTable", [
        { id: "rec1", Name: "Test 1", customField: "value", output: "" },
        { id: "rec2", Name: "Test 2", customField: "", output: "" },
      ]);

      const config: UpdateRecordsConfig = {
        sourceField: "customField",
        targetField: "output",
        targetValue: "processed",
      };

      const result = await updateRecordsScript(mockBase, "CustomTable", mockLogger, config);

      expect(result.updated).toBe(1);
      expect(result.skipped).toBe(1);
    });

    it("should log summary at the end", async () => {
      await updateRecordsScript(mockBase, "Items", mockLogger);
      const summaryLog = mockLogger.logs.find((log) => log.includes("Summary"));
      expect(summaryLog).toBeDefined();
    });
  });
});
