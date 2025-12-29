# @animated-spork/frontend-core

Express-based frontend server factory with GitHub OAuth, session management, and Backend-For-Frontend (BFF) patterns.

## Status

🔴 **NOT YET STARTED** - Planned for Phase 1 after api-core completion

This package is currently a stub. Implementation will begin once the api-core package is complete.

## Planned Features

`frontend-core` will provide:

1. **GitHub OAuth Integration**
   - OAuth flow handling (authorization, callback, token exchange)
   - User session management with secure cookies
   - Organization and team membership verification

2. **Session Management**
   - Cookie-based sessions with secure configuration
   - Session store abstraction (memory, Redis, database)
   - CSRF protection
   - Session lifecycle management

3. **API Client Wrapper**
   - Automatic JWT injection from session
   - Request/response transformation
   - Error handling and user-friendly error messages
   - API endpoint proxying

4. **Server-Side Rendering**
   - Eta template engine integration
   - Layout and partial management
   - View template layering for reusability
   - Static asset serving

5. **Admin UI Shell**
   - Pre-built admin interface components
   - User authentication status display
   - Navigation scaffolding
   - Responsive layout templates

6. **Security Defaults**
   - Helmet.js integration for security headers
   - Content Security Policy (CSP) configuration
   - Rate limiting
   - Input sanitization

## Planned Architecture

```
packages/frontend-core/
├── src/
│   ├── auth/              # GitHub OAuth handlers
│   ├── session/           # Session management
│   ├── api-client/        # API wrapper with JWT injection
│   ├── views/             # Default Eta templates
│   ├── middleware/        # Express middleware
│   └── factory.js         # createFrontendApp() factory
├── tests/
│   └── ...                # Test suites
└── documentation/
    └── ...                # Implementation guides
```

## Future Usage Example

```javascript
import { createFrontendApp } from '@animated-spork/frontend-core';

const app = await createFrontendApp({
  github: {
    clientId: process.env.GITHUB_CLIENT_ID,
    clientSecret: process.env.GITHUB_CLIENT_SECRET,
    callbackUrl: 'http://localhost:3000/auth/callback',
    organization: 'my-org',
    requiredTeams: ['developers']
  },
  api: {
    baseUrl: 'http://localhost:4000',
    authEndpoint: '/auth/exchange'
  },
  session: {
    secret: process.env.SESSION_SECRET,
    store: 'redis',
    storeConfig: { /* Redis config */ }
  },
  views: {
    engine: 'eta',
    directory: './views',
    layout: 'layouts/main'
  }
});

app.listen(3000, () => {
  console.log('Frontend server running on port 3000');
});
```

## Timeline

**Phase 1** implementation is planned to begin after:
- ✅ shared-core completion
- ✅ api-core database layer completion
- 🔴 api-core JWT/auth layer completion (in progress)

Expected timeline: Q1 2026

## See Also

- [Main README](../../README.md) - Project overview
- [PROJECT_GOALS.md](../../documentation/PROJECT_GOALS.md) - Project goals and principles
- [PHASES.md](../../documentation/PHASES.md) - Implementation phases

---

**Part of the [animated-spork](../../README.md) monorepo** - Building composable, production-ready Express applications.
