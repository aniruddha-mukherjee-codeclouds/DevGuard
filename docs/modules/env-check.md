# Module: envCheck

## Purpose

Reads `.env.example` directly from the filesystem and validates that every key defined there is present in `process.env`. Does not evaluate values — only checks key presence.

Additionally checks any keys listed in `config.requiredEnvKeys` that are not already covered by `.env.example`.

---

## Inputs

Receives the `DevGuardConfig` object. Relevant fields:

| Field | Type | Default | Description |
|---|---|---|---|
| `requiredEnvKeys` | `string[]` | `[]` | Additional keys to validate beyond `.env.example` |

The check also reads `.env.example` from the project root (`process.cwd()`) if it exists.

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
    total: number
  },
  durationMs: number
}
```

| Status | Condition |
|---|---|
| `ok` | All required keys are present in the environment |
| `warning` | `.env.example` not found (soft failure — may be intentional) |
| `error` | One or more required keys are missing — `suggestion` always present |

---

## Edge Cases

| Scenario | Behavior |
|---|---|
| `.env.example` missing | Returns `warning`, suggestion to create the file |
| `.env.example` empty | Returns `ok`, message: "No keys defined in .env.example" |
| `requiredEnvKeys: []` and no `.env.example` | Returns `warning` (no keys to check) |
| Key with no value (e.g. `API_KEY=`) | Still treated as a required key; only the key name matters |
| Duplicate keys across `.env.example` and `requiredEnvKeys` | Deduplicated before checking |
| Malformed lines in `.env.example` | Best-effort parse; lines that don't match `KEY=` pattern are skipped silently |
| Key present in env with empty string value | Treated as present — this check only validates key existence |

---

## Failure Scenarios

| Scenario | Behavior |
|---|---|
| File read error (e.g., permission denied) | `status: 'error'`, error message in `details.error`, `suggestion` provided |
| Timeout | Handled by runner via `Promise.race` |

---

## Implementation Notes

- Reads `.env.example` via injected `fs.readFileSync` — does not use `dotenv`
- Parses file line by line, extracts keys using a simple regex (`/^([^#=\s][^=]*)=/`)
- Comments (`# ...`) and blank lines are ignored
- Does not access `devguard.config.json` directly — config is passed in by the runner
- Does not catch its own errors — top-level errors propagate to the runner's central handler
