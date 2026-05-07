# Module: portCheck

## Purpose

Lists the TCP ports that are currently in a listening state on the host machine. Returns a single consolidated result with the occupied port list in `details`.

Uses OS-level process and socket inspection through `lib/utils/system.ts` instead of attempting to bind ports directly.

---

## Inputs

Receives the `DevGuardConfig` object. Relevant fields:

| Field | Type | Default | Description |
|---|---|---|---|
| `timeoutMs` | `number` | `4000` | Max allowed time (enforced by runner, not this check) |

System dependencies (`exec`, `platform`) are injected via a `deps` parameter to support unit testing without global mocks.

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
    total: number
  },
  durationMs: number
}
```

| Status | Condition |
|---|---|
| `ok` | No listening TCP ports were detected |
| `warning` | One or more listening TCP ports were detected |
| `error` | Check failed (command execution, parse failure, etc.) — `suggestion` always present |

---

## Edge Cases

| Scenario | Behavior |
|---|---|
| No listening ports found | Returns `ok`, message: "No occupied TCP listening ports detected" |
| One or more ports listening | Returns `warning`, all ports listed in `details.occupied` |
| Duplicate ports in command output | Deduplicated before returning |
| IPv4 and IPv6 listeners | Both are parsed and normalized to port numbers |

---

## Failure Scenarios

| Scenario | Behavior |
|---|---|
| Port listing command fails | `status: 'error'`, error message in `details.error`, `suggestion` provided |
| Timeout | Handled by runner via `Promise.race` — returns error result with check name and timeout duration |

---

## Implementation Notes

- Calls `getListeningPorts(deps)` from `lib/utils/system.ts`
- Sorts and deduplicates port numbers before returning them
- Does not access `devguard.config.json` directly — config is passed in by the runner
- Does not catch its own errors — top-level errors propagate to the runner's central handler
