# PRD template

Use this as a decision-oriented scaffold. Remove optional sections that do not apply; never fill them with generic text.

# [Product or feature name]

| Field | Value |
| --- | --- |
| Status | Draft / In review / Approved |
| Owner | |
| Approvers | |
| Last updated | YYYY-MM-DD |
| Target release | |
| Related artifacts | Research, designs, analytics, ADRs |

## 1. Executive summary

- **Problem:** What user or business problem exists?
- **Direction:** What change is proposed?
- **Target user:** Who benefits?
- **Scope:** What is included and explicitly excluded?
- **Success:** What measurable outcome determines success?
- **Decision needed:** What should readers approve or resolve?

Write this section last and keep it understandable without the rest of the document.

## 2. Context and evidence

### Background

Explain why this matters now and how the current state works.

### Evidence

| ID | Claim or insight | Type | Source | Confidence |
| --- | --- | --- | --- | --- |
| E-001 | | Fact / Decision / Assumption | Link, dashboard, research, or stakeholder | High / Medium / Low |

### Current user journey

Describe the current path, pain points, workarounds, and failure modes.

## 3. Problem and opportunity

### Problem statement

`[Target user] struggles to [job] because [cause], resulting in [measurable impact].`

### Why now

State the trigger, urgency, or opportunity cost.

### Desired outcome

Describe the changed user or business state without prescribing implementation.

## 4. Users and jobs

### Primary users

For each relevant segment, state context, need, current workaround, and accessibility or localization considerations.

### Jobs or user stories

`As a [user], I want [capability] so that [outcome].`

Include only stories that trace to the problem and scope.

## 5. Goals and success measures

### Goals

List 3–5 outcome-focused goals.

### Non-goals

State what this initiative intentionally will not solve.

### Metrics

| Metric | Baseline | Target | Guardrail | Definition/formula | Window | Source | Owner |
| --- | --- | --- | --- | --- | --- | --- | --- |
| | TBD + measurement plan | | | | | | |

## 6. Scope and user experience

### In scope

- 

### Out of scope

- 

### Deferred

- 

### Future-state user flow

Describe the happy path plus empty, loading, error, permission-denied, cancellation, and recovery states where applicable.

### Design requirements

Record interaction, content, accessibility, responsive behavior, and design-system constraints without dictating unnecessary implementation detail.

## 7. Requirements

### Functional requirements

| ID | Priority | Requirement | Rationale / traceability |
| --- | --- | --- | --- |
| FR-001 | Must | The system shall… | Goal, story, or evidence ID |

### Acceptance criteria

#### FR-001 — [Short title]

- Given [initial state], when [action], then [observable result].
- Given [failure or boundary state], when [action], then [observable recovery or error behavior].

### Non-functional requirements

| ID | Category | Measurable requirement | Verification method |
| --- | --- | --- | --- |
| NFR-001 | Performance / Reliability / Security / Privacy / Accessibility / Scale / Observability | | Test, audit, dashboard, or review |

## 8. AI system requirements

Include only when AI is part of the product.

- **Capability boundary:**
- **Inputs and outputs:**
- **Grounding and tools:**
- **Evaluation dataset:**
- **Quality metrics and pass thresholds:**
- **Latency and cost budgets:**
- **Safety and prohibited behavior:**
- **Human review and escalation:**
- **Privacy and retention:**
- **Fallback and monitoring:**

## 9. Technical and operational considerations

- Architecture boundaries and integration points.
- Data model, migration, and backward compatibility.
- Authentication, authorization, security, privacy, and compliance.
- Analytics and observability.
- Rollout controls, support, and operational ownership.

Record implementation decisions in a linked technical design or ADR when they exceed product requirements.

## 10. Dependencies, risks, and rollout

### Dependencies

| Dependency | Owner | Needed by | Status | Fallback |
| --- | --- | --- | --- | --- |
| | | | | |

### Risks

| Risk | Likelihood | Impact | Mitigation | Trigger / signal | Owner |
| --- | --- | --- | --- | --- | --- |
| | | | | | |

### Rollout and validation

Define phases, eligibility, feature flags, experiment design, monitoring, rollback criteria, and exit criteria.

## 11. Assumptions and open decisions

### Assumptions to validate

| ID | Assumption | Validation method | Decision threshold | Owner | Due |
| --- | --- | --- | --- | --- | --- |
| A-001 | | | | | |

### Open decisions

| ID | Decision | Options / trade-offs | Recommender | Approver | Due |
| --- | --- | --- | --- | --- | --- |
| D-001 | | | | | |

## 12. Appendix

Include glossary, research notes, source links, diagrams, revision history, or detailed calculations that support—but would distract from—the main decision.
