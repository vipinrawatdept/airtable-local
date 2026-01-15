import { ILogger } from './interfaces';

/**
 * NodeLogger - Console-based logger for local testing
 * Uses Node.js console methods
 */
export class NodeLogger implements ILogger {
  private prefix: string;

  constructor(prefix: string = '[Airtable Script]') {
    this.prefix = prefix;
  }

  log(message: string): void {
    console.log(`${this.prefix} ${message}`);
  }

  inspect(data: unknown, label?: string): void {
    if (label) {
      console.log(`${this.prefix} ${label}:`);
    }
    console.dir(data, { depth: null, colors: true });
  }

  error(message: string): void {
    console.error(`${this.prefix} [ERROR] ${message}`);
  }

  warn(message: string): void {
    console.warn(`${this.prefix} [WARN] ${message}`);
  }
}

/**
 * AirtableLogger - Logger for Airtable Scripting environment
 * Uses Airtable's global output object
 * 
 * Note: In Airtable Scripts, 'output' is a global object with:
 * - output.text(message: string): Display text output
 * - output.inspect(data: any): Display formatted object inspection
 * - output.markdown(text: string): Display markdown formatted text
 * - output.table(data: any): Display data as a table
 */
export class AirtableLogger implements ILogger {
  log(message: string): void {
    // @ts-expect-error - 'output' is a global in Airtable Scripts
    output.text(message);
  }

  inspect(data: unknown, label?: string): void {
    if (label) {
      // @ts-expect-error - 'output' is a global in Airtable Scripts
      output.text(label + ':');
    }
    // @ts-expect-error - 'output' is a global in Airtable Scripts
    output.inspect(data);
  }

  error(message: string): void {
    // @ts-expect-error - 'output' is a global in Airtable Scripts
    output.text(`❌ ERROR: ${message}`);
  }

  warn(message: string): void {
    // @ts-expect-error - 'output' is a global in Airtable Scripts
    output.text(`⚠️ WARNING: ${message}`);
  }
}
