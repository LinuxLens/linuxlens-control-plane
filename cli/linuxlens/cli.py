"""linuxlens CLI entrypoint."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from . import __version__
from .assess import assess_evidence, format_assessment_text
from .collect import (
    collect_host,
    load_evidence_from_archive,
    write_archive,
    write_evidence,
)


def _build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(
        prog="linuxlens",
        description="Read-only Linux estate collector and deterministic risk assessment.",
    )
    p.add_argument("--version", action="version", version=f"linuxlens {__version__}")
    sub = p.add_subparsers(dest="command", required=True)

    c = sub.add_parser("collect", help="Collect host evidence (facts only, read-only)")
    c.add_argument("--output", "-o", type=Path, default=Path("linuxlens-evidence.json"))
    c.add_argument("--archive", type=Path, help="Also write offline tar.gz archive")
    c.add_argument("--mode", choices=["offline", "connected", "relay"], default="offline")
    c.add_argument("--json", action="store_true", help="Print evidence JSON to stdout")

    a = sub.add_parser("assess", help="Collect (optional) and assess a host")
    a.add_argument("target", nargs="?", default="localhost", help="localhost (default)")
    a.add_argument("--from-evidence", type=Path, help="Assess an existing evidence JSON file")
    a.add_argument("--from-archive", type=Path, help="Assess evidence from offline archive")
    a.add_argument("--output", "-o", type=Path, help="Write assessment JSON")
    a.add_argument("--evidence-out", type=Path, default=Path("linuxlens-evidence.json"))
    a.add_argument("--archive", type=Path, help="Write offline archive while collecting")
    a.add_argument("--criticality", choices=["low", "standard", "high", "critical"], default="standard")
    a.add_argument(
        "--maintenance-window",
        choices=["weekly", "monthly", "quarterly", "annual", "none"],
        default=None,
    )
    a.add_argument("--workload", default=None)
    a.add_argument("--json", action="store_true", help="Print assessment JSON instead of text")

    sub.add_parser("version", help="Show version")
    return p


def main(argv: list[str] | None = None) -> int:
    parser = _build_parser()
    args = parser.parse_args(argv)

    if args.command == "version":
        print(__version__)
        return 0

    if args.command == "collect":
        evidence = collect_host(mode=args.mode)
        write_evidence(evidence, args.output)
        if args.archive:
            write_archive(evidence, args.archive)
            print(f"Wrote archive {args.archive}", file=sys.stderr)
        print(f"Wrote evidence {args.output}", file=sys.stderr)
        print(
            f"Collected {evidence.get('host_id')} "
            f"({(evidence.get('os') or {}).get('pretty_name')}) — facts only, no changes made.",
            file=sys.stderr,
        )
        if args.json:
            print(json.dumps(evidence, indent=2))
        return 0

    if args.command == "assess":
        if args.target not in ("localhost", "local", "."):
            print(
                "Only localhost assessment is supported in this open-source release. "
                "Run the collector on each host, or use --from-evidence / --from-archive.",
                file=sys.stderr,
            )
            return 2

        if args.from_archive:
            evidence = load_evidence_from_archive(args.from_archive)
        elif args.from_evidence:
            evidence = json.loads(Path(args.from_evidence).read_text(encoding="utf-8"))
        else:
            evidence = collect_host(mode="offline")
            write_evidence(evidence, args.evidence_out)
            if args.archive:
                write_archive(evidence, args.archive)
                print(f"Wrote archive {args.archive}", file=sys.stderr)
            print(f"Wrote evidence {args.evidence_out}", file=sys.stderr)

        context = {"business_criticality": args.criticality}
        if args.maintenance_window:
            context["maintenance_window"] = args.maintenance_window
        if args.workload:
            context["workload"] = args.workload
        elif evidence.get("workload_hints"):
            context["workload"] = evidence["workload_hints"][0]

        assessment = assess_evidence(evidence, business_context=context)
        if args.output:
            args.output.write_text(json.dumps(assessment, indent=2) + "\n", encoding="utf-8")
            print(f"Wrote assessment {args.output}", file=sys.stderr)

        if args.json:
            print(json.dumps(assessment, indent=2))
        else:
            print(format_assessment_text(evidence, assessment), end="")
        return 0

    parser.print_help()
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
