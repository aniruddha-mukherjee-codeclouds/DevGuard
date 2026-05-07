# DevGuard Web

A local developer environment inspector built with Next.js. Run a single scan to instantly surface port conflicts, missing environment variables, Node.js version mismatches, and missing background processes.

---

## What It Does

DevGuard Web runs four checks against your local environment and presents results in a clean dashboard:

| Check | What It Inspects |
|---|---|
| **Port Check** | Which TCP ports are currently listening on your machine |
| **Env Check** | Whether all keys from `.env.example` are present in the environment |
| **Node Check** | Whether your Node.js version satisfies the required semver range |
| **Process Check** | Whether required background processes (e.g., Redis, Docker) are running |

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
# Edit devguard.config.json to set your processes, Node version, etc.

# 3. Start the development server
npm run dev

# 4. Open http://localhost:3000 and click "Run Scan"
```

### Run Tests

```bash
npm run test
```

### Optional Config (`devguard.config.json`)

If not present, all checks use hardcoded defaults. To override:

```json
{
  "requiredEnvKeys": ["DATABASE_URL", "API_KEY"],
  "requiredNodeVersion": ">=18.0.0",
  "processes": ["redis", "docker"],
  "timeoutMs": 4000
}
```

### `.env.example`

Place a `.env.example` file in the project root listing required environment variable keys:

```
DATABASE_URL=
API_KEY=
PORT=
NODE_ENV=
```

The Env Check validates that every key listed here is present in your actual environment.

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
