# DevGuard Web

## What It Is

DevGuard Web is a local developer environment intelligence dashboard built with Next.js.

It helps answer:

`Is my local project environment healthy, consistent, and ready to work with right now?`

## Current + Planned Sections

1. Inspector
2. Project Risks
3. Scan History
4. Environment Settings

Inspector is already working today. The other sections are planned and documented for implementation.

## Local-First Philosophy

DevGuard is intentionally local-first:

- checks run against your local machine and local project files
- no cloud dependency required for core workflows
- no account creation or sync requirements
- no mandatory remote APIs
- lightweight local persistence only (`localStorage`)

Why this matters:

- fast feedback loops
- no infrastructure overhead
- clear, inspectable behavior
- privacy by default for local environment data

## Feature Summary

### Inspector (Existing)

- Target-port-driven project inspection
- Port availability and ownership checks
- `.env` readiness checks
- Node version compatibility checks
- Selected process presence checks
- Modal-based check details

### Project Risks (Planned)

Operational risk detection for common local project issues such as:

- missing or conflicting lockfiles
- suspicious placeholder env values
- `.env` or `node_modules` gitignore problems
- framework/tooling version mismatch signals
- oversized dependency footprint warnings

Not a CVE scanner. Not an `npm audit` replacement.

### Scan History (Planned)

- Stores latest 20 scans in `localStorage`
- Newest-first timeline
- Clear history action
- Export JSON action

### Environment Settings (Planned)

- default target port
- default process list
- timeout duration
- auto-scan on load
- optional theme preference

## Tech Stack

- TypeScript
- Next.js 14 App Router
- React 18
- Tailwind CSS
- Vitest
- `semver`
- Node.js runtime APIs for process and port inspection

## How to Run

1. Clone the repository
2. Install dependencies:

```bash
npm install
```

3. Start development:

```bash
npm run dev
```

4. Open `http://localhost:3000`

Optional:

- Run tests: `npm run test`
- Build check: `npm run build`

## Architecture Snapshot

- App UI + API in Next.js App Router
- Thin route handlers
- Pure inspection logic under `lib`
- Explicit check registry
- Cross-platform system utilities in `lib/utils/system.ts`

See full architecture details in `architecture.md`.

## Screenshots

- `![Inspector Dashboard](docs/assets/screenshots/inspector-placeholder.png)`
- `![Project Risks](docs/assets/screenshots/project-risks-placeholder.png)`
- `![Scan History](docs/assets/screenshots/scan-history-placeholder.png)`
- `![Environment Settings](docs/assets/screenshots/environment-settings-placeholder.png)`

(Placeholders only; replace with real captures during implementation rollout.)

## Upcoming Features

- Project Risks module implementation (operational risk checks)
- Scan History UI + local persistence lifecycle
- Environment Settings UI + validation and defaults
- Cross-section navigation polish and empty-state handling
- Additional Vitest coverage for local persistence flows

## AI Tools Used

- Claude
- Codex
