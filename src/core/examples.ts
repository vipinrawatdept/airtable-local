import { IAirtableBase, ILogger } from "../types";
import {
  archiveOldRecords,
  findDuplicatesByField,
  copyRecordsBetweenTables,
  bulkUpdateByCondition,
  generateTableStatistics,
  cleanupEmptyRecords,
} from "./main-logic";

export async function exampleScripts(base: IAirtableBase, logger: ILogger): Promise<void> {
  logger.log("🎯 Running example scripts...\n");

  logger.log("Example 1: Archive old records");
  await archiveOldRecords(base, "Tasks", "Created", 90, logger);

  logger.log("\nExample 2: Find duplicate emails");
  const duplicates = await findDuplicatesByField(base, "Users", "Email", logger);
  if (duplicates.count > 0) {
    logger.log(`Found ${duplicates.count} duplicate records that need attention`);
  }

  logger.log("\nExample 3: Copy active tasks to archive table");
  await copyRecordsBetweenTables(
    base,
    "Tasks",
    "TasksArchive",
    { Name: "TaskName", Status: "Status", Priority: "Priority" },
    (record) => record.getCellValue("Status") === "Completed",
    logger
  );

  logger.log("\nExample 4: Bulk update statuses");
  await bulkUpdateByCondition(
    base,
    "Tasks",
    [
      { field: "Priority", value: "Critical", updates: { Urgent: true, Notified: true } },
      { field: "Status", value: "Overdue", updates: { "Needs Review": true } },
    ],
    logger
  );

  logger.log("\nExample 5: Generate project statistics");
  const stats = await generateTableStatistics(base, "Projects", "Status", logger);
  logger.log(`Total unique statuses: ${stats.size}`);

  logger.log("\nExample 6: Clean up empty contacts");
  await cleanupEmptyRecords(base, "Contacts", ["Name", "Email", "Phone"], logger);

  logger.log("\n✨ All example scripts completed!");
}

export async function customWorkflow(base: IAirtableBase, logger: ILogger): Promise<void> {
  logger.log("🔧 Running custom workflow...\n");

  logger.log("Step 1: Find and log duplicates");
  const emailDupes = await findDuplicatesByField(base, "Users", "Email", logger);

  if (emailDupes.count > 0) {
    logger.log(`\nStep 2: Handle ${emailDupes.count} duplicates`);
    for (const [email, recordIds] of emailDupes.duplicates.entries()) {
      logger.log(`  Merging duplicates for: ${email}`);
    }
  }

  logger.log("\nStep 3: Archive completed tasks older than 30 days");
  const archiveResult = await archiveOldRecords(base, "Tasks", "Completed Date", 30, logger);

  logger.log("\nStep 4: Generate final report");
  await generateTableStatistics(base, "Tasks", "Status", logger);

  logger.log(`\n✅ Workflow complete - ${archiveResult.archived} tasks archived`);
}
