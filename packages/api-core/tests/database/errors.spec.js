/**
 * Tests for database error hierarchy
 *
 * Verifies that all error classes:
 * - Extend Error correctly
 * - Have appropriate statusCode (4xx or 5xx)
 * - Preserve stack traces
 * - Include context and originalError
 * - Work with helper functions
 */

import { expect } from "chai";
import {
  DatabaseError,
  ConnectionError,
  QueryTimeoutError,
  QueryError,
  ConfigurationError,
  PoolExhaustedError,
  DatabaseNotFoundError,
  TransactionError,
  PermissionError,
  InternalDatabaseError,
  isDatabaseError,
  isClientError,
  isServerError,
} from "../../src/database/errors.js";

describe("Database Errors", () => {
  describe("DatabaseError (base class)", () => {
    it("should extend Error", () => {
      const err = new DatabaseError("Test message", "TEST_CODE");
      expect(err).to.be.instanceOf(Error);
      expect(err).to.be.instanceOf(DatabaseError);
    });

    it("should have required properties", () => {
      const err = new DatabaseError("Test message", "TEST_CODE", 500);
      expect(err.message).to.equal("Test message");
      expect(err.code).to.equal("TEST_CODE");
      expect(err.statusCode).to.equal(500);
      expect(err.name).to.equal("DatabaseError");
    });

    it("should default statusCode to 500", () => {
      const err = new DatabaseError("Test", "TEST");
      expect(err.statusCode).to.equal(500);
    });

    it("should include context object", () => {
      const context = { databaseName: "default", sql: "SELECT 1" };
      const err = new DatabaseError("Test", "TEST", 500, context);
      expect(err.context).to.deep.equal(context);
    });

    it("should include originalError", () => {
      const original = new Error("Original error");
      const err = new DatabaseError("Test", "TEST", 500, {}, original);
      expect(err.originalError).to.equal(original);
    });

    it("should have stack trace", () => {
      const err = new DatabaseError("Test", "TEST");
      expect(err.stack).to.be.a("string");
      expect(err.stack).to.include("DatabaseError");
    });
  });

  describe("ConnectionError", () => {
    it("should be a DatabaseError with correct properties", () => {
      const err = new ConnectionError("Cannot connect", {
        server: "localhost",
      });
      expect(err).to.be.instanceOf(DatabaseError);
      expect(err).to.be.instanceOf(ConnectionError);
      expect(err.name).to.equal("ConnectionError");
      expect(err.code).to.equal("CONNECTION_ERROR");
      expect(err.statusCode).to.equal(503);
      expect(err.message).to.equal("Cannot connect");
      expect(err.context).to.deep.equal({ server: "localhost" });
    });

    it("should accept originalError", () => {
      const original = new Error("Network timeout");
      const err = new ConnectionError("Failed", {}, original);
      expect(err.originalError).to.equal(original);
    });
  });

  describe("QueryTimeoutError", () => {
    it("should be a DatabaseError with correct properties", () => {
      const err = new QueryTimeoutError("Timeout", { timeoutMs: 30000 });
      expect(err).to.be.instanceOf(DatabaseError);
      expect(err.name).to.equal("QueryTimeoutError");
      expect(err.code).to.equal("QUERY_TIMEOUT");
      expect(err.statusCode).to.equal(504);
    });
  });

  describe("QueryError", () => {
    it("should be a DatabaseError with correct properties", () => {
      const err = new QueryError("Invalid SQL", { sql: "SELECT * FORM users" });
      expect(err).to.be.instanceOf(DatabaseError);
      expect(err.name).to.equal("QueryError");
      expect(err.code).to.equal("QUERY_ERROR");
      expect(err.statusCode).to.equal(400);
    });
  });

  describe("ConfigurationError", () => {
    it("should be a DatabaseError with correct properties", () => {
      const err = new ConfigurationError("Missing server", { config: {} });
      expect(err).to.be.instanceOf(DatabaseError);
      expect(err.name).to.equal("ConfigurationError");
      expect(err.code).to.equal("CONFIGURATION_ERROR");
      expect(err.statusCode).to.equal(400);
    });
  });

  describe("PoolExhaustedError", () => {
    it("should be a DatabaseError with correct properties", () => {
      const err = new PoolExhaustedError("No connections", { poolSize: 20 });
      expect(err).to.be.instanceOf(DatabaseError);
      expect(err.name).to.equal("PoolExhaustedError");
      expect(err.code).to.equal("POOL_EXHAUSTED");
      expect(err.statusCode).to.equal(503);
    });
  });

  describe("DatabaseNotFoundError", () => {
    it("should be a DatabaseError with correct properties", () => {
      const err = new DatabaseNotFoundError("reporting", {
        available: ["default"],
      });
      expect(err).to.be.instanceOf(DatabaseError);
      expect(err.name).to.equal("DatabaseNotFoundError");
      expect(err.code).to.equal("DATABASE_NOT_FOUND");
      expect(err.statusCode).to.equal(400);
      expect(err.message).to.equal("Database 'reporting' is not configured");
      expect(err.context.databaseName).to.equal("reporting");
      expect(err.context.available).to.deep.equal(["default"]);
    });
  });

  describe("TransactionError", () => {
    it("should be a DatabaseError with correct properties", () => {
      const err = new TransactionError("Commit failed", {
        operation: "commit",
      });
      expect(err).to.be.instanceOf(DatabaseError);
      expect(err.name).to.equal("TransactionError");
      expect(err.code).to.equal("TRANSACTION_ERROR");
      expect(err.statusCode).to.equal(500);
    });
  });

  describe("PermissionError", () => {
    it("should be a DatabaseError with correct properties", () => {
      const err = new PermissionError("Access denied", {
        user: "api",
        operation: "INSERT",
      });
      expect(err).to.be.instanceOf(DatabaseError);
      expect(err.name).to.equal("PermissionError");
      expect(err.code).to.equal("PERMISSION_DENIED");
      expect(err.statusCode).to.equal(403);
    });
  });

  describe("InternalDatabaseError", () => {
    it("should be a DatabaseError with correct properties", () => {
      const err = new InternalDatabaseError("Driver error", {
        driver: "mssql",
      });
      expect(err).to.be.instanceOf(DatabaseError);
      expect(err.name).to.equal("InternalDatabaseError");
      expect(err.code).to.equal("INTERNAL_DATABASE_ERROR");
      expect(err.statusCode).to.equal(500);
    });
  });

  describe("Helper Functions", () => {
    describe("isDatabaseError()", () => {
      it("should return true for DatabaseError instances", () => {
        const err = new DatabaseError("Test", "TEST");
        expect(isDatabaseError(err)).to.be.true;
      });

      it("should return true for DatabaseError subclasses", () => {
        expect(isDatabaseError(new ConnectionError("Test", {}))).to.be.true;
        expect(isDatabaseError(new QueryError("Test", {}))).to.be.true;
        expect(isDatabaseError(new TransactionError("Test", {}))).to.be.true;
      });

      it("should return false for regular Error", () => {
        const err = new Error("Not a database error");
        expect(isDatabaseError(err)).to.be.false;
      });

      it("should return false for non-errors", () => {
        expect(isDatabaseError(null)).to.be.false;
        expect(isDatabaseError(undefined)).to.be.false;
        expect(isDatabaseError({})).to.be.false;
        expect(isDatabaseError("string")).to.be.false;
      });
    });

    describe("isClientError()", () => {
      it("should return true for 4xx errors", () => {
        expect(isClientError(new QueryError("Test", {}))).to.be.true;
        expect(isClientError(new ConfigurationError("Test", {}))).to.be.true;
        expect(isClientError(new DatabaseNotFoundError("test", {}))).to.be.true;
        expect(isClientError(new PermissionError("Test", {}))).to.be.true;
      });

      it("should return false for 5xx errors", () => {
        expect(isClientError(new ConnectionError("Test", {}))).to.be.false;
        expect(isClientError(new QueryTimeoutError("Test", {}))).to.be.false;
        expect(isClientError(new TransactionError("Test", {}))).to.be.false;
        expect(isClientError(new InternalDatabaseError("Test", {}))).to.be
          .false;
      });

      it("should return false for non-database errors", () => {
        expect(isClientError(new Error("Test"))).to.be.false;
      });
    });

    describe("isServerError()", () => {
      it("should return true for 5xx errors", () => {
        expect(isServerError(new ConnectionError("Test", {}))).to.be.true;
        expect(isServerError(new QueryTimeoutError("Test", {}))).to.be.true;
        expect(isServerError(new PoolExhaustedError("Test", {}))).to.be.true;
        expect(isServerError(new TransactionError("Test", {}))).to.be.true;
        expect(isServerError(new InternalDatabaseError("Test", {}))).to.be.true;
      });

      it("should return false for 4xx errors", () => {
        expect(isServerError(new QueryError("Test", {}))).to.be.false;
        expect(isServerError(new ConfigurationError("Test", {}))).to.be.false;
        expect(isServerError(new DatabaseNotFoundError("test", {}))).to.be
          .false;
        expect(isServerError(new PermissionError("Test", {}))).to.be.false;
      });

      it("should return false for non-database errors", () => {
        expect(isServerError(new Error("Test"))).to.be.false;
      });
    });
  });

  describe("Express Middleware Compatibility", () => {
    it("should work with Express next(error) pattern", () => {
      const err = new ConnectionError("Database unavailable", {
        databaseName: "default",
      });

      // Simulate Express error middleware
      const mockNext = (error) => {
        expect(error).to.be.instanceOf(Error);
        expect(error.statusCode).to.equal(503);
        expect(error.code).to.equal("CONNECTION_ERROR");
        expect(error.context.databaseName).to.equal("default");
      };

      mockNext(err);
    });

    it("should provide statusCode for response routing", () => {
      const errors = [
        new QueryError("Bad SQL", {}),
        new ConfigurationError("Invalid config", {}),
        new ConnectionError("No connection", {}),
        new QueryTimeoutError("Timeout", {}),
        new PermissionError("Denied", {}),
        new TransactionError("Failed", {}),
      ];

      errors.forEach((err) => {
        expect(err.statusCode).to.be.a("number");
        expect(err.statusCode).to.be.at.least(400);
        expect(err.statusCode).to.be.below(600);
      });
    });
  });

  describe("Error Classification for Retry Logic", () => {
    it("should identify client errors that should not be retried", () => {
      const clientErrors = [
        new QueryError("Invalid SQL", {}),
        new ConfigurationError("Bad config", {}),
        new DatabaseNotFoundError("unknown", {}),
        new PermissionError("Access denied", {}),
      ];

      clientErrors.forEach((err) => {
        expect(isClientError(err)).to.be.true;
        expect(isServerError(err)).to.be.false;
      });
    });

    it("should identify server errors that may be transient", () => {
      const serverErrors = [
        new ConnectionError("Network issue", {}),
        new QueryTimeoutError("Slow query", {}),
        new PoolExhaustedError("No connections", {}),
        new TransactionError("Deadlock", {}),
        new InternalDatabaseError("Driver crash", {}),
      ];

      serverErrors.forEach((err) => {
        expect(isServerError(err)).to.be.true;
        expect(isClientError(err)).to.be.false;
      });
    });
  });

  describe("Error Context Preservation", () => {
    it("should preserve all context for debugging", () => {
      const context = {
        databaseName: "default",
        server: "localhost",
        port: 1433,
        attempt: 3,
        duration: 5000,
        lastError: "Connection timeout",
      };

      const err = new ConnectionError("Failed to connect", context);

      expect(err.context).to.deep.equal(context);
      expect(err.context.databaseName).to.equal("default");
      expect(err.context.attempt).to.equal(3);
    });

    it("should chain original driver errors", () => {
      const driverError = new Error("ECONNREFUSED");
      driverError.code = "ECONNREFUSED";
      driverError.errno = -111;

      const err = new ConnectionError(
        "Cannot connect to database",
        { server: "localhost", port: 1433 },
        driverError
      );

      expect(err.originalError).to.equal(driverError);
      expect(err.originalError.code).to.equal("ECONNREFUSED");
    });
  });
});
