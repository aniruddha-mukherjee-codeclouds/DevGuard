# DevGuard Web — Architecture

## High-Level System Design

DevGuard Web is a local developer environment inspector. It scans listening TCP ports, environment variables, Node.js version, and running processes, then surfaces results in a browser dashboard.

Next.js serves as the delivery layer only. All inspection logic lives in `/lib` as plain Node.js modules with no framework dependencies. API routes are thin wrappers. This separation makes the core logic independently testable and portable.

The app is designed to run on localhost. It requires Node.js runtime (not Edge) to access `net`, `fs`, and `child_process`.

---

## Module Breakdown

```
/lib/types/index.ts              Shared TypeScript interfaces
/lib/constants/defaultConfig.ts  Hardcoded fallback values
/lib/utils/config.ts             Loads devguard.config.json, merges with defaults
/lib/utils/system.ts             OS detection, cross-platform helpers (getRunningProcesses, getNodeVersion, getListeningPorts)
/lib/checks/portCheck.ts         Lists occupied TCP listening ports from the OS
/lib/checks/envCheck.ts          Reads .env.example, validates keys against process.env
/lib/checks/nodeCheck.ts         Compares Node version to required semver range
/lib/checks/processCheck.ts      Checks if required processes are running via child_process
/lib/core/registry.ts            Static array of all check modules { name, run }
/lib/core/runAllChecks.ts        Loads config once, runs registry in parallel with timeout + error wrapping
/app/api/scan/route.ts           GET /api/scan — calls runAllChecks, returns JSON
/app/page.tsx                    Dashboard UI — Run Scan button + results
```

---

## Data Flow

```
Browser: "Run Scan" clicked
    │
    ▼
GET /api/scan
    │
    ▼
route.ts
  → calls runAllChecks()
  → serializes ScanResponse to JSON
    │
    ▼
runAllChecks.ts
  → loads config once (config.ts)
  → imports registry (static array of 4 checks)
  → Promise.allSettled(
      registry.map(check =>
        Promise.race([check.run(config), timeout(config.timeoutMs)])
      )
    )
  → derives overallStatus from all results
  → returns ScanResponse
    │
    ├── portCheck.run(config)      net module, cross-platform via system.ts
    ├── envCheck.run(config)       fs.readFileSync .env.example, compares keys
    ├── nodeCheck.run(config)      getNodeVersion() helper + semver range check
    └── processCheck.run(config)   exec (tasklist / ps aux) via system.ts
    │
    ▼
Each check returns CheckResult { name, status, message, suggestion?, details?, durationMs }
    │
    ▼
ScanResponse { timestamp, overallStatus, results[] }
    │
    ▼
Frontend renders one status card per result
```

**Error isolation:** `runAllChecks` wraps each `Promise.race` in try/catch. A check that throws or times out produces an error `CheckResult` without affecting the others.

**Config parse failure:** If `devguard.config.json` exists but is malformed, a synthetic `CheckResult` (`name: 'Config'`, `status: 'warning'`) is prepended to results. Defaults are used for all checks.

---

## API Structure

### `GET /api/scan`

**Runtime:** Node.js (not Edge)

**Success response — `200 OK`:**
```json
{
  "timestamp": "2026-05-06T10:00:00.000Z",
  "overallStatus": "warning",
  "results": [
    {
      "name": "Port Check",
      "status": "warning",
      "message": "Detected 2 occupied TCP listening ports",
      "suggestion": "Stop the process using a conflicting port or change your app port before starting another service",
      "details": { "occupied": [3000, 3001], "total": 2 },
      "durationMs": 38
    },
    {
      "name": "Env Check",
      "status": "ok",
      "message": "All 4 required keys are present",
      "details": { "missing": [], "present": ["DATABASE_URL", "API_KEY", "PORT", "NODE_ENV"], "total": 4 },
      "durationMs": 5
    },
    {
      "name": "Node Check",
      "status": "ok",
      "message": "Node v20.11.0 satisfies >=18.0.0",
      "details": { "current": "20.11.0", "required": ">=18.0.0", "satisfied": true },
      "durationMs": 1
    },
    {
      "name": "Process Check",
      "status": "warning",
      "message": "1 of 2 configured processes not found",
      "suggestion": "Start redis-server or remove it from devguard.config.json",
      "details": { "running": ["docker"], "missing": ["redis"] },
      "durationMs": 112
    }
  ]
}
```

**Error response — `500 Internal Server Error`:**
```json
{ "error": "Internal server error", "message": "Unexpected failure in scan runner" }
```

---

## Tradeoffs

| Decision | Chosen | Alternative | Reason |
|---|---|---|---|
| Framework coupling | `/lib` isolated from Next.js | Logic inside routes | Testability; framework portability |
| Parallelism | `Promise.allSettled` | Sequential | Speed; one failure doesn't block others |
| Error handling | Central in runner | Per-check try/catch | Checks stay clean; consistent error shape |
| Timeout | `Promise.race` per check | Global scan timeout | Per-check granularity; better error messages |
| Config | File + hardcoded defaults | Env vars only | Supports arrays; readable; no shell escaping |
| Registry | Static array in `registry.ts` | Dynamic FS discovery | Explicit, fully typed, zero magic |
| OS compat | `system.ts` abstraction | Inline `process.platform` | Single place to update; checks stay clean |
| Testing | Vitest + DI for system deps | Jest + global mocks | Faster; ESM-native; DI avoids global state |
| Node version | Semver range (`>=18`) | Exact version pin | Flexible; matches real-world `.nvmrc` patterns |
