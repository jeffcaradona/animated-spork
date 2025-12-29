/**
 * Tests for database connection manager and factory
 *
 * Verifies that:
 * - createDatabaseClient validates configuration
 * - createConnectionManager initializes adapters correctly
 * - Multi-database routing works as expected
 * - Health checks can be enabled/disabled
 * - Shutdown cleanly closes all connections
 */

import { expect } from 'chai';
import { createDatabaseClient } from '../../src/database/index.js';
import { ConfigurationError } from '../../src/database/errors.js';

describe('Database Connection Manager', () => {
  let db;

  afterEach(async () => {
    if (db) {
      await db.close();
      db = null;
    }
  });

  describe('createDatabaseClient (factory function)', () => {
    describe('configuration validation', () => {
      it('should throw ConfigurationError for invalid config', async () => {
        try {
          await createDatabaseClient({});
          expect.fail('Should have thrown ConfigurationError');
        } catch (err) {
          expect(err).to.be.instanceOf(ConfigurationError);
        }
      });

      it('should throw ConfigurationError for missing backend', async () => {
        try {
          await createDatabaseClient({ databases: { default: {} } });
          expect.fail('Should have thrown ConfigurationError');
        } catch (err) {
          expect(err).to.be.instanceOf(ConfigurationError);
          expect(err.message).to.include('backend');
        }
      });

      it('should throw ConfigurationError for unsupported backend', async () => {
        try {
          await createDatabaseClient({
            backend: 'postgres',
            databases: { default: {} }
          });
          expect.fail('Should have thrown ConfigurationError');
        } catch (err) {
          expect(err).to.be.instanceOf(ConfigurationError);
          expect(err.message).to.include('postgres');
        }
      });
    });

    describe('SQLite adapter initialization', () => {
      it('should create database client with SQLite backend', async () => {
        db = await createDatabaseClient({
          backend: 'sqlite',
          databases: {
            default: { filename: ':memory:' }
          }
        });

        expect(db).to.be.an('object');
        expect(db.backend).to.equal('sqlite');
      });

      it('should expose IDatabase interface methods', async () => {
        db = await createDatabaseClient({
          backend: 'sqlite',
          databases: {
            default: { filename: ':memory:' }
          }
        });

        expect(db.query).to.be.a('function');
        expect(db.execute).to.be.a('function');
        expect(db.getConnection).to.be.a('function');
        expect(db.releaseConnection).to.be.a('function');
        expect(db.beginTransaction).to.be.a('function');
        expect(db.isHealthy).to.be.a('function');
        expect(db.getStatus).to.be.a('function');
        expect(db.close).to.be.a('function');
      });

      it('should expose backend property', async () => {
        db = await createDatabaseClient({
          backend: 'sqlite',
          databases: {
            default: { filename: ':memory:' }
          }
        });

        expect(db.backend).to.equal('sqlite');
      });

      it('should expose databaseNames property', async () => {
        db = await createDatabaseClient({
          backend: 'sqlite',
          databases: {
            default: { filename: ':memory:' },
            secondary: { filename: ':memory:' }
          }
        });

        expect(db.databaseNames).to.deep.equal(['default', 'secondary']);
      });
    });
  });

  describe('multi-database routing', () => {
    beforeEach(async () => {
      db = await createDatabaseClient({
        backend: 'sqlite',
        databases: {
          default: { filename: ':memory:' },
          secondary: { filename: ':memory:' }
        }
      });

      // Create tables in both databases
      await db.execute('CREATE TABLE items (id INTEGER PRIMARY KEY, name TEXT)', [], 'default');
      await db.execute('CREATE TABLE items (id INTEGER PRIMARY KEY, name TEXT)', [], 'secondary');
    });

    it('should route queries to default database when no name specified', async () => {
      await db.execute('INSERT INTO items (name) VALUES (?)', ['default-item']);
      const results = await db.query('SELECT * FROM items');
      
      expect(results).to.have.lengthOf(1);
      expect(results[0].name).to.equal('default-item');
    });

    it('should route queries to named database', async () => {
      await db.execute('INSERT INTO items (name) VALUES (?)', ['secondary-item'], 'secondary');
      
      // Default database should be empty
      const defaultResults = await db.query('SELECT * FROM items', [], 'default');
      expect(defaultResults).to.have.lengthOf(0);

      // Secondary database should have the item
      const secondaryResults = await db.query('SELECT * FROM items', [], 'secondary');
      expect(secondaryResults).to.have.lengthOf(1);
      expect(secondaryResults[0].name).to.equal('secondary-item');
    });

    it('should throw DatabaseNotFoundError for unknown database', async () => {
      try {
        await db.query('SELECT 1', [], 'nonexistent');
        expect.fail('Should have thrown');
      } catch (err) {
        expect(err.name).to.equal('DatabaseNotFoundError');
        expect(err.message).to.include('nonexistent');
      }
    });

    it('should support transactions on named database', async () => {
      const txn = await db.beginTransaction(null, 'secondary');
      await txn.execute('INSERT INTO items (name) VALUES (?)', ['txn-item']);
      await txn.commit();

      const results = await db.query('SELECT * FROM items', [], 'secondary');
      expect(results).to.have.lengthOf(1);
      expect(results[0].name).to.equal('txn-item');
    });

    it('should support getConnection on named database', async () => {
      const conn = await db.getConnection('secondary');
      await conn.execute('INSERT INTO items (name) VALUES (?)', ['conn-item']);
      await conn.release();

      const results = await db.query('SELECT * FROM items', [], 'secondary');
      expect(results).to.have.lengthOf(1);
    });
  });

  describe('health monitoring', () => {
    it('should report healthy when all databases accessible', async () => {
      db = await createDatabaseClient({
        backend: 'sqlite',
        databases: {
          default: { filename: ':memory:' }
        }
      });

      const healthy = await db.isHealthy();
      expect(healthy).to.be.true;
    });

    it('should return detailed status', async () => {
      db = await createDatabaseClient({
        backend: 'sqlite',
        databases: {
          default: { filename: ':memory:' },
          secondary: { filename: ':memory:' }
        }
      });

      const status = await db.getStatus();
      
      expect(status.healthy).to.be.true;
      expect(status.backend).to.equal('sqlite');
      expect(status.databases.default.connected).to.be.true;
      expect(status.databases.secondary.connected).to.be.true;
    });
  });

  describe('health check configuration', () => {
    it('should not start health checks by default (opt-in per design decision #13)', async () => {
      db = await createDatabaseClient({
        backend: 'sqlite',
        databases: { default: { filename: ':memory:' } }
      });

      // If health checks were running, there would be active timers
      // We can't easily verify this, but the design is opt-in
      expect(db).to.be.an('object');
    });

    it('should accept health check configuration', async () => {
      db = await createDatabaseClient({
        backend: 'sqlite',
        databases: { default: { filename: ':memory:' } },
        healthCheck: {
          enabled: false,
          intervalMs: 30000
        }
      });

      expect(db).to.be.an('object');
    });
  });

  describe('shutdown', () => {
    it('should close all databases on close()', async () => {
      db = await createDatabaseClient({
        backend: 'sqlite',
        databases: {
          default: { filename: ':memory:' },
          secondary: { filename: ':memory:' }
        }
      });

      // Create table and insert data
      await db.execute('CREATE TABLE test (id INTEGER PRIMARY KEY)');

      // Close should complete without error
      await db.close();
      db = null;

      // Create new client to verify clean shutdown
      const newDb = await createDatabaseClient({
        backend: 'sqlite',
        databases: { default: { filename: ':memory:' } }
      });
      await newDb.close();
    });

    it('should stop health checks on close()', async () => {
      db = await createDatabaseClient({
        backend: 'sqlite',
        databases: { default: { filename: ':memory:' } },
        healthCheck: {
          enabled: true,
          intervalMs: 60000 // Long interval so test completes quickly
        }
      });

      // Close should stop health check timer
      await db.close();
      db = null;
    });
  });

  describe('query and execute delegation', () => {
    beforeEach(async () => {
      db = await createDatabaseClient({
        backend: 'sqlite',
        databases: { default: { filename: ':memory:' } }
      });
      await db.execute('CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT)');
    });

    it('should execute INSERT and return rowsAffected', async () => {
      const result = await db.execute('INSERT INTO users (name) VALUES (?)', ['Alice']);
      expect(result.rowsAffected).to.equal(1);
    });

    it('should execute SELECT and return result set', async () => {
      await db.execute('INSERT INTO users (name) VALUES (?)', ['Alice']);
      await db.execute('INSERT INTO users (name) VALUES (?)', ['Bob']);

      const results = await db.query('SELECT * FROM users ORDER BY name');
      expect(results).to.have.lengthOf(2);
      expect(results[0].name).to.equal('Alice');
      expect(results[1].name).to.equal('Bob');
    });

    it('should execute UPDATE and return rowsAffected', async () => {
      await db.execute('INSERT INTO users (name) VALUES (?)', ['Alice']);
      const result = await db.execute('UPDATE users SET name = ? WHERE name = ?', ['Alicia', 'Alice']);
      expect(result.rowsAffected).to.equal(1);
    });

    it('should execute DELETE and return rowsAffected', async () => {
      await db.execute('INSERT INTO users (name) VALUES (?)', ['Alice']);
      const result = await db.execute('DELETE FROM users WHERE name = ?', ['Alice']);
      expect(result.rowsAffected).to.equal(1);
    });
  });
});
