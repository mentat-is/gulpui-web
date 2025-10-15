#!/usr/bin/env bash
set -euo pipefail

MAJOR_MINOR_FILE="${MAJOR_MINOR_FILE:-VERSION}"
if [[ -n "${1:-}" && "${1}" == "--help" ]]; then
  echo "env MAJOR_MINOR_FILE=VERSION"
  exit 0
fi

if [[ ! -f "${MAJOR_MINOR_FILE}" ]]; then
  echo "VERSION file missing"
  exit 1
fi

MM_RAW="$(cat "${MAJOR_MINOR_FILE}" | tr -d '[:space:]')"
if [[ ! "${MM_RAW}" =~ ^[0-9]+\.[0-9]+$ ]]; then
  echo "VERSION must be MAJOR.MINOR"
  exit 1
fi

MAJOR="${MM_RAW%%.*}"
MINOR="${MM_RAW##*.}"

git fetch --tags --force >/dev/null 2>&1 || true

BRANCH="${GITHUB_REF_NAME:-$(git rev-parse --abbrev-ref HEAD)}"
BRANCH="${BRANCH//\//-}"
BRANCH="${BRANCH//[^A-Za-z0-9._-]/-}"

PREFIX="${BRANCH}_${MAJOR}.${MINOR}."
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

git tag -a "${NEW_TAG}" -m "${NEW_TAG}"

echo "${NEW_TAG}"
if [[ -n "${GITHUB_OUTPUT:-}" ]]; then
  {
    echo "version=${NEW_TAG}"
    echo "major=${MAJOR}"
    echo "minor=${MINOR}"
    echo "fix=${NEXT_FIX}"
    echo "branch=${BRANCH}"
  } >> "$GITHUB_OUTPUT"
fi

if [[ "${PUSH_TAGS:-1}" == "1" ]]; then
  git push --tags
fi
