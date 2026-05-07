# Module: portCheck

## Purpose

Inspect listening TCP ports on the host machine and present them in a developer-friendly way.

This module does two jobs:

1. list all occupied listening TCP ports and their owning processes
2. evaluate an optional `targetPort` as either:
   - available
   - already owned by the resolved target project
   - occupied by another process

It does not probe ports by binding sockets. It reads the OS listener table through `lib/utils/system.ts`.

## Inputs

Receives `DevGuardConfig`.

Relevant fields:

| Field | Type | Meaning |
|---|---|---|
| `targetPort` | `number | undefined` | Optional port selected in the dashboard |
| `timeoutMs` | `number` | Enforced by the runner, not by this module |

Dependency injection:

- `exec`
- `platform`
- optional `resolveProjectRootFromPort`

## Outputs

Typical details shape:

```ts
{
  occupied: number[];
  listeners: Array<{
    port: number;
    pid: number | null;
    processName: string | null;
    isTarget?: boolean;
  }>;
  total: number;
  targetPort?: number;
  targetOccupied?: boolean;
  targetOwned?: boolean;
  targetListener?: {
    port: number;
    pid: number | null;
    processName: string | null;
  };
  targetProjectRoot?: string;
  targetPid?: number | null;
  targetCommandLine?: string | null;
}
```

## Status Rules

| Status | Condition |
|---|---|
| `ok` | No target port was provided and no listeners were found |
| `ok` | Target port is available |
| `ok` | Target port is occupied by the resolved target project |
| `warning` | No target port was provided and one or more occupied ports were found |
| `error` | Target port is occupied by another process |

## Current Behavior

- enumerates all listening TCP ports
- sorts and deduplicates them
- resolves process names for listeners
- marks the selected target port in `listeners`
- if a target port is occupied, tries to resolve the project behind that port

If project resolution succeeds, the module treats that as a healthy "this is your target app" state.

## Edge Cases

| Scenario | Behavior |
|---|---|
| No listeners on machine | `ok`, "No occupied TCP listening ports detected" |
| Same port appears more than once in command output | Deduplicated in `occupied` |
| IPv4 and IPv6 listeners | Normalized to port numbers |
| Port is occupied but process root cannot be resolved | Treated as a conflict for the target-port flow |
| No `targetPort` provided | Module acts as a machine-state summary and may return `warning` |

## Implementation Notes

- Uses `getListeningPortDetails()` from `lib/utils/system.ts`
- Uses project resolution only when `targetPort` is present and occupied
- Leaves timeout/error wrapping to `runAllChecks()`
