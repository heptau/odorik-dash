#!/usr/bin/env bash
set -euo pipefail
# =============================================================================
# prepare_release.sh — Bump VERSION, roll CHANGELOG.md's [Unreleased] section
#                       into a dated release entry, build production, commit.
#
# Called by: make release VERSION=X.Y.Z
# =============================================================================

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$DIR/.."

VERSION="${VERSION:?VERSION is required, e.g. make release VERSION=1.1.0}"

if grep -q "^## \[${VERSION}\]" CHANGELOG.md; then
  echo "Error: CHANGELOG.md already has an entry for [${VERSION}]. Did you already" >&2
  echo "prepare this release, or forget to bump VERSION?" >&2
  exit 1
fi

if ! awk '/^## \[Unreleased\]/{f=1; next} /^## \[/{if(f) exit} f{if ($0 !~ /^[[:space:]]*$/) found=1} END{exit !found}' CHANGELOG.md; then
  echo "Error: CHANGELOG.md's [Unreleased] section is empty (or missing). Add" >&2
  echo "changelog entries before releasing." >&2
  exit 1
fi

echo "==> Bumping VERSION to ${VERSION}..."
echo "${VERSION}" > VERSION

echo "==> Rolling CHANGELOG.md's [Unreleased] section into [${VERSION}]..."
DATE="$(date +%Y-%m-%d)"
awk -v ver="$VERSION" -v date="$DATE" '
  /^## \[Unreleased\]/ {
    print "## [Unreleased]"
    print ""
    print "## [" ver "] - " date
    next
  }
  { print }
' CHANGELOG.md > CHANGELOG.md.tmp && mv CHANGELOG.md.tmp CHANGELOG.md

echo "==> Building production bundle for v${VERSION}..."
make clean
make build

echo "==> Committing..."
git add VERSION CHANGELOG.md
git add -A docs
git commit -m "chore(release): v${VERSION}"

echo "==> Prepared release v${VERSION} (committed, not pushed)."
