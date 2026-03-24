# Next hacka.re Migration Plan

Date: 2026-03-22

## Goal

Rebuild `hacka.re` in TypeScript with a modern, production-tested frontend stack while preserving the current product behavior:

- static deployable
- privacy-first
- direct browser-to-provider networking
- encrypted local/browser storage
- no required backend for the main app
- exact workflow parity with the current UI
- modest dependency footprint

The existing site should remain available inside the new repo as a linked legacy build, not discarded.

## What Exists Today

Repository review shows the current browser app is already a fairly large system, not a small static page:

- `81` files under `js/components`
- `74` files under `js/services`
- `47` top-level browser/unit test files under [`_tests`](/Users/user/dev/hacka.re/_tests/README.md)
- `330` files under [`_tests/playwright`](/Users/user/dev/hacka.re/_tests/playwright)

Core product traits confirmed from the current implementation and docs:

- static HTML/CSS/JS deployment
- local-hosted third-party libraries only
- encrypted browser storage
- direct API calls to OpenAI-compatible providers
- modal-heavy interface
- share links with encrypted payloads
- function calling and MCP integration
- broad browser-driven workflow tests

## Constraints

The rewrite should optimize for these constraints in this order:

1. Preserve behavior and workflows.
2. Preserve privacy and static deployment.
3. Reduce incidental UI complexity.
4. Improve maintainability and type safety.
5. Keep runtime dependencies intentionally small.

## Recommended Stack

### Foundation

- `TypeScript 5.9`
- `React 19`
- `Vite 8`

Why:

- TypeScript 5.9 is the current stable TypeScript release as of August 1, 2025.
- React 19 is stable and gives the most conservative, production-proven UI base with the strongest long-term ecosystem support.
- Vite 8 is current and is the cleanest fit for a static client app with fast local iteration and straightforward GitHub Pages style builds.

This combination is the safest path for "same product, better scaffolding" without introducing server assumptions.

### UI State

- React local state
- React Context for cross-cutting app services
- `useReducer` for complex feature state

Recommendation:

- Do not add Redux, Zustand, or XState in the first rewrite phase.

Why:

- The app is stateful, but most state is feature-scoped: chat, settings, share, prompts, MCP, functions, theme.
- The current app already maps naturally to feature modules and service boundaries.
- A global runtime store would increase dependency and architectural overhead before we have a typed domain model.
- If a store becomes necessary later, Redux Toolkit is the most conservative choice, but it is not justified at the start.

### Routing

- No router in phase 1 for the main chat app shell.
- Use Vite as a multi-page/static build.

Recommendation:

- Keep the main app as a single-page shell.
- Keep docs/about/legacy pages as static routes.
- Add a router only if the new app grows true in-app navigable screens beyond modals.

Why:

- The current product is fundamentally a single-screen application with modal workflows, not a route-driven product.
- A router adds little value for the migration and makes parity harder.

### Forms and Validation

- Native React controlled/uncontrolled forms
- `Zod 4` for runtime validation of untrusted inputs only

Use Zod for:

- share-link payload decoding
- local storage payload versioning/migrations
- imported/exported config blobs
- MCP/provider config parsing

Do not use Zod for:

- every internal component prop
- trivial form state

Why:

- This app handles a lot of untrusted browser data and persisted payloads.
- Zod adds real safety at the boundaries without forcing a framework-heavy form stack.
- `react-hook-form` is not needed initially because the settings surface is custom and modal-driven.

### Styling

- Plain CSS
- CSS custom properties for theming
- CSS Modules for component-local styles where isolation helps

Recommendation:

- Do not adopt Tailwind, Chakra, MUI, or a CSS-in-JS runtime.

Why:

- The current site already has a strong handcrafted visual identity.
- Utility/CSS-in-JS stacks would add large migration churn and a bigger dependency surface.
- Theme variables and handcrafted CSS are fully compatible with the existing aesthetic and zero-infrastructure goal.

### Icons

- `lucide-react` for new app icons
- keep custom SVG/logo assets where they define the existing identity

Why:

- tree-shakeable
- small footprint
- cleaner React integration than carrying forward Font Awesome as the primary icon system

### Markdown and Rendering

- `markdown-it`
- `DOMPurify`
- `highlight.js`

Recommendation:

- Replace ad hoc markdown rendering with a dedicated typed wrapper around these three libraries.

Why:

