# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.0.1] - 2026-02-13

### Added

- Initial release of `@animated-spork/app`
- Express application factory (`createApp`)
- HTTP server factory with graceful shutdown (`createServer`)
- Environment configuration management (`createConfig`, `filterSensitiveKeys`)
- Standardized error handlers (`createAppError`, `createNotFoundError`, `createValidationError`)
- Built-in middleware for error handling and 404 responses
- Plugin system for extending application functionality
- Pre-configured routes: health check, landing page, admin dashboard
- EJS view engine integration
- Static file serving
- JSON and URL-encoded body parsing
- Comprehensive documentation

### Dependencies

- `@animated-spork/shared` ^0.0.1
- `express` ^5.2.1
- `ejs` ^4.0.1
