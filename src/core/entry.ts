import { runScript } from "./main-logic";
import { AirtableLogger } from "../utils";
import { IAirtableBase } from "../types";

function isAirtableEnvironment(): boolean {
  return typeof (globalThis as Record<string, unknown>).base !== "undefined";
}

function getAirtableBase(): IAirtableBase {
  // @ts-expect-error - 'base' is a global in Airtable Scripts
  return base as IAirtableBase;
}

(async () => {
  if (isAirtableEnvironment()) {
    const airtableBase = getAirtableBase();
    const logger = new AirtableLogger();

    try {
      await runScript(airtableBase, logger);
    } catch (error) {
      logger.error("Script execution failed");
      throw error;
    }
  } else {
    console.log("Not running in Airtable environment.");
    console.log('Use "npm run local" to run against real Airtable data.');
    console.log('Use "npm test" to run unit tests with mocks.');
  }
})();
