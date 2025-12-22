
# Test Plan — packages/shared-core

## Summary
This document records a concise, implementable plan for unit-testing the current `shared-core` debug and logger utilities. It is based on the package's present state:
- `src/debug.js`: exports `createDebugger` (reads calling app package.json name at runtime, falls back to namespace or `process.env.DEBUG`).
- `src/logger.js`: exports `createLogger(...)` (Winston-based) and a default `logger` which writes to `process.cwd()/logs` by default.
- `index.js`: re-exports `createDebugger`, `createLogger`, and default `logger`.
- `package.json` (root) already lists `mocha` as a devDependency.

Goal: add deterministic, hermetic unit tests for `debug.js` and `logger.js` under `packages/shared-core/tests/` using Mocha, Sinon, and Chai. Tests will use mocking/stubbing for environment, time, console and transport behaviors and temporary directories for any file assertions.

## Test scope
- Unit tests only (no integration with network or other workspace packages).
- Files to test: `src/debug.js`, `src/logger.js`.
- Test folder: `packages/shared-core/tests/` (you created an empty tests/ — use that).

## Tools
- Test runner: Mocha (root devDependency already present).
- Assertions: Chai (`expect` style).
- Mocks/Stubs/Spies: Sinon.
- Module injection: `proxyquire` or manual `require` cache clearing when needed.

## High-level strategy
1. Keep tests hermetic: stub clocks, set/restore `process.env`, isolate require cache, and use per-test temporary directories for file I/O.
2. Use helpers (in `packages/shared-core/tests/helpers/`) to manage common tasks: `withEnv`, `requireFresh`, `captureConsole`, `tempDir`, and `stubClock`.
3. Prefer mocking Winston file transport or writing into an OS tempdir and reading the resulting file synchronously. Clean up after each test.

## Helpers (recommended)
- `withEnv(env, fn)`: set env keys for duration and restore.
- `requireFresh(path)`: delete module from `require.cache` then `import()`/`require()` it.
- `captureConsole()`: spy/stub `globalThis.console` methods and provide restore.
- `tempDir()`: `fs.mkdtempSync(path.join(os.tmpdir(), 'sharedcore-test-'))` with `cleanup()`.
- `stubClock(now)`: `sinon.useFakeTimers(now)` and `clock.restore()`.

## Test cases (minimum)

### debug.spec.js
- returns a debug function for explicit name/namespaceSuffix.
- when `process.env.DEBUG` does not enable namespace, calling debugger should not write to console.
- when `process.env.DEBUG` enables `appname:*`, debug output should be emitted (assert via console spy).
- when no explicit name passed, if a `package.json` exists at `process.cwd()` the factory should use its `name` (simulate with `tempDir` + fake package.json + `requireFresh`).

### logger.spec.js
- `createLogger` returns object with methods: `info`, `warn`, `error`, `debug`.
- `createLogger({ level: 'warn' })` suppresses `info` calls.
- default logger exists (import default `logger`) and is callable.
- file sink: configure `createLogger({ name, logDir })` with a per-test tempdir, write a log line, flush/close if needed, then assert `<logDir>/<name>.log` contains the message. Clean up after.

## Mocking / stubbing notes
- Use Sinon sandbox in `beforeEach`/`afterEach` and restore.
- For time-dependent assertions stub the clock with `sinon.useFakeTimers()`.
- For console output use `captureConsole()` to spy on `globalThis.console` methods.
- For modules that read env on import, call `withEnv(...)` then `requireFresh()` to ensure the module sees the env you set.

## ESLint & test rules
- Update `eslint.config.js` with an override for test files to enable Mocha globals and allow `no-console` in tests. Example override:

	{
		files: ['packages/shared-core/tests/**/*.js'],
		languageOptions: { sourceType: 'module' },
		env: { mocha: true, node: true },
		rules: { 'no-console': 'off', 'no-unused-expressions': 'off' }
	}

## NPM scripts (suggested)
- add to root `package.json` (or run from package folder):

	"test:shared-core": "mocha --recursive \"packages/shared-core/tests/**/*.spec.js\" --exit"

Use `npm run test:shared-core` to run only these tests.

## CI notes
- In CI run from repo root: `npm ci` then `npm run test:shared-core`.
- Ensure `NODE_ENV=test` is set and tests run in a clean working directory.

## Files to create (implementation checklist)
- `packages/shared-core/tests/helpers/*` — implement helpers listed above.
- `packages/shared-core/tests/debug.spec.js` — full tests per cases above.
- `packages/shared-core/tests/logger.spec.js` — full tests per cases above.
- Optional: small README section in `packages/shared-core/README.md` showing how to run the tests.

## Cleanup & flakiness prevention
- Always restore Sinon sandboxes and clocks.
- Use per-test tempdirs and remove them in `afterEach`.
- Avoid network/time-based flakiness; prefer deterministic, fast assertions.

---

