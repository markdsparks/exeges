# Exeges — Agent Guidelines

## Development Discipline: Small, Testable Changes

When possible, work in small atomic increments and verify each one before moving on. This prevents the "compile at the end" pattern where everything breaks together and debugging is hard.

### What this means

- **One feature, one commit.** A change that touches twenty files is probably a story, not a step. Split it — get the data flow working first, style it second, wire interactions third.
- **Verify before continuing.** Run the server, hit reload, check the browser. If something changed visually, great — move on. If not, fix now while you know what you touched.
- **Prefer commits over save-all-and-run.** A failing build blocks progress; a single broken line in an uncommitted hunk doesn't block anyone.
- **Read before writing.** Before making a large edit, skim the file to understand existing patterns — indentation, naming, comment style. Match the codebase you're dropping into.

### Anti-patterns to avoid

| Pattern | Better approach |
|---|---|
| Rewrite 3 files then run `npm start` | Run after each file, catch errors early |
| Destructure from a hook then hope it exports it | Check the source before wiring up the call site |
| Wire a component without verifying the parent renders it | Inspect the render tree, not just expect it works |
| Guess at API surface or prop contracts | Read the code that exposes it first |

### When big changes are fine

Not every change needs to be small. Refactors for readability, bug fixes, or well-scoped features are all reasonable in one shot — the key is verifying before committing.
