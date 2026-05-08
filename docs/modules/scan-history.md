# Scan History Module

## Purpose

Scan History gives developers a short, local timeline of recent environment states so they can compare outcomes and spot regressions after changes.

## Storage Strategy

Persistence uses `localStorage` only.

- Key: `devguard:scan-history:v1`
- Format: JSON array
- Ordering: newest-first
- Hard limit: 20 entries

Why `localStorage`:

- zero setup and no infrastructure
- fast read/write for UI-scale data
- aligned with local-first product philosophy
- avoids schema migration burden of database layers

Why database was intentionally avoided:

- no multi-user requirement
- no remote sync requirement
- no high-volume analytics requirement
- would add unnecessary operational complexity

## Retention Strategy

- on each new scan: prepend newest entry
- trim list to max 20
- dedupe strategy (planned): preserve all entries by timestamp, no overwrite
- recovery: invalid JSON resets to empty array safely

## localStorage Architecture

Planned utility module: `lib/utils/historyStore.ts` (client-only usage)

Responsibilities:

- `getHistory(): ScanHistoryEntry[]`
- `saveScan(entry: ScanHistoryEntry): void`
- `clearHistory(): void`
- `exportHistory(): string` (JSON text)
- internal parse/serialize guardrails

## Scan Entry Shape

```ts
interface ScanHistoryEntry {
  id: string; // uuid or timestamp-based id
  timestamp: string; // ISO string
  overallStatus: 'ok' | 'warning' | 'error';
  targetPort: number | null;
  selectedProcesses: string[];
  durationMsTotal: number;
  results: Array<{
    name: string;
    status: 'ok' | 'warning' | 'error';
    message: string;
    durationMs: number;
  }>;
}
```

## UI Flow

1. User runs scan from Inspector
2. Successful response is transformed into `ScanHistoryEntry`
3. Entry is saved to localStorage
4. Scan History page reads list and renders newest-first
5. User can open a past entry detail snapshot
6. User can clear all history
7. User can export full history JSON

## Edge Cases

- localStorage unavailable (private mode restrictions)
- quota exceeded due to unusually large detail payloads
- malformed historical payload from older schema versions
- first-time user with no history

Planned behavior:

- fail gracefully to in-memory empty state
- show lightweight non-blocking warning messages
- never block Inspector scanning due to history persistence failure

## Export / Clear History Behavior

Export:

- provide a JSON string/blob of current stored entries
- export exact stored shape for transparency
- do not include hidden/private remote metadata (none exists)

Clear:

- remove localStorage history key value
- update UI immediately to empty state
- keep action explicit with confirmation UX

## Tradeoff Notes

- 20-entry cap prioritizes responsiveness and simplicity.
- Full-text search/filtering is intentionally deferred.
- History is local to one browser profile by design.
