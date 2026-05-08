# DevGuard Web - Architecture

## Overview

DevGuard Web is a local developer environment intelligence dashboard built with Next.js. It keeps thin API routes in the App Router and places product logic in framework-agnostic modules under `lib`.

The platform is organized into four product sections:

1. Inspector (existing)
2. Project Risks (new, renamed from Vulnerabilities)
3. Scan History (new)
4. Environment Settings (new)

The Inspector remains the execution engine for runtime checks. The new sections provide interpretation, continuity, and customization of local workflows without introducing cloud services, databases, or account systems.

## Core Principles (Unchanged)

- Thin API routes
- Pure logic in `lib`
- Cross-platform system inspection through explicit utilities
- Local-first persistence and behavior
- No overengineering or plugin architecture
- No runtime magic discovery systems
- Explicit, testable data flow

## High-Level Design

```txt
Browser UI (App Router)
  -> Section navigation (Inspector / Project Risks / Scan History / Environment Settings)
  -> GET /api/scan?targetPort=...&processes=...
  -> app/api/scan/route.ts
  -> lib/core/runAllChecks.ts
  -> lib/core/registry.ts (explicit ordered checks)
  -> Check results + metadata
  -> UI renders:
     - Inspector cards + modal details
     - Project Risks summary (derived locally)
     - Scan History list (localStorage)
     - Environment Settings form (localStorage)
```

## Feature Boundaries

### Inspector

- Purpose: run machine/project readiness checks.
- Source of truth: live system state and resolved target project.
- Persistence: none required for check execution itself.

### Project Risks

- Purpose: detect lightweight local operational risks.
- Input: latest Inspector result + project metadata from local files.
- Output: warnings with rationale and remediation hints.
- Explicitly not a CVE scanner, not `npm audit`, not external security intelligence.

### Scan History

- Purpose: retain recent scan snapshots for local comparison.
- Persistence: `localStorage` only.
- Retention: latest 20 entries, newest first.

### Environment Settings

- Purpose: persist user preferences for scan behavior and UI defaults.
- Persistence: `localStorage` only.
- Scope: single-browser, single-machine preferences.

## Responsibilities By Layer

### App Layer (`app/*`)

- Render section shells and interactions.
- Trigger scan execution through `/api/scan`.
- Read/write localStorage via dedicated client-side modules.
- Map domain results to visual components.

### API Layer (`app/api/*`)

- Parse query params.
- Pass explicit overrides to core runner.
- Return typed JSON only.
- Keep API routes free of business logic.

### Core Layer (`lib/core/*`)

- Keep explicit check registry ordering.
- Run checks with timeout guards and isolation.
- Derive overall statuses.
- Provide stable response shape for UI and history capture.

### Checks Layer (`lib/checks/*`)

- Inspector checks remain independent modules:
  - `portCheck`
  - `envCheck`
  - `nodeCheck`
  - `processCheck`
- Planned expansion:
  - `projectRiskCheck` as a dedicated non-security operational check module.

### Utility Layer (`lib/utils/*`)

- `system.ts`: cross-platform process/port inspection.
- `projectTarget.ts`: resolve target root from port/PID/command line.
- `config.ts`: optional static config loading.
- Planned additions:
  - `historyStore.ts` (browser localStorage wrapper)
  - `settingsStore.ts` (browser localStorage wrapper)

## Planned Data Flow

```txt
1) Load app
   -> read Environment Settings from localStorage
   -> prefill target port/process defaults
   -> optional auto-scan (if enabled)

2) Run scan
   -> UI composes request
   -> GET /api/scan
   -> runAllChecks executes registry
   -> response returned to Inspector UI

3) Persist snapshot
   -> client creates ScanHistoryEntry
   -> prepend to localStorage list
   -> trim to latest 20

4) Compute Project Risks
   -> evaluate rules against latest scan + local project files
   -> show risk cards and actionable hints

5) History interactions
   -> list scans newest-first
   -> open detail snapshot
   -> clear all
   -> export JSON
```

## Local Persistence Strategy

Persistence is intentionally split:

- `devguard.config.json` (optional file): project-level defaults and static check config.
- `localStorage`: user-level interaction state and lightweight history.

Why this split:

- file config is versionable and team-visible.
- localStorage is immediate, zero-setup, and local-user specific.
- no database lifecycle burden.
- no cloud or account coupling.

Planned localStorage keys:

- `devguard:settings:v1`
- `devguard:scan-history:v1`

## Proposed Data Contracts (Planning)

### Environment Settings

```ts
interface EnvironmentSettings {
  defaultTargetPort: number | null;
  defaultProcesses: string[];
  timeoutMs: number;
  autoScanOnLoad: boolean;
  theme: 'dark' | 'system';
}
```

### Scan History Entry

```ts
interface ScanHistoryEntry {
  id: string;
  timestamp: string;
  overallStatus: 'ok' | 'warning' | 'error';
  targetPort: number | null;
  selectedProcesses: string[];
  durationMsTotal: number;
  results: Array<{
    name: string;
    status: 'ok' | 'warning' | 'error';
    message: string;
    durationMs: number;
  }>;
}
```

## Tradeoffs and Rationale

| Decision | Choice | Why |
|---|---|---|
| Risks scope | Operational risk only | Useful signal without pretending to be security tooling |
| History storage | `localStorage` only | Zero infra, fast UX, aligned with local-first goals |
| Settings storage | `localStorage` only | User preference data does not need backend complexity |
| Module discovery | Explicit imports/registry | Predictable behavior and easier testability |
| Persistence limit | 20 scan entries | Prevents storage bloat while retaining recent context |

## Implementation Boundaries for Next Phase

- No database, ORM, or external persistence.
- No auth/accounts.
- No external vulnerability feeds/APIs.
- No plugin runtime system.
- No hidden background daemons.

This keeps DevGuard Web practical, understandable, and maintainable for local developer workflows.
