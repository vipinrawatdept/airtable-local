/**
 * Airtable Local Development Environment
 * 
 * Main entry point that re-exports all public APIs.
 * 
 * For Airtable bundling, use: src/core/entry.ts
 * For local execution, use: src/core/local.ts
 */

// Re-export types
export * from './types';

// Re-export utilities (loggers, scripts)
export * from './utils';

// Re-export adapters
export * from './adapters';

// Re-export core logic
export * from './core';
