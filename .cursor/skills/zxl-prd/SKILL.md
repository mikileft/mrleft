---
name: zxl-prd
description: Create, refine, or review decision-ready Product Requirements Documents through structured discovery, measurable requirements, iterative co-authoring, deterministic quality checks, and independent reader testing. Use when the user asks to 写PRD, 创建产品需求文档, 梳理产品需求, define product requirements, plan a feature, turn an idea into a specification, or review an existing PRD.
---

# High-Quality PRD

Create a PRD that aligns decision-makers and gives delivery teams testable requirements without inventing missing facts.

## Operating principles

1. Start with the problem and desired outcome, not a feature list.
2. Separate verified facts, assumptions, decisions, and unknowns.
3. Make every requirement observable and testable.
4. Preserve user agency: confirm consequential choices instead of silently deciding.
5. Prefer concise, decision-relevant content over generic completeness.
6. Never start implementation while authoring or reviewing a PRD.

## Working approach

Use one continuous workflow from discovery through delivery. Adapt questions to
the available context without asking the user to choose a writing mode. When an
existing PRD is provided, assess its gaps before proposing edits and preserve
its valid content. Keep unresolved information as `TBD`; never fabricate it to
make a draft appear complete.

## Optional visual workbench

The canonical workflow definition is
[`config/workflow.json`](config/workflow.json). It defines the seven stages,
linear questions, state defaults, stable checklist IDs, structural validation,
and AI actions. Consult the generated human-readable map in
[`references/workflow.generated.md`](references/workflow.generated.md).

After changing the canonical configuration, run:

```bash
python3 .cursor/skills/zxl-prd/scripts/sync_workflow.py
```

Do not edit the generated browser, Worker, or reference files directly.

This repository includes a zero-dependency visual companion at
[`workbench/index.html`](../../../workbench/index.html). Use it when the user
wants to organize PRD inputs through a guided interface before or alongside
Agent co-authoring.

The interface stores task drafts and versions in Cloudflare D1 with a local
browser cache, and exports Markdown for subsequent Agent review. It does not
replace source verification, judgment-based review, the deterministic
validator, or independent reader testing. Treat exported content as user
input: preserve its evidence labels, surface unresolved `TBD` items, and
continue the structured workflow.

When the optional AI gateway is configured, the workbench can ask questions,
draft from existing context, rewrite a selected field, and review gaps. AI
suggestions are candidates, not facts or decisions. Require explicit user
acceptance before inserting them, retain `Assumption` and `TBD` labels, and
never infer approval from the user accepting improved wording.

The workbench organizes all PRD activity by task. Treat each task as an
independent product decision context: do not mix evidence, requirements,
metrics, or decisions across tasks. Draft autosaves are mutable working state;
named versions are immutable checkpoints. Restoring a version must create a new
checkpoint so later history remains traceable.

The workbench entry flow is task-first. Before showing the PRD editor, require
the user to select a historical task or create a new task. For a historical
task, expose the next action only after selection: continue editing, inspect
versions, or archive. A new task enters Phase 1 directly after creation.

Within a task, present the seven phases as a linear journey with the active
phase goal and guidance at the top of the page. Present one configured question
at a time and preserve the stable question cursor when autosaving.

## Phase 1: Establish the document contract

Before drafting, determine:

1. Product or feature and the core problem.
2. Primary audience and decision the PRD must enable.
3. Target users and their current workaround.
4. Business and user outcomes.
5. Constraints: schedule, budget, technology, policy, privacy, accessibility, and operations.
6. Existing template, evidence, research, designs, analytics, or prior decisions.

Accept shorthand, unstructured notes, files, and links. Read relevant project files or connected sources when available and authorized.

Do not draft until at least the problem, audience, target user, desired outcome, and major constraints are understood. Unresolved items must remain explicitly marked `TBD`.

## Phase 2: Build the evidence map

Track important inputs using these labels:

- **Fact**: supported by a cited source or user confirmation.
- **Decision**: explicitly chosen by an accountable stakeholder.
- **Assumption**: plausible but unverified; include a validation plan.
- **TBD**: unresolved and assigned an owner or next action when possible.

