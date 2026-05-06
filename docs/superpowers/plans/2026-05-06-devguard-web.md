# DevGuard Web Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a cross-platform Next.js developer environment inspector that runs four parallel checks (ports, env vars, Node version, processes) and displays results in a browser dashboard.

**Architecture:** Framework-agnostic core in `/lib` (plain Node.js modules with dependency injection for system APIs); Next.js used only for `/app/api/scan/route.ts` (thin GET wrapper) and `/app/page.tsx` (dashboard UI). A static registry array wires four check modules to a parallel runner using `Promise.allSettled` + per-check timeouts. Config loaded once in the runner, passed down to each check.

**Tech Stack:** Next.js 14 (App Router, TypeScript), Tailwind CSS, Vitest, `semver` npm package, Node.js built-ins (`net`, `fs`, `child_process`)

---

## File Map

```
package.json
tsconfig.json
next.config.ts
tailwind.config.ts
postcss.config.mjs
vitest.config.ts
.eslintrc.json
.prettierrc
.gitignore (update)
devguard.config.example.json
.env.example
app/layout.tsx
app/globals.css
app/page.tsx
app/api/scan/route.ts
app/components/StatusBadge.tsx
app/components/ResultCard.tsx
lib/types/index.ts
lib/constants/defaultConfig.ts
lib/utils/config.ts
lib/utils/system.ts
lib/checks/portCheck.ts
lib/checks/envCheck.ts
lib/checks/nodeCheck.ts
lib/checks/processCheck.ts
lib/core/registry.ts
lib/core/runAllChecks.ts
__tests__/lib/utils/config.test.ts
__tests__/lib/utils/system.test.ts
__tests__/lib/checks/portCheck.test.ts
__tests__/lib/checks/envCheck.test.ts
__tests__/lib/checks/nodeCheck.test.ts
__tests__/lib/checks/processCheck.test.ts
__tests__/lib/core/runAllChecks.test.ts
```

---

