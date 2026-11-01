# Troubleshooting

| Symptom | Safe response |
| --- | --- |
| Plugin is older than 2.29.1, or its version is unverified | Stop before drawing operations. Ask the user to update/reload Excalidraw, repeat read-only discovery, and verify `status.data.version` / `pluginVersion`. Doctor readiness alone is not a version check. |
| Native command is missing | Check the Obsidian CLI host/API, enabled plugin, CLI setting, launcher, vault selection, and plugin readiness. Do not install a competing drawing CLI. |
| `NOT_FOUND` for an input file | Confirm the exact vault-relative path and UTF-8 file contents. Newly generated files may not yet be indexed; use only a supported readiness check, not polling sleeps. |
| `STALE_REVISION` | Discard the stale plan, reread all required pages at a fresh revision, and apply a focused edit. |
| `BUSY` | Inspect receipt/state. Retry only an explicitly pre-execution refusal with the identical payload and request ID once free; do not bypass uncertain outcomes with a new ID. |
| `INTERNAL_ERROR` | Treat as an internal failure rather than malformed input. Inspect the original receipt and live/disk state before another possible write. |
| Image export exceeds resource limits or an asset is unavailable | Use explicit thumbnail/placeholder rules or a smaller scope/budget as described in [image previews](image-previews.md). A placeholder is not evidence that the omitted image was inspected. |
| Different request payload reuses an ID | Assign a fresh request ID to each changed effective request. Keep the original payload for receipt recovery. |
| Timeout or missing stdout | Query `result` using the same request ID. If unresolved, read back the exact target before another mutation. |
| Save/export succeeded but layout looks wrong | Inspect actual live element bounds and the exported image. Persistence, export, and structural validation do not establish visual quality. |
| Text overflows or moves | Resolve the requested runtime font by name; use native measurement/wrapping; make anchor semantics explicit; inspect live geometry after insertion. Do not use a silent Virgil fallback. |
| An element appears missing | Exhaust `nextOffset` for the same revision. Native reads are paginated. |
| Script fails after some edits | Trusted scripts are nontransactional. Read back the actual scene and report the state; do not claim rollback. |
| Windows output is garbled | Preserve the JSON request/response as UTF-8 and inspect the stored text directly before diagnosing data corruption. |

The runner intentionally does not blindly retry mutations or delete files. Use a dedicated test vault for optional live checks.
