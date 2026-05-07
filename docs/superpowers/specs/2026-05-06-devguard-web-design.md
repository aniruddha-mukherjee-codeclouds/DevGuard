---
name: DevGuard Web - Design Spec
description: Current design snapshot for the local developer environment inspector
type: project
---

# DevGuard Web - Design Spec

**Date:** 2026-05-07
**Status:** Active

## Product Summary

DevGuard Web is a local-only developer environment inspector built with Next.js App Router. It helps a developer answer one practical question quickly:

`Is the project running on this local port ready, compatible, and free of obvious machine-level conflicts?`

The current product centers on:

- target-port-driven project resolution
- machine-level port visibility
- env-file validation against `.env.example`
- Node compatibility against explicit or inferred project requirements
- user-selected process checks

## Current UX

- user enters a target port such as `3000`
- user selects any relevant supporting processes
- user runs the scan
- results appear as summary cards
- clicking `Show details` opens a modal with richer, structured detail

The UI no longer renders raw JSON for result details.

## Current Architecture Constraints

- Next.js is used only for the dashboard and API route
- business logic lives in `/lib`
- API route runs on Node.js runtime
- cross-platform system inspection goes through `lib/utils/system.ts`
- port-to-project resolution goes through `lib/utils/projectTarget.ts`

## Current Check Definitions

### Port Check

- lists all listening TCP ports
- shows process name and PID per port
- marks the chosen target port in the full occupied-port list
- returns:
  - `ok` if target port is free
  - `ok` if target port belongs to the resolved target project
  - `error` if target port is occupied by another process

### Env Check

- resolves the target project from the chosen port when possible
- reads `.env.example`, `.env`, `.env.local`
- merges project env files
- reports missing and placeholder-like values

### Node Check

- compares current machine Node version to the target project's requirement
- looks for explicit version metadata first
- falls back to installed framework/tooling package engine metadata when necessary

### Process Check

- checks whether selected process names are present in the OS process list
- built-in options come from `lib/constants/processOptions.ts`
- custom process names can be added from the UI

## Current Config Model

Optional file: `devguard.config.json`

Supported fields:

```json
{
  "requiredEnvKeys": [],
  "processes": [],
  "timeoutMs": 4000
}
```

Important:

- `targetPort` is request-driven
- UI process selection can override `processes`
- Node version is not configured here

## API Shape

`GET /api/scan`

Query params:

- `targetPort`
- `processes`

Example:

```txt
/api/scan?targetPort=3000&processes=redis,docker
```

## Testing Model

- Vitest
- dependency injection for system-facing code
- per-check tests plus runner tests
- current suite covers Node fallback behavior and target-port ownership behavior

## Design Intent

The project is intentionally optimized for local developer clarity:

- explain what is running
- point at the likely target project
- keep results structured and readable
- avoid false conflict reports when the target project is already using its own port
