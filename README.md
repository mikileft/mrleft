# ZXL PRD

`zxl-prd` is a Cursor skill for creating, refining, and reviewing decision-ready Product Requirements Documents.

It supports:

- full collaborative authoring, fast drafting, and review modes;
- a guided visual workbench for structuring and exporting PRD inputs;
- evidence, assumption, decision, and `TBD` tracking;
- measurable functional and non-functional requirements;
- product metrics with baselines, targets, guardrails, and owners;
- AI-specific evaluation, safety, privacy, latency, and cost requirements;
- deterministic validation and independent reader testing.

## Visual workbench

Once GitHub Pages is enabled for this repository, the continuously deployed
workbench is available at:

```text
https://mikileft.github.io/mrleft/workbench/
```

Changes to `workbench/` on the configured branches are published by
`.github/workflows/deploy-workbench.yml`. The workflow can also be run manually
from the repository's **Actions** tab.

Open `workbench/index.html` directly in a browser, or serve the repository
locally:

```bash
python3 -m http.server 8000
```

Then visit `http://localhost:8000/workbench/`.

The workbench turns the ZXL PRD phases into a seven-step interface. It supports
evidence labeling, requirement and metric editing, readiness tracking, local
autosave, structural checks, live Markdown preview, and Markdown export. Drafts
remain in the browser's local storage; no content is sent to a server.

### Task-based workflow and history

Every PRD belongs to a task. The task center supports:

- creating, switching, progressing, completing, and archiving tasks;
- task-scoped cloud autosave with a local browser cache;
- migrating an existing pre-task local draft;
- immutable version snapshots with change notes;
- previewing and restoring historical versions without deleting later history.

Task drafts and revisions are stored in Cloudflare D1 through the same
single-user access token used by the AI gateway.

### AI co-authoring

Long-form fields include an **AI 共创** action with four tasks:

- identify consequential gaps and ask focused questions;
- draft content from existing facts while preserving assumptions and `TBD`s;
- improve clarity, measurability, and testability;
- review contradictions, unsupported claims, scope gaps, and risks.

AI output never overwrites a field automatically. The user must explicitly
append or replace content after reviewing the suggestion.

The public workbench does not contain a model API key. Deploy the secure,
OpenAI-compatible Cloudflare gateway in [`worker/`](worker/README.md), then use
**配置 AI** in the workbench to save its `/api/assist` endpoint and a separate
workbench access token in the current browser.

## Use as a project skill

The repository includes the skill at:

```text
.cursor/skills/zxl-prd/SKILL.md
```

Open the repository in Cursor and invoke:

```text
/zxl-prd
```

## Test as a local user-level plugin

Clone the repository, then link it into Cursor's local plugin directory:

```bash
mkdir -p ~/.cursor/plugins/local
ln -s /absolute/path/to/mrleft ~/.cursor/plugins/local/zxl-prd
```

Run `Developer: Reload Window`, then verify `ZXL PRD` appears under **Customize** and invoke `/zxl-prd` in a new Agent conversation.

This local installation applies only to that computer. It does not synchronize to Cursor mobile or other devices.

## Cross-device distribution

For personal account-wide installation, publish the plugin through the Cursor Marketplace and install it with user scope. Marketplace submissions must be open source and are manually reviewed.

For private organizational distribution, Teams and Enterprise administrators can import this repository into a Team Marketplace and set the plugin to Default Off, Default On, or Required.

The plugin manifest is located at:

```text
.cursor-plugin/plugin.json
```
