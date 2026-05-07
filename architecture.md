# DevGuard Web - Architecture

## Overview

DevGuard Web is a local developer environment inspector built with Next.js. The UI and API layer live in the App Router, while all inspection logic lives in framework-agnostic modules under `lib`.

The project currently revolves around a target-app workflow:

- the user enters a target port in the dashboard
- DevGuard resolves the process listening on that port
- DevGuard tries to infer the target project root from that process command line
- Env Check and Node Check use that resolved project as their inspection target

Port Check and Process Check still inspect the current machine state, but they also incorporate the user-supplied target port when present.

## High-Level Design

```txt
Browser
  -> GET /api/scan?targetPort=3000&processes=redis,docker
  -> app/api/scan/route.ts
  -> lib/core/runAllChecks.ts
  -> registry of checks
     - portCheck
     - envCheck
     - nodeCheck
     - processCheck
  -> JSON response
  -> app/page.tsx summary cards
  -> app/components/ResultCard.tsx modal details
```

## Responsibilities By Layer

### App Layer

- `app/page.tsx`
  - collects `targetPort`
  - collects selected process targets
  - calls `/api/scan`
  - renders overall status and result cards

- `app/components/ResultCard.tsx`
  - renders human-readable details for each check
  - opens details in a centered modal
  - avoids raw JSON output in the UI

- `app/api/scan/route.ts`
  - parses `targetPort`
  - parses `processes`
  - passes request-driven overrides to the runner

### Core Layer

- `lib/core/registry.ts`
  - static ordered array of checks

- `lib/core/runAllChecks.ts`
  - loads optional config once
  - applies request-level overrides
  - runs checks in parallel
  - wraps each check with a timeout
  - isolates failures into per-check error results
  - derives `overallStatus`

### Check Layer

- `lib/checks/portCheck.ts`
  - enumerates listening ports
  - marks the chosen target port
  - reports whether the target port is free, owned by the target project, or occupied by another process

- `lib/checks/envCheck.ts`
  - resolves the target project root from port when possible
  - reads `.env.example`
  - validates `.env` and `.env.local`
  - flags missing and placeholder-like values

- `lib/checks/nodeCheck.ts`
  - resolves the target project root from port when possible
  - compares the current Node version to project requirements
  - falls back to framework/toolchain package metadata when no explicit version file exists

- `lib/checks/processCheck.ts`
  - checks whether the developer-selected process names appear in the OS process list

### Utility Layer

- `lib/utils/system.ts`
  - cross-platform process and port inspection
  - OS-specific command execution lives here

- `lib/utils/projectTarget.ts`
  - resolves a port to a PID
  - resolves a PID to a command line
  - infers a likely project root from command-line paths

- `lib/utils/config.ts`
  - reads optional `devguard.config.json`
  - merges it with defaults

## Current Config Model

`DevGuardConfig` currently contains:

```ts
interface DevGuardConfig {
  requiredEnvKeys: string[];
  processes: string[];
  timeoutMs: number;
  targetPort?: number;
}
```

Important details:

- `targetPort` is usually provided at request time from the dashboard
- `processes` may come from the optional config file, but the UI selection can override it
- Node requirements are not read from config

## Current Data Flow

```txt
User enters target port and process targets
  -> HomePage builds query params
  -> GET /api/scan
  -> route.ts parses query params
  -> runAllChecks({ configOverrides })
  -> loadConfig()
  -> merge defaults + file config + request overrides
  -> run registry in parallel with Promise.race timeout guards
  -> return ScanResponse
  -> UI renders cards
  -> Details open in a modal
```

## Status Semantics

### Overall Status

- `error` if any check returns `error`
- `warning` if no errors but at least one warning exists
- `ok` otherwise

### Per-Check Status

- Port Check:
  - `ok` for free target port
  - `ok` for target port already owned by the resolved target project
  - `error` for target port occupied by another process
  - `warning` only in the no-target broad machine-state case when occupied ports are found

- Env Check:
  - `ok` when required keys are present and not placeholder-like
  - `warning` when target resolution fails, `.env.example` is missing, or no env files are found
  - `error` for missing keys, placeholder values, or file read failures

- Node Check:
  - `ok` when current Node satisfies explicit or inferred project requirement
  - `warning` when no usable requirement can be found or the target project cannot be resolved
  - `error` for incompatibility, malformed version metadata, or metadata read failures

- Process Check:
  - `ok` when every selected process is found
  - `warning` when some selected processes are missing
  - `error` when process listing fails

## API

### `GET /api/scan`

Query params:

- `targetPort`
- `processes`

Example:

```txt
/api/scan?targetPort=3000&processes=redis,docker
```

The route runs on `runtime = 'nodejs'`.

## UI Model

The current dashboard is intentionally lightweight and local-tool oriented:

- top control row for target port and scan action
- process selection grid with built-in service presets
- custom process input
- overall summary bar
- two-column result grid on larger screens
- modal-based detail views with scrollable content and blurred backdrop
- overflow-safe text rendering for long paths, command lines, and dependency source strings

## Tradeoffs

| Decision | Current Choice | Why |
|---|---|---|
| Target discovery | Resolve project from port | Matches how developers think about running local apps |
| Node compatibility | Explicit files first, framework fallback second | Useful even when projects omit `.nvmrc` or `engines.node` |
| Port ownership | Treat target-project ownership as healthy | More developer-friendly than flagging your own running app as a conflict |
| Process selection | UI-driven | Different projects care about different dependencies |
| Detail rendering | Custom UI + modal | Easier to read than raw JSON and does not disturb grid layout |
