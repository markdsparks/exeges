# Decision Records

Use an architecture decision record for a consequential product or technical choice whose context would otherwise be lost, especially when reversal is expensive or the choice changes a product promise, data boundary, dependency, deployment shape, public interface, or source/AI policy.

Do not create an ADR for routine implementation details. CEO-reserved decisions require explicit CEO approval before an ADR is marked accepted.

## Process

1. Copy [0000-template.md](0000-template.md) to the next four-digit number and a short slug, for example `0001-reader-first-study.md`.
2. Set status to `Proposed` and describe the decision, evidence, alternatives, consequences, and validation plan.
3. Name the decision owner. Use `CEO` for reserved product decisions and `Lead agent` for reversible technical decisions within approved scope.
4. Set status to `Accepted` only after the owner decides. Link the implementing feature spec or handoff.
5. Never rewrite the history of an accepted ADR. Add a new ADR that supersedes it.

## Statuses

- `Proposed`: under evaluation; implementation must not assume approval.
- `Accepted`: authoritative until superseded.
- `Rejected`: considered and declined.
- `Superseded by ADR-NNNN`: retained as history.
