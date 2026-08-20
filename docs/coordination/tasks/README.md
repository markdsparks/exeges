# Task Records

Task records make implementation assignments durable and traceable to an approved objective. Start from [the task-contract template](../../templates/task-contract.md) and use a stable numeric ID plus short slug.

The repository lead accepts the contract, assigns exactly one role and owner, settles dependencies/interfaces, and places the task in the queue. Separate assignments such as implementation and independent review use separate task records. An Implementer may recommend a change but may not silently redefine the contract. Review and integration evidence is appended or linked before the task state becomes `Integrated`; only a met release condition permits `Shipped`.

Each record tracks both a coordination **task state** (`Blocked`, `Ready`, `In progress`, `Review`, `Integrated`, `Shipped`) and a finer **delivery state** (`Proposed`, `Approved`, `In progress`, `Implemented`, `Verified`, `Integrated`, `Shipped`). Independent review follows implementation; successful review permits verification and then integration.

Workers edit a task record only when its ownership boundary explicitly permits it. Otherwise they return the required structured handoff to the lead.
