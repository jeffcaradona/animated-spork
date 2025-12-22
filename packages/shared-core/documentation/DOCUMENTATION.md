# Shared-Core Documentation Guide

This document summarizes the documentation provided throughout the `shared-core` package.

## Documentation Structure

### 1. README.md
**Location:** [packages/shared-core/README.md](README.md)

Comprehensive user-facing documentation including:
- Overview of the two main utilities (debug and logger)
- Installation instructions
- Usage examples with code snippets
- Environment variable configuration
- Log method reference
- Log output format examples
- Testing instructions and coverage details
- File structure overview
- Complete API reference for both `createDebugger()` and `createLogger()`
- Architecture notes explaining design decisions

**Best for:** Developers new to the package or looking for quick usage examples.

### 2. Inline Comments in Source Files

#### [src/debug.js](src/debug.js)
- **Module-level docstring:** Explains purpose (lightweight environment-driven logging)
- **getAppNameFromPkg():** Full documentation of resolution order, error handling, fallback behavior
- **createDebugger():** Complete JSDoc with parameters, return type, examples
- **Inline comments:** Explain each step of namespace construction and fallback logic

#### [src/logger.js](src/logger.js)
- **Module-level docstring:** Explains Winston-based architecture, file/console output, example log format
- **createLogger():** Full JSDoc with all parameters, return value, examples
- **defaultLogger:** Documentation of the pre-configured instance
- **Inline comments:** Explain directory creation, log format construction, transport configuration

#### [index.js](index.js)
- **Module-level docstring:** Summarizes public API and usage patterns
- **Exports:** Comments explaining named vs. default exports

### 3. Test Helpers Documentation

#### [tests/helpers/index.js](tests/helpers/index.js)
- **Module-level docstring:** Lists all 5 helpers and their purposes
- **withEnv():** Full documentation with use case and example
- **captureConsole():** Explains spy behavior and the duplicate-check mechanism
- **tempDir():** Describes cleanup behavior and file system isolation
- **stubClock():** Explains fake timer usage for deterministic testing
- **importFresh():** Explains cache-busting for ESM modules, necessary for env-dependent code

### 4. Test Specifications Documentation

#### [tests/debug.spec.js](tests/debug.spec.js)
- **File header:** Explains test scope and strategies
- **Test 1:** "returns a function when called with explicit name" — factory sanity check
- **Test 2:** "returns a function with namespaceSuffix" — suffix parameter validation
- **Test 3:** "does not log when DEBUG env is empty" — environment filtering
- **Test 4:** "logs when DEBUG env enables namespace" — SKIPPED with detailed explanation
- **Test 5:** "reads package.json name from cwd" — fallback mechanism testing

Each test includes:
- **Purpose:** Why the test exists
- **Approach:** How the test is structured
- **Key assertion:** What is being verified
- **Side effects:** Cleanup and environment restoration

#### [tests/logger.spec.js](tests/logger.spec.js)
- **File header:** Explains test scope, verification strategy, and rationale for file-based assertions
- **Test 1:** "createLogger returns object with log methods" — API shape verification
- **Test 2:** "default logger is exported" — export verification
- **Test 3:** "logs info messages" — basic functionality
- **Test 4:** "respects log level filtering" — level-based filtering
- **Test 5:** "writes to file in specified logDir" — file creation and content
- **Test 6:** "includes timestamps in log output" — timestamp formatting

Each test includes:
- **Purpose:** What feature is being tested
- **Approach:** Test setup and execution strategy
- **Assertion details:** What the test verifies
- **Resource management:** Cleanup steps

### 5. Test Plan Documentation

#### [TEST_PLAN.md](TEST_PLAN.md)
Strategic overview including:
- **Scope:** What is tested
- **Tools:** Mocha, Sinon, Chai, Winston
- **Helpers:** Description of 5 reusable test utilities
- **Test cases:** Coverage matrix for both modules
- **ESLint notes:** Configuration requirements for test environments
- **CI/CD guidance:** How to integrate tests into pipelines

## Documentation Patterns

### File Header Comments
Every `.js` file includes a header comment with:
```javascript
/**
 * @file <filename>
 * <Purpose in one line>
 *
 * <Detailed explanation of architecture or testing strategy>
 * <Key design decisions>
 *
 * Example: ...
 */
```

### JSDoc Comments
Factory functions include full JSDoc:
```javascript
/**
 * functionName(params)
 * <One-line description>
 *
 * <Detailed explanation with context>
 * <Resolution order or algorithm flow>
 *
 * @param {type} name - <description>
 * @param {type} [optional] - <description>
 * @returns {type} <description>
 *
 * @example
 * // <Example code>
 */
```

