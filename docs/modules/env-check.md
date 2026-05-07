# Module: envCheck

## Purpose

Validate whether the target project's env files satisfy the keys defined in that project's `.env.example`.

This check is now target-project oriented, not DevGuard-process oriented.

## Inputs

Receives `DevGuardConfig`.

Relevant fields:

| Field | Type | Meaning |
|---|---|---|
| `requiredEnvKeys` | `string[]` | Extra keys to require in addition to `.env.example` |
| `targetPort` | `number | undefined` | Optional port used to resolve the target project root |

Dependency injection:

- `fileExists`
- `readFile`
- `exec`
- `platform`
- optional `resolveProjectRootFromPort`

## Project Resolution

If `targetPort` is provided, the module attempts to:

1. find the PID listening on that port
2. read its command line
3. infer the target project root

If this fails, Env Check returns `warning` because it cannot confidently inspect the intended target project.

If no `targetPort` is provided, the module falls back to `process.cwd()`.

## Files Read

- `.env.example`
- `.env`
- `.env.local`

Merge order:

1. `.env`
2. `.env.local`

So `.env.local` wins on conflicts.

## Outputs

Typical details shape:

```ts
{
  missing: string[];
  present: string[];
  placeholderLike: string[];
  filesChecked: string[];
  total: number;
  projectRoot?: string;
  targetPort?: number;
  targetPid?: number | null;
  targetCommandLine?: string | null;
  error?: string;
}
```

## Status Rules

| Status | Condition |
|---|---|
| `ok` | All required keys are present and non-placeholder |
| `ok` | `.env.example` exists but defines no keys |
| `warning` | Target project cannot be resolved from the chosen port |
| `warning` | `.env.example` is missing |
| `warning` | No `.env` or `.env.local` file exists in the target project |
| `error` | Missing required keys |
| `error` | Placeholder-like values found |
| `error` | Required files could not be read |

## Placeholder Detection

Current placeholder-like patterns include values such as:

- empty string
- `changeme`
- `replace-me`
- `your-api-key`
- `example`
- `todo`
- `test`

## Notes

- `.env.example` is the primary source of truth
- `requiredEnvKeys` can add extra keys beyond `.env.example`
- The check intentionally reads files directly and does not depend on DevGuard's own `process.env`