- They align closely with the current feature set.
- They preserve a static/client-only model.
- They avoid the weight and abstraction of a React markdown rendering stack unless we later need AST-level customization.

Alternative:

- Keeping `marked` is acceptable if minimizing change is more important than changing parser libraries. This is the least important decision in the stack.

### Crypto

- Keep `tweetnacl`
- Prefer Web Crypto for supported primitives where it materially simplifies code

Recommendation:

- Do not rewrite the cryptographic model during the UI migration.
- First, preserve the current semantics behind typed service boundaries and test vectors.

Why:

- Crypto rewrites are high risk.
- The migration goal is architectural modernization, not security-model reinvention.

### Testing

- `Playwright`
- `Vitest`
- `@testing-library/react`

Testing split:

- Playwright for workflow parity, browser behavior, real storage, modal flows, share links, and full chat workflows
- Vitest for typed unit/integration tests around services and React components
- Testing Library for component behavior at DOM level without coupling tests to implementation details

Recommendation:

- Port the current browser workflow coverage into Playwright first.
- Build new unit/integration coverage in Vitest as services are rewritten.
- Retire the current ad hoc browser test harness only after equivalent coverage exists.

## Libraries Explicitly Not Recommended For Phase 1

- `Next.js`: server-oriented by default, unnecessary for a static privacy-first chat shell
- `Remix` / full-stack React frameworks: same reason
- `Redux Toolkit`: good if the app later needs centralized event/state tracing, but currently unnecessary
- `TanStack Query`: the app does not have conventional cacheable CRUD server state; it mostly performs user-driven direct provider calls
- `Tailwind CSS`: fast to start, but poor fit for preserving the existing handcrafted visual language with minimal churn
- `Material UI`, `Ant Design`, `Chakra`: too opinionated visually and too heavy for this project
- `react-hook-form`: helpful for conventional forms, but not necessary for this modal-heavy custom UI yet
- `XState`: likely overkill unless modal and connection workflows prove unmanageable under typed reducers

## Recommended App Shape

```text
/
  legacy/
    index.html
    about/
    css/
    js/
    lib/
    images/
    ...
  app/
    index.html
    src/
      main.tsx
      app/
      features/
        chat/
        settings/
        prompts/
        share/
        functions/
        mcp/
        rag/
        theme/
      services/
      storage/
      crypto/
      markdown/
      test/
  docs/
```

Notes:

- `legacy/` is the frozen original site, served as its own static subtree.
- The new TypeScript app lives under `app/`.
- Top-level deployment can later choose whether `/` serves the new app and `/legacy/` serves the original, or vice versa during transition.

## Legacy Placement Plan

The safest migration plan is:

1. Freeze the current site into `/legacy`.
2. Keep all current pages and assets working inside that subtree.
3. Add a visible link in the new UI to "Original hacka.re".
4. Add a visible link in the legacy UI to "Next hacka.re" once the rewrite is ready.

Important:

- This should be done as a dedicated move with path-fix verification.
- Do not mix the legacy move with the TypeScript rewrite bootstrap in one giant commit.

Reason:

- The current app uses many root-relative and page-relative references.
- Moving it safely needs focused validation so legacy behavior does not silently break.

## Migration Architecture

### Principle

Preserve the current service boundaries conceptually, but rewrite them as typed modules with explicit interfaces.

### New architecture layers

1. `features/*`
   React components, reducers, feature hooks, and feature-specific view models.

2. `services/*`
   Provider APIs, share-link generation, model loading, MCP adapters, and business logic.

3. `storage/*`
   encrypted storage, schema versioning, namespace isolation, session/local persistence.

4. `crypto/*`
   wrappers around TweetNaCl/Web Crypto plus deterministic test vectors.

5. `domain/*` or `types/*`
   canonical app types, discriminated unions, payload schemas.

### Migration principle for old code

- Port behavior, not file names.
- Preserve tested semantics.
- Avoid carrying over global-window coupling.
- Convert implicit DOM contracts into typed interfaces.

## Feature Migration Order

### Phase 0: Freeze and map

- inventory legacy routes and assets
- define parity checklist
- identify all storage keys, URL formats, and payload schemas
- capture golden screenshots and Playwright traces for critical workflows

### Phase 1: Repository reshaping

- move current site to `/legacy`
- scaffold `app/` with Vite + React + TypeScript
- set up shared linting, formatting, and test commands
- make both apps runnable side by side