### Test Comments
Test specs follow a 3-part structure:
```javascript
/**
 * Test N: <Test name>
 * Purpose: <Why this test exists>
 * [Optional] Approach: <How it's structured>
 */
it('test description', async () => {
    // Arrange: Set up test conditions
    // Act: Execute the code under test
    // Assert: Verify expected behavior
});
```

### Inline Comments
Complex logic includes inline comments explaining:
- **Why** a decision was made (not just what it does)
- **When** a fallback is used
- **Error handling** strategies
- **Trade-offs** and alternatives considered

## Key Documentation Highlights

### Debug Module (`src/debug.js`)
- **Namespace resolution:** 3-step fallback (explicit param → package.json → globalThis hook → default)
- **Error handling:** Graceful logger error handling with console fallback
- **Environment control:** Complete description of DEBUG env var behavior
- **Use case:** Lightweight development tracing without file overhead

### Logger Module (`src/logger.js`)
- **Dual transport:** File and console outputs explained
- **Log format:** ISO 8601 timestamp + level + message + metadata
- **Directory creation:** Recursive mkdir with error handling
- **Level filtering:** How log level parameter controls output
- **Use case:** Persistent, structured logging with immediate console feedback

### Testing Infrastructure (`tests/helpers/index.js`)
- **Resource isolation:** How helpers prevent test pollution
- **Environment manipulation:** Atomic restoration of process.env
- **Console spying:** Defensive Sinon wrapper checking
- **Module reloading:** Cache-busting with file:// URL query params
- **File system isolation:** Temporary directory cleanup

## How to Use This Documentation

**As a maintainer:**
1. Start with README.md for the public API
2. Check source file headers for architecture decisions
3. Review JSDoc comments for function contracts
4. Look at inline comments for implementation details

**As a contributor:**
1. Read README.md for context
2. Study the test files to understand expected behavior
3. Check helper documentation for testing patterns
4. Follow the existing comment style for new code

**For debugging:**
1. Check the relevant source file's module header
2. Look at inline comments for error handling paths
3. Review test cases for expected behavior
4. Check TEST_PLAN.md for testing strategy

## Documentation Maintenance

When updating code:
- Update the module header comment if architecture changes
- Update JSDoc when function signatures change
- Add inline comments for non-obvious logic
- Add test cases for new features
- Update README.md if public API changes
- Update TEST_PLAN.md if testing strategy changes

## Code Coverage

Code coverage is tracked using **c8** with the following commands:

### Commands

```bash
# From packages/shared-core
npm run coverage

# From repo root
npm run coverage:shared-core
```

### Configuration

Coverage is configured in [.c8rc.json](.c8rc.json):
- **Include:** `src/**/*.js` (only production code)
- **Reporters:** text, text-summary, html (detailed report in `coverage/`)
- **Thresholds:** Configured at 80% for statements/lines, 100% for functions

### Current Results

- **Statements:** 90.35% (178/197 lines covered)
- **Functions:** 100% (3/3 functions covered)
- **Lines:** 90.35% (190/197 lines covered)
- **Branches:** 52.63% (error handling edge cases)

Uncovered lines are primarily in error handling paths for package.json read failures.

### HTML Report

An HTML coverage report is generated in `coverage/index.html` with:
- File-by-file coverage breakdown
- Line-level coverage highlighting
- Coverage statistics and trends

This is useful for visualizing which specific lines/branches need additional tests.

## Version Information

- **Created:** 2025-12-22
- **ESM:** All code uses ES modules (`import`/`export`)
- **Node.js:** 20.x+
- **Test Runner:** Mocha 11.7.5
- **Assertion Library:** Chai 6.2.1
- **Mocking Library:** Sinon 19.0.2
- **Coverage Tool:** c8 10.1.3
- **Logger:** Winston 3.19.0
- **Debug:** debug 4.3.4

## Quick Navigation

| Purpose | Location |
|---------|----------|
| User guide | [README.md](README.md) |
| Debug source | [src/debug.js](src/debug.js) |
| Logger source | [src/logger.js](src/logger.js) |
| Public API | [index.js](index.js) |
| Test helpers | [tests/helpers/index.js](tests/helpers/index.js) |
| Debug tests | [tests/debug.spec.js](tests/debug.spec.js) |
| Logger tests | [tests/logger.spec.js](tests/logger.spec.js) |
| Test plan | [TEST_PLAN.md](TEST_PLAN.md) |
| Coverage config | [.c8rc.json](.c8rc.json) |
| This guide | [DOCUMENTATION.md](DOCUMENTATION.md) |
