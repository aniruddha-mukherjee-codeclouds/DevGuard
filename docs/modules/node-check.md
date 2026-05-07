# Module: nodeCheck

## Purpose

Compares the currently running system Node.js version against the target project's declared requirement. The requirement is discovered from `package.json` `engines.node` first, then `.nvmrc`, then `.node-version`.

Uses the `semver` npm package for range evaluation.

---

## Inputs

Receives the `DevGuardConfig` object. Relevant fields:

| Field | Type | Default | Description |
|---|---|---|---|
| `targetPort` | `number \| undefined` | `undefined` | Optional port used to resolve the target project before reading version metadata |

System dependencies (`getNodeVersion`, filesystem reads, and project-root resolution) are injected via a `deps` parameter to support unit testing.

---

## Outputs

```ts
CheckResult {
  name: 'Node Check',
  status: 'ok' | 'warning' | 'error',
  message: string,
  suggestion?: string,
  details: {
    current: string,
    required?: string,
    satisfied?: boolean,
    source?: string,
    projectRoot?: string
  },
  durationMs: number
}
```

| Status | Condition |
|---|---|
| `ok` | Current Node version satisfies the discovered project requirement |
| `warning` | No version metadata was found, or the target project could not be resolved from the requested port |
| `error` | Version does not satisfy the discovered range, the range is malformed, or version metadata could not be read |

---

## Edge Cases

| Scenario | Behavior |
|---|---|
| Version satisfies range | Returns `ok` |
| Version does not satisfy range | Returns `error`, suggestion includes required range and how to upgrade (e.g., via nvm) |
| Malformed requirement in project metadata | Returns `error`, suggestion to fix the version file |
| No `engines.node`, `.nvmrc`, or `.node-version` | Returns `warning` |
| Pre-release version (e.g., `v22.0.0-nightly`) | Handled by semver library; pre-release versions do not satisfy ranges unless range explicitly allows them |
| Very old Node (e.g., v12) | Returns `error`, clear message and suggestion |

---

## Failure Scenarios

| Scenario | Behavior |
|---|---|
| Project metadata file cannot be read | `status: 'error'`, error message in `details.error`, `suggestion` provided |
| Target port cannot be resolved to a project root | `status: 'warning'`, `targetPort` and `targetPid` included in details |
| Timeout | Handled by runner via `Promise.race` |

---

## Implementation Notes

- `getNodeVersion()` in `lib/utils/system.ts` returns `process.version` stripped of the leading `v` (e.g., `'20.11.0'`)
- The check imports and calls this helper and never accesses `process.version` directly
- The required version is discovered from `package.json` `engines.node`, `.nvmrc`, or `.node-version`
- Tests mock `getNodeVersion` and project-root resolution via dependency injection
- Does not catch its own errors; top-level errors propagate to the runner's central handler
