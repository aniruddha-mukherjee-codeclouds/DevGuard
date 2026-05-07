# Module: envCheck

## Purpose

Reads `.env.example` directly from the filesystem and validates that every key defined there is present in the target project's `.env` files. It also flags placeholder-like values that suggest setup is incomplete.

Additionally checks any keys listed in `config.requiredEnvKeys` that are not already covered by `.env.example`.

---

## Inputs

Receives the `DevGuardConfig` object. Relevant fields:

| Field | Type | Default | Description |
|---|---|---|---|
| `requiredEnvKeys` | `string[]` | `[]` | Additional keys to validate beyond `.env.example` |

The check reads `.env.example`, then inspects `.env` and `.env.local` from the target project root. By default the target root is `process.cwd()`. If a target port is provided, the check first attempts to resolve the project root from the process listening on that port.

The `fs` module is injected via a `deps` parameter to support unit testing without global mocks.

---

## Outputs

```ts
CheckResult {
  name: 'Env Check',
  status: 'ok' | 'warning' | 'error',
  message: string,
  suggestion?: string,   // present on 'warning' and always on 'error'
  details: {
    missing: string[],
    present: string[],
    placeholderLike: string[],
    filesChecked: string[],
    total: number
  },
  durationMs: number
}
```

| Status | Condition |
|---|---|
| `ok` | All required keys are present in `.env`/`.env.local` with non-placeholder values |
| `warning` | `.env.example` not found, or no project env files were found |
| `error` | One or more required keys are missing, unreadable, or still placeholder-like |

---

## Edge Cases

| Scenario | Behavior |
|---|---|
| `.env.example` missing | Returns `warning`, suggestion to create the file |
| `.env.example` empty | Returns `ok`, message: "No keys defined in .env.example" |
| `.env` and `.env.local` both missing | Returns `warning`, suggests creating project env files |
| Key with no value (e.g. `API_KEY=`) | Still treated as a required key; only the key name matters |
| Duplicate keys across `.env.example` and `requiredEnvKeys` | Deduplicated before checking |
| Malformed lines in `.env.example` | Best-effort parse; lines that don't match `KEY=` pattern are skipped silently |
| Key present with `changeme`, `your-api-key`, or empty string | Flagged in `placeholderLike` as incomplete setup |
| Key exists in both `.env` and `.env.local` | `.env.local` wins |

---

## Failure Scenarios

| Scenario | Behavior |
|---|---|
| File read error (e.g., permission denied) | `status: 'error'`, error message in `details.error`, `suggestion` provided |
| Timeout | Handled by runner via `Promise.race` |

---

## Implementation Notes

- Reads `.env.example`, `.env`, and `.env.local` via injected `fs.readFileSync` — does not use `dotenv`
- Parses file line by line, ignores comments/blank lines, and merges `.env` then `.env.local`
- Performs a lightweight placeholder-value check for obviously incomplete values
- When `targetPort` is present, attempts a best-effort project-root lookup from the listening process before reading files
- Does not access `devguard.config.json` directly — config is passed in by the runner
- Does not catch its own errors — top-level errors propagate to the runner's central handler
