/**
 * Jest Tests for Airtable Script
 * 
 * These tests use the mock classes to verify script behavior
 * without connecting to a real Airtable base.
 */

import { runScript, processTableRecords, createSampleRecords } from '../src/core';
import {
  MockBase,
  MockTable,
  MockRecord,
  MockLogger,
  createMockBaseWithSampleData,
} from './__mocks__';

describe('runScript', () => {
  let mockBase: MockBase;
  let mockLogger: MockLogger;

  beforeEach(() => {
    // Create fresh mocks for each test
    const { base } = createMockBaseWithSampleData();
    mockBase = base;
    mockLogger = new MockLogger();
  });

  it('should log script started message', async () => {
    await runScript(mockBase, mockLogger);

    expect(mockLogger.hasLog('Script started')).toBe(true);
  });

  it('should list all tables in the base', async () => {
    await runScript(mockBase, mockLogger);

    expect(mockLogger.hasLog('Found 1 table(s)')).toBe(true);
    expect(mockLogger.hasLog('Tasks')).toBe(true);
  });

  it('should fetch and display records', async () => {
    await runScript(mockBase, mockLogger);

    expect(mockLogger.hasLog('Retrieved 5 record(s)')).toBe(true);
    expect(mockLogger.hasLog('Task 1')).toBe(true);
  });

  it('should complete successfully', async () => {
    await runScript(mockBase, mockLogger);

    expect(mockLogger.hasLog('Script completed successfully')).toBe(true);
  });

  it('should handle empty base gracefully', async () => {
    const emptyBase = new MockBase([]);
    
    await runScript(emptyBase, mockLogger);

    expect(mockLogger.hasLog('Found 0 table(s)')).toBe(true);
    expect(mockLogger.hasLog('Script completed successfully')).toBe(true);
  });
});

describe('processTableRecords', () => {
  let mockBase: MockBase;
  let mockTable: MockTable;
  let mockLogger: MockLogger;

  beforeEach(() => {
    const { base, table } = createMockBaseWithSampleData();
    mockBase = base;
    mockTable = table;
    mockLogger = new MockLogger();
  });

  it('should process pending records', async () => {
    const result = await processTableRecords(mockBase, 'Tasks', mockLogger);

    // There are 3 records with Status: 'Pending'
    expect(result.processed).toBe(3);
    expect(result.errors).toBe(0);
  });

  it('should update processed records status', async () => {
    await processTableRecords(mockBase, 'Tasks', mockLogger);

    // Verify records were updated
    const updateCalls = mockTable._calls.updateRecordAsync;
    expect(updateCalls.length).toBe(3);
    
    // All updates should set Status to 'Processed'
    for (const call of updateCalls) {
      expect(call.fields['Status']).toBe('Processed');
      expect(call.fields['Processed Date']).toBeDefined();
    }
  });

  it('should skip non-pending records', async () => {
    // rec002 has Status: 'Completed', rec004 has Status: 'In Progress'
    await processTableRecords(mockBase, 'Tasks', mockLogger);

    const updateCalls = mockTable._calls.updateRecordAsync;
    const updatedIds = updateCalls.map(c => c.id);
    
    expect(updatedIds).not.toContain('rec002');
    expect(updatedIds).not.toContain('rec004');
  });

  it('should log summary', async () => {
    await processTableRecords(mockBase, 'Tasks', mockLogger);

    expect(mockLogger.hasLog('Summary: 3 processed, 0 errors')).toBe(true);
  });

  it('should throw error for non-existent table', async () => {
    await expect(
      processTableRecords(mockBase, 'NonExistent', mockLogger)
    ).rejects.toThrow('Table "NonExistent" not found');
  });
});

describe('createSampleRecords', () => {
  let mockBase: MockBase;
  let mockTable: MockTable;
  let mockLogger: MockLogger;

  beforeEach(() => {
    const { base, table } = createMockBaseWithSampleData();
    mockBase = base;
    mockTable = table;
    mockLogger = new MockLogger();
  });

  it('should create the specified number of records', async () => {
    const createdIds = await createSampleRecords(mockBase, 'Tasks', 3, mockLogger);

    expect(createdIds).toHaveLength(3);
    expect(mockTable._calls.createRecordAsync).toHaveLength(3);
  });

  it('should return valid record IDs', async () => {
    const createdIds = await createSampleRecords(mockBase, 'Tasks', 2, mockLogger);

    for (const id of createdIds) {
      expect(id).toMatch(/^rec\d+$/);
    }
  });

  it('should create records with correct fields', async () => {
    await createSampleRecords(mockBase, 'Tasks', 1, mockLogger);

    const createCalls = mockTable._calls.createRecordAsync;
    expect(createCalls[0]).toMatchObject({
      Name: 'Sample Record 1',
      Status: 'New',
    });
    expect(createCalls[0].Created).toBeDefined();
  });

  it('should log progress', async () => {
    await createSampleRecords(mockBase, 'Tasks', 2, mockLogger);

    expect(mockLogger.hasLog('Creating 2 sample records')).toBe(true);
    expect(mockLogger.hasLog('Created record 1')).toBe(true);
    expect(mockLogger.hasLog('Created record 2')).toBe(true);
  });
});

