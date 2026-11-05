#!/usr/bin/env bash
# Apply GitHub repository settings that live in this repo.
#
# 1. Repository settings from .github/repo-settings.json (PATCH /repos/{repo}).
# 2. Rulesets from .github/rulesets/*.json. An existing ruleset with the same
#    name is updated. If the plan does not support rulesets, this step is skipped.
#
# Safe to run more than once.
#
# Usage: scripts/setup-repo.sh [--dry-run] [--repo OWNER/NAME]
# Requires: gh (logged in, admin on the repo), node.

set -euo pipefail

usage() {
  sed -n '2,11p' "$0" | sed 's/^# \{0,1\}//'
}

die() {
  echo "error: $*" >&2
  exit 1
}

warn() {
  echo "warning: $*" >&2
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
settings_file="$root/.github/repo-settings.json"
rulesets_dir="$root/.github/rulesets"
ci_file="$root/.github/workflows/ci.yml"

gh auth status >/dev/null 2>&1 || die "gh is not logged in. Run: gh auth login -h github.com"

if [[ -z "$repo" ]]; then
  repo="$(gh repo view --json nameWithOwner --jq .nameWithOwner)"
fi

permission="$(gh repo view "$repo" --json viewerPermission --jq .viewerPermission)"
[[ "$permission" == "ADMIN" ]] || die "you need ADMIN permission on $repo (you have $permission)"

# Print the value of a top-level JSON field in a file.
json_field() {
  node -e 'const v = JSON.parse(require("fs").readFileSync(process.argv[1], "utf8"))[process.argv[2]];
           process.stdout.write(v === undefined ? "" : String(v))' "$1" "$2"
}

apply_settings() {
  [[ -f "$settings_file" ]] || {
    warn "no ${settings_file#"$root"/}; skipping repository settings"
    return
  }
  local summary
  summary="$(node -e 'const s = JSON.parse(require("fs").readFileSync(process.argv[1], "utf8"));
    console.log(Object.entries(s).map(([k, v]) => `${k}=${JSON.stringify(v)}`).join(", "))' "$settings_file")"

  if [[ $dry_run -eq 1 ]]; then
    echo "[dry-run] would set on $repo: $summary"
    return
  fi
  gh api -X PATCH "repos/$repo" --input "$settings_file" >/dev/null
  echo "done: set on $repo: $summary"
}

apply_rulesets() {
  shopt -s nullglob
  local files=("$rulesets_dir"/*.json)
  if [[ ${#files[@]} -eq 0 ]]; then
    warn "no ruleset files in ${rulesets_dir#"$root"/}; skipping rulesets"
    return
  fi

  local existing
  if ! existing="$(gh api "repos/$repo/rulesets" \
    --jq '.[] | select(.source_type == "Repository") | "\(.id) \(.name)"' 2>&1)"; then
    if [[ "$existing" == *"Upgrade to GitHub Pro"* ]]; then
      warn "the GitHub plan does not support rulesets on $repo (private repo on Free)."
      warn "skipping rulesets. Upgrade to Pro or make the repo public to enable them."
      return
    fi
    die "could not list rulesets: $existing"
  fi

  local file name check checks id action method endpoint
  for file in "${files[@]}"; do
    name="$(json_field "$file" name)"
    [[ -n "$name" ]] || die "$file has no \"name\""

    # Every required status check must be a job in ci.yml, or no PR can ever merge.
    checks="$(node -e '
      const r = JSON.parse(require("fs").readFileSync(process.argv[1], "utf8"));
      for (const rule of r.rules ?? [])
        if (rule.type === "required_status_checks")
          for (const c of rule.parameters.required_status_checks) console.log(c.context);
    ' "$file")"
    for check in $checks; do
      grep -Eq "^  ${check}:" "$ci_file" ||
        die "$file requires check \"$check\", but $ci_file has no job \"$check\""
    done

    id="$(awk -v n="$name" '{ i = $1; $1 = ""; sub(/^ /, ""); if ($0 == n) print i }' <<<"$existing")"
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
}

apply_settings
apply_rulesets
