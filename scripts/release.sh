#!/usr/bin/env bash
set -euo pipefail

usage() {
  echo "Usage: $0 --major N --minor N [--push] [--dry-run]"
  exit 2
}

MAJOR=""
MINOR=""
PUSH=false
DRY=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    --major) MAJOR="${2:-}"; shift 2 ;;
    --minor) MINOR="${2:-}"; shift 2 ;;
    --push)  PUSH=true; shift ;;
    --dry-run) DRY=true; shift ;;
    *) usage ;;
  esac
done

[[ -n "$MAJOR" && -n "$MINOR" ]] || usage
[[ "$MAJOR" =~ ^[0-9]+$ ]] || { echo "major must be integer"; exit 1; }
[[ "$MINOR" =~ ^[0-9]+$ ]] || { echo "minor must be integer"; exit 1; }

# полная история тэгов
git fetch --tags --force >/dev/null 2>&1 || true

PREFIX="v${MAJOR}.${MINOR}."
# найти максимальный fix среди тегов v{major}.{minor}.*
LATEST_FIX=$(
  git tag -l "${PREFIX}*" \
  | sed -nE "s/^${PREFIX}([0-9]+)$/\1/p" \
  | sort -n | tail -n1
)

if [[ -z "${LATEST_FIX:-}" ]]; then
  NEXT_FIX=0
else
  NEXT_FIX=$((LATEST_FIX + 1))
fi

NEW_TAG="${PREFIX}${NEXT_FIX}"

if $DRY; then
  echo "${NEW_TAG}"
  exit 0
fi

# создать аннотированный тег
git tag -a "${NEW_TAG}" -m "release ${NEW_TAG}"

# вывод для локальных скриптов / GitHub Actions
echo "${NEW_TAG}"
if [[ -n "${GITHUB_OUTPUT:-}" ]]; then
  {
    echo "version=${NEW_TAG}"
    echo "major=${MAJOR}"
    echo "minor=${MINOR}"
    echo "fix=${NEXT_FIX}"
  } >> "$GITHUB_OUTPUT"
fi

$PUSH && git push --tags
