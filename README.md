# Novel Idle

Local-first writing operations console for `novel-lab`.

This is intended to become a production-grade portfolio project, not a static demo. The core app reads a Markdown novel repository from the browser, builds a typed project model, and presents actionable writing-pipeline state without modifying source files.

## Why It Exists

`novel-lab` already has a serious production workflow:

- `outline.md` as the chapter-level authority.
- `story.md` as the truth source and foreshadowing ledger.
- `character/`, `site/`, and `canon/` as the asset library.
- `卷一` to `卷九` as manuscript/spec-card production lanes.
- `工程/流程定式.md` and `工程/技法引擎.md` as the writing engine.

Novel Idle turns that folder into a local writing IDE/dashboard.

## Current Capabilities

- Scan `卷一` to `卷九` manuscript and spec-card files.
- Count manuscript writing units with CJK-aware logic.
- Track manuscript/spec-card coverage by volume.
- Show chapter readiness: spec exists, manuscript exists, ready for review gate.
- Index characters, sites, canon, and project-engine docs.
- Keep local browser snapshots for delta/idle metrics.
- Run typed unit tests and Playwright smoke tests.

## Setup

```powershell
cd "C:\Users\z1628\Documents\novel idle"
npm install
```

## Development

```powershell
npm run dev
```

Open:

```text
http://127.0.0.1:8787
```

Then select:

```text
C:\Users\z1628\novel-lab
```

You can also run:

```powershell
.\start.ps1
```

## Verification

```powershell
npm run build
npm run test
npm run e2e
npm audit --omit=optional
```

The Playwright config uses the installed system Chrome channel instead of downloading a bundled browser.

## Production Roadmap

1. Chapter detail view: manuscript, spec card, previous chapter ending, related assets.
2. Rule-based consistency checks: missing story-state updates, POV markers, terminology drift.
3. Context-pack generation with dry-run preview before writing `_开写包_第NN章.md`.
4. Explicit write-back mode through a local service or Tauri shell.
5. Kimi WebBridge adapter for authenticated browser research and external source capture.
6. Resume-ready case study: local-first architecture, test coverage, browser automation, and real workflow usage.

## Safety Boundary

The browser app is read-only. Write-back features must be explicit, previewable, and reversible.
