/**
 * Tests for database configuration validation
 *
 * Verifies that validateDatabaseConfig and related functions:
 * - Validate required properties
 * - Validate backend types
 * - Validate SQLite-specific configuration
 * - Validate MSSQL-specific configuration
 * - Validate health check configuration
 * - Throw ConfigurationError with helpful context
 */

import { expect } from "chai";
import {
  validateDatabaseConfig,
  validateDatabaseConfigForBackend,
  validateHealthCheckConfig,
  SUPPORTED_BACKENDS,
} from "../../src/database/validation.js";
import { ConfigurationError } from "../../src/database/errors.js";
import { MSSQL_TEST_PASSWORD } from "../test-fixtures.js";

describe("Database Validation", () => {
  describe("SUPPORTED_BACKENDS", () => {
    it("should include sqlite and mssql", () => {
      expect(SUPPORTED_BACKENDS).to.include("sqlite");
      expect(SUPPORTED_BACKENDS).to.include("mssql");
    });

    it("should be frozen", () => {
      expect(Object.isFrozen(SUPPORTED_BACKENDS)).to.be.true;
    });
  });

  describe("validateDatabaseConfig - config object validation", () => {
    it("should throw if config is undefined", () => {
      expect(() => validateDatabaseConfig(undefined))
        .to.throw(ConfigurationError)
        .with.property("message", "Database configuration must be an object");
    });

    it("should throw if config is null", () => {
      expect(() => validateDatabaseConfig(null))
        .to.throw(ConfigurationError)
        .with.property("message", "Database configuration must be an object");
    });

    it("should throw if config is not an object", () => {
      expect(() => validateDatabaseConfig("invalid"))
        .to.throw(ConfigurationError)
        .with.property("message", "Database configuration must be an object");
    });
  });

  describe("validateDatabaseConfig - backend validation", () => {
    it("should throw if backend is missing", () => {
      expect(() => validateDatabaseConfig({ databases: {} }))
        .to.throw(ConfigurationError)
        .with.property(
          "message",
          "Database configuration requires a backend property"
        );
    });

    it("should throw if backend is not a string", () => {
      expect(() => validateDatabaseConfig({ backend: 123, databases: {} }))
        .to.throw(ConfigurationError)
        .with.property("message", "Database backend must be a string");
    });

    it("should throw if backend is unsupported", () => {
      expect(() =>
        validateDatabaseConfig({ backend: "postgres", databases: {} })
      )
        .to.throw(ConfigurationError)
        .with.property("message", "Unsupported database backend: 'postgres'");
    });

    it("should include supported backends in error context", () => {
      try {
        validateDatabaseConfig({ backend: "postgres", databases: {} });
      } catch (err) {
        expect(err.context.supportedBackends).to.deep.equal(SUPPORTED_BACKENDS);
      }
    });
  });

  describe("validateDatabaseConfig - databases object validation", () => {
    it("should throw if databases is missing", () => {
      expect(() => validateDatabaseConfig({ backend: "sqlite" }))
        .to.throw(ConfigurationError)
        .with.property(
          "message",
          "Database configuration requires a databases object"
        );
    });

    it("should throw if databases is not an object", () => {
      expect(() =>
        validateDatabaseConfig({ backend: "sqlite", databases: "invalid" })
      )
        .to.throw(ConfigurationError)
        .with.property(
          "message",
          "Database configuration requires a databases object"
        );
    });

    it("should throw if databases is empty", () => {
      expect(() => validateDatabaseConfig({ backend: "sqlite", databases: {} }))
        .to.throw(ConfigurationError)
        .with.property("message", "At least one database must be configured");
    });
  });

  describe("validateDatabaseConfig - valid configurations", () => {
    it("should accept valid SQLite config", () => {
      expect(() =>
        validateDatabaseConfig({
          backend: "sqlite",
          databases: {
            default: { filename: ":memory:" },
          },
        })
      ).to.not.throw();
    });

    it("should accept valid MSSQL config", () => {
      expect(() =>
        validateDatabaseConfig({
          backend: "mssql",
          databases: {
            default: {
              server: "localhost",
              database: "testdb",
              authentication: {
                type: "default",
                options: {
                  userName: "sa",
                  password: MSSQL_TEST_PASSWORD,
                },
              },
            },
          },
        })
      ).to.not.throw();
    });

    it("should accept multiple databases", () => {
      expect(() =>
        validateDatabaseConfig({
          backend: "sqlite",
          databases: {
            default: { filename: ":memory:" },
            reporting: { filename: "./reporting.db", readonly: true },
          },
        })
      ).to.not.throw();
    });
  });

  describe("validateDatabaseConfigForBackend - common validation", () => {
    it("should throw if dbConfig is undefined", () => {
      expect(() =>
        validateDatabaseConfigForBackend("test", undefined, "sqlite")
      )
        .to.throw(ConfigurationError)
        .with.property(
          "message",
          "Database 'test' configuration must be an object"
        );
    });

    it("should throw if dbConfig is not an object", () => {
      expect(() =>
        validateDatabaseConfigForBackend("test", "invalid", "sqlite")
      )
        .to.throw(ConfigurationError)
        .with.property(
          "message",
          "Database 'test' configuration must be an object"
        );
    });
  });

  describe("validateDatabaseConfigForBackend - SQLite validation", () => {
    it("should accept empty config (defaults to :memory:)", () => {
      expect(() =>
        validateDatabaseConfigForBackend("test", {}, "sqlite")
      ).to.not.throw();
    });

    it("should accept valid filename", () => {
      expect(() =>
        validateDatabaseConfigForBackend(
          "test",
          { filename: "./test.db" },
          "sqlite"
        )
      ).to.not.throw();
    });

    it("should throw if filename is not a string", () => {
      expect(() =>
        validateDatabaseConfigForBackend("test", { filename: 123 }, "sqlite")
      )
        .to.throw(ConfigurationError)
        .with.property("message", "Database 'test' filename must be a string");
    });

    it("should accept valid readonly flag", () => {
      expect(() =>
        validateDatabaseConfigForBackend("test", { readonly: true }, "sqlite")
      ).to.not.throw();
    });

    it("should throw if readonly is not a boolean", () => {
      expect(() =>
        validateDatabaseConfigForBackend("test", { readonly: "yes" }, "sqlite")
      )
        .to.throw(ConfigurationError)
        .with.property("message", "Database 'test' readonly must be a boolean");
    });

    it("should accept valid timeout", () => {
      expect(() =>
        validateDatabaseConfigForBackend("test", { timeout: 5000 }, "sqlite")
      ).to.not.throw();
    });

    it("should throw if timeout is not a number", () => {
      expect(() =>
        validateDatabaseConfigForBackend("test", { timeout: "5000" }, "sqlite")
      )
        .to.throw(ConfigurationError)
        .with.property(
          "message",
          "Database 'test' timeout must be a positive number"
        );
    });

    it("should throw if timeout is not positive", () => {
      expect(() =>
        validateDatabaseConfigForBackend("test", { timeout: 0 }, "sqlite")
      )
        .to.throw(ConfigurationError)
        .with.property(
          "message",
          "Database 'test' timeout must be a positive number"
        );
    });
  });

  describe("validateDatabaseConfigForBackend - MSSQL validation", () => {
    const validMssqlConfig = {
      server: "localhost",
      database: "testdb",
      authentication: {
        type: "default",
        options: {
          userName: "sa",
          password: MSSQL_TEST_PASSWORD,
        },
      },
    };

    it("should accept valid MSSQL config", () => {
      expect(() =>
        validateDatabaseConfigForBackend("test", validMssqlConfig, "mssql")
      ).to.not.throw();
    });

    it("should throw if server is missing", () => {
      const config = { ...validMssqlConfig };
      delete config.server;
      expect(() => validateDatabaseConfigForBackend("test", config, "mssql"))
        .to.throw(ConfigurationError)
        .with.property("message", "Database 'test' requires a server property");
    });

    it("should throw if database is missing", () => {
      const config = { ...validMssqlConfig };
      delete config.database;
      expect(() => validateDatabaseConfigForBackend("test", config, "mssql"))
        .to.throw(ConfigurationError)
        .with.property(
          "message",
          "Database 'test' requires a database property"
        );
    });

    it("should throw if authentication is missing", () => {
      const config = { ...validMssqlConfig };
      delete config.authentication;
      expect(() => validateDatabaseConfigForBackend("test", config, "mssql"))
        .to.throw(ConfigurationError)
        .with.property(
          "message",
          "Database 'test' requires an authentication object"
        );
    });

    it("should throw if authentication.type is missing", () => {
      const config = {
        ...validMssqlConfig,
        authentication: { options: {} },
      };
      expect(() => validateDatabaseConfigForBackend("test", config, "mssql"))
        .to.throw(ConfigurationError)
        .with.property(
          "message",
          "Database 'test' authentication requires a type property"
        );
    });

    it("should throw if authentication.options is missing for type default", () => {
      const config = {
        ...validMssqlConfig,
        authentication: { type: "default" },
      };
      expect(() => validateDatabaseConfigForBackend("test", config, "mssql"))
        .to.throw(ConfigurationError)
        .with.property(
          "message",
          "Database 'test' authentication requires options for type 'default'"
        );
    });

    it("should throw if userName is missing", () => {
      const config = {
        ...validMssqlConfig,
        authentication: {
          type: "default",
          options: { password: MSSQL_TEST_PASSWORD },
        },
      };
      expect(() => validateDatabaseConfigForBackend("test", config, "mssql"))
        .to.throw(ConfigurationError)
        .with.property(
          "message",
          "Database 'test' authentication options requires userName"
        );
    });

    it("should throw if password is missing", () => {
      const config = {
        ...validMssqlConfig,
        authentication: {
          type: "default",
          options: { userName: "sa" },
        },
      };
      expect(() => validateDatabaseConfigForBackend("test", config, "mssql"))
        .to.throw(ConfigurationError)
        .with.property(
          "message",
          "Database 'test' authentication options requires password"
        );
    });
  });

  describe("validateDatabaseConfigForBackend - MSSQL pool configuration", () => {
    const validMssqlConfig = {
      server: "localhost",
      database: "testdb",
      authentication: {
        type: "default",
        options: {
          userName: "sa",
          password: MSSQL_TEST_PASSWORD,
        },
      },
    };

    it("should accept valid pool config", () => {
      const config = {
        ...validMssqlConfig,
        pool: {
          min: 5,
          max: 20,
          idleTimeoutMillis: 30000,
          acquireTimeoutMillis: 10000,
        },
      };
      expect(() =>
        validateDatabaseConfigForBackend("test", config, "mssql")
      ).to.not.throw();
    });

    it("should throw if pool is not an object", () => {
      const config = { ...validMssqlConfig, pool: "invalid" };
      expect(() => validateDatabaseConfigForBackend("test", config, "mssql"))
        .to.throw(ConfigurationError)
        .with.property("message", "Database 'test' pool must be an object");
    });

    it("should throw if pool.min is negative", () => {
      const config = { ...validMssqlConfig, pool: { min: -1 } };
      expect(() => validateDatabaseConfigForBackend("test", config, "mssql"))
        .to.throw(ConfigurationError)
        .with.property(
          "message",
          "Database 'test' pool.min must be a non-negative number"
        );
    });

    it("should accept pool.min of 0", () => {
      const config = { ...validMssqlConfig, pool: { min: 0 } };
      expect(() =>
        validateDatabaseConfigForBackend("test", config, "mssql")
      ).to.not.throw();
    });

    it("should throw if pool.max is less than 1", () => {
      const config = { ...validMssqlConfig, pool: { max: 0 } };
      expect(() => validateDatabaseConfigForBackend("test", config, "mssql"))
        .to.throw(ConfigurationError)
        .with.property(
          "message",
          "Database 'test' pool.max must be a positive number"
        );
    });

    it("should throw if pool.min > pool.max", () => {
      const config = { ...validMssqlConfig, pool: { min: 10, max: 5 } };
      expect(() => validateDatabaseConfigForBackend("test", config, "mssql"))
        .to.throw(ConfigurationError)
        .with.property(
          "message",
          "Database 'test' pool.min cannot be greater than pool.max"
        );
    });

    it("should throw if idleTimeoutMillis is negative", () => {
      const config = { ...validMssqlConfig, pool: { idleTimeoutMillis: -1 } };
      expect(() => validateDatabaseConfigForBackend("test", config, "mssql"))
        .to.throw(ConfigurationError)
        .with.property(
          "message",
          "Database 'test' pool.idleTimeoutMillis must be a non-negative number"
        );
    });

    it("should throw if acquireTimeoutMillis is negative", () => {
      const config = {
        ...validMssqlConfig,
        pool: { acquireTimeoutMillis: -1 },
      };
      expect(() => validateDatabaseConfigForBackend("test", config, "mssql"))
        .to.throw(ConfigurationError)
        .with.property(
          "message",
          "Database 'test' pool.acquireTimeoutMillis must be a non-negative number"
        );
    });
  });

  describe("validateDatabaseConfigForBackend - MSSQL options validation", () => {
    const validMssqlConfig = {
      server: "localhost",
      database: "testdb",
      authentication: {
        type: "default",
        options: {
          userName: "sa",
          password: MSSQL_TEST_PASSWORD,
        },
      },
    };

    it("should throw if options is not an object", () => {
      const config = { ...validMssqlConfig, options: "invalid" };
      expect(() => validateDatabaseConfigForBackend("test", config, "mssql"))
        .to.throw(ConfigurationError)
        .with.property("message", "Database 'test' options must be an object");
    });

    it("should accept valid options object", () => {
      const config = {
        ...validMssqlConfig,
        options: { encrypt: true, trustServerCertificate: false },
      };
      expect(() =>
        validateDatabaseConfigForBackend("test", config, "mssql")
      ).to.not.throw();
    });
  });

  describe("validateHealthCheckConfig", () => {
    it("should throw if healthCheck is not an object", () => {
      expect(() => validateHealthCheckConfig("invalid"))
        .to.throw(ConfigurationError)
        .with.property("message", "healthCheck must be an object");
    });

    it("should accept empty object", () => {
      expect(() => validateHealthCheckConfig({})).to.not.throw();
    });

    it("should accept valid enabled flag", () => {
      expect(() => validateHealthCheckConfig({ enabled: true })).to.not.throw();
      expect(() =>
        validateHealthCheckConfig({ enabled: false })
      ).to.not.throw();
    });

    it("should throw if enabled is not a boolean", () => {
      expect(() => validateHealthCheckConfig({ enabled: "yes" }))
        .to.throw(ConfigurationError)
        .with.property("message", "healthCheck.enabled must be a boolean");
    });

    it("should accept valid intervalMs", () => {
      expect(() =>
        validateHealthCheckConfig({ intervalMs: 30000 })
      ).to.not.throw();
    });

    it("should throw if intervalMs is not a number", () => {
      expect(() => validateHealthCheckConfig({ intervalMs: "30000" }))
        .to.throw(ConfigurationError)
        .with.property(
          "message",
          "healthCheck.intervalMs must be a positive number"
        );
    });

    it("should throw if intervalMs is not positive", () => {
      expect(() => validateHealthCheckConfig({ intervalMs: 0 }))
        .to.throw(ConfigurationError)
        .with.property(
          "message",
          "healthCheck.intervalMs must be a positive number"
        );
    });

    it("should accept valid queryMs", () => {
      expect(() => validateHealthCheckConfig({ queryMs: 5000 })).to.not.throw();
    });

    it("should throw if queryMs is not a number", () => {
      expect(() => validateHealthCheckConfig({ queryMs: "5000" }))
        .to.throw(ConfigurationError)
        .with.property(
          "message",
          "healthCheck.queryMs must be a positive number"
        );
    });

    it("should throw if queryMs is not positive", () => {
      expect(() => validateHealthCheckConfig({ queryMs: 0 }))
        .to.throw(ConfigurationError)
        .with.property(
          "message",
          "healthCheck.queryMs must be a positive number"
        );
    });

    it("should accept complete valid config", () => {
      expect(() =>
        validateHealthCheckConfig({
          enabled: true,
          intervalMs: 30000,
          queryMs: 5000,
        })
      ).to.not.throw();
    });
  });

  describe("healthCheck validation via validateDatabaseConfig", () => {
    it("should validate healthCheck when provided", () => {
      expect(() =>
        validateDatabaseConfig({
          backend: "sqlite",
          databases: { default: {} },
          healthCheck: { enabled: "invalid" },
        })
      )
        .to.throw(ConfigurationError)
        .with.property("message", "healthCheck.enabled must be a boolean");
    });

    it("should accept valid healthCheck", () => {
      expect(() =>
        validateDatabaseConfig({
          backend: "sqlite",
          databases: { default: {} },
          healthCheck: { enabled: true, intervalMs: 30000 },
        })
      ).to.not.throw();
    });
  });
});
