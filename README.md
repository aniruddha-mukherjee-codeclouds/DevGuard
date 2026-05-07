# DevGuard Web

A local developer environment inspector built with Next.js. Run a single scan to instantly surface port conflicts, missing environment variables, Node.js version mismatches, and missing background processes.

---

## What It Does

DevGuard Web runs four checks against your local environment and presents results in a clean dashboard:

| Check | What It Inspects |
|---|---|
| **Port Check** | Which TCP ports are currently listening on your machine |
| **Env Check** | Whether all keys from `.env.example` are present in the target project's `.env` files, optionally resolved from a target port |
| **Node Check** | Whether your system Node.js version satisfies the target project's required version |
| **Process Check** | Whether the developer-selected background processes are running |

Each check returns a structured result with a status (`ok`, `warning`, or `error`), a human-readable message, optional details, and a suggestion when something is wrong.

---

## Why I Built It

Developer environment issues cause confusing failures. Wrong Node version, missing env vars, a port already bound — these are all easy to detect but annoying to debug manually. DevGuard Web gives you one button to check everything at once.

---

## Tech Stack

- **Framework:** Next.js 14 (App Router, TypeScript)
- **Runtime:** Node.js ≥18
- **Core:** Framework-agnostic `/lib` modules using `net`, `fs`, `child_process`
- **Styling:** Tailwind CSS
- **Testing:** Vitest

---

## How to Run

```bash
# 1. Install dependencies
npm install

# 2. (Optional) Create a config file to override defaults
cp devguard.config.example.json devguard.config.json
# Edit devguard.config.json to set your timeout and any extra env keys.

# 3. Start the development server
npm run dev

# 4. Open http://localhost:3000 and click "Run Scan"
```

To target another local app for Env Check, enter its port in the `Env Target Port` field before running the scan.

### Run Tests

```bash
npm run test
```

### Optional Config (`devguard.config.json`)

If not present, all checks use hardcoded defaults. To override:

```json
{
  "requiredEnvKeys": ["DATABASE_URL", "API_KEY"],
  "processes": [],
  "timeoutMs": 4000
}
```

Node Check discovers the required version from the target project's `package.json` `engines.node`, `.nvmrc`, or `.node-version` instead of reading a version from DevGuard config.
Process Check can be driven directly from the UI by selecting common developer services such as Docker, Redis, PostgreSQL, MySQL, MongoDB, Kafka, RabbitMQ, LocalStack, MailHog, Nginx, and more, plus any custom process names.

### `.env.example`

Place a `.env.example` file in the project root listing required environment variable keys:

```
DATABASE_URL=
API_KEY=
PORT=
NODE_ENV=
```

The Env Check validates that every key listed here is present in the target project's `.env` or `.env.local` file, and flags placeholder-like values such as `changeme`. When you provide an `Env Target Port`, DevGuard attempts to resolve the project root from the process listening on that port.

---

## AI Tools Used

_To be filled after project completion._

---

## What AI Got Right

_To be filled after project completion._

---

## What I Had to Fix

_To be filled after project completion._

---

## What I Learned

_To be filled after project completion._
