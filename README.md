# ZXL PRD

`zxl-prd` is a Cursor skill for creating, refining, and reviewing decision-ready Product Requirements Documents.

It supports:

- full collaborative authoring, fast drafting, and review modes;
- evidence, assumption, decision, and `TBD` tracking;
- measurable functional and non-functional requirements;
- product metrics with baselines, targets, guardrails, and owners;
- AI-specific evaluation, safety, privacy, latency, and cost requirements;
- deterministic validation and independent reader testing.

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
