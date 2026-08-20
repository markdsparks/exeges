# Exeges Operating System

- **Owner:** CEO for product authority; repository lead for operation and upkeep
- **Status:** Adopted for repository work
- **Last verified:** 2026-08-19

This is the shared operating model for turning CEO direction into verified Exeges outcomes. Product intent and acceptance criteria stay centralized; only genuinely independent work is parallelized; integration flows through one controlled queue.

## Authority

The CEO owns vision, priorities, customer judgment, success measures, risk tolerance, consequential decisions, autonomy limits, and release authority. The repository lead acts as chief of staff and delivery lead: it interprets directives, maintains the task graph and shared contracts, assigns bounded work, integrates, verifies, and reports outcomes.

The full execution rules, interaction protocol, source hierarchy, role boundaries, approval envelope, and escalation conditions live in [AGENTS.md](../../AGENTS.md). Vendor-specific agent files are thin adapters to that shared source; they do not contain unique product or architecture truth.

## Durable Sources Of Truth

| Concern | Authoritative document |
| --- | --- |
| Mission, principles, constraints, reserved decisions | [Project charter](project-charter.md) |
| Current product state, provisional outcomes, assumptions | [Product direction](product-direction.md) |
| System, data flows, commands, release path | [Engineering context](engineering-context.md) |
| Current and proposed module boundaries | [Module map](../architecture/MODULES.md) |
| Shared interfaces and invariants | [Contract registry](../architecture/contracts/README.md) |
| Consequential accepted choices | [Decision records](../decisions/README.md) |
| Current objective, task graph, queue, decisions, and risks | [Coordination](../coordination/README.md) |
| Initial operating-system audit and migration proposal | [Adoption plan](adoption-plan.md) |
| Source licensing and grounding | [Curated source plan](../curated-source-plan.md) |
| ESV and native integration constraints | [ESV proxy](../esv-proxy.md) and [iOS shell](../../native/ios/README.md) |

Use the authority order in `AGENTS.md` when sources conflict. Do not let current implementation silently override approved intent.

## Delivery Lifecycle

1. **Brief:** classify the CEO message and capture the desired outcome, priority, constraints, and success signal using plain language or the [directive brief](../templates/executive-brief.md).
2. **Frame:** inspect the relevant product and technical context; record acceptance criteria, non-goals, assumptions, risks, and open CEO decisions.
3. **Classify:** assess impact, reversibility, data/security/licensing exposure, architecture reach, and release consequences.
4. **Plan:** settle shared interfaces, create the dependency graph, identify approval gates and checkpoints, and write bounded [task contracts](../templates/task-contract.md).
5. **Delegate:** give every agent exactly one role. Use one writer per checkout and parallelize only independent work.
6. **Implement:** execute a bounded inspect-plan-edit-check-diagnose-repair loop and return new evidence.
7. **Review:** have an independent Reviewer compare the task contract, diff, surrounding system, and checks.
8. **Integrate:** process the authoritative queue in dependency order and rerun cross-module checks.
9. **Release:** prepare a candidate separately from production action. Production requires explicit approval or a precisely recorded standing approval.
10. **Handoff:** report the outcome, important decisions, evidence, uncertainty, CEO decisions, and next action using the [delivery handoff](../templates/delivery-handoff.md).

## States

Coordination tasks use `Blocked`, `Ready`, `In progress`, `Review`, `Integrated`, and `Shipped`.

Outcome reporting uses `Proposed`, `Approved`, `In progress`, `Implemented`, `Verified`, `Integrated`, and `Shipped`. These are not synonyms:

- `Implemented` means the change exists locally.
- `Verified` means its acceptance criteria and applicable checks passed.
- `Integrated` means the lead accepted it into the integration base or explicitly marked it ready there.
- `Shipped` means the approved release condition was met.

## Roles

- **Explorer:** read-only evidence, data flows, risks, alternatives, and task boundaries.
- **Implementer:** one approved task contract and exclusive mutable area.
- **Reviewer:** fresh-context, read-only assessment with prioritized findings and a pass/fail recommendation.
- **Integrator:** queue order, compatibility, conflicts, regression evidence, and release-candidate preparation.

There is one repository lead and one integration queue. The lead may also be the Integrator. Only the lead updates shared coordination records.

## Risk And Approval

- **Low:** local, reversible, no persisted-data or shared-contract effect. The lead may proceed inside an approved objective.
- **Medium:** shared behavior, meaningful UX, new dependency, or difficult regression surface. Use an explicit plan, focused evidence, and independent review.
- **High:** product promise, security/privacy/compliance, licensing, destructive data behavior, production infrastructure, spending, credentials, migration, or breaking interface. Stop for CEO approval and record the accepted decision when consequential.

Production deployment, publishing, external communication, spending, destructive action, irreversible migration, and live-infrastructure changes require explicit approval for the specific action immediately before it unless a still-valid, narrowly scoped CEO standing approval is recorded. That standing approval substitutes for repeated approval only inside its stated scope, safeguards, and validity period. No standing production approval is currently recorded.

## Standard Quality Gate

Run `npm run check` for documentation, lint, and the production build. Run `npm run check:full` when broad regression evidence is appropriate; it adds every local focused benchmark. Change-specific requirements are in [engineering context](engineering-context.md).

Passing automation is necessary when applicable, but it is not completion. The gate also requires accepted behavior, relevant manual journeys, security/privacy/licensing review, documentation alignment, clean scope, independent review for meaningful changes, and explicit residual uncertainty.

## Operating Measures

Evaluate the system through product outcomes, directive-to-verified lead time, deployment frequency, change failure and rollback rate, escaped defects, rework, integration failures, review backlog, CEO attention per shipped outcome, and user or business impact. Do not use agents spawned, tokens, commits, lines of code, or generated output as primary productivity measures.

## CEO Brief

“Give me the CEO brief” means a compact status report, not a request for raw task transcripts. Use the [CEO brief template](../templates/ceo-brief.md): current objective, shipped outcomes, work in progress, decisions, risks and changed assumptions, evidence, resource position, and recommendation.

## Adoption Boundary

The governance and verification layer may evolve through small reversible changes. The application remains a single releasable Vite project today. The proposed modular-monorepo target in the [adoption plan](adoption-plan.md) is not approval to move product code, change persisted contracts, or alter release infrastructure. Each material migration phase requires CEO approval.