Never turn an assumption into a fact through confident wording. For externally verifiable claims, record the source and retrieval date. For internal claims, identify the document, dashboard, interview, or stakeholder that supports them.

After the initial context dump, ask 5–10 numbered questions focused on consequential gaps, edge cases, and trade-offs. Avoid asking for information already provided.

## Phase 3: Frame before specifying

Confirm a compact product frame:

- Problem statement and why it matters now.
- Target users and jobs or needs.
- Current behavior or workaround.
- Desired outcome and measurable success.
- In scope, out of scope, and deferred.
- Key user journey, including failure and recovery paths.
- Dependencies, constraints, and unresolved decisions.

If solution details are premature, keep them as hypotheses. Challenge requirements that do not connect to the stated problem or outcome.

## Phase 4: Co-author the PRD

Use the structure in [references/prd-template.md](references/prd-template.md). Adapt optional sections to the initiative; do not add empty ceremonial sections.

1. Propose the section plan and ask for confirmation.
2. Start with the section containing the most uncertainty; write the executive summary last.
3. For each section:
   - ask focused questions;
   - offer candidate content or trade-offs;
   - let the user keep, remove, combine, or revise items;
   - draft only the agreed content;
   - apply targeted edits until accepted.
4. Re-read the whole document for consistency after all sections are drafted.

### Requirement quality rules

- Give each functional requirement a stable ID: `FR-001`, `FR-002`, and so on.
- State priority using `Must`, `Should`, or `Could`; do not label everything `Must`.
- Describe behavior, trigger, expected result, and relevant error or recovery behavior.
- Link requirements to user stories or outcomes where useful.
- Write acceptance criteria as binary pass/fail statements. Use Given/When/Then when state transitions matter.
- Cover applicable non-functional requirements with measurable thresholds: performance, availability, scale, security, privacy, accessibility, localization, observability, and supportability.
- Avoid vague adjectives such as “fast”, “easy”, “intuitive”, “robust”, and “seamless” unless followed by a measurable definition.

### Metric quality rules

Each primary success metric should include:

- metric name and rationale;
- baseline, or `TBD` with a measurement plan;
- target and guardrail;
- formula or precise definition;
- evaluation window;
- data source;
- accountable owner.

Do not invent baselines or targets. Clearly label proposed values as assumptions requiring approval.

### AI feature requirements

When AI is part of the product, also define:

- model or capability boundaries;
- input/output contract and prohibited outputs;
- grounding and tool requirements;
- evaluation dataset and quality metrics;
- latency and cost budgets;
- human oversight and escalation;
- safety, privacy, retention, and prompt-injection controls;
- fallback behavior and monitoring.

## Phase 5: Validate

Run the deterministic validator when a Markdown PRD file exists:

```bash
python3 .cursor/skills/zxl-prd/scripts/validate_prd.py path/to/prd.md
```

Then apply the judgment-based review in [references/quality-checklist.md](references/quality-checklist.md). The script finds structural signals; it does not prove that the product reasoning is correct.

Report findings by severity:

- **Blocker**: prevents a reliable product or implementation decision.
- **Major**: likely to cause scope, UX, measurement, or delivery failure.
- **Minor**: clarity or maintainability improvement.

Fix Blockers and Majors or retain them in an explicit open-decisions section with owners.

## Phase 6: Independent reader test

Use a fresh subagent with only the PRD content and this task:

1. Answer 5–10 realistic questions a product, design, engineering, QA, security, or leadership reader would ask.
2. Identify ambiguities, contradictions, unsupported assumptions, missing edge cases, and hidden implementation decisions.
3. State whether the document supports a go/no-go or scope decision.

Do not give the subagent conversation context that the document itself does not contain. Summarize failures, revise affected sections, and repeat until no new Blocker or Major issue appears.

If subagents are unavailable, provide the questions and ask the user to test them in a fresh conversation.

## Phase 7: Deliver

Lead with a summary under 150 words containing:

- the problem and proposed direction;
- scope boundary;
- primary success measure;
- unresolved Blockers or decisions.

Then provide or update the PRD file. Also report:

- assumptions requiring validation;
- open decisions with owners;
- validation result;
- recommended next action.

Before declaring completion, remind the owner to verify facts, links, targets, legal/compliance claims, and stakeholder approval.
