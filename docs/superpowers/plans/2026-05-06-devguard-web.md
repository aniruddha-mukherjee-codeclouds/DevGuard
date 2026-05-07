# DevGuard Web - Current Implementation Snapshot

**Date:** 2026-05-07

This file now serves as a current-state implementation note rather than the original build checklist. The codebase has moved beyond the first plan and the goal here is to keep future contributors aligned with what the product is today.

## What Exists Today

- Next.js 14 App Router dashboard
- `GET /api/scan` API route
- parallel check runner with timeout protection
- four checks:
  - Port Check
  - Env Check
  - Node Check
  - Process Check
- structured result cards with modal detail views

## Current User Flow

1. Open DevGuard locally
2. Enter the target application's port
3. Select any background processes relevant to that project
4. Run the scan
5. Review summary cards and open modals for details

## Key Product Decisions That Changed Since The Initial Build

### 1. Port inspection is dynamic

The app no longer checks only a preconfigured list of ports.

Instead it:

- reads all listening TCP ports from the OS
- shows which process is using each port
- evaluates the selected target port specially

### 2. Env Check is project-targeted

The app no longer checks DevGuard's own `process.env`.

It now:

- resolves the target project from the selected port
- reads that project's `.env.example`
- validates `.env` and `.env.local`

### 3. Node Check is smarter

The app no longer depends on a configured required Node version.

It now:

- prefers explicit project version files
- falls back to framework/tooling package `engines.node` metadata

### 4. Process Check is UI-driven

The app no longer assumes fixed process targets by default.

The user now chooses what to inspect from the dashboard.

### 5. Details are modal-based

The app no longer expands cards inline with raw JSON.

It now:

- renders structured detail UIs
- opens them in a centered modal
- keeps the dashboard grid stable

## Current File Map

```txt
app/
  api/scan/route.ts
  components/ResultCard.tsx
  components/StatusBadge.tsx
  globals.css
  layout.tsx
  page.tsx
lib/
  checks/envCheck.ts
  checks/nodeCheck.ts
  checks/portCheck.ts
  checks/processCheck.ts
  constants/defaultConfig.ts
  constants/processOptions.ts
  core/registry.ts
  core/runAllChecks.ts
  types/index.ts
  utils/config.ts
  utils/projectTarget.ts
  utils/system.ts
__tests__/
```

## Current Priorities For Future Work

- improve project-root resolution reliability for more wrapper/tooling setups
- optionally support explicit project path fallback in the UI
- expand health checks beyond process-name presence
- keep docs synchronized whenever check behavior changes

## Validation Baseline

At the time of this update:

- `npx tsc --noEmit` passes
- `npm run test` passes
- the suite covers 50 tests