### Phase 2: Core shell parity

- header
- chat layout
- modal infrastructure
- theme system
- keyboard behavior
- responsive/mobile shell

Executable subtasks for the current implementation pass:

1. Create a typed app-shell reducer with modal, theme, composer, and chat-shell state.
2. Rebuild the legacy top-bar control surface in React with stable button IDs and typed actions.
3. Implement a reusable modal layer so settings, share, prompts, functions, MCP, and RAG can be ported incrementally without redesigning the shell.
4. Port the base chat surface: message list, model info block, composer, stop/send controls, and migration status affordances.
5. Keep the new shell visually close to the original product language while leaving feature bodies as clearly marked placeholders until each subsystem is ported.

### Phase 3: Storage and settings parity

- encrypted API key storage
- provider/base URL settings
- model selection
- theme persistence
- prompt persistence

### Phase 4: Chat parity

- conversation rendering
- markdown rendering
- token/context display
- streaming responses
- abort/stop generation
- conversation persistence

### Phase 5: Advanced feature parity

- share links
- function calling
- prompt library
- MCP integration
- RAG workflows
- agent/orchestration flows that still matter to the product

### Phase 6: Hardening

- accessibility pass
- browser compatibility pass
- performance budget
- bundle analysis
- remove dead migration shims

## Reusable Testing Strategy

The strongest asset in this repo is the existing workflow test culture. Reuse it.

### Golden-rule test pyramid

- Keep end-to-end workflow tests as the source of truth for parity.
- Add service-level unit tests as typed modules are extracted.
- Add component tests only where they reduce Playwright load or catch UI regressions earlier.

### Concrete plan

1. Identify the 20-30 highest-value existing workflows.
2. Convert those into stable Playwright specs against behavior, not implementation.
3. Build adapter helpers so the same test intent can run against `legacy/` and `app/`.
4. For crypto, storage, and sharing payloads, create fixed fixtures and deterministic vectors.
5. Use screenshot comparison only for a small curated visual set, not the whole product.

### Shared test abstractions to build

- page objects for modal open/close and common controls
- provider configuration helpers
- storage seeding/inspection helpers
- shared-link fixture builders
- streaming chat assertions
- feature parity matrix per workflow

### Real API policy

Keep both:

- mocked/unit coverage for repeatability and speed
- selective real-provider Playwright coverage for actual integration confidence

Do not rely only on real API tests. They are valuable but too slow and brittle to be the entire safety net for a rewrite.

## Proposed Dependency Policy

### Production dependencies

Allowed if they meet all of the following:

- materially reduce complexity
- widely used and stable
- compatible with static browser deployment
- small enough to justify their runtime cost
- not duplicating browser/platform capabilities

### Initial production dependency set

- `react`
- `react-dom`
- `zod`
- `markdown-it`
- `dompurify`
- `highlight.js`
- `tweetnacl`
- `lucide-react`

Possible to defer until needed:

- `react-router-dom`

### Initial development dependency set

- `typescript`
- `vite`
- `vitest`
- `@vitest/coverage-v8`
- `@testing-library/react`
- `@testing-library/dom`
- `@playwright/test`
- `eslint`
- `typescript-eslint`

Optional:

- `prettier`

## Decision Summary

If the rewrite starts today, the best default stack is:

- React 19
- TypeScript 5.9
- Vite 8
- plain CSS plus CSS variables and selective CSS Modules
- Zod only at trust boundaries
- Playwright plus Vitest plus React Testing Library
- TweetNaCl retained behind typed service wrappers
- legacy app preserved under `/legacy`

## Source Notes

Library/version research was checked against primary sources available on 2026-03-22:

- React 19 stable: https://react.dev/blog/2024/12/05/react-19
- TypeScript 5.9: https://devblogs.microsoft.com/typescript/announcing-typescript-5-9/
- Vite 8: https://vite.dev/blog/announcing-vite8
- Vitest current docs/blog: https://vitest.dev/ and https://vitest.dev/blog
- Playwright docs: https://playwright.dev/docs/intro
- Zod 4 stable docs: https://zod.dev/
- Lucide docs: https://lucide.dev/
- DOMPurify releases: https://github.com/cure53/DOMPurify/releases
- highlight.js releases: https://github.com/highlightjs/highlight.js/releases
- TweetNaCl.js project: https://github.com/dchest/tweetnacl-js
