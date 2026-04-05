# Playwright E2E for 2.0

This directory is the first TypeScript-native Playwright stack for the 2.0 app.

Current scope:
- Browser smoke coverage for the React/Vite app in `app/`
- Local persistence validation through real `localStorage`
- Request inspection at the browser boundary with Playwright `route()` mocks

Run it from `app/`:

```bash
npm run test:e2e
```

Useful variants:

```bash
npm run test:e2e -- --grep "settings"
npm run test:e2e:headed
```

The initial suite intentionally ports only a few high-signal flows before the broader migration from the legacy Python Playwright suite.
