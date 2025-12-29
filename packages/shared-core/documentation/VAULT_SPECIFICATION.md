# HashiCorp Vault Interface Specification

**Document Version:** 0.1  
**Date:** December 2025  
**Status:** Specification  
**Scope:** shared-core secret management abstraction for api-core, frontend-core, and other services

---

## Table of Contents

1. [Overview](#overview)
2. [Secret Path Architecture](#secret-path-architecture)
3. [ISecretProvider Interface](#isecretprovider-interface)
4. [Authentication Methods](#authentication-methods)
5. [Secret Type Schemas](#secret-type-schemas)
6. [Token Lifecycle & Caching](#token-lifecycle--caching)
7. [Development / Local Override Mode](#development--local-override-mode)
8. [Security Rules](#security-rules)
9. [Integration Points](#integration-points)
10. [Error Handling Contract](#error-handling-contract)
11. [Configuration Reference](#configuration-reference)

---

## Overview

The Vault interface provides a lightweight, composable abstraction for accessing secrets from HashiCorp Vault. It is implemented in `shared-core` and consumed by `api-core` (database credentials, JWT keys) and `frontend-core` (GitHub OAuth, session secrets).

**Key Principles:**
- Single source of truth: environment variables or Vault (never hardcoded)
- Composable: optional, non-intrusive; services pull secrets as needed
- Defensive: all credentials stripped from logs and error messages
- Hybrid lifecycle: automatic token renewal + manual refresh on demand
- Dev-friendly: local environment variable override for development without Vault

---

## Secret Path Architecture

### Vault Mount Structure

Secrets are stored in HashiCorp Vault KV Secrets Engine v2 at the following mount point:

```
/secret/
```

### Namespaced Path Hierarchy

All secrets follow a three-tier hierarchy:

```
/secret/animated-spork/{service}/{environment}
```

- **Service**: `database`, `jwt`, `oauth`, `session`
- **Environment**: `development`, `staging`, `production` (or custom per deployment)

### Path Examples

| Service     | Path                                      | Purpose                           |
|-------------|-------------------------------------------|-----------------------------------|
| Database    | `/secret/animated-spork/database/{env}`   | MSSQL/SQLite credentials          |
| JWT         | `/secret/animated-spork/jwt/{env}`        | RSA keys, issuer, audience        |
| OAuth       | `/secret/animated-spork/oauth/github/{env}` | GitHub app client ID/secret      |
| Session     | `/secret/animated-spork/session/{env}`    | Session signing key, cookie cfg   |

---

## ISecretProvider Interface

The `ISecretProvider` is the contract that all secret providers must implement. It is defined using JSDoc type definitions.

### Interface Definition

```javascript
/**
 * Secret Provider interface for accessing secrets from HashiCorp Vault
 * or development/local overrides.
 * 
 * @typedef {object} ISecretProvider
 * @property {(path: string, options?: GetSecretOptions) => Promise<string>} getSecret
 * @property {(path: string, options?: GetSecretOptions) => Promise<object>} getSecretObject
 * @property {(path: string) => Promise<void>} refresh
 * @property {() => Promise<boolean>} healthCheck
 */

/**
 * Options for retrieving a secret.
 * 
 * @typedef {object} GetSecretOptions
 * @property {number} [timeoutMs=5000] - Request timeout in milliseconds
 * @property {boolean} [bypassCache=false] - Force fresh fetch, ignore cache
 */

/**
 * Retrieves a secret value as a string from the specified Vault path.
 * Automatically caches the result in memory and handles renewal.
 * 
 * @param {string} path - Vault secret path (e.g., '/secret/animated-spork/database/production')
 * @param {GetSecretOptions} [options] - Optional request parameters
 * @returns {Promise<string>} The secret value
 * @throws {VaultError} If secret not found, auth failed, or network error
 * @example
 * const dbPassword = await secretProvider.getSecret(
 *   '/secret/animated-spork/database/production:password'
 * );
 */

/**
 * Retrieves a secret as a parsed JSON object from the specified Vault path.
 * Useful for multi-field secrets (e.g., database config with host, port, user, pass).
 * 
 * @param {string} path - Vault secret path
 * @param {GetSecretOptions} [options] - Optional request parameters
 * @returns {Promise<object>} The parsed secret object
 * @throws {VaultError} If secret not found, parsing fails, or network error
 * @example
 * const dbConfig = await secretProvider.getSecretObject(
 *   '/secret/animated-spork/database/production'
 * );
 * // Returns { hostname: '...', database: '...', username: '...', password: '...' }
 */

/**
 * Manually refresh/renew the cached secret at the specified path.
 * Useful for forcing a token renewal or picking up rotated secrets without restart.
 * 
 * @param {string} path - Vault secret path to refresh
 * @returns {Promise<void>}
 * @throws {VaultError} If refresh fails
 * @example
 * await secretProvider.refresh('/secret/animated-spork/jwt/production');
 */

/**
 * Health check: verifies that Vault is reachable and authentication is valid.
 * Returns true if Vault is accessible, false otherwise (does not throw).
 * 
 * @returns {Promise<boolean>} true if healthy, false otherwise
 * @example
 * const isHealthy = await secretProvider.healthCheck();
 * if (!isHealthy) console.warn('Vault is unreachable');
 */
```

---

## Authentication Methods

### Supported Vault Auth Methods

The secret provider supports the following Vault authentication strategies:

1. **Kubernetes Auth** (recommended for cloud-native deployments)
2. **JWT/OIDC Auth** (for workload identity federations)
3. **AppRole Auth** (for service-to-service auth)
4. **Token Auth** (for development/testing; short-lived tokens only)

### Configuration via Environment Variables

Authentication is configured entirely through environment variables:

| Env Variable           | Description                                         | Example                |
|------------------------|-----------------------------------------------------|------------------------|
| `VAULT_ADDR`           | Vault server URL (required)                         | `https://vault.example.com:8200` |
| `VAULT_NAMESPACE`      | Vault namespace (optional)                          | `my-namespace`         |
| `VAULT_AUTH_METHOD`    | Auth method: `kubernetes`, `jwt`, `approle`, `token` | `kubernetes`           |
| `VAULT_ROLE_ID`        | Role ID for AppRole auth                            | `my-role-id`           |
| `VAULT_SECRET_ID`      | Secret ID for AppRole auth                          | `my-secret-id`         |
| `VAULT_JWT_TOKEN`      | JWT token for JWT/OIDC auth                         | `eyJ...`               |
| `VAULT_TOKEN`          | Raw Vault token (token auth only)                   | `s.xxxxx`              |
| `VAULT_SKIP_VERIFY`    | Skip TLS verification (dev only, not recommended)   | `false`                |

### Auth Method Precedence

Configuration is evaluated in this order:

1. **Token** (if `VAULT_TOKEN` is set) → Direct token auth
2. **AppRole** (if `VAULT_ROLE_ID` is set) → AppRole auth
3. **JWT** (if `VAULT_JWT_TOKEN` is set) → JWT/OIDC auth
4. **Kubernetes** (default) → Kubernetes service account auto-auth

### Kubernetes Auth (Recommended)

When deployed in Kubernetes, the provider automatically uses the pod's service account token:

- Reads token from `/var/run/secrets/kubernetes.io/serviceaccount/token`
- Sends pod name and namespace to Vault for validation
- No additional configuration needed; Vault must have Kubernetes auth method configured

---

## Secret Type Schemas

Each service retrieves secrets with a defined structure. Services use `getSecretObject()` to parse multi-field secrets.

### 1. Database Secrets

**Path:** `/secret/animated-spork/database/{env}`

**Schema:**

```javascript
/**
 * Database credentials and connection configuration.
 * 
 * @typedef {object} DatabaseSecrets
 * @property {string} hostname - Database server hostname or IP
 * @property {string} database - Database name
 * @property {string} username - Database user
 * @property {string} password - Database password
 * @property {number} [port=1433] - Database port (default MSSQL: 1433)
 * @property {boolean} [encrypt=true] - MSSQL: encrypt connection
 * @property {boolean} [trustServerCertificate=false] - MSSQL: trust self-signed cert
 * @property {number} [poolMin=5] - Min connection pool size
 * @property {number} [poolMax=20] - Max connection pool size
 * @property {number} [connectionTimeout=15000] - Connection timeout in ms
 * @property {number} [requestTimeout=30000] - Query request timeout in ms
 */
```

**Example Vault Secret:**

```json
{
  "hostname": "mssql.example.com",
  "database": "production_db",
  "username": "app_user",
  "password": "SecureP@ssw0rd123!",
  "port": 1433,
  "encrypt": true,
  "trustServerCertificate": false,
  "poolMin": 5,
  "poolMax": 20,
  "connectionTimeout": 15000,
  "requestTimeout": 30000
}
```

### 2. JWT Secrets

**Path:** `/secret/animated-spork/jwt/{env}`

**Schema:**

```javascript
/**
 * JWT signing and validation configuration.
 * 
 * @typedef {object} JwtSecrets
 * @property {string} privateKey - RSA private key (PEM format, may be multi-line)
 * @property {string} publicKey - RSA public key (PEM format, may be multi-line)
 * @property {string} issuer - JWT issuer claim (e.g., 'animated-spork-api')
 * @property {string} audience - JWT audience claim (e.g., 'animated-spork-web')
 * @property {number} [expiresIn=3600] - Token expiration in seconds
 * @property {string} [algorithm='RS256'] - Signing algorithm
 */
```

**Example Vault Secret:**

```json
{
  "privateKey": "-----BEGIN RSA PRIVATE KEY-----\nMIIEpAIBAAKCAQEA2...truncated...\n-----END RSA PRIVATE KEY-----",
  "publicKey": "-----BEGIN PUBLIC KEY-----\nMIIBIjANBg...truncated...\n-----END PUBLIC KEY-----",
  "issuer": "animated-spork-api",
  "audience": "animated-spork-web",
  "expiresIn": 3600,
  "algorithm": "RS256"
}
```

### 3. OAuth (GitHub) Secrets

**Path:** `/secret/animated-spork/oauth/github/{env}`

**Schema:**

```javascript
/**
 * GitHub OAuth application credentials.
 * 
 * @typedef {object} GitHubOAuthSecrets
 * @property {string} clientId - GitHub OAuth app client ID
 * @property {string} clientSecret - GitHub OAuth app client secret
 * @property {string} redirectUri - OAuth callback URL (must match GitHub app config)
 * @property {string} [org] - GitHub organization name (for membership validation)
 * @property {string[]} [teams] - GitHub team slugs to allow access
 */
```

**Example Vault Secret:**

```json
{
  "clientId": "Iv1.abcd1234efgh5678",
  "clientSecret": "ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  "redirectUri": "https://app.example.com/auth/github/callback",
  "org": "my-org",
  "teams": ["engineering", "data-science"]
}
```

### 4. Session Secrets

**Path:** `/secret/animated-spork/session/{env}`

**Schema:**

```javascript
/**
 * Session and cookie signing configuration.
 * 
 * @typedef {object} SessionSecrets
 * @property {string} secret - Secret key for signing session/cookies (min 32 chars)
 * @property {string} [cookieName='session-id'] - Session cookie name
 * @property {boolean} [cookieSecure=true] - HTTPS only
 * @property {boolean} [cookieHttpOnly=true] - Prevent JavaScript access
 * @property {number} [cookieMaxAge=86400000] - Cookie max age in ms (default: 24h)
 */
```

**Example Vault Secret:**

```json
{
  "secret": "this-is-a-very-secret-key-at-least-32-characters-long!",
  "cookieName": "session-id",
  "cookieSecure": true,
  "cookieHttpOnly": true,
  "cookieMaxAge": 86400000
}
```

---

## Token Lifecycle & Caching

### Automatic Token Renewal (Hybrid Lifecycle)

The secret provider implements automatic background renewal with manual refresh capability:

1. **On First Access**: Secret is fetched from Vault and cached in memory
2. **TTL & Lease Tracking**: Provider respects Vault lease duration; secrets cached until lease expiry minus a buffer (default: 30 seconds before expiry)
3. **Background Renewal**: A background task automatically renews secrets approaching expiry without blocking callers
4. **Stale Fallback**: If renewal fails, cached value remains available (non-blocking)
5. **Manual Refresh**: Callers can force an immediate refresh via `refresh(path)` if needed (e.g., after secret rotation)

### Configuration

| Env Variable              | Description                                  | Default  |
|---------------------------|----------------------------------------------|----------|
| `VAULT_CACHE_TTL_SECONDS` | Max in-memory cache lifetime                 | `3600`   |
| `VAULT_RENEWAL_BUFFER_SEC`| Renew this many seconds before lease expiry  | `30`     |
| `VAULT_RENEWAL_INTERVAL_MS` | Background renewal check interval           | `60000`  |

### Example: Automatic vs. Manual Refresh

```javascript
// First call: fetches from Vault, caches result
const secret1 = await provider.getSecret('/secret/animated-spork/jwt/production');
// Returns immediately from cache on subsequent calls (within TTL)

const secret2 = await provider.getSecret('/secret/animated-spork/jwt/production');
// Same result, no Vault roundtrip

// If secret was rotated and you need the new value:
await provider.refresh('/secret/animated-spork/jwt/production');
const secret3 = await provider.getSecret('/secret/animated-spork/jwt/production');
// Returns the newly refreshed secret
```

---

## Development / Local Override Mode

### Local Environment Variable Mode

For development and local testing without running a Vault server, the provider supports a **local mode** that reads secrets directly from environment variables.

**Activation:**

Set `VAULT_MODE=local` to enable local environment variable lookup.

### Local Env Var Naming Convention

Local secrets are sourced from environment variables using a predictable naming pattern:

```
SECRET_{SERVICE}_{FIELD}={value}
```

Where:
- `{SERVICE}` is the secret service (uppercase): `DATABASE`, `JWT`, `OAUTH_GITHUB`, `SESSION`
- `{FIELD}` is the secret field name (uppercase)

### Examples

**Database credentials:**
```bash
SECRET_DATABASE_HOSTNAME=localhost
SECRET_DATABASE_DATABASE=local_db
SECRET_DATABASE_USERNAME=sa
SECRET_DATABASE_PASSWORD=LocalP@ss123
SECRET_DATABASE_PORT=1433
SECRET_DATABASE_POOL_MIN=2
SECRET_DATABASE_POOL_MAX=10
```

**JWT secrets:**
```bash
SECRET_JWT_PRIVATE_KEY='-----BEGIN RSA PRIVATE KEY-----\n...\n-----END RSA PRIVATE KEY-----'
SECRET_JWT_PUBLIC_KEY='-----BEGIN PUBLIC KEY-----\n...\n-----END PUBLIC KEY-----'
SECRET_JWT_ISSUER=animated-spork-api
SECRET_JWT_AUDIENCE=animated-spork-web
```

**GitHub OAuth:**
```bash
SECRET_OAUTH_GITHUB_CLIENT_ID=Iv1.test1234
SECRET_OAUTH_GITHUB_CLIENT_SECRET=ghp_test5678
SECRET_OAUTH_GITHUB_REDIRECT_URI=http://localhost:3000/auth/github/callback
SECRET_OAUTH_GITHUB_ORG=my-local-org
SECRET_OAUTH_GITHUB_TEAMS=engineering
```

**Session secrets:**
```bash
SECRET_SESSION_SECRET=my-local-session-secret-at-least-32-chars-long!!
SECRET_SESSION_COOKIE_NAME=session-id
SECRET_SESSION_COOKIE_SECURE=false
SECRET_SESSION_COOKIE_HTTP_ONLY=true
```

### Local Mode Fallback Behavior

When `VAULT_MODE=local` is set:

1. **Env var lookup first**: Provider checks for `SECRET_{SERVICE}_{FIELD}` environment variable
2. **Fail fast**: If the env var is not found, provider throws a clear error indicating which var is missing
3. **No Vault fallback**: Local mode does not fall back to Vault; misconfiguration is surfaced immediately

This ensures developers catch missing configuration early rather than silently falling back to production credentials.

### Recommended .env File for Development

Create `.env.local` (or `.env` if using dotenv) with all required secrets:

```bash
# .env.local or .env (add to .gitignore!)
VAULT_MODE=local
NODE_ENV=development

# Database
SECRET_DATABASE_HOSTNAME=localhost
SECRET_DATABASE_DATABASE=animated_spork_dev
SECRET_DATABASE_USERNAME=sa
SECRET_DATABASE_PASSWORD=DevP@ssw0rd!
SECRET_DATABASE_PORT=1433

# JWT (use test keys; generate with: openssl genrsa 2048 | openssl pkeyutl ... )
SECRET_JWT_PRIVATE_KEY=-----BEGIN RSA PRIVATE KEY-----\n...
SECRET_JWT_PUBLIC_KEY=-----BEGIN PUBLIC KEY-----\n...
SECRET_JWT_ISSUER=animated-spork-api-dev
SECRET_JWT_AUDIENCE=animated-spork-web-dev

# GitHub OAuth (use test GitHub app credentials)
SECRET_OAUTH_GITHUB_CLIENT_ID=Iv1.dev1234567890
SECRET_OAUTH_GITHUB_CLIENT_SECRET=ghp_dev1234567890
SECRET_OAUTH_GITHUB_REDIRECT_URI=http://localhost:3000/auth/github/callback
SECRET_OAUTH_GITHUB_ORG=my-dev-org

# Session
SECRET_SESSION_SECRET=dev-session-secret-at-least-32-chars-long!!!
SECRET_SESSION_COOKIE_SECURE=false
```

---

## Security Rules

### Token & Credential Storage

- **Never hardcode** Vault tokens, role IDs, or secrets in code or config files
- **Never log** secret values; logs must be stripped (see [Sanitization](#sanitization))
- **Tokens stored only in memory** during the current process; not persisted to disk
- **Environment variables only**: All Vault connection details (`VAULT_ADDR`, `VAULT_TOKEN`, etc.) come from environment or Kubernetes service account
- **No caching to disk**: Secrets remain only in process memory; no writes to disk

### Token Lifespan

- **Short-lived tokens**: Vault tokens should have minimal TTL (e.g., 1 hour)
- **Automatic renewal**: Background renewal handles expiry; callers need not manage token lifecycle manually
- **Workload identity preferred**: Use Kubernetes auth or OIDC rather than static AppRole secrets

### TLS & Transport Security

- **HTTPS required**: Vault server must be reachable via HTTPS; HTTP is only acceptable for `localhost` in development
- **TLS verification enabled** by default; only disable (`VAULT_SKIP_VERIFY=true`) for local testing
- **TLS pinning recommended**: For production, configure TLS certificate pinning if possible

### Sanitization

All error messages and logs must strip credentials:

- **Error messages**: Do not include secret values in stack traces or error objects
- **Log statements**: Never log the plaintext secret; log only metadata (path, status, TTL)
- **Config dump/stringify**: If printing configuration for debugging, exclude or mask sensitive fields

Example safe logging:

```javascript
// ❌ BAD: Logs the password
logger.info(`Connecting with password: ${dbConfig.password}`);

// ✅ GOOD: Logs only non-sensitive metadata
logger.info('Database config loaded', {
  hostname: dbConfig.hostname,
  database: dbConfig.database,
  poolSize: dbConfig.poolMax,
  // password field omitted
});
```

---

## Integration Points

### How api-core Uses Vault Secrets

**Step 1**: During initialization, `api-core` retrieves database secrets:

```javascript
const secretProvider = require('shared-core').vault;

const dbSecrets = await secretProvider.getSecretObject(
  `/secret/animated-spork/database/${process.env.NODE_ENV}`
);
```

**Step 2**: Passes secrets to database validation and connection manager:

```javascript
const dbConfig = {
  backend: 'mssql',
  databases: {
    default: {
      server: dbSecrets.hostname,
      database: dbSecrets.database,
      authentication: {
        type: 'default',
        options: {
          userName: dbSecrets.username,
          password: dbSecrets.password
        }
      },
      options: {
        encrypt: dbSecrets.encrypt,
        trustServerCertificate: dbSecrets.trustServerCertificate,
        connectionTimeout: dbSecrets.connectionTimeout,
        requestTimeout: dbSecrets.requestTimeout
      }
    }
  }
};

// Validation happens using existing validators (no changes needed)
const validation = validateDatabaseConfig(dbConfig);
```

**Step 3**: Existing database connection manager and validators work unchanged:

- Secrets are now sourced from Vault (or local env vars in dev) instead of raw env vars
- All existing error handling and sanitization applies
- No changes to database adapter code required

### How frontend-core Uses Vault Secrets

**Step 1**: During initialization, `frontend-core` retrieves OAuth and session secrets:

```javascript
const secretProvider = require('shared-core').vault;

const oauthSecrets = await secretProvider.getSecretObject(
  `/secret/animated-spork/oauth/github/${process.env.NODE_ENV}`
);

const sessionSecrets = await secretProvider.getSecretObject(
  `/secret/animated-spork/session/${process.env.NODE_ENV}`
);
```

**Step 2**: Passes secrets to OAuth middleware and session config:

```javascript
app.use(sessionMiddleware({
  secret: sessionSecrets.secret,
  cookie: {
    secure: sessionSecrets.cookieSecure,
    httpOnly: sessionSecrets.cookieHttpOnly,
    maxAge: sessionSecrets.cookieMaxAge
  }
}));

app.use(githubOAuthMiddleware({
  clientID: oauthSecrets.clientId,
  clientSecret: oauthSecrets.clientSecret,
  callbackURL: oauthSecrets.redirectUri,
  scope: ['read:org', 'read:user']
}));
```

### Existing Code Compatibility

All existing validation, error handling, and sanitization patterns remain **unchanged**:

- Database validators (api-core) continue to work
- Error handling (stripping sensitive data from logs) is unaffected
- Configuration objects passed through the layers maintain the same structure
- Logging infrastructure (shared-core logger) remains unchanged

The Vault integration is a **pure source change**: replacing where secrets come from, not how they are used.

---

## Error Handling Contract

The secret provider defines clear error handling behavior:

### VaultError (Base Error Class)

```javascript
/**
 * Base error for Vault-related failures.
 * 
 * @typedef {object} VaultError
 * @property {string} name - Always 'VaultError'
 * @property {string} message - Human-readable error message (no secret values)
 * @property {string} code - Machine-readable error code
 * @property {number} [statusCode] - HTTP status code (if from Vault API)
 * @property {object} [context] - Additional context (no secrets)
 * @property {Error} [cause] - Original error, if any
 */
```

### Error Codes

| Code                    | Meaning                                      | HTTP Status |
|-------------------------|----------------------------------------------|-------------|
| `VAULT_UNREACHABLE`     | Vault server not reachable                   | N/A         |
| `VAULT_AUTH_FAILED`     | Authentication failed (invalid token/role)   | 401         |
| `VAULT_PERMISSION_DENIED` | Caller not authorized for path               | 403         |
| `VAULT_SECRET_NOT_FOUND` | Secret path does not exist                    | 404         |
| `VAULT_PARSE_ERROR`     | Response parsing failed (invalid JSON)       | N/A         |
| `VAULT_TIMEOUT`         | Request timeout                              | N/A         |
| `LOCAL_ENV_VAR_MISSING` | Required env var not found (local mode)      | N/A         |

### Error Handling Best Practices

Services should handle errors gracefully:

```javascript
try {
  const secrets = await secretProvider.getSecretObject(
    `/secret/animated-spork/database/${env}`
  );
  // Use secrets
} catch (error) {
  if (error.code === 'VAULT_UNREACHABLE') {
    // Service cannot start; fail loudly
    logger.error('Vault unreachable; exiting', { error: error.message });
    process.exit(1);
  } else if (error.code === 'VAULT_AUTH_FAILED') {
    // Auth misconfiguration; provide guidance
    logger.error('Vault auth failed; check VAULT_AUTH_METHOD and credentials', {
      error: error.message
    });
    process.exit(1);
  } else {
    // Unexpected error
    throw error;
  }
}
```

---

## Configuration Reference

### Complete Environment Variable List

| Variable                  | Required | Default     | Purpose                          |
|---------------------------|----------|-------------|----------------------------------|
| `VAULT_ADDR`              | Yes*     | N/A         | Vault server URL                 |
| `VAULT_MODE`              | No       | `vault`     | `vault` or `local`               |
| `VAULT_NAMESPACE`         | No       | (none)      | Vault namespace path             |
| `VAULT_AUTH_METHOD`       | No       | `kubernetes` | Auth method (see above)          |
| `VAULT_ROLE_ID`           | No       | (none)      | AppRole role ID                  |
| `VAULT_SECRET_ID`         | No       | (none)      | AppRole secret ID                |
| `VAULT_JWT_TOKEN`         | No       | (none)      | JWT token (JWT auth)             |
| `VAULT_TOKEN`             | No       | (none)      | Raw Vault token (token auth)     |
| `VAULT_SKIP_VERIFY`       | No       | `false`     | Skip TLS verification (dev only) |
| `VAULT_CACHE_TTL_SECONDS` | No       | `3600`      | Cache TTL in seconds             |
| `VAULT_RENEWAL_BUFFER_SEC` | No      | `30`        | Renew before expiry (seconds)    |
| `VAULT_RENEWAL_INTERVAL_MS` | No     | `60000`     | Background renewal check (ms)    |
| `NODE_ENV`                | No       | `development` | Determines environment path      |

**\* Required if `VAULT_MODE=vault`; not required if `VAULT_MODE=local`**

### Environment-Based Secret Path Resolution

The provider constructs secret paths using the current environment:

```javascript
// If NODE_ENV=production:
const path = `/secret/animated-spork/database/production`;

// If NODE_ENV=staging:
const path = `/secret/animated-spork/database/staging`;

// If NODE_ENV=development (local mode):
const path = `/secret/animated-spork/database/development`;
// But secrets come from SECRET_DATABASE_* env vars instead
```

---

## Appendices

### A. Recommended Vault Policy (MSSQL)

For the Kubernetes auth method, create a Vault policy granting read-only access to secret paths:

```hcl
# /etc/vault/policies/animated-spork-api.hcl
path "secret/data/animated-spork/database/*" {
  capabilities = ["read", "list"]
}

path "secret/data/animated-spork/jwt/*" {
  capabilities = ["read", "list"]
}

path "secret/metadata/animated-spork/*" {
  capabilities = ["list"]
}

# Health check endpoint
path "sys/health" {
  capabilities = ["read"]
}
```

### B. Test Credentials for Local Development

Generate test RSA keys for JWT in development:

```bash
# Generate private key
openssl genrsa -out private.pem 2048

# Extract public key
openssl rsa -in private.pem -pubout -out public.pem

# View keys (for copying to .env.local)
cat private.pem
cat public.pem
```

### C. Reference: Vault KV-v2 Secret Structure

When storing a secret in Vault KV-v2, the actual data is nested under a `data` key:

```bash
# When you store a secret:
vault kv put secret/animated-spork/database/production \
  hostname=db.example.com \
  database=prod_db \
  username=app_user \
  password=SecureP@ssw0rd123!

# Vault API returns it under secret.data.data:
{
  "request_id": "...",
  "lease_id": "",
  "lease_duration": 2764800,
  "data": {
    "data": {
      "hostname": "db.example.com",
      "database": "prod_db",
      "username": "app_user",
      "password": "SecureP@ssw0rd123!"
}


```

The provider handles this nested structure transparently; callers see only the actual secret data.

---

**Document Version:** 0.1
**Last Updated:** December 2025  
**Next Review:** Q1 2026
