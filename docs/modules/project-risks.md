# Project Risks Module

## Purpose

Project Risks translates raw local inspection signals into operational risk warnings a developer can act on quickly.

This module focuses on local project reliability and workflow hygiene, not enterprise security analysis.

## Developer Value

- surfaces hidden setup drift before it causes runtime issues
- reduces "works on my machine" inconsistencies
- gives actionable warnings without heavyweight tooling
- complements Inspector by adding interpretation and context

## Proposed Risk Checks (Planning Scope)

1. Lockfile consistency
- detect multiple lockfiles (`package-lock.json`, `pnpm-lock.yaml`, `yarn.lock`, `bun.lockb`)
- detect missing lockfile when `package.json` exists

2. Env hygiene
- detect suspicious placeholder-like values in `.env` files
- detect missing `.env*` ignore patterns where applicable

3. Ignore rule hygiene
- detect missing `node_modules` in `.gitignore`

4. Tooling/version coherence
- detect obvious framework/tooling mismatch patterns
- detect incompatible major version combinations where deterministic rules exist

5. Dependency footprint warnings
- detect unusually large direct dependency count thresholds (warning-level only)

6. Deprecated pattern hints
- detect known outdated local patterns (rule-based, static, lightweight)

## Edge Cases

- Monorepos with intentional multiple lockfiles per workspace
- Repositories that intentionally commit `.env.example` but not `.env`
- Template repositories that keep placeholders by design
- Non-Node repositories where lockfile rules should be skipped
- Generated or vendored subfolders introducing false positives

Planned handling:

- classify uncertain cases as `warning`, not `error`
- include rationale and suggested manual verification
- keep rule matching explicit and transparent

## Non-Goals

- CVE scanning
- dependency exploit intelligence
- external vulnerability API integrations
- clone/replacement of `npm audit`, `pnpm audit`, or SCA platforms
- compliance scoring and governance dashboards

## Future Extensibility

- add optional risk rule toggles in Environment Settings
- add severity tuning per risk family
- allow per-repository ignore list for specific risk rules
- add richer remediation hints linked to local docs

Extensibility must remain local-only and explicit; no dynamic plugin systems.

## Planned Output Shape

```ts
interface ProjectRiskItem {
  id: string;
  title: string;
  severity: 'warning' | 'error';
  message: string;
  evidence?: string[];
  suggestion?: string;
}

interface ProjectRisksResult {
  status: 'ok' | 'warning' | 'error';
  count: number;
  risks: ProjectRiskItem[];
}
```

## Tradeoff Notes

- Rule-based risk checks are intentionally simple and explainable.
- Some checks may be conservative to reduce false certainty.
- Lightweight heuristics are preferred over opaque scoring models.
