# Proposal: SEED-00b-sqlite-docker

## Why

Deliver the SEED unit **SEED-00b-sqlite-docker** as defined in `Docs/SEED_PLAN_FULL.md` and `Docs/seeds/SEED-00b-sqlite-docker.md`.

## What changes

Replace in-memory store with SQLite and ship local Docker Compose (api + web + volume).

## Status

Done

## Out of scope

See Out of scope in `Docs/seeds/SEED-00b-sqlite-docker.md`.

## Impact

- Demo stack only (SQLite · mock auth · Docker Compose)
- Spec delta under `openspec/changes/SEED-00b-sqlite-docker/specs/`
- Implementation under `codebase/` when this SEED is selected for build

## Parent change

`openspec/changes/shelfpilot-mvp/`
