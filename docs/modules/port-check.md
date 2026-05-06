# Module: portCheck

## Purpose

Checks whether the configured ports are currently in use on localhost. Returns a single consolidated result — not one result per port — with occupied and free ports broken out in `details`.

Uses Node.js `net.createServer()` to attempt binding each port. Cross-platform — no OS-specific code. All socket helpers are provided by `lib/utils/system.ts`.

---

## Inputs

Receives the `DevGuardConfig` object. Relevant fields:

| Field | Type | Default | Description |
|---|---|---|---|
| `ports` | `number[]` | `[3000, 5432, 6379]` | Ports to check |
| `timeoutMs` | `number` | `4000` | Max allowed time (enforced by runner, not this check) |

System dependencies (`net`) are injected via a `deps` parameter to support unit testing without global mocks.

---

## Outputs

```ts
CheckResult {
  name: 'Port Check',
  status: 'ok' | 'warning' | 'error',
  message: string,
  suggestion?: string,   // present on 'warning' and always on 'error'
  details: {
    occupied: number[],
    free: number[]
  },
  durationMs: number
}
```

| Status | Condition |
|---|---|
| `ok` | All ports are free |
| `warning` | One or more ports are in use |
| `error` | Check failed (socket error, invalid port, etc.) — `suggestion` always present |

---

## Edge Cases

| Scenario | Behavior |
|---|---|
| `ports: []` | Returns `ok`, message: "No ports configured to check" |
| All ports occupied | Returns `warning`, all ports listed in `details.occupied` |
| Single port | Same logic, same result shape |
| Port number > 65535 | Returns `error`, suggestion to fix config |
| Port number ≤ 0 | Returns `error`, suggestion to fix config |

---

## Failure Scenarios

| Scenario | Behavior |
|---|---|
| Socket creation error | `status: 'error'`, error message in `details.error`, `suggestion` provided |
| Timeout | Handled by runner via `Promise.race` — returns error result with check name and timeout duration |

---

## Implementation Notes

- Calls `isPortOpen(port, deps)` from `lib/utils/system.ts` for each configured port
- Checks run concurrently via `Promise.all` within the check itself
- Does not access `devguard.config.json` directly — config is passed in by the runner
- Does not catch its own errors — top-level errors propagate to the runner's central handler
