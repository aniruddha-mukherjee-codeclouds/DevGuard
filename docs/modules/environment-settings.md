# Environment Settings Module

## Purpose

Environment Settings stores user-level defaults that make repeated scans faster and more consistent without changing core runtime architecture.

## Configurable Settings (Planned)

- `defaultTargetPort`
- `defaultProcesses`
- `timeoutMs`
- `autoScanOnLoad`
- `theme` (optional: `dark` or `system`)

## Persistence Approach

Use `localStorage` only.

- Key: `devguard:settings:v1`
- Scope: per browser profile, per machine
- No backend or account linkage

Rationale:

- settings are personal UX preferences
- no team-wide synchronization need
- local-first simplicity and speed

## Validation Rules

- `defaultTargetPort`
  - integer or null
  - valid range `1..65535`
- `defaultProcesses`
  - array of lowercase process tokens
  - trimmed, deduplicated
  - bounded max count (planned: 30)
- `timeoutMs`
  - integer
  - bounded range (planned: `500..30000`)
- `autoScanOnLoad`
  - boolean only
- `theme`
  - enum `dark | system`

Invalid values fallback to defaults.

## Defaults

```ts
const DEFAULT_ENV_SETTINGS = {
  defaultTargetPort: null,
  defaultProcesses: [],
  timeoutMs: 4000,
  autoScanOnLoad: false,
  theme: 'dark',
} as const;
```

Defaults should remain conservative and predictable.

## UI Behavior

- Settings page form mirrors stored shape directly.
- Save action writes validated settings to localStorage.
- Reset action restores defaults.
- Inspector reads settings on load and pre-fills scan controls.
- Auto-scan runs only when setting is true and target input is valid.

## Future-Safe Constraints

- version key suffix (`v1`) allows non-breaking migration path
- unknown fields are ignored on read
- schema evolution should be additive where possible
- settings read failure must not block scanning

## Non-Goals

- user accounts
- cloud sync
- team policy enforcement
- server-side preference persistence

## Tradeoff Notes

- Local-only settings keep architecture simple and private.
- Cross-device continuity is intentionally out-of-scope.
- Explicit validation avoids fragile implicit coercion.
