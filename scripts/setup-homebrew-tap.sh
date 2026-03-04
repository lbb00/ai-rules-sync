#!/usr/bin/env bash
set -euo pipefail

SOURCE_REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
FORMULA_SRC="$SOURCE_REPO_ROOT/Formula/ais.rb"
TAP_REPO="${1:-$HOME/code/homebrew-ai-rules-sync}"

if [[ ! -f "$FORMULA_SRC" ]]; then
  echo "Formula source not found: $FORMULA_SRC" >&2
  exit 1
fi

mkdir -p "$TAP_REPO/Formula"

if [[ ! -d "$TAP_REPO/.git" ]]; then
  git init "$TAP_REPO"
fi

cp "$FORMULA_SRC" "$TAP_REPO/Formula/ais.rb"

if [[ ! -f "$TAP_REPO/README.md" ]]; then
  cat > "$TAP_REPO/README.md" <<'README'
# homebrew-ai-rules-sync

Homebrew tap for [ai-rules-sync](https://github.com/lbb00/ai-rules-sync).

## Install

```bash
brew tap lbb00/ai-rules-sync
brew install ais
```
README
fi

echo "Tap repository prepared at: $TAP_REPO"
echo "Formula synced to: $TAP_REPO/Formula/ais.rb"
