# Active Risk Register

- **Maintainer:** Repository lead
- **Updated:** 2026-08-19

| ID | Risk | Exposure / trigger | Owner | Current response | Status |
| --- | --- | --- | --- | --- | --- |
| R-001 | Unresolved primary customer creates incoherent scope | Any new product or source/AI expansion before D-001 | CEO | Keep outcomes provisional; require a bounded brief and success signal | Open |
| R-002 | A production push changes both web and iOS behavior | Any push to `main` | CEO / Integrator | Treat push as production; default to per-action approval until D-002 records a valid alternative | Open |
| R-003 | Single checkout permits agent filesystem interference | More than one writing agent | Repository lead | One writer at a time; read-only parallelism only until isolated worktrees exist | Controlled |
| R-004 | Coordination and architecture documents drift from code | Behavior or workflow changes without same-change docs | Repository lead | Link validation, check command, task handoff reconciliation, reviewer diff check | Controlled |
| R-005 | Private local data can be lost or incompatibly migrated | Storage/schema/restore changes; device reset without backup | CEO / module owner | Preserve keys and additive backup contract; require approval for migration or cloud promise | Open |
| R-006 | Licensed or attributed material is mishandled | ESV persistence, source additions, missing Tyndale/OpenBible attribution | Module owner / Reviewer | Enforce proxy, redaction, source metadata, provenance and license review | Open |
| R-007 | Model or synthesis output overstates evidence | Prompt, audit, retrieval, source, or model changes | Study owner / Reviewer | Passage-first deterministic default, evidence-only packet, exact-quote checks, opt-in labeling | Controlled with residual risk |
| R-008 | Large orchestration hotspots increase regression and integration risk | Changes to `App.jsx`, `StudyThread.jsx`, or legacy `StudyMode.jsx` | Repository lead | Serialize changes; use focused contracts/checks; extract only through approved bounded phases | Open |
| R-009 | Verification is incomplete despite a green build | UI, Worker, native, network, or device behavior changes | Integrator / Reviewer | Apply change-specific manual and integration checks; do not equate build with ship | Open |
| R-010 | ESV Worker is exposed operationally | Public-origin access, unbounded requests, quota abuse, missing deploy config | CEO / architecture owner | Do not change infrastructure silently; scope a security/contract review before broader release | Open |
| R-011 | Runtime source failure silently reduces evidence | Static pack fetch/schema/version failure | Study/source owner | Record as contract debt; add explicit partial/error states in an approved phase | Open |
| R-012 | Code license and KJV provenance are unsubstantiated | Broader distribution or public legal claims | CEO | Keep claims unresolved; complete D-004 before relying on them | Open |
| R-013 | Hand-authored study chunks bypass SourcePack v2 validation | Adding or relying on unvalidated runtime source records | Study/source owner | Do not expand bypass; migrate through validated path in an approved contract task | Open |

## Escalation Rule

Escalate a risk when likelihood or impact materially increases, mitigation requires a CEO-reserved decision, evidence invalidates an accepted assumption, or the current task cannot satisfy its contract without crossing the stated boundary. State the evidence, impact, options, recommendation, and smallest decision needed.
