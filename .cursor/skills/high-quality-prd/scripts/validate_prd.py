#!/usr/bin/env python3
"""Run deterministic structural checks on a Markdown PRD."""

from __future__ import annotations

import argparse
import re
import sys
from collections import Counter
from pathlib import Path


SECTION_RULES = {
    "problem": r"问题|problem",
    "users": r"用户|users?|persona|jobs?",
    "goals": r"目标|goals?|success|成功",
    "scope": r"范围|scope|non-goals?",
    "requirements": r"需求|requirements?",
    "risks": r"风险|risks?",
    "open decisions": r"待决|open decisions?|未决|assumptions?|假设",
}

VAGUE_TERMS = (
    "快速",
    "简单",
    "易用",
    "直观",
    "稳定",
    "无缝",
    "高性能",
    "fast",
    "easy",
    "intuitive",
    "robust",
    "seamless",
    "high-performance",
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("prd", type=Path, help="Path to the Markdown PRD")
    return parser.parse_args()


def line_number(text: str, position: int) -> int:
    return text.count("\n", 0, position) + 1


def main() -> int:
    args = parse_args()
    if not args.prd.is_file():
        print(f"ERROR: file not found: {args.prd}")
        return 2

    text = args.prd.read_text(encoding="utf-8")
    errors: list[str] = []
    warnings: list[str] = []

    if not re.search(r"(?m)^#\s+\S", text):
        errors.append("Missing level-one document title.")

    headings = "\n".join(re.findall(r"(?m)^#{2,6}\s+(.+)$", text))
    for label, pattern in SECTION_RULES.items():
        if not re.search(pattern, headings, flags=re.IGNORECASE):
            errors.append(f"Missing section signal: {label}.")

    requirement_matches = list(re.finditer(r"\b(FR|NFR)-(\d{3})\b", text))
    requirement_ids = [match.group(0) for match in requirement_matches]
    duplicates = sorted(
        requirement_id
        for requirement_id, count in Counter(requirement_ids).items()
        if count > 1
    )
    if duplicates:
        # Repeated IDs are normal in acceptance-criteria headings. Flag unusually
        # frequent repetitions while keeping ordinary traceability visible.
        excessive = [
            requirement_id
            for requirement_id in duplicates
            if requirement_ids.count(requirement_id) > 3
        ]
        if excessive:
            warnings.append(
                "Requirement IDs appear more than three times; check accidental "
                f"duplicates: {', '.join(excessive)}."
            )

    if not any(requirement_id.startswith("FR-") for requirement_id in requirement_ids):
        errors.append("No functional requirement IDs found (expected FR-001 format).")

    acceptance_signal = re.search(
        r"(?i)acceptance criteria|验收标准|given.+when.+then|给定.+当.+则",
        text,
        flags=re.DOTALL,
    )
    if not acceptance_signal:
        errors.append("No acceptance-criteria signal found.")

    for match in re.finditer(r"\bTBD\b|待定", text, flags=re.IGNORECASE):
        warnings.append(
            f"Line {line_number(text, match.start())}: unresolved TBD; assign an "
            "owner or next action."
        )

    for line_no, line in enumerate(text.splitlines(), start=1):
        lowered = line.lower()
        if any(term in lowered for term in VAGUE_TERMS):
            if not re.search(r"\d|≤|≥|<|>|百分|percent|ms|秒|分钟|小时|天", line):
                warnings.append(
                    f"Line {line_no}: possibly vague wording without a measurable "
                    f"threshold: {line.strip()[:120]}"
                )

    metric_header = re.search(r"(?im)^#{2,6}\s+.*(?:metrics?|指标|度量)", text)
    if not metric_header:
        warnings.append("No explicit metrics heading found.")

    print(f"Validated: {args.prd}")
    print(f"Errors: {len(errors)}; Warnings: {len(warnings)}")
    for issue in errors:
        print(f"ERROR: {issue}")
    for issue in warnings:
        print(f"WARNING: {issue}")

    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main())