describe('MockRecord', () => {
  it('should return field values with getCellValue', () => {
    const record = new MockRecord('rec001', { 
      Name: 'Test', 
      Count: 42 
    });

    expect(record.getCellValue('Name')).toBe('Test');
    expect(record.getCellValue('Count')).toBe(42);
    expect(record.getCellValue('NonExistent')).toBeNull();
  });

  it('should convert values to string with getCellValueAsString', () => {
    const record = new MockRecord('rec001', {
      Name: 'Test',
      Count: 42,
      Tags: ['a', 'b'],
      Empty: null,
    });

    expect(record.getCellValueAsString('Name')).toBe('Test');
    expect(record.getCellValueAsString('Count')).toBe('42');
    expect(record.getCellValueAsString('Tags')).toBe('["a","b"]');
    expect(record.getCellValueAsString('Empty')).toBe('');
  });

  it('should update fields', () => {
    const record = new MockRecord('rec001', { Name: 'Original' });
    
    record._updateFields({ Name: 'Updated', Status: 'New' });

    expect(record.getCellValue('Name')).toBe('Updated');
    expect(record.getCellValue('Status')).toBe('New');
    expect(record.name).toBe('Updated');
  });
});

describe('MockTable', () => {
  it('should select all records', async () => {
    const records = [
      new MockRecord('rec001', { Name: 'Record 1' }),
      new MockRecord('rec002', { Name: 'Record 2' }),
    ];
    const table = new MockTable('tbl001', 'TestTable', records);

    const result = await table.selectRecordsAsync();

    expect(result.records).toHaveLength(2);
    expect(result.getRecord('rec001')).toBeDefined();
  });

  it('should filter by recordIds', async () => {
    const records = [
      new MockRecord('rec001', { Name: 'Record 1' }),
      new MockRecord('rec002', { Name: 'Record 2' }),
      new MockRecord('rec003', { Name: 'Record 3' }),
    ];
    const table = new MockTable('tbl001', 'TestTable', records);

    const result = await table.selectRecordsAsync({ recordIds: ['rec001', 'rec003'] });

    expect(result.records).toHaveLength(2);
    expect(result.records.map(r => r.id)).toEqual(['rec001', 'rec003']);
  });

  it('should sort records', async () => {
    const records = [
      new MockRecord('rec001', { Name: 'Charlie' }),
      new MockRecord('rec002', { Name: 'Alice' }),
      new MockRecord('rec003', { Name: 'Bob' }),
    ];
    const table = new MockTable('tbl001', 'TestTable', records);

    const result = await table.selectRecordsAsync({ 
      sorts: [{ field: 'Name', direction: 'asc' }] 
    });

    expect(result.records.map(r => r.name)).toEqual(['Alice', 'Bob', 'Charlie']);
  });

  it('should create records', async () => {
    const table = new MockTable('tbl001', 'TestTable');

    const id = await table.createRecordAsync({ Name: 'New Record' });

    expect(id).toMatch(/^rec\d+$/);
    expect(table._getRecord(id)).toBeDefined();
    expect(table._getRecord(id)?.name).toBe('New Record');
  });

  it('should delete records', async () => {
    const records = [new MockRecord('rec001', { Name: 'Record 1' })];
    const table = new MockTable('tbl001', 'TestTable', records);

    await table.deleteRecordAsync('rec001');

    expect(table._getRecord('rec001')).toBeUndefined();
  });
});

describe('MockBase', () => {
  it('should get table by name', () => {
    const table = new MockTable('tbl001', 'TestTable');
    const base = new MockBase([table]);

    expect(base.getTable('TestTable')).toBe(table);
  });

  it('should get table by id', () => {
    const table = new MockTable('tbl001', 'TestTable');
    const base = new MockBase([table]);

    expect(base.getTable('tbl001')).toBe(table);
  });

  it('should throw error for non-existent table', () => {
    const base = new MockBase([]);

    expect(() => base.getTable('NonExistent')).toThrow('Table "NonExistent" not found');
  });
});

describe('MockLogger', () => {
  it('should capture log messages', () => {
    const logger = new MockLogger();

    logger.log('Test message');
    logger.error('Error message');
    logger.warn('Warning message');

    expect(logger.logs).toHaveLength(3);
    expect(logger.hasLog('Test message')).toBe(true);
    expect(logger.hasLog('Error message')).toBe(true);
    expect(logger.hasLog('Warning message')).toBe(true);
  });

  it('should filter by log type', () => {
    const logger = new MockLogger();

    logger.log('Log 1');
    logger.error('Error 1');
    logger.log('Log 2');

    const errors = logger.getLogsByType('error');
    expect(errors).toHaveLength(1);
    expect(errors[0].message).toBe('Error 1');
  });

  it('should clear logs', () => {
    const logger = new MockLogger();

    logger.log('Test');
    expect(logger.logs).toHaveLength(1);

    logger.clear();
    expect(logger.logs).toHaveLength(0);
  });
});
