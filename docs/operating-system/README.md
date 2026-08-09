# Exeges Operating System

This directory is the concise source of truth for turning CEO direction into verified software outcomes.

## Authority

The CEO owns vision, priorities, customer judgment, success measures, risk tolerance, and consequential product decisions. The lead agent converts that direction into a specification and delivery plan, coordinates specialist agents, integrates work, runs quality gates, and reports evidence.

Specialists advise or execute within a bounded assignment. They do not change product strategy or expand scope. Project-scoped role definitions live in `.codex/agents/`.

## Documents

- [Project charter](project-charter.md): durable mission, principles, constraints, non-goals, and reserved decisions.
- [Product direction](product-direction.md): current product state and provisional near-term direction.
- [Engineering context](engineering-context.md): system shape, commands, delivery paths, and technical risks.
- [Decision records](../decisions/README.md): accepted consequential product and architecture decisions.
- Templates: [executive brief](../templates/executive-brief.md), [feature specification](../templates/feature-spec.md), [implementation plan](../templates/implementation-plan.md), and [delivery handoff](../templates/delivery-handoff.md).

The charter changes slowly. Product direction changes when priorities or validated assumptions change. Engineering context changes when the system or its supported workflows change. ADRs preserve why consequential decisions were made.

## Standard Delivery Cycle

1. **Brief:** The CEO states the problem, desired outcome, urgency, constraints, and any known success signal using the [executive brief](../templates/executive-brief.md) or plain language.
2. **Frame:** The lead inspects relevant context and writes the outcome, acceptance criteria, non-goals, constraints, assumptions, risks, and open CEO decisions.
3. **Classify:** Assess impact, reversibility, data/security/licensing exposure, architecture reach, and release consequences.
4. **Plan:** Define small increments, owners, affected areas, checks, and rollback or recovery. Create an ADR for a consequential hard-to-reverse decision.
5. **Delegate:** Assign only bounded independent work. One agent owns each mutable area; read-only audits may run in parallel.
6. **Integrate:** The lead reviews and combines the work without unrelated changes.
7. **Verify:** Run applicable repository checks, manually test affected user journeys, and have an independent verifier assess meaningful changes.
8. **Resolve:** Fix findings or clearly escalate them with evidence and options.
9. **Handoff:** Report the delivered outcome, visible behavior, decisions, verification evidence, remaining risk, CEO decisions, and recommended next action.

## Risk And Reversibility

- **Low:** local, easily reverted, no persisted-data or contract impact. The lead may proceed using established patterns.
- **Medium:** shared behavior, meaningful UX change, new dependency, or difficult regression surface. Use an explicit plan and independent verification.
- **High:** product promise, security/privacy/compliance, licensed data, destructive behavior, production infrastructure, spending, credentials, migration, or breaking interface. Stop for CEO approval and record the decision when accepted.

## Quality Gates

The minimum gate is acceptance criteria satisfied, applicable lint/build/benchmarks passing, focused tests added where practical, manual coverage of changed journeys and edge states, security/privacy/licensing review, documentation alignment, clean scope, independent diff review for meaningful work, and explicit remaining uncertainty. The exact command matrix is in [engineering context](engineering-context.md).