## Task 1: Bootstrap project config files

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `next.config.ts`
- Update: `.gitignore`

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "devguard-web",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "next": "^14.2.0",
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "semver": "^7.6.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0",
    "@types/semver": "^7.5.0",
    "autoprefixer": "^10.4.0",
    "eslint": "^8.0.0",
    "eslint-config-next": "^14.2.0",
    "postcss": "^8.4.0",
    "prettier": "^3.0.0",
    "tailwindcss": "^3.4.0",
    "typescript": "^5.4.0",
    "vitest": "^1.6.0"
  }
}
```

- [ ] **Step 2: Create `tsconfig.json`**

```json
{
  "compilerOptions": {
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": {
      "@/*": ["./*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 3: Create `next.config.ts`**

```ts
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {};

export default nextConfig;
```

- [ ] **Step 4: Update `.gitignore`**

Append these lines to the existing `.gitignore` (create it if absent):

```
node_modules/
.next/
.env
devguard.config.json
```

- [ ] **Step 5: Commit**

```bash
git add package.json tsconfig.json next.config.ts .gitignore
git commit -m "chore: add Next.js project config files"
```

---

## Task 2: Configure tooling

**Files:**
- Create: `tailwind.config.ts`
- Create: `postcss.config.mjs`
- Create: `vitest.config.ts`
- Create: `.eslintrc.json`
- Create: `.prettierrc`

- [ ] **Step 1: Create `tailwind.config.ts`**

```ts
import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}'],
  theme: { extend: {} },
  plugins: [],
};

export default config;
```

- [ ] **Step 2: Create `postcss.config.mjs`**

```js
const config = {
  plugins: { tailwindcss: {}, autoprefixer: {} },
};

export default config;
```

- [ ] **Step 3: Create `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, '.') },
  },
});
```

- [ ] **Step 4: Create `.eslintrc.json`**

```json
{
  "extends": "next/core-web-vitals"
}
```

- [ ] **Step 5: Create `.prettierrc`**

```json
{
  "semi": true,
  "singleQuote": true,
  "trailingComma": "es5",
  "printWidth": 100
}
```

- [ ] **Step 6: Commit**

```bash
git add tailwind.config.ts postcss.config.mjs vitest.config.ts .eslintrc.json .prettierrc
git commit -m "chore: add Tailwind, Vitest, ESLint, Prettier config"
```

---

## Task 3: Scaffold app shell and example files

**Files:**
- Create: `app/globals.css`
- Create: `app/layout.tsx`
- Create: `app/page.tsx` (stub — replaced in Task 13)
- Create: `devguard.config.example.json`
- Create: `.env.example`

- [ ] **Step 1: Create `app/globals.css`**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

- [ ] **Step 2: Create `app/layout.tsx`**

```tsx
import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'DevGuard Web',
  description: 'Developer environment inspector',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-gray-950 text-gray-100 min-h-screen">{children}</body>
    </html>
  );
}
```

- [ ] **Step 3: Create `app/page.tsx` (stub)**

```tsx
export default function HomePage() {
  return <main className="p-8"><h1 className="text-xl">DevGuard Web</h1></main>;
}
```

- [ ] **Step 4: Create `devguard.config.example.json`**

```json
{
  "ports": [3000, 5432, 6379],
  "requiredEnvKeys": ["DATABASE_URL", "API_KEY"],
  "requiredNodeVersion": ">=18.0.0",
  "processes": ["redis", "docker"],
  "timeoutMs": 4000
}
```

- [ ] **Step 5: Create `.env.example`**

```
DATABASE_URL=
API_KEY=
PORT=
NODE_ENV=
```

- [ ] **Step 6: Install dependencies**

Run: `npm install`

Expected: `node_modules/` created, lock file generated, no fatal errors. Peer dependency warnings are safe to ignore.

- [ ] **Step 7: Verify dev server starts**

Run: `npm run dev`

Expected: Server starts at `http://localhost:3000`. Open in browser — stub page renders "DevGuard Web". Stop with Ctrl+C.

- [ ] **Step 8: Commit**

```bash
git add app/globals.css app/layout.tsx app/page.tsx devguard.config.example.json .env.example package-lock.json
git commit -m "chore: scaffold app shell, example files, install deps"
```

---

## Task 4: Define shared types and default config

**Files:**
- Create: `lib/types/index.ts`
- Create: `lib/constants/defaultConfig.ts`

No tests — pure type and data definitions.

- [ ] **Step 1: Create `lib/types/index.ts`**

```ts
export type CheckStatus = 'ok' | 'warning' | 'error';

export interface CheckResult {
  name: string;
  status: CheckStatus;
  message: string;
  suggestion?: string;
  details?: Record<string, unknown>;
  durationMs: number;
}

export interface ScanResponse {
  timestamp: string;
  overallStatus: CheckStatus;
  results: CheckResult[];
}

export interface DevGuardConfig {
  ports: number[];
  requiredEnvKeys: string[];
  requiredNodeVersion: string;
  processes: string[];
  timeoutMs: number;
}

export interface CheckModule {
  name: string;
  run: (config: DevGuardConfig) => Promise<CheckResult>;
}
```

- [ ] **Step 2: Create `lib/constants/defaultConfig.ts`**

```ts
import type { DevGuardConfig } from '../types';

export const defaultConfig: DevGuardConfig = {
  ports: [3000, 5432, 6379],
  requiredEnvKeys: [],
  requiredNodeVersion: '>=18.0.0',
  processes: ['redis', 'docker'],
  timeoutMs: 4000,
};
```

- [ ] **Step 3: Commit**

```bash
git add lib/types/index.ts lib/constants/defaultConfig.ts
git commit -m "feat: add shared types and default config"
```

---

## Task 5: Config utility with tests

**Files:**
- Create: `lib/utils/config.ts`
- Create: `__tests__/lib/utils/config.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `__tests__/lib/utils/config.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { loadConfig } from '../../../lib/utils/config';
import { defaultConfig } from '../../../lib/constants/defaultConfig';

describe('loadConfig', () => {
  it('returns defaults when config file does not exist', () => {
    const { config, warning } = loadConfig({
      fileExists: () => false,
      readFile: () => '',
    });
    expect(config).toEqual(defaultConfig);
    expect(warning).toBeUndefined();
  });

  it('returns shallow-merged config when file is valid JSON', () => {
    const { config, warning } = loadConfig({
      fileExists: () => true,
      readFile: () => JSON.stringify({ ports: [4000], timeoutMs: 2000 }),
    });
    expect(config.ports).toEqual([4000]);
    expect(config.timeoutMs).toBe(2000);
    expect(config.processes).toEqual(defaultConfig.processes);
    expect(warning).toBeUndefined();
  });

  it('returns defaults and warning when file has malformed JSON', () => {
    const { config, warning } = loadConfig({
      fileExists: () => true,
      readFile: () => '{ not valid json',
    });
    expect(config).toEqual(defaultConfig);
    expect(warning).toMatch(/Could not parse/);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test -- __tests__/lib/utils/config.test.ts`

Expected: FAIL — "Cannot find module '../../../lib/utils/config'"

- [ ] **Step 3: Create `lib/utils/config.ts`**

```ts
import fs from 'fs';
import path from 'path';
import type { DevGuardConfig } from '../types';
import { defaultConfig } from '../constants/defaultConfig';

export interface ConfigDeps {
  fileExists?: (p: string) => boolean;
  readFile?: (p: string) => string;
}

export interface LoadConfigResult {
  config: DevGuardConfig;
  warning?: string;
}

export function loadConfig(deps: ConfigDeps = {}): LoadConfigResult {
  const fileExists = deps.fileExists ?? ((p: string) => fs.existsSync(p));
  const readFile = deps.readFile ?? ((p: string) => fs.readFileSync(p, 'utf-8'));
  const configPath = path.join(process.cwd(), 'devguard.config.json');

  if (!fileExists(configPath)) {
    return { config: { ...defaultConfig } };
  }

  try {
    const raw = readFile(configPath);
    const parsed = JSON.parse(raw) as Partial<DevGuardConfig>;
    return { config: { ...defaultConfig, ...parsed } };
  } catch (err) {
    return {
      config: { ...defaultConfig },
      warning: `Could not parse devguard.config.json: ${(err as Error).message}`,
    };
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test -- __tests__/lib/utils/config.test.ts`

Expected: PASS — 3 tests passed

- [ ] **Step 5: Commit**

```bash
git add lib/utils/config.ts __tests__/lib/utils/config.test.ts
git commit -m "feat: add config utility with tests"
```

---

## Task 6: System utility with tests

**Files:**
- Create: `lib/utils/system.ts`
- Create: `__tests__/lib/utils/system.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `__tests__/lib/utils/system.test.ts`:

```ts
import { describe, it, expect, vi } from 'vitest';
import { getNodeVersion, isPortOpen, getRunningProcesses } from '../../../lib/utils/system';

describe('getNodeVersion', () => {
  it('returns version string without leading v', () => {
    const version = getNodeVersion();
    expect(version).toMatch(/^\d+\.\d+\.\d+/);
    expect(version.startsWith('v')).toBe(false);
  });
});

describe('isPortOpen', () => {
  it('returns true when the port can be bound', async () => {
    const mockServer = {
      once: vi.fn((event: string, handler: () => void) => {
        if (event === 'listening') setTimeout(handler, 0);
        return mockServer;
      }),
      listen: vi.fn(),
      close: vi.fn((cb: () => void) => cb()),
    };
    const mockNet = { createServer: vi.fn(() => mockServer) };

    const result = await isPortOpen(3001, { net: mockNet as never });
    expect(result).toBe(true);
  });

  it('returns false when the port is in use', async () => {
    const mockServer = {
      once: vi.fn((event: string, handler: () => void) => {
        if (event === 'error') setTimeout(handler, 0);
        return mockServer;
      }),
      listen: vi.fn(),
      close: vi.fn(),
    };
    const mockNet = { createServer: vi.fn(() => mockServer) };

    const result = await isPortOpen(3001, { net: mockNet as never });
    expect(result).toBe(false);
  });
});

describe('getRunningProcesses', () => {
  it('returns lowercase lines from exec stdout', async () => {
    const mockExec = vi.fn().mockResolvedValue({ stdout: 'Redis-Server\nDockerD\n', stderr: '' });
    const lines = await getRunningProcesses({ exec: mockExec });
    expect(lines).toContain('redis-server');
    expect(lines).toContain('dockerd');
  });

  it('propagates errors from exec', async () => {
    const mockExec = vi.fn().mockRejectedValue(new Error('command not found'));
    await expect(getRunningProcesses({ exec: mockExec })).rejects.toThrow('command not found');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test -- __tests__/lib/utils/system.test.ts`

Expected: FAIL — "Cannot find module '../../../lib/utils/system'"

- [ ] **Step 3: Create `lib/utils/system.ts`**

```ts
import net from 'net';
import { exec as cpExec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(cpExec);

export type ExecFn = (cmd: string) => Promise<{ stdout: string; stderr: string }>;

export interface NetDeps {
  net?: Pick<typeof net, 'createServer'>;
}

export interface ExecDeps {
  exec?: ExecFn;
}

export function getNodeVersion(): string {
  return process.version.replace(/^v/, '');
}

export function isPortOpen(port: number, deps: NetDeps = {}): Promise<boolean> {
  const netModule = deps.net ?? net;
  return new Promise((resolve) => {
    const server = netModule.createServer();
    server.once('error', () => resolve(false));
    server.once('listening', () => server.close(() => resolve(true)));
    server.listen(port, '127.0.0.1');
  });
}

export async function getRunningProcesses(deps: ExecDeps = {}): Promise<string[]> {
  const execFn = deps.exec ?? execAsync;
  const cmd = process.platform === 'win32' ? 'tasklist' : 'ps aux';
  const { stdout } = await execFn(cmd);
  return stdout.toLowerCase().split('\n').filter(Boolean);
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test -- __tests__/lib/utils/system.test.ts`

Expected: PASS — 4 tests passed

- [ ] **Step 5: Commit**

```bash
git add lib/utils/system.ts __tests__/lib/utils/system.test.ts
git commit -m "feat: add system utility with tests"
```

---

## Task 7: portCheck with tests

**Files:**
- Create: `lib/checks/portCheck.ts`
- Create: `__tests__/lib/checks/portCheck.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `__tests__/lib/checks/portCheck.test.ts`:

```ts
import { describe, it, expect, vi } from 'vitest';
import { portCheck } from '../../../lib/checks/portCheck';
import { defaultConfig } from '../../../lib/constants/defaultConfig';

function makeMockNet(isFree: boolean) {
  const mockServer = {
    once: vi.fn((event: string, handler: () => void) => {
      if (isFree && event === 'listening') setTimeout(handler, 0);
      if (!isFree && event === 'error') setTimeout(handler, 0);
      return mockServer;
    }),
    listen: vi.fn(),
    close: vi.fn((cb?: () => void) => cb?.()),
  };
  return { createServer: vi.fn(() => mockServer) };
}

describe('portCheck', () => {
  it('returns ok when all ports are free', async () => {
    const config = { ...defaultConfig, ports: [3001, 3002] };
    const result = await portCheck.run(config, { net: makeMockNet(true) as never });
    expect(result.status).toBe('ok');
    expect(result.details).toEqual({ occupied: [], free: [3001, 3002] });
  });

  it('returns warning when a port is occupied', async () => {
    const config = { ...defaultConfig, ports: [3001] };
    const result = await portCheck.run(config, { net: makeMockNet(false) as never });
    expect(result.status).toBe('warning');
    expect((result.details as { occupied: number[] }).occupied).toContain(3001);
    expect(result.suggestion).toBeDefined();
  });

  it('returns ok with message when ports array is empty', async () => {
    const config = { ...defaultConfig, ports: [] };
    const result = await portCheck.run(config);
    expect(result.status).toBe('ok');
    expect(result.message).toBe('No ports configured to check');
  });

  it('includes durationMs as a number', async () => {
    const config = { ...defaultConfig, ports: [] };
    const result = await portCheck.run(config);
    expect(typeof result.durationMs).toBe('number');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test -- __tests__/lib/checks/portCheck.test.ts`

Expected: FAIL — "Cannot find module '../../../lib/checks/portCheck'"

- [ ] **Step 3: Create `lib/checks/portCheck.ts`**

```ts
import type { CheckResult, DevGuardConfig } from '../types';
import type { NetDeps } from '../utils/system';
import { isPortOpen } from '../utils/system';

export const portCheck = {
  name: 'Port Check',

  async run(config: DevGuardConfig, deps: NetDeps = {}): Promise<CheckResult> {
    const start = performance.now();

    if (config.ports.length === 0) {
      return { name: 'Port Check', status: 'ok', message: 'No ports configured to check', durationMs: 0 };
    }

    const results = await Promise.all(
      config.ports.map(async (port) => ({ port, free: await isPortOpen(port, deps) }))
    );

    const occupied = results.filter((r) => !r.free).map((r) => r.port);
    const free = results.filter((r) => r.free).map((r) => r.port);
    const durationMs = Math.round(performance.now() - start);

    if (occupied.length === 0) {
      return {
        name: 'Port Check',
        status: 'ok',
        message: `All ${config.ports.length} configured ports are free`,
        details: { occupied, free },
        durationMs,
      };
    }

    return {
      name: 'Port Check',
      status: 'warning',
      message: `${occupied.length} of ${config.ports.length} configured ports are in use`,
      suggestion: `Stop the process using port${occupied.length > 1 ? 's' : ''} ${occupied.join(', ')} or update your config`,
      details: { occupied, free },
      durationMs,
    };
  },
};
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test -- __tests__/lib/checks/portCheck.test.ts`

Expected: PASS — 4 tests passed

- [ ] **Step 5: Commit**

```bash
git add lib/checks/portCheck.ts __tests__/lib/checks/portCheck.test.ts
git commit -m "feat: add portCheck with tests"
```

---

## Task 8: envCheck with tests

**Files:**
- Create: `lib/checks/envCheck.ts`
- Create: `__tests__/lib/checks/envCheck.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `__tests__/lib/checks/envCheck.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { envCheck } from '../../../lib/checks/envCheck';
import { defaultConfig } from '../../../lib/constants/defaultConfig';

function makeDeps(content: string | null, env: Record<string, string> = {}) {
  return {
    fileExists: () => content !== null,
    readFile: () => {
      if (content === null) throw new Error('not found');
      return content;
    },
    env,
  };
}

describe('envCheck', () => {
  it('returns warning when .env.example does not exist', async () => {
    const result = await envCheck.run(defaultConfig, makeDeps(null));
    expect(result.status).toBe('warning');
    expect(result.suggestion).toBeDefined();
  });

  it('returns ok when all keys are present in env', async () => {
    const result = await envCheck.run(
      { ...defaultConfig, requiredEnvKeys: [] },
      makeDeps('DATABASE_URL=\nAPI_KEY=\n', { DATABASE_URL: 'x', API_KEY: 'y' })
    );
    expect(result.status).toBe('ok');
    expect((result.details as { missing: string[] }).missing).toHaveLength(0);
  });

  it('returns error when keys are missing', async () => {
    const result = await envCheck.run(
      { ...defaultConfig, requiredEnvKeys: [] },
      makeDeps('DATABASE_URL=\nAPI_KEY=\n', {})
    );
    expect(result.status).toBe('error');
    expect(result.suggestion).toBeDefined();
    expect((result.details as { missing: string[] }).missing).toContain('DATABASE_URL');
  });

  it('returns ok with message when .env.example is empty', async () => {
    const result = await envCheck.run(defaultConfig, makeDeps('', {}));
    expect(result.status).toBe('ok');
    expect(result.message).toBe('No keys defined in .env.example');
  });

  it('deduplicates keys across .env.example and requiredEnvKeys', async () => {
    const result = await envCheck.run(
      { ...defaultConfig, requiredEnvKeys: ['DATABASE_URL', 'EXTRA'] },
      makeDeps('DATABASE_URL=\n', { DATABASE_URL: 'x', EXTRA: 'y' })
    );
    expect(result.status).toBe('ok');
    expect((result.details as { total: number }).total).toBe(2);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test -- __tests__/lib/checks/envCheck.test.ts`

Expected: FAIL — "Cannot find module '../../../lib/checks/envCheck'"

- [ ] **Step 3: Create `lib/checks/envCheck.ts`**

```ts
import fs from 'fs';
import path from 'path';
import type { CheckResult, DevGuardConfig } from '../types';

export interface EnvDeps {
  fileExists?: (p: string) => boolean;
  readFile?: (p: string) => string;
  env?: Record<string, string | undefined>;
}

function parseEnvKeys(content: string): string[] {
  return content
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#'))
    .map((l) => l.split('=')[0].trim())
    .filter(Boolean);
}

export const envCheck = {
  name: 'Env Check',

  async run(config: DevGuardConfig, deps: EnvDeps = {}): Promise<CheckResult> {
    const start = performance.now();
    const fileExists = deps.fileExists ?? ((p: string) => fs.existsSync(p));
    const readFile = deps.readFile ?? ((p: string) => fs.readFileSync(p, 'utf-8'));
    const env = deps.env ?? process.env;
    const examplePath = path.join(process.cwd(), '.env.example');

    if (!fileExists(examplePath)) {
      return {
        name: 'Env Check',
        status: 'warning',
        message: '.env.example not found',
        suggestion: 'Create a .env.example file listing required environment variable keys',
        details: { missing: [], present: [], total: 0 },
        durationMs: Math.round(performance.now() - start),
      };
    }

    let keysFromFile: string[] = [];
    try {
      keysFromFile = parseEnvKeys(readFile(examplePath));
    } catch (err) {
      return {
        name: 'Env Check',
        status: 'error',
        message: 'Failed to read .env.example',
        suggestion: 'Check file permissions for .env.example',
        details: { error: (err as Error).message },
        durationMs: Math.round(performance.now() - start),
      };
    }

    const allKeys = [...new Set([...keysFromFile, ...config.requiredEnvKeys])];

    if (allKeys.length === 0) {
      return {
        name: 'Env Check',
        status: 'ok',
        message: 'No keys defined in .env.example',
        details: { missing: [], present: [], total: 0 },
        durationMs: Math.round(performance.now() - start),
      };
    }

    const missing = allKeys.filter((k) => !(k in env));
    const present = allKeys.filter((k) => k in env);
    const durationMs = Math.round(performance.now() - start);

    if (missing.length === 0) {
      return {
        name: 'Env Check',
        status: 'ok',
        message: `All ${allKeys.length} required keys are present`,
        details: { missing, present, total: allKeys.length },
        durationMs,
      };
    }

    return {
      name: 'Env Check',
      status: 'error',
      message: `${missing.length} of ${allKeys.length} required keys are missing`,
      suggestion: `Add the following keys to your environment: ${missing.join(', ')}`,
      details: { missing, present, total: allKeys.length },
      durationMs,
    };
  },
};
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test -- __tests__/lib/checks/envCheck.test.ts`

Expected: PASS — 5 tests passed

- [ ] **Step 5: Commit**

```bash
git add lib/checks/envCheck.ts __tests__/lib/checks/envCheck.test.ts
git commit -m "feat: add envCheck with tests"
```

---

## Task 9: nodeCheck with tests

**Files:**
- Create: `lib/checks/nodeCheck.ts`
- Create: `__tests__/lib/checks/nodeCheck.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `__tests__/lib/checks/nodeCheck.test.ts`:

```ts
import { describe, it, expect, vi } from 'vitest';
import { nodeCheck } from '../../../lib/checks/nodeCheck';
import { defaultConfig } from '../../../lib/constants/defaultConfig';

describe('nodeCheck', () => {
  it('returns ok when version satisfies the range', async () => {
    const result = await nodeCheck.run(
      { ...defaultConfig, requiredNodeVersion: '>=18.0.0' },
      { getNodeVersion: () => '20.11.0' }
    );
    expect(result.status).toBe('ok');
    expect(result.details).toMatchObject({ current: '20.11.0', required: '>=18.0.0', satisfied: true });
  });

  it('returns error when version does not satisfy the range', async () => {
    const result = await nodeCheck.run(
      { ...defaultConfig, requiredNodeVersion: '>=18.0.0' },
      { getNodeVersion: () => '16.20.0' }
    );
    expect(result.status).toBe('error');
    expect(result.suggestion).toBeDefined();
    expect((result.details as { satisfied: boolean }).satisfied).toBe(false);
  });

  it('returns error when requiredNodeVersion is not a valid semver range', async () => {
    const result = await nodeCheck.run(
      { ...defaultConfig, requiredNodeVersion: 'not-a-range' },
      { getNodeVersion: () => '20.0.0' }
    );
    expect(result.status).toBe('error');
    expect(result.suggestion).toBeDefined();
  });

  it('calls getNodeVersion from deps and never reads process.version directly', async () => {
    const mockGetVersion = vi.fn().mockReturnValue('20.0.0');
    await nodeCheck.run(defaultConfig, { getNodeVersion: mockGetVersion });
    expect(mockGetVersion).toHaveBeenCalledOnce();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test -- __tests__/lib/checks/nodeCheck.test.ts`

Expected: FAIL — "Cannot find module '../../../lib/checks/nodeCheck'"

- [ ] **Step 3: Create `lib/checks/nodeCheck.ts`**

```ts
import semver from 'semver';
import type { CheckResult, DevGuardConfig } from '../types';
import { getNodeVersion as defaultGetNodeVersion } from '../utils/system';

export interface NodeDeps {
  getNodeVersion?: () => string;
}

export const nodeCheck = {
  name: 'Node Check',

  async run(config: DevGuardConfig, deps: NodeDeps = {}): Promise<CheckResult> {
    const start = performance.now();
    const getVersion = deps.getNodeVersion ?? defaultGetNodeVersion;
    const current = getVersion();
    const required = config.requiredNodeVersion;

    if (!semver.validRange(required)) {
      return {
        name: 'Node Check',
        status: 'error',
        message: `Invalid requiredNodeVersion: "${required}"`,
        suggestion: 'Fix requiredNodeVersion in devguard.config.json (e.g., ">=18.0.0")',
        details: { current, required, satisfied: false },
        durationMs: Math.round(performance.now() - start),
      };
    }

    const satisfied = semver.satisfies(current, required);
    const durationMs = Math.round(performance.now() - start);

    if (satisfied) {
      return {
        name: 'Node Check',
        status: 'ok',
        message: `Node v${current} satisfies ${required}`,
        details: { current, required, satisfied: true },
        durationMs,
      };
    }

    return {
      name: 'Node Check',
      status: 'error',
      message: `Node v${current} does not satisfy ${required}`,
      suggestion: `Upgrade Node.js to satisfy ${required}. Use nvm: nvm install --lts`,
      details: { current, required, satisfied: false },
      durationMs,
    };
  },
};
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test -- __tests__/lib/checks/nodeCheck.test.ts`

Expected: PASS — 4 tests passed

- [ ] **Step 5: Commit**

```bash
git add lib/checks/nodeCheck.ts __tests__/lib/checks/nodeCheck.test.ts
git commit -m "feat: add nodeCheck with tests"
```

---

## Task 10: processCheck with tests

**Files:**
- Create: `lib/checks/processCheck.ts`
- Create: `__tests__/lib/checks/processCheck.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `__tests__/lib/checks/processCheck.test.ts`:

```ts
import { describe, it, expect, vi } from 'vitest';
import { processCheck } from '../../../lib/checks/processCheck';
import { defaultConfig } from '../../../lib/constants/defaultConfig';

describe('processCheck', () => {
  it('returns ok when all processes are running', async () => {
    const mockExec = vi.fn().mockResolvedValue({ stdout: 'redis-server\ndocker\n', stderr: '' });
    const result = await processCheck.run(
      { ...defaultConfig, processes: ['redis', 'docker'] },
      { exec: mockExec }
    );
    expect(result.status).toBe('ok');
    expect((result.details as { running: string[] }).running).toContain('redis');
  });

  it('returns warning when processes are missing', async () => {
    const mockExec = vi.fn().mockResolvedValue({ stdout: 'chrome\n', stderr: '' });
    const result = await processCheck.run(
      { ...defaultConfig, processes: ['redis', 'docker'] },
      { exec: mockExec }
    );
    expect(result.status).toBe('warning');
    expect(result.suggestion).toBeDefined();
    expect((result.details as { missing: string[] }).missing).toContain('redis');
  });

  it('returns ok with message when processes array is empty', async () => {
    const result = await processCheck.run({ ...defaultConfig, processes: [] });
    expect(result.status).toBe('ok');
    expect(result.message).toBe('No processes configured to check');
  });

  it('returns error when exec fails', async () => {
    const mockExec = vi.fn().mockRejectedValue(new Error('exec failed'));
    const result = await processCheck.run(defaultConfig, { exec: mockExec });
    expect(result.status).toBe('error');
    expect(result.suggestion).toBeDefined();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test -- __tests__/lib/checks/processCheck.test.ts`

Expected: FAIL — "Cannot find module '../../../lib/checks/processCheck'"

- [ ] **Step 3: Create `lib/checks/processCheck.ts`**

```ts
import type { CheckResult, DevGuardConfig } from '../types';
import type { ExecDeps } from '../utils/system';
import { getRunningProcesses } from '../utils/system';

export const processCheck = {
  name: 'Process Check',

  async run(config: DevGuardConfig, deps: ExecDeps = {}): Promise<CheckResult> {
    const start = performance.now();

    if (config.processes.length === 0) {
      return { name: 'Process Check', status: 'ok', message: 'No processes configured to check', durationMs: 0 };
    }

    let processList: string[];
    try {
      processList = await getRunningProcesses(deps);
    } catch (err) {
      return {
        name: 'Process Check',
        status: 'error',
        message: 'Failed to list running processes',
        suggestion: 'Ensure your shell has access to tasklist (Windows) or ps (macOS/Linux)',
        details: { error: (err as Error).message },
        durationMs: Math.round(performance.now() - start),
      };
    }

    const running = config.processes.filter((name) =>
      processList.some((line) => line.includes(name.toLowerCase()))
    );
    const missing = config.processes.filter((name) => !running.includes(name));
    const durationMs = Math.round(performance.now() - start);

    if (missing.length === 0) {
      return {
        name: 'Process Check',
        status: 'ok',
        message: `All ${config.processes.length} configured processes are running`,
        details: { running, missing },
        durationMs,
      };
    }

    return {
      name: 'Process Check',
      status: 'warning',
      message: `${missing.length} of ${config.processes.length} configured processes not found`,
      suggestion: `Start the missing process${missing.length > 1 ? 'es' : ''}: ${missing.join(', ')}`,
      details: { running, missing },
      durationMs,
    };
  },
};
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test -- __tests__/lib/checks/processCheck.test.ts`

Expected: PASS — 4 tests passed

- [ ] **Step 5: Commit**

```bash
git add lib/checks/processCheck.ts __tests__/lib/checks/processCheck.test.ts
git commit -m "feat: add processCheck with tests"
```

---

## Task 11: Registry and runAllChecks with tests

**Files:**
- Create: `lib/core/registry.ts`
- Create: `lib/core/runAllChecks.ts`
- Create: `__tests__/lib/core/runAllChecks.test.ts`

- [ ] **Step 1: Create `lib/core/registry.ts`**

```ts
import type { CheckModule } from '../types';
import { portCheck } from '../checks/portCheck';
import { envCheck } from '../checks/envCheck';
import { nodeCheck } from '../checks/nodeCheck';
import { processCheck } from '../checks/processCheck';

export const registry: CheckModule[] = [portCheck, envCheck, nodeCheck, processCheck];
```

- [ ] **Step 2: Write the failing tests for runAllChecks**

Create `__tests__/lib/core/runAllChecks.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { runAllChecks } from '../../../lib/core/runAllChecks';
import type { CheckResult, CheckModule, DevGuardConfig } from '../../../lib/types';
import { defaultConfig } from '../../../lib/constants/defaultConfig';

function makeCheck(name: string, override: Partial<CheckResult> = {}): CheckModule {
  return {
    name,
    run: vi.fn().mockResolvedValue({
      name,
      status: 'ok',
      message: 'all good',
      durationMs: 1,
      ...override,
    } as CheckResult),
  };
}

function makeStalledCheck(name: string): CheckModule {
  return { name, run: vi.fn().mockReturnValue(new Promise(() => {})) };
}

describe('runAllChecks — overallStatus derivation', () => {
  it('returns ok when all checks pass', async () => {
    const checks = [makeCheck('A'), makeCheck('B')];
    const res = await runAllChecks({ config: defaultConfig, checks });
    expect(res.overallStatus).toBe('ok');
  });

  it('returns warning when one check warns', async () => {
    const checks = [makeCheck('A'), makeCheck('B', { status: 'warning' })];
    const res = await runAllChecks({ config: defaultConfig, checks });
    expect(res.overallStatus).toBe('warning');
  });

  it('returns error when one check errors', async () => {
    const checks = [
      makeCheck('A'),
      makeCheck('B', { status: 'error', suggestion: 'fix it' }),
    ];
    const res = await runAllChecks({ config: defaultConfig, checks });
    expect(res.overallStatus).toBe('error');
  });
});

describe('runAllChecks — error and timeout handling', () => {
  it('handles a check that throws without crashing the runner', async () => {
    const bad: CheckModule = { name: 'Exploding', run: vi.fn().mockRejectedValue(new Error('boom')) };
    const res = await runAllChecks({ config: defaultConfig, checks: [bad] });
    expect(res.results[0].status).toBe('error');
    expect(res.results[0].suggestion).toBeTruthy();
  });

  describe('timeout', () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    it('produces an error result when a check exceeds timeoutMs', async () => {
      const config = { ...defaultConfig, timeoutMs: 100 };
      const check = makeStalledCheck('Slow');
      const promise = runAllChecks({ config, checks: [check] });
      vi.advanceTimersByTime(200);
      const res = await promise;
      expect(res.results[0].status).toBe('error');
      expect(res.results[0].message).toContain('Slow');
      expect(res.results[0].message).toContain('100ms');
      expect(res.results[0].suggestion).toBeTruthy();
    });
  });
});

describe('runAllChecks — general behaviour', () => {
  it('returns ok for an empty checks array', async () => {
    const res = await runAllChecks({ config: defaultConfig, checks: [] });
    expect(res.overallStatus).toBe('ok');
    expect(res.results).toHaveLength(0);
  });

  it('timestamp is ISO 8601', async () => {
    const res = await runAllChecks({ config: defaultConfig, checks: [] });
    expect(res.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  });

  it('every error result has a non-empty suggestion', async () => {
    const bad: CheckModule = { name: 'Bad', run: vi.fn().mockRejectedValue(new Error('oops')) };
    const res = await runAllChecks({ config: defaultConfig, checks: [bad] });
    res.results
      .filter((r) => r.status === 'error')
      .forEach((r) => expect(r.suggestion).toBeTruthy());
  });

  it('matches ScanResponse snapshot', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));
    const checks = [makeCheck('Test', { status: 'ok', message: 'all good', durationMs: 5 })];
    const res = await runAllChecks({ config: defaultConfig, checks });
    expect(res).toMatchSnapshot();
    vi.useRealTimers();
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npm run test -- __tests__/lib/core/runAllChecks.test.ts`

Expected: FAIL — "Cannot find module '../../../lib/core/runAllChecks'"

- [ ] **Step 4: Create `lib/core/runAllChecks.ts`**

```ts
import type { CheckResult, CheckModule, ScanResponse, CheckStatus, DevGuardConfig } from '../types';
import { registry as defaultRegistry } from './registry';
import { loadConfig } from '../utils/config';

interface RunOptions {
  config?: DevGuardConfig;
  checks?: CheckModule[];
}

function deriveOverallStatus(results: CheckResult[]): CheckStatus {
  if (results.some((r) => r.status === 'error')) return 'error';
  if (results.some((r) => r.status === 'warning')) return 'warning';
  return 'ok';
}

function createTimeout(ms: number, checkName: string): Promise<CheckResult> {
  return new Promise((resolve) =>
    setTimeout(
      () =>
        resolve({
          name: checkName,
          status: 'error',
          message: `${checkName} timed out after ${ms}ms`,
          suggestion: 'Increase timeoutMs in devguard.config.json or investigate system slowness',
          durationMs: ms,
        }),
      ms
    )
  );
}

export async function runAllChecks(options: RunOptions = {}): Promise<ScanResponse> {
  const results: CheckResult[] = [];
  let config: DevGuardConfig;

  if (options.config) {
    config = options.config;
  } else {
    const loaded = loadConfig();
    config = loaded.config;
    if (loaded.warning) {
      results.push({
        name: 'Config',
        status: 'warning',
        message: loaded.warning,
        suggestion: 'Fix the JSON syntax in devguard.config.json or delete it to use defaults',
        durationMs: 0,
      });
    }
  }

  const activeChecks = options.checks ?? defaultRegistry;

  const settled = await Promise.allSettled(
    activeChecks.map((check) =>
      Promise.race([check.run(config), createTimeout(config.timeoutMs, check.name)])
    )
  );

  for (const [i, result] of settled.entries()) {
    if (result.status === 'fulfilled') {
      results.push(result.value);
    } else {
      results.push({
        name: activeChecks[i].name,
        status: 'error',
        message: result.reason instanceof Error ? result.reason.message : 'Unknown error',
        suggestion: 'Check the application logs or file a bug report',
        details: { error: String(result.reason) },
        durationMs: 0,
      });
    }
  }

  return {
    timestamp: new Date().toISOString(),
    overallStatus: deriveOverallStatus(results),
    results,
  };
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm run test -- __tests__/lib/core/runAllChecks.test.ts`

Expected: PASS — 9 tests passed

- [ ] **Step 6: Commit**

```bash
git add lib/core/registry.ts lib/core/runAllChecks.ts __tests__/lib/core/runAllChecks.test.ts
git commit -m "feat: add registry and runAllChecks with tests"
```

---

## Task 12: API route

**Files:**
- Create: `app/api/scan/route.ts`

- [ ] **Step 1: Create `app/api/scan/route.ts`**

```ts
import { NextResponse } from 'next/server';
import { runAllChecks } from '@/lib/core/runAllChecks';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const data = await runAllChecks();
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: err instanceof Error ? err.message : 'Unexpected failure in scan runner',
      },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 2: Verify the endpoint responds**

Run: `npm run dev`

In a separate terminal run: `curl http://localhost:3000/api/scan`

Expected: JSON with `timestamp`, `overallStatus`, and `results` array containing four check results. Stop dev server with Ctrl+C.

- [ ] **Step 3: Commit**

```bash
git add app/api/scan/route.ts
git commit -m "feat: add GET /api/scan route"
```

---

## Task 13: Frontend dashboard

**Files:**
- Create: `app/components/StatusBadge.tsx`
- Create: `app/components/ResultCard.tsx`
- Replace: `app/page.tsx`

- [ ] **Step 1: Create `app/components/StatusBadge.tsx`**

```tsx
import type { CheckStatus } from '@/lib/types';

const styles: Record<CheckStatus, string> = {
  ok: 'bg-green-900 text-green-300 border border-green-700',
  warning: 'bg-yellow-900 text-yellow-300 border border-yellow-700',
  error: 'bg-red-900 text-red-300 border border-red-700',
};

export function StatusBadge({ status }: { status: CheckStatus }) {
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-mono uppercase ${styles[status]}`}>
      {status}
    </span>
  );
}
```

- [ ] **Step 2: Create `app/components/ResultCard.tsx`**

```tsx
'use client';

import { useState } from 'react';
import type { CheckResult } from '@/lib/types';
import { StatusBadge } from './StatusBadge';

export function ResultCard({ result }: { result: CheckResult }) {
  const [expanded, setExpanded] = useState(false);
  const hasMore = result.details || result.suggestion;

  return (
    <div className="rounded-lg border border-gray-800 bg-gray-900 p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <StatusBadge status={result.status} />
          <span className="font-medium text-gray-100 truncate">{result.name}</span>
        </div>
        <span className="text-xs text-gray-500 shrink-0">{result.durationMs}ms</span>
      </div>

      <p className="mt-2 text-sm text-gray-400">{result.message}</p>

      {hasMore && (
        <button
          onClick={() => setExpanded((e) => !e)}
          className="mt-2 text-xs text-gray-500 hover:text-gray-300 transition-colors"
        >
          {expanded ? '▲ Hide details' : '▼ Show details'}
        </button>
      )}

      {expanded && (
        <div className="mt-3 space-y-2">
          {result.suggestion && (
            <p className="text-xs text-yellow-400">
              <span className="font-semibold">Suggestion:</span> {result.suggestion}
            </p>
          )}
          {result.details && (
            <pre className="text-xs text-gray-400 bg-gray-950 rounded p-2 overflow-auto">
              {JSON.stringify(result.details, null, 2)}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Replace `app/page.tsx` with the full dashboard**

```tsx
'use client';

import { useState } from 'react';
import type { ScanResponse } from '@/lib/types';
import { StatusBadge } from './components/StatusBadge';
import { ResultCard } from './components/ResultCard';

export default function HomePage() {
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<ScanResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function runScan() {
    setScanning(true);
    setError(null);
    try {
      const res = await fetch('/api/scan');
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      setResult(await res.json() as ScanResponse);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setScanning(false);
    }
  }

  return (
    <main className="max-w-2xl mx-auto px-4 py-12">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-100">DevGuard Web</h1>
        <p className="text-sm text-gray-400 mt-1">Developer environment inspector</p>
      </div>

      <button
        onClick={runScan}
        disabled={scanning}
        className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium transition-colors"
      >
        {scanning ? 'Scanning…' : 'Run Scan'}
      </button>

      {error && (
        <div className="mt-4 rounded-lg border border-red-800 bg-red-950 p-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {result && (
        <div className="mt-6 space-y-4">
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-400">Overall:</span>
            <StatusBadge status={result.overallStatus} />
            <span className="text-xs text-gray-500 ml-auto">
              {new Date(result.timestamp).toLocaleTimeString()}
            </span>
          </div>
          {result.results.map((r) => (
            <ResultCard key={r.name} result={r} />
          ))}
        </div>
      )}
    </main>
  );
}
```

- [ ] **Step 4: Run dev server and test the UI end-to-end**

Run: `npm run dev`

Open `http://localhost:3000`. Click "Run Scan". Verify:
- Four result cards appear (Port Check, Env Check, Node Check, Process Check)
- Each card shows a colored status badge (green/yellow/red)
- Duration shows per card
- Clicking "Show details" expands the raw JSON and suggestion
- The overall status banner appears at top
- No console errors in the browser

Stop dev server with Ctrl+C.

- [ ] **Step 5: Commit**

```bash
git add app/components/StatusBadge.tsx app/components/ResultCard.tsx app/page.tsx
git commit -m "feat: add dashboard UI with ResultCard and StatusBadge"
```

---

## Task 14: Full test suite and final validation

**Files:** No new files.

- [ ] **Step 1: Run the complete test suite**

Run: `npm run test`

Expected output (all pass):
```
✓ __tests__/lib/utils/config.test.ts (3)
✓ __tests__/lib/utils/system.test.ts (4)
✓ __tests__/lib/checks/portCheck.test.ts (4)
✓ __tests__/lib/checks/envCheck.test.ts (5)
✓ __tests__/lib/checks/nodeCheck.test.ts (4)
✓ __tests__/lib/checks/processCheck.test.ts (4)
✓ __tests__/lib/core/runAllChecks.test.ts (9)

Test Files  7 passed (7)
Tests      33 passed (33)
```

Fix any failures before proceeding.

- [ ] **Step 2: TypeScript type check**

Run: `npx tsc --noEmit`

Expected: No output (zero errors). If errors appear, fix them.

- [ ] **Step 3: Run a clean install and dev server**

Run:
```bash
rm -rf node_modules .next
npm install
npm run dev
```

Open `http://localhost:3000`, click "Run Scan", confirm all four checks return results. Stop with Ctrl+C.

- [ ] **Step 4: Verify no sensitive data is committed**

Confirm:
- `.env` is NOT tracked by git: `git ls-files .env` → empty output
- `devguard.config.json` is NOT tracked: `git ls-files devguard.config.json` → empty output
- `devguard.config.example.json` IS tracked with placeholder values only

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "chore: final validation — all tests pass, app runs from scratch"
```
