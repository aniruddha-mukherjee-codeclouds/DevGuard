# Module: nodeCheck

## Purpose

Compares the currently running Node.js version against the required semver range from config. Uses a `getNodeVersion()` helper from `lib/utils/system.ts` rather than reading `process.version` directly, so tests can mock the helper cleanly.

Uses the `semver` npm package for range evaluation.

---

## Inputs

Receives the `DevGuardConfig` object. Relevant fields:

| Field | Type | Default | Description |
|---|---|---|---|
| `requiredNodeVersion` | `string` | `'>=18.0.0'` | Semver range the current Node version must satisfy |

System dependencies (`getNodeVersion`) are injected via a `deps` parameter to support unit testing.

---

## Outputs

```ts
CheckResult {
  name: 'Node Check',
  status: 'ok' | 'error',
  message: string,
  suggestion?: string,   // always present on 'error'
  details: {
    current: string,
    required: string,
    satisfied: boolean
  },
  durationMs: number
}
```

| Status | Condition |
|---|---|
| `ok` | Current Node version satisfies the required range |
| `error` | Version does not satisfy range, or range is malformed — `suggestion` always present |

Note: This check has no `warning` state — a version mismatch is always an error.

---

## Edge Cases

| Scenario | Behavior |
|---|---|
| Version satisfies range | Returns `ok` |
| Version does not satisfy range | Returns `error`, suggestion includes required range and how to upgrade (e.g., via nvm) |
| Malformed `requiredNodeVersion` (e.g., `'foo'`) | Returns `error`, suggestion to fix config value |
| Pre-release version (e.g., `v22.0.0-nightly`) | Handled by semver library; pre-release versions do not satisfy ranges unless range explicitly allows them |
| Very old Node (e.g., v12) | Returns `error`, clear message and suggestion |

---

## Failure Scenarios

| Scenario | Behavior |
|---|---|
| `getNodeVersion()` returns unexpected format | `status: 'error'`, raw value in `details.current`, `suggestion` provided |
| Timeout | Handled by runner via `Promise.race` |

---

## Implementation Notes

- `getNodeVersion()` in `lib/utils/system.ts` returns `process.version` stripped of the leading `v` (e.g., `'20.11.0'`)
- The check imports and calls this helper — never accesses `process.version` directly
- Tests mock `getNodeVersion` via dependency injection, not `process.version`
- Does not access `devguard.config.json` directly — config is passed in by the runner
- Does not catch its own errors — top-level errors propagate to the runner's central handler
