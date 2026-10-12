# Troubleshooting

| Symptom | Safe response |
| --- | --- |
| Native command is missing | Check the Obsidian CLI host/API, enabled plugin, CLI setting, launcher, vault selection, and plugin readiness. Do not install a competing drawing CLI. |
| `NOT_FOUND` for an input file | Confirm the exact vault-relative path and UTF-8 file contents. Newly generated files may not yet be indexed; use only a supported readiness check, not polling sleeps. |
| `STALE_REVISION` | Discard the stale plan, reread all required pages at a fresh revision, and apply a focused edit. |
| `BUSY` | Read the target back before deciding whether and when to retry. |
| Different request payload reuses an ID | Assign a fresh request ID to each changed effective request. Keep the original payload for receipt recovery. |
| Timeout or missing stdout | Query `result` using the same request ID. If unresolved, read back the exact target before another mutation. |
| Save/export succeeded but layout looks wrong | Inspect actual live element bounds and the exported image. Persistence, export, and structural validation do not establish visual quality. |
| Text overflows or moves | Resolve the requested runtime font by name; use native measurement/wrapping; make anchor semantics explicit; inspect live geometry after insertion. Do not use a silent Virgil fallback. |
| An element appears missing | Exhaust `nextOffset` for the same revision. Native reads are paginated. |
| Script fails after some edits | Trusted scripts are nontransactional. Read back the actual scene and report the state; do not claim rollback. |
| Windows output is garbled | Preserve the JSON request/response as UTF-8 and inspect the stored text directly before diagnosing data corruption. |

The runner intentionally does not blindly retry mutations or delete files. Use a dedicated test vault for optional live checks.
