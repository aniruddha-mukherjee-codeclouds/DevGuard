---
name: DevGuard Expansion - Intelligence Dashboard Spec
description: Planning spec for expanding DevGuard from Inspector-only workflow to a four-section local intelligence dashboard
type: project
---

# DevGuard Expansion Spec

**Date:** 2026-05-08
**Status:** Planning

## Objective

Expand DevGuard Web from a single Inspector workflow into a local developer environment intelligence dashboard with four sections:

1. Inspector
2. Project Risks
3. Scan History
4. Environment Settings

This document defines architecture and scope before implementation begins.

## Why "Vulnerabilities" Was Renamed to "Project Risks"

The previous label implied security vulnerability scanning. That wording creates incorrect expectations (CVE feeds, exploit intelligence, compliance posture).

"Project Risks" is more accurate because the feature will detect local operational risks and setup hygiene issues, such as lockfile inconsistencies and env/gitignore misconfiguration.

Renaming prevents product-positioning drift and keeps user trust aligned with actual capability.

## Architectural Decisions

1. Keep thin API routes
- no business logic in route handlers
- route stays request parsing + core invocation

2. Keep check logic in `lib`
- explicit module boundaries
- deterministic behavior and easier unit testing

3. Add local persistence only in browser
- `localStorage` for history/settings
- no server persistence paths

4. Preserve explicit registry and module wiring
- no plugin runtime loading
- no dynamic check discovery

5. Keep cross-platform support centralized
- system-level behavior remains in `lib/utils/system.ts`

## Feature Scope

### Inspector (Existing)

- remains primary scan execution engine
- no architecture rewrite required
- may read defaults from Environment Settings

### Project Risks (Planned)

- local operational risk detection only
- explicit rule-based checks
- remediation-oriented messaging

### Scan History (Planned)

- `localStorage` only
- newest-first list
- latest 20 scans only
- clear and export actions

### Environment Settings (Planned)

- local preference form
- validated defaults for target port/processes/timeout
- optional auto-scan and theme preference

## Implementation Boundaries

- no database introduction
- no account/auth system
- no remote sync
- no external vulnerability APIs
- no enterprise policy engine
- no background agent service

## Local-Only Philosophy

All new features must operate offline against local state and local project artifacts.

Benefits:

- immediate responsiveness
- no external dependency failures
- lower maintenance overhead
- clearer privacy posture

## Out of Scope (Explicit)

- CVE scanning and threat intelligence feeds
- replacing package manager security audit tooling
- cloud dashboards or organization workspaces
- team RBAC, SSO, multi-user data sharing
- heavy analytics pipelines
- plugin marketplace/runtime extension model

## Proposed Delivery Slices (Implementation Phase Later)

1. Data contracts and storage utilities
2. Settings UI + validation
3. History persistence + timeline UI
4. Project Risks rules + rendering
5. Integration polish and Vitest coverage

## Testing Strategy (Planning)

- keep Vitest as primary test runner
- add unit tests for:
  - history store parse/trim/export behavior
  - settings validation/fallback behavior
  - project risk rule evaluator
- retain existing check-module tests unchanged unless intentionally extended

## Risks and Mitigations

1. False-positive risk warnings
- mitigation: conservative rule severity and explicit evidence messages

2. localStorage schema drift
- mitigation: key versioning (`v1`) and tolerant parse logic

3. scope creep into security platform claims
- mitigation: strict naming, docs, and non-goals enforcement

4. UI complexity growth
- mitigation: section boundaries and explicit component ownership

## Definition of Ready for Implementation

Implementation can start when:

- architecture and scope are approved
- data contracts for settings/history/risk items are accepted
- non-goals are acknowledged as constraints
- phased delivery order is accepted
