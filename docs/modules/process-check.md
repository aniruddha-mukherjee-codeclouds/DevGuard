# Module: processCheck

## Purpose

Checks whether configured background processes (e.g., `redis`, `docker`) are currently running on the host machine. Uses OS-appropriate commands selected by `lib/utils/system.ts` to list running processes.

Missing processes are treated as warnings by default — they are not fatal errors.

---

## Inputs

Receives the `DevGuardConfig` object. Relevant fields:

| Field | Type | Default | Description |
|---|---|---|---|
| `processes` | `string[]` | `['redis', 'docker']` | Process names to look for |
| `timeoutMs` | `number` | `4000` | Max allowed time (enforced by runner, not this check) |

The `exec` function from `child_process` is injected via a `deps` parameter to support unit testing without global mocks.

---

## Outputs

```ts
CheckResult {
  name: 'Process Check',
  status: 'ok' | 'warning' | 'error',
  message: string,
  suggestion?: string,   // present on 'warning' (missing processes) and always on 'error'
  details: {
    running: string[],
    missing: string[]
  },
  durationMs: number
}
```

| Status | Condition |
|---|---|
| `ok` | All configured processes are found running |
| `warning` | One or more processes not found — not treated as fatal |
| `error` | Command execution failed (non-zero exit, ENOENT, etc.) — `suggestion` always present |

---

## Edge Cases

| Scenario | Behavior |
|---|---|
| `processes: []` | Returns `ok`, message: "No processes configured to check" |
| All processes running | Returns `ok` |
| Some processes missing | Returns `warning`, missing listed in `details.missing`, suggestion included |
| Process name partial match (e.g., `redis` matches `redis-server`) | Intentional — substring match used |
| Process name casing | Lowercase comparison on all platforms |
| Windows | Uses `tasklist` command, filters output by process name |
| macOS / Linux | Uses `ps aux`, filters by process name |

---

## Failure Scenarios

| Scenario | Behavior |
|---|---|
| `exec` returns non-zero exit code | `status: 'error'`, stderr in `details.error`, suggestion to check shell/PATH |
| `exec` throws (`ENOENT`, etc.) | `status: 'error'`, error message in `details.error`, suggestion provided |
| Timeout | Handled by runner via `Promise.race` — returns error result with check name and timeout duration |

---

## Implementation Notes

- `getRunningProcesses(deps)` in `lib/utils/system.ts` selects the correct command based on `process.platform` and executes it via the injected `exec`
- This check contains no `if (process.platform === ...)` logic — all OS branching lives in `system.ts`
- Tests mock the injected `exec` function to return controlled stdout/stderr without spawning real processes
- Does not access `devguard.config.json` directly — config is passed in by the runner
- Does not catch its own errors — top-level errors propagate to the runner's central handler
