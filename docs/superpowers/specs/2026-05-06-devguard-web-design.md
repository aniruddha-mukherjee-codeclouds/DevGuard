---
name: DevGuard Web — Design Spec
description: Full design for a Next.js-based developer environment inspector with cross-platform checks for ports, env vars, Node version, and processes
type: project
---

# DevGuard Web — Design Spec

**Date:** 2026-05-06
**Status:** Approved

---

## Overview

DevGuard Web is a local developer environment inspector. It runs four checks (listening TCP ports, env vars, Node version, processes) in parallel and presents results in a browser dashboard. Built with Next.js App Router, TypeScript, and a framework-agnostic `/lib` core.

---

## Architecture

### Constraints
- Next.js used for UI and API routes only — no business logic in routes or components
- All check logic in `/lib` as pure Node.js modules
- API routes are thin wrappers over `runAllChecks()`
- Node.js runtime only (not Edge) — requires `net`, `fs`, `child_process`
- App runs locally on `localhost`

### Folder Structure

```
/app
  /api/scan/route.ts           GET endpoint — thin wrapper only
  /page.tsx                    Dashboard UI
  /layout.tsx

/lib
  /types/index.ts              CheckResult, ScanResponse, DevGuardConfig
  /constants/defaultConfig.ts  Hardcoded fallback values
  /utils
    /config.ts                 Loads devguard.config.json, merges with defaults
    /system.ts                 OS detection, cross-platform helpers
  /checks
    /portCheck.ts
    /envCheck.ts
    /nodeCheck.ts
    /processCheck.ts
  /core
    /registry.ts               Static array of { name, run } check modules
    /runAllChecks.ts           Config loading, parallel execution, error wrapping

/devguard.config.json          Optional user config (gitignored)
/devguard.config.example.json  Example config committed to repo
/.env.example                  Required env keys reference
```

---

## Types

```ts
type CheckStatus = 'ok' | 'warning' | 'error';

interface CheckResult {
  name: string;
  status: CheckStatus;
  message: string;
  suggestion?: string;          // required when status is 'error'
  details?: Record<string, unknown>;
  durationMs: number;
}

interface ScanResponse {
  timestamp: string;            // ISO 8601
  overallStatus: CheckStatus;   // derived: error > warning > ok
  results: CheckResult[];
}

interface DevGuardConfig {
  requiredEnvKeys: string[];    // default: []
  requiredNodeVersion: string;  // default: '>=18.0.0' (semver range)
  processes: string[];          // default: ['redis', 'docker']
  timeoutMs: number;            // default: 4000
}
```

---

## Check Module Interface

Each check exports a plain object:

```ts
interface CheckModule {
  name: string;
  run: (config: DevGuardConfig, deps?: SystemDeps) => Promise<CheckResult>;
}
```

`deps` carries injected system dependencies (`fs`, `net`, `exec`, `getNodeVersion`) for testability. Production code passes real implementations; tests pass mocks.

---

## Runner Behaviour

`runAllChecks()`:
1. Calls `config.ts` once — loads and merges `devguard.config.json` with defaults
2. If config file is malformed, prepends a synthetic `CheckResult` (`name: 'Config'`, `status: 'warning'`) and uses defaults
3. Iterates over `registry` array
4. Each check runs inside `Promise.race([check.run(config), timeout(config.timeoutMs)])`
5. Each race is wrapped in try/catch — exceptions produce an error `CheckResult` without affecting other checks
6. Timeout error message format: `'<checkName> timed out after <timeoutMs>ms'`
7. Derives `overallStatus`: `error` if any result is error, `warning` if any is warning, else `ok`
8. Returns `ScanResponse`

---

## Error Handling Rules

| Scenario | Result |
|---|---|
| `devguard.config.json` missing | Silent — use defaults |
| `devguard.config.json` malformed | Synthetic `Config` warning result, use defaults |
| `processes: []` | `ok`, message "No processes configured to check" |
| Check throws | `error` result, exception message in `details.error`, `suggestion` provided |
| Check times out | `error` result, message includes check name and timeout duration, `suggestion` provided |
| `status: 'error'` | `suggestion` field always present (enforced by convention) |
| `.env.example` missing | `warning` — soft failure, not an error |
| Process not found | `warning` — not treated as fatal |
| Node version mismatch | `error` |

---

## OS Compatibility

`lib/utils/system.ts` provides:
- `getNodeVersion()` — returns `process.version` stripped of `v` prefix
- `getListeningPorts(deps)` — reads currently listening TCP ports from the host OS
- `getRunningProcesses(deps)` — runs `tasklist` (Windows) or `ps aux` (macOS/Linux), returns process name list

Checks contain no `process.platform` branching. All platform logic is in `system.ts`.

---

## Default Config

```ts
// lib/constants/defaultConfig.ts
export const defaultConfig: DevGuardConfig = {
  requiredEnvKeys: [],
  requiredNodeVersion: '>=18.0.0',
  processes: ['redis', 'docker'],
  timeoutMs: 4000,
};
```

---

## API

### `GET /api/scan`

- Runtime: `nodejs` (export `const runtime = 'nodejs'`)
- Calls `runAllChecks()`
- Returns `200` with `ScanResponse` on success
- Returns `500` with `{ error, message }` if runner itself fails catastrophically

---

## Frontend

Minimal dashboard:
- "Run Scan" button triggers `GET /api/scan`
- Loading state while scan runs
- One card per `CheckResult` — shows name, status badge (`ok`/`warning`/`error`), message
- Expandable section per card for `details` and `suggestion`
- `overallStatus` shown as a banner at the top
- Tailwind CSS for styling — no UI library dependency

---

## Testing

**Framework:** Vitest

**Approach:** Dependency injection for all system modules (`fs`, `net`, `exec`, `getNodeVersion`). No global mocks.

**Required test cases:**
- Each check: happy path, empty config array, edge cases from module docs
- `nodeCheck`: uses mocked `getNodeVersion()` helper — never mocks `process.version` directly
- Runner: all pass, one throws, one times out, empty registry
- `overallStatus` aggregation: all ok, mixed, all error
- One snapshot test for `ScanResponse` shape
- Assertion that every `'error'` result has a non-empty `suggestion`
- `config.ts`: valid JSON, malformed JSON, missing file

---

## Out of Scope

- Authentication / access control (local tool only)
- Persistent scan history
- CI integration / remote scanning
- Plugin system for custom checks
- Real-time updates (WebSocket / SSE)
