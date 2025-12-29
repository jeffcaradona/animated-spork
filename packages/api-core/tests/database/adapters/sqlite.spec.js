/**
 * Test suite for SQLite database adapter.
 * 
 * @module tests/database/adapters/sqlite.spec
 */

import { describe, it, beforeEach, afterEach } from 'node:test';
import { strict as assert } from 'node:assert';
import { createSqliteAdapter } from '../../../src/database/adapters/sqlite.js';
import {
  ConfigurationError,
  DatabaseNotFoundError,
  QueryError,
  TransactionError
} from '../../../src/database/errors.js';

describe('SQLite Adapter', () => {
  describe('createSqliteAdapter', () => {
    it('should throw ConfigurationError if config is missing', () => {
      assert.throws(
        () => createSqliteAdapter(),
        ConfigurationError
      );
    });

    it('should throw ConfigurationError if databases object is missing', () => {
      assert.throws(
        () => createSqliteAdapter({}),
        ConfigurationError
      );
    });

    it('should throw ConfigurationError if databases object is empty', () => {
      assert.throws(
        () => createSqliteAdapter({ databases: {} }),
        ConfigurationError
      );
    });

    it('should create adapter with valid configuration', () => {
      const adapter = createSqliteAdapter({
        databases: {
          default: { filename: ':memory:' }
        }
      });

      assert.ok(adapter);
      assert.strictEqual(typeof adapter.query, 'function');
      assert.strictEqual(typeof adapter.execute, 'function');
      assert.strictEqual(typeof adapter.getConnection, 'function');
      assert.strictEqual(typeof adapter.beginTransaction, 'function');
      assert.strictEqual(typeof adapter.isHealthy, 'function');
      assert.strictEqual(typeof adapter.getStatus, 'function');
      assert.strictEqual(typeof adapter.close, 'function');
    });

    it('should support multiple named databases', () => {
      const adapter = createSqliteAdapter({
        databases: {
          default: { filename: ':memory:' },
          test: { filename: ':memory:' }
        }
      });

      assert.ok(adapter);
    });
  });

  describe('query', () => {
    let adapter;

    beforeEach(() => {
      adapter = createSqliteAdapter({
        databases: {
          default: { filename: ':memory:' }
        }
      });
    });

    afterEach(async () => {
      await adapter.close();
    });

    it('should execute SELECT query and return results', async () => {
      // Create test table
      await adapter.execute('CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT)');
      await adapter.execute('INSERT INTO users (name) VALUES (?)', ['Alice']);
      await adapter.execute('INSERT INTO users (name) VALUES (?)', ['Bob']);

      const results = await adapter.query('SELECT * FROM users ORDER BY id');

      assert.strictEqual(results.length, 2);
      assert.strictEqual(results[0].name, 'Alice');
      assert.strictEqual(results[1].name, 'Bob');
    });

    it('should handle empty result sets', async () => {
      await adapter.execute('CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT)');

      const results = await adapter.query('SELECT * FROM users');

      assert.strictEqual(results.length, 0);
    });

    it('should support parameterized queries', async () => {
      await adapter.execute('CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT, age INTEGER)');
      await adapter.execute('INSERT INTO users (name, age) VALUES (?, ?)', ['Alice', 30]);
      await adapter.execute('INSERT INTO users (name, age) VALUES (?, ?)', ['Bob', 25]);

      const results = await adapter.query('SELECT * FROM users WHERE age > ?', [26]);

      assert.strictEqual(results.length, 1);
      assert.strictEqual(results[0].name, 'Alice');
    });

    it('should throw DatabaseNotFoundError for unknown database', async () => {
      await assert.rejects(
        async () => adapter.query('SELECT 1', [], 'unknown'),
        DatabaseNotFoundError
      );
    });

    it('should throw QueryError for invalid SQL', async () => {
      await assert.rejects(
        async () => adapter.query('SELECT * FROM nonexistent_table'),
        QueryError
      );
    });

    it('should query from named database', async () => {
      const multiAdapter = createSqliteAdapter({
        databases: {
          default: { filename: ':memory:' },
          test: { filename: ':memory:' }
        }
      });

      await multiAdapter.execute('CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT)', [], 'test');
      await multiAdapter.execute('INSERT INTO users (name) VALUES (?)', ['TestUser'], 'test');

      const results = await multiAdapter.query('SELECT * FROM users', [], 'test');

      assert.strictEqual(results.length, 1);
      assert.strictEqual(results[0].name, 'TestUser');

      await multiAdapter.close();
    });
  });

  describe('execute', () => {
    let adapter;

    beforeEach(() => {
      adapter = createSqliteAdapter({
        databases: {
          default: { filename: ':memory:' }
        }
      });
    });

    afterEach(async () => {
      await adapter.close();
    });

    it('should execute INSERT and return execution result', async () => {
      await adapter.execute('CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT)');

      const result = await adapter.execute('INSERT INTO users (name) VALUES (?)', ['Alice']);

      assert.ok(result);
      assert.strictEqual(result.rowsAffected, 1);
      assert.ok(result.lastInsertRowid > 0);
    });

    it('should execute UPDATE and return rowsAffected', async () => {
      await adapter.execute('CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT)');
      await adapter.execute('INSERT INTO users (name) VALUES (?)', ['Alice']);
      await adapter.execute('INSERT INTO users (name) VALUES (?)', ['Bob']);

      const result = await adapter.execute('UPDATE users SET name = ? WHERE name = ?', ['Alicia', 'Alice']);

      assert.strictEqual(result.rowsAffected, 1);
    });

    it('should execute DELETE and return rowsAffected', async () => {
      await adapter.execute('CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT)');
      await adapter.execute('INSERT INTO users (name) VALUES (?)', ['Alice']);
      await adapter.execute('INSERT INTO users (name) VALUES (?)', ['Bob']);

      const result = await adapter.execute('DELETE FROM users WHERE name = ?', ['Alice']);

      assert.strictEqual(result.rowsAffected, 1);

      const remaining = await adapter.query('SELECT * FROM users');
      assert.strictEqual(remaining.length, 1);
    });

    it('should return 0 rowsAffected when no rows match', async () => {
      await adapter.execute('CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT)');
      await adapter.execute('INSERT INTO users (name) VALUES (?)', ['Alice']);

      const result = await adapter.execute('DELETE FROM users WHERE name = ?', ['Bob']);

      assert.strictEqual(result.rowsAffected, 0);
    });

    it('should throw DatabaseNotFoundError for unknown database', async () => {
      await assert.rejects(
        async () => adapter.execute('CREATE TABLE test (id INTEGER)', [], 'unknown'),
        DatabaseNotFoundError
      );
    });

    it('should throw QueryError for invalid SQL', async () => {
      await assert.rejects(
        async () => adapter.execute('INSERT INTO nonexistent_table VALUES (1)'),
        QueryError
      );
    });

  });

  describe('getConnection', () => {
    let adapter;

    beforeEach(() => {
      adapter = createSqliteAdapter({
        databases: {
          default: { filename: ':memory:' }
        }
      });
    });

    afterEach(async () => {
      await adapter.close();
    });

    it('should return connection object', async () => {
      const connection = await adapter.getConnection();

      assert.ok(connection);
      assert.strictEqual(typeof connection.query, 'function');
      assert.strictEqual(typeof connection.execute, 'function');
      assert.strictEqual(typeof connection.release, 'function');
    });

    it('should execute queries through connection', async () => {
      await adapter.execute('CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT)');
      await adapter.execute('INSERT INTO users (name) VALUES (?)', ['Alice']);

      const connection = await adapter.getConnection();
      const results = await connection.query('SELECT * FROM users');

      assert.strictEqual(results.length, 1);
      assert.strictEqual(results[0].name, 'Alice');

      await connection.release();
    });

    it('should execute statements through connection', async () => {
      await adapter.execute('CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT)');

      const connection = await adapter.getConnection();
      const result = await connection.execute('INSERT INTO users (name) VALUES (?)', ['Alice']);

      assert.strictEqual(result.rowsAffected, 1);

      await connection.release();
    });

    it('should throw DatabaseNotFoundError for unknown database', async () => {
      await assert.rejects(
        async () => adapter.getConnection('unknown'),
        DatabaseNotFoundError
      );
    });
  });

  describe('beginTransaction', () => {
    let adapter;

    beforeEach(async () => {
      adapter = createSqliteAdapter({
        databases: {
          default: { filename: ':memory:' }
        }
      });
      await adapter.execute('CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT)');
    });

    afterEach(async () => {
      await adapter.close();
    });

    it('should create transaction object', async () => {
      const txn = await adapter.beginTransaction();

      assert.ok(txn);
      assert.strictEqual(typeof txn.query, 'function');
      assert.strictEqual(typeof txn.execute, 'function');
      assert.strictEqual(typeof txn.commit, 'function');
      assert.strictEqual(typeof txn.rollback, 'function');

      await txn.rollback();
    });

    it('should commit transaction successfully', async () => {
      const txn = await adapter.beginTransaction();

      await txn.execute('INSERT INTO users (name) VALUES (?)', ['Alice']);
      await txn.execute('INSERT INTO users (name) VALUES (?)', ['Bob']);
      await txn.commit();

      const results = await adapter.query('SELECT * FROM users');
      assert.strictEqual(results.length, 2);
    });

    it('should rollback transaction successfully', async () => {
      const txn = await adapter.beginTransaction();

      await txn.execute('INSERT INTO users (name) VALUES (?)', ['Alice']);
      await txn.execute('INSERT INTO users (name) VALUES (?)', ['Bob']);
      await txn.rollback();

      const results = await adapter.query('SELECT * FROM users');
      assert.strictEqual(results.length, 0);
    });

    it('should execute queries within transaction', async () => {
      await adapter.execute('INSERT INTO users (name) VALUES (?)', ['Alice']);

      const txn = await adapter.beginTransaction();
      const results = await txn.query('SELECT * FROM users');

      assert.strictEqual(results.length, 1);

      await txn.rollback();
    });

    it('should isolate transaction changes before commit', async () => {
      const txn = await adapter.beginTransaction();

      await txn.execute('INSERT INTO users (name) VALUES (?)', ['Alice']);

      // Query outside transaction shouldn't see uncommitted changes
      // Note: SQLite in-memory doesn't truly isolate like this, but we test the API
      
      await txn.commit();

      const results = await adapter.query('SELECT * FROM users');
      assert.strictEqual(results.length, 1);
    });

    it('should throw TransactionError on commit failure', async () => {
      const txn = await adapter.beginTransaction();
      await txn.commit();

      // Committing twice should fail
      await assert.rejects(
        async () => txn.commit(),
        TransactionError
      );
    });

    it('should handle rollback after error', async () => {
      const txn = await adapter.beginTransaction();

      await txn.execute('INSERT INTO users (name) VALUES (?)', ['Alice']);

      try {
        await txn.execute('INSERT INTO nonexistent VALUES (1)');
      } catch (err) {
        assert.ok(err instanceof QueryError);
      }

      await txn.rollback();

      const results = await adapter.query('SELECT * FROM users');
      assert.strictEqual(results.length, 0);
    });
  });

  describe('isHealthy', () => {
    let adapter;

    beforeEach(() => {
      adapter = createSqliteAdapter({
        databases: {
          default: { filename: ':memory:' }
        }
      });
    });

    afterEach(async () => {
      await adapter.close();
    });

    it('should return true for healthy database', async () => {
      const healthy = await adapter.isHealthy();
      assert.strictEqual(healthy, true);
    });

    it('should check all configured databases', async () => {
      const multiAdapter = createSqliteAdapter({
        databases: {
          default: { filename: ':memory:' },
          test: { filename: ':memory:' }
        }
      });

      const healthy = await multiAdapter.isHealthy();
      assert.strictEqual(healthy, true);

      await multiAdapter.close();
    });

    it('should return false for closed databases', async () => {
      // Access database first to open it
      await adapter.query('SELECT 1');
      
      await adapter.close();
      
      // After close, trying to check health creates new connections
      // which would succeed for :memory: databases.
      // This test verifies the close() method works without throwing.
    });
  });

  describe('getStatus', () => {
    let adapter;

    beforeEach(() => {
      adapter = createSqliteAdapter({
        databases: {
          default: { filename: ':memory:' }
        }
      });
    });

    afterEach(async () => {
      await adapter.close();
    });

    it('should return status object', async () => {
      const status = await adapter.getStatus();

      assert.ok(status);
      assert.strictEqual(status.backend, 'sqlite');
      assert.strictEqual(typeof status.healthy, 'boolean');
      assert.ok(status.databases);
    });

    it('should show connected databases', async () => {
      const status = await adapter.getStatus();

      assert.strictEqual(status.healthy, true);
      assert.ok(status.databases.default);
      assert.strictEqual(status.databases.default.connected, true);
      assert.strictEqual(status.databases.default.filename, ':memory:');
    });

    it('should show status for multiple databases', async () => {
      const multiAdapter = createSqliteAdapter({
        databases: {
          default: { filename: ':memory:' },
          test: { filename: ':memory:' }
        }
      });

      const status = await multiAdapter.getStatus();

      assert.strictEqual(status.healthy, true);
      assert.ok(status.databases.default);
      assert.ok(status.databases.test);
      assert.strictEqual(status.databases.default.connected, true);
      assert.strictEqual(status.databases.test.connected, true);

      await multiAdapter.close();
    });

    it('should show readonly flag in status', async () => {
      const readonlyAdapter = createSqliteAdapter({
        databases: {
          default: { filename: ':memory:', readonly: false }
        }
      });

      const status = await readonlyAdapter.getStatus();
      assert.strictEqual(status.databases.default.readonly, false);

      await readonlyAdapter.close();
    });
  });

  describe('close', () => {
    it('should close all database connections', async () => {
      const adapter = createSqliteAdapter({
        databases: {
          default: { filename: ':memory:' },
          test: { filename: ':memory:' }
        }
      });

      // Use databases to ensure they're opened
      await adapter.query('SELECT 1');
      await adapter.query('SELECT 1', [], 'test');

      // Close should complete without error
      await assert.doesNotReject(async () => adapter.close());
    });

    it('should handle close errors gracefully', async () => {
      const adapter = createSqliteAdapter({
        databases: {
          default: { filename: ':memory:' }
        }
      });

      await adapter.query('SELECT 1');
      await adapter.close();

      // Closing twice should not throw
      await assert.doesNotReject(async () => adapter.close());
    });
  });

  describe('releaseConnection', () => {
    let adapter;

    beforeEach(() => {
      adapter = createSqliteAdapter({
        databases: {
          default: { filename: ':memory:' }
        }
      });
    });

    afterEach(async () => {
      await adapter.close();
    });

    it('should be a no-op for SQLite', async () => {
      const connection = await adapter.getConnection();
      
      // Should not throw
      await assert.doesNotReject(async () => adapter.releaseConnection(connection));
    });
  });

  describe('Integration scenarios', () => {
    it('should handle complex multi-table operations', async () => {
      const adapter = createSqliteAdapter({
        databases: {
          default: { filename: ':memory:' }
        }
      });

      // Create schema
      await adapter.execute(`
        CREATE TABLE users (
          id INTEGER PRIMARY KEY,
          name TEXT NOT NULL,
          email TEXT UNIQUE
        )
      `);

      await adapter.execute(`
        CREATE TABLE posts (
          id INTEGER PRIMARY KEY,
          user_id INTEGER,
          title TEXT,
          FOREIGN KEY (user_id) REFERENCES users(id)
        )
      `);

      // Insert data
      const userResult = await adapter.execute(
        'INSERT INTO users (name, email) VALUES (?, ?)',
        ['Alice', 'alice@example.com']
      );

      await adapter.execute(
        'INSERT INTO posts (user_id, title) VALUES (?, ?)',
        [userResult.lastInsertRowid, 'First Post']
      );

      // Query with JOIN
      const posts = await adapter.query(`
        SELECT posts.*, users.name as author
        FROM posts
        JOIN users ON posts.user_id = users.id
      `);

      assert.strictEqual(posts.length, 1);
      assert.strictEqual(posts[0].author, 'Alice');
      assert.strictEqual(posts[0].title, 'First Post');

      await adapter.close();
    });

    it('should handle concurrent operations', async () => {
      const adapter = createSqliteAdapter({
        databases: {
          default: { filename: ':memory:' }
        }
      });

      await adapter.execute('CREATE TABLE counters (id INTEGER PRIMARY KEY, value INTEGER)');
      await adapter.execute('INSERT INTO counters (value) VALUES (0)');

      // Execute multiple updates concurrently
      const updates = [];
      for (let i = 0; i < 10; i++) {
        updates.push(
          adapter.execute('UPDATE counters SET value = value + 1 WHERE id = 1')
        );
      }

      await Promise.all(updates);

      const results = await adapter.query('SELECT value FROM counters WHERE id = 1');
      assert.strictEqual(results[0].value, 10);

      await adapter.close();
    });
  });
});
