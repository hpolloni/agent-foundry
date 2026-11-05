#!/usr/bin/env bash
# Apply GitHub repository settings that live in this repo.
#
# Creates or updates every ruleset in .github/rulesets/*.json.
# Safe to run more than once: an existing ruleset with the same name is updated.
#
# Usage: scripts/setup-repo.sh [--dry-run] [--repo OWNER/NAME]
# Requires: gh (logged in, admin on the repo), node.

set -euo pipefail

usage() {
  sed -n '2,9p' "$0" | sed 's/^# \{0,1\}//'
}

die() {
  echo "error: $*" >&2
  exit 1
}

dry_run=0
repo=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run) dry_run=1 ;;
    --repo)
      [[ $# -ge 2 ]] || die "--repo needs a value"
      repo="$2"
      shift
      ;;
    -h | --help)
      usage
      exit 0
      ;;
    *) die "unknown argument: $1 (see --help)" ;;
  esac
  shift
done

command -v gh >/dev/null || die "gh is not installed. See https://cli.github.com"
command -v node >/dev/null || die "node is not installed"

root="$(git rev-parse --show-toplevel)"
rulesets_dir="$root/.github/rulesets"
ci_file="$root/.github/workflows/ci.yml"

gh auth status >/dev/null 2>&1 || die "gh is not logged in. Run: gh auth login -h github.com"

if [[ -z "$repo" ]]; then
  repo="$(gh repo view --json nameWithOwner --jq .nameWithOwner)"
fi

permission="$(gh repo view "$repo" --json viewerPermission --jq .viewerPermission)"
[[ "$permission" == "ADMIN" ]] || die "you need ADMIN permission on $repo (you have $permission)"

visibility="$(gh repo view "$repo" --json visibility --jq .visibility)"
if [[ "$visibility" == "PRIVATE" ]]; then
  echo "warning: $repo is private. On the GitHub Free plan, rulesets are not enforced" >&2
  echo "         on private repositories. A Pro, Team, or Enterprise plan is necessary." >&2
fi

shopt -s nullglob
files=("$rulesets_dir"/*.json)
[[ ${#files[@]} -gt 0 ]] || die "no ruleset files in $rulesets_dir"

for file in "${files[@]}"; do
  name="$(node -e 'process.stdout.write(JSON.parse(require("fs").readFileSync(process.argv[1], "utf8")).name)' "$file")"
  [[ -n "$name" ]] || die "$file has no \"name\""

  # Every required status check must be a job in ci.yml, or no PR can ever merge.
  checks="$(node -e '
    const r = JSON.parse(require("fs").readFileSync(process.argv[1], "utf8"));
    for (const rule of r.rules ?? [])
      if (rule.type === "required_status_checks")
        for (const c of rule.parameters.required_status_checks) console.log(c.context);
  ' "$file")"
  for check in $checks; do
    grep -Eq "^  ${check}:" "$ci_file" || die "$file requires check \"$check\", but $ci_file has no job \"$check\""
  done

  id="$(gh api "repos/$repo/rulesets" \
    --jq ".[] | select(.name == \"$name\" and .source_type == \"Repository\") | .id")"

  if [[ -n "$id" ]]; then
    action="update ruleset \"$name\" (id $id)"
    method=PUT
    endpoint="repos/$repo/rulesets/$id"
  else
    action="create ruleset \"$name\""
    method=POST
    endpoint="repos/$repo/rulesets"
  fi

  if [[ $dry_run -eq 1 ]]; then
    echo "[dry-run] would $action on $repo from ${file#"$root"/}"
    continue
  fi

  gh api -X "$method" "$endpoint" --input "$file" >/dev/null
  echo "done: $action on $repo"
done
