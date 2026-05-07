# Module: nodeCheck

## Purpose

Compare the machine's current Node.js version to the version required by the target project.

This module now supports two levels of discovery:

1. explicit project metadata
2. framework or toolchain metadata fallback

That makes the check useful even for projects that do not keep `.nvmrc`, `.node-version`, or `engines.node`.

## Inputs

Receives `DevGuardConfig`.

Relevant fields:

| Field | Type | Meaning |
|---|---|---|
| `targetPort` | `number | undefined` | Optional port used to resolve the target project root |

Dependency injection:

- `getNodeVersion`
- `fileExists`
- `readFile`
- optional `resolveProjectRootFromPort`

## Resolution Order

### Target Project

If `targetPort` is present, Node Check tries to resolve the project root from the process listening on that port.

If it cannot resolve the target project, the module returns `warning`.

If no target port is provided, it inspects `process.cwd()`.

### Node Requirement

The module looks for a required version in this order:

1. `package.json#engines.node`
2. `.nvmrc`
3. `.node-version`
4. installed toolchain package metadata under `node_modules`

Current toolchain fallback targets include packages such as:

- `next`
- `vite`
- `react-scripts`
- `@remix-run/dev`
- `@angular/cli`
- `nuxt`
- `gatsby`

For the fallback case, the requirement comes from that package's `package.json#engines.node`.

## Outputs

Typical details shape:

```ts
{
  current: string;
  required?: string;
  satisfied?: boolean;
  source?: string;
  basis?: string | null;
  projectRoot?: string;
  targetPort?: number;
  targetPid?: number | null;
  error?: string;
}
```

## Status Rules

| Status | Condition |
|---|---|
| `ok` | Current Node satisfies the discovered requirement |
| `warning` | Target project cannot be resolved from the chosen port |
| `warning` | No explicit or inferred Node requirement can be found |
| `error` | Current Node does not satisfy the requirement |
| `error` | Discovered requirement is malformed |
| `error` | Project metadata could not be read |

## Examples

- A Next.js project without `.nvmrc` can still return `ok` if the installed `next` package declares a compatible Node engine
- A Vite project without `engines.node` can still return `error` if the current machine Node version is below Vite's required engine range

## Notes

- Uses `semver.satisfies`
- Reads `process.version` through `getNodeVersion()` helper
- Reports the `basis` field when the requirement came from a framework or tooling package rather than an explicit project file
