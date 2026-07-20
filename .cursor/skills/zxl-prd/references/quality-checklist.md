# PRD quality checklist

Use this after drafting. A checked box requires evidence in the document, not confidence from the conversation.

## Decision readiness

- [ ] The requested decision and accountable approver are explicit.
- [ ] The problem, urgency, target users, and desired outcome are clear.
- [ ] Scope, non-goals, and deferred work prevent plausible scope misunderstandings.
- [ ] Blockers and unresolved decisions have owners or next actions.

## Evidence integrity

- [ ] Material claims are sourced or labeled as assumptions.
- [ ] Proposed baselines and targets are not presented as verified facts.
- [ ] Facts, decisions, assumptions, and `TBD` items are distinguishable.
- [ ] Research dates, sample limitations, and confidence are visible when relevant.
- [ ] No unsupported market, legal, security, or compliance claim is stated as fact.

## User and product reasoning

- [ ] Primary users, context, jobs, and current workarounds are specific.
- [ ] The proposed direction addresses the stated root cause, not only a symptom.
- [ ] Key trade-offs and rejected alternatives are understandable.
- [ ] The future-state journey includes failure, boundary, and recovery states.
- [ ] Accessibility and localization implications are considered where applicable.

## Requirements

- [ ] Functional requirements have stable IDs and justified priorities.
- [ ] Each `Must` requirement traces to a goal, story, constraint, or risk.
- [ ] Acceptance criteria are binary, observable, and implementation-independent.
- [ ] Permission, empty, loading, error, cancellation, concurrency, and retry behavior are covered where relevant.
- [ ] Non-functional requirements use measurable thresholds and verification methods.
- [ ] Requirements do not contradict scope, non-goals, or one another.

## Measurement

- [ ] Primary metrics reflect outcomes rather than shipping activity.
- [ ] Each primary metric has a definition, baseline or measurement plan, target, window, source, and owner.
- [ ] Guardrails cover likely negative side effects.
- [ ] Experiment or rollout exit criteria support a clear continue, iterate, or stop decision.

## Delivery and operations

- [ ] Dependencies have owners, status, timing, and fallback plans.
- [ ] Risks include mitigations, observable triggers, and owners.
- [ ] Rollout includes eligibility, monitoring, rollback criteria, and support ownership.
- [ ] Security, privacy, data retention, observability, and migration implications are addressed where applicable.
- [ ] Product requirements avoid silently locking unnecessary implementation choices.

## AI-specific checks

Apply only when AI is part of the product:

- [ ] Capability limits and prohibited outputs are explicit.
- [ ] Evaluation data represents intended users and important failure modes.
- [ ] Quality, latency, and cost thresholds are measurable.
- [ ] Grounding, citations, fallback, human escalation, and monitoring are defined.
- [ ] Prompt injection, sensitive data, retention, and model-provider risks are addressed.

## Reader test

- [ ] A fresh reader can explain the problem, user, scope, direction, and success measure.
- [ ] Product, design, engineering, QA, security, operations, and leadership questions are answerable or explicitly open.
- [ ] Independent review found no unresolved Blocker or Major ambiguity.
- [ ] The executive summary is consistent with the detailed requirements.
- [ ] Generic filler and duplicated content have been removed.
