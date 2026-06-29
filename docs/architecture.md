# Novel Idle Architecture

Novel Idle is a local-first writing operations console for Markdown novel repositories.

## Product Boundary

The core product is offline and repository-native:

- Read existing Markdown files from a user-selected folder.
- Build a typed project model for volumes, specs, manuscripts, assets, and progress.
- Show actionable production state without mutating source files.
- Store only local browser snapshots for delta metrics.

Write-back features are intentionally a later stage and must be explicit user actions.

## Integration Strategy

Kimi WebBridge and Playwright are automation adapters, not the persistence layer.

- Playwright: deterministic smoke/regression testing for the local UI.
- Kimi WebBridge: optional browser bridge for authenticated web research, source capture, or cross-site workflow automation.
- Local agent service: Node backend for OpenAI-compatible model calls. It keeps API keys outside the browser and returns preview output for chapter tasks.
- Future write-back: Node/Tauri backend for safe file writes such as generating `_开写包_第NN章.md`.

This keeps the application usable without external accounts while still allowing richer automation.

## Resume-Framing Milestones

1. Local-first repository scanner with typed domain model.
2. Production dashboard for long-form fiction pipeline state.
3. Rule-based consistency checks for specs, manuscripts, POV, and story-state updates.
4. Explicit write-back workflow with dry-run diff preview.
5. Browser automation integration for visual QA and external source capture.
