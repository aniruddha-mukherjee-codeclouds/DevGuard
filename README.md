# DevGuard Web

## What It Does

DevGuard Web is a local developer environment inspector built with Next.js. It helps a developer quickly check whether a target project is ready to run by scanning ports, env setup, Node compatibility, and selected background processes from one dashboard.

## Why I Built It

A lot of local setup issues are easy to diagnose but annoying to chase manually. Port conflicts, missing env keys, the wrong Node version, or a dependency like Redis not running can waste time before actual development even starts, so I built this to make that feedback visible in one place.

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

3. Start the app:

```bash
npm run dev
```

4. Open `http://localhost:3000`
5. Enter the target app port, select any relevant process targets, and click `Run Scan`

Optional:

- Run tests with `npm run test`
- Run typecheck with `npx tsc --noEmit`
- You can also add an optional `devguard.config.json` if you want to override `requiredEnvKeys`, `processes`, or `timeoutMs`

## AI Tools Used

- Claude
- Codex

Planned future addition:

- Google Stitch for improving and refining the UI in a future iteration

## What AI Got Right

- Helped scaffold the initial Next.js structure and split the project cleanly between UI code and framework-agnostic check logic
- Accelerated the test-driven buildout of the check modules and runner flow
- Made it faster to iterate on the UI once the product direction became clearer

## What I Had to Fix

- The original port-check behavior was not reliable enough for real developer workflows, so I changed it from a fixed configured-port check to dynamic OS-level port inspection
- The early Env Check was validating DevGuard's own process environment, which was not very useful, so I redesigned it to inspect the target project's `.env` files instead
- Node version checking had to be improved because not every project keeps `.nvmrc` or `engines.node`, so I added a fallback based on framework and toolchain package compatibility
- The result details originally expanded inline and caused awkward layout shifts, so I moved them into a centered modal and then fixed multiple overflow issues for long paths and command strings

## What I Learned About Vibe Coding

- AI is excellent for generating momentum, especially when the architecture is small enough to keep in your head and the feedback loop is fast
- The most useful pattern is not accepting the first version blindly, but treating AI output like a strong draft that still needs product judgment
- The better I got at giving precise constraints, the better the results became
- The hardest part was not generating code, but making sure the behavior actually matched the real developer problem I wanted to solve

## Screenshots / Demo

Current demo state:

- Local Next.js dashboard
- Modal-based check detail views
- Target-port-driven project inspection flow

You can add screenshots or a short GIF here for submission.
