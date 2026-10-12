# Contributing

Read [AGENTS.md](AGENTS.md). Keep changes focused on helping a new agent discover and use the installed Obsidian Excalidraw CLI without prior context.

## Development

Use Node.js 20 or newer. There are no npm dependencies and no installation or build step:

```sh
npm run check
```

This runs syntax checks and offline Node tests. Add protocol-boundary tests for new helpers, including failure and partial-success paths. Use argument-array subprocess execution, UTF-8 JSON, explicit vault/paths, and bounded native operations. Do not add automatic write retries, global agent configuration changes, cloud services, or a copied drawing engine.

## Documentation and examples

Keep [README.md](README.md) and [SKILL.md](SKILL.md) as the user and agent entry points. Link to focused material rather than repeating a complete API reference. Keep all linked resources in the bundle and test examples from a working directory other than the repository. Do not instruct users to copy only SKILL.md: its supporting directories must accompany it.

For protocol changes, inspect the relevant plugin revision and update the dated source references in [getting started](docs/getting-started.md). Compare actual source/response fields, not only a PR description. Live `schema` and `api` remain authoritative. Treat [capabilities](docs/capabilities.md) and [results](docs/results.md) as historical inspection records, not a current compatibility guarantee.

## Live acceptance

Use only an explicitly authorized, dedicated test vault. `--execute` on the first-drawing example creates a drawing, opens it, applies a guarded edit, and writes a PNG. Opening can run configured drawing scripts. Never use a personal vault for an automatic smoke test.

Before claiming live support, record the OS, Node/Obsidian/plugin versions, launcher, exact commands, paths, request IDs, returned receipts, and actual validation. Check these three things:

1. Discovery works, and the first-drawing example produces saved read-back, editable labels, and connected endpoints.
2. Inspect the exported PNG for clipping, readability, font, framing, and connector visibility; verify the drawing remains editable.
3. An existing destination or uncertain write stops without overwrite, duplicate creation, automatic retry, or cleanup of unrelated files.

Keep offline test results, live integration, visual inspection, and user acceptance separate in the PR. A successful export is not proof that a previous live edit was saved. Do not change versions or licensing as part of routine improvements.
