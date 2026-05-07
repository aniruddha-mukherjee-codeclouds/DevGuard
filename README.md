# DevGuard Web

DevGuard Web is a local Next.js dashboard for checking whether a developer machine is ready to run a target project.

It inspects four things in one scan:

- `Port Check`: what ports are listening right now, what process owns them, and whether the chosen target port belongs to the target project or a conflicting process
- `Env Check`: whether the target project's `.env` files satisfy `.env.example`
- `Node Check`: whether the machine's Node version is compatible with the target project
- `Process Check`: whether developer-selected background services are running

## Current Product Shape

This project is no longer centered around a fixed list of configured ports or a hardcoded process list.

The current workflow is:

1. Start DevGuard locally
2. Enter a target app port such as `3000`
3. Select any supporting processes you care about
4. Run the scan
5. Review the results in modal detail views

DevGuard then tries to resolve the project running on that port and uses that project as the inspection target for Env Check and Node Check.

## What The Checks Mean

### Port Check

- Enumerates all listening TCP ports on the host OS
- Shows `port -> process name -> pid`
- If a target port is provided:
  - returns `ok` when the port is free
  - returns `ok` when the port is already in use by the resolved target project
  - returns `error` when the port is occupied by some other process

### Env Check

- Resolves the target project from the selected port when possible
- Reads that project's `.env.example`
- Merges `.env` and `.env.local` from the target project
- Reports missing keys, present keys, and placeholder-like values such as `changeme`

### Node Check

- Compares the machine's current Node version to the target project's requirement
- Looks for an explicit requirement in:
  - `package.json#engines.node`
  - `.nvmrc`
  - `.node-version`
- If no explicit version file exists, it falls back to installed framework/tooling metadata such as:
  - `node_modules/next/package.json#engines.node`
  - `node_modules/vite/package.json#engines.node`

### Process Check

- Uses the processes selected in the UI
- Checks whether matching process names are visible in the OS process list
- Supports built-in options plus custom comma-separated names

## UI Behavior

- The dashboard is rendered in a two-column card layout on larger screens
- Each check has a compact summary card
- Clicking `Show details` opens a centered modal instead of expanding the card inline
- The modal backdrop blurs the page and the modal body scrolls independently
- Long paths, command lines, and package source strings are wrapped inside cards and modals to avoid horizontal overflow

## Tech Stack

- Next.js 14 App Router
- React 18
- TypeScript
- Tailwind CSS
- Vitest
- `semver`

## Run Locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Tests

```bash
npm run test
npx tsc --noEmit
```

## Optional Config File

DevGuard can still read an optional `devguard.config.json`, but the current product does not depend on it for the main workflow.

Supported fields:

```json
{
  "requiredEnvKeys": ["DATABASE_URL", "API_KEY"],
  "processes": [],
  "timeoutMs": 4000
}
```

Notes:

- `targetPort` is supplied by the UI and API request, not by the config file
- `processes` can be overridden by the UI selection
- Node Check does not read a required Node version from config

## API

`GET /api/scan`

Optional query params:

- `targetPort=3000`
- `processes=redis,docker,postgres`

Example:

```txt
/api/scan?targetPort=3000&processes=redis,docker
```

## Project Structure

```txt
app/
  api/scan/route.ts
  components/
  page.tsx
lib/
  checks/
  constants/
  core/
  types/
  utils/
docs/
  modules/
  superpowers/
```

## Notes

- DevGuard is designed for local use
- API routes run on the Node.js runtime, not Edge
- Target project resolution is best-effort and depends on what can be inferred from the process listening on the chosen port
