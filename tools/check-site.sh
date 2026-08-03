#!/usr/bin/env bash
# Structural checks for the Bless Life Services static site.
# Usage: bash tools/check-site.sh [--production]
set -uo pipefail
cd "$(dirname "$0")/.." || exit 1

PRODUCTION=0
[ "${1:-}" = "--production" ] && PRODUCTION=1
fails=0
note() { printf '  %s\n' "$1"; }
fail() { printf 'FAIL  %s\n' "$1"; fails=$((fails + 1)); }
pass() { printf 'ok    %s\n' "$1"; }

pages=$(find . -maxdepth 1 -name '*.html' | sort)

# 1. No-JS fallback: any page using .reveal must keep content visible without JS.
for f in $pages; do
  if grep -q 'class="[^"]*reveal' "$f"; then
    if grep -q '<noscript>' "$f"; then
      pass "no-JS fallback present: $f"
    else
      fail "no-JS fallback missing: $f uses .reveal but has no <noscript>"
    fi
  fi
done

# 2. Exactly one <h1> per page.
for f in $pages; do
  n=$(grep -c '<h1' "$f")
  if [ "$n" -eq 1 ]; then pass "one <h1>: $f"; else fail "$f has $n <h1> (expected 1)"; fi
done

# 3. No duplicate id attributes within a page.
for f in $pages; do
  dupes=$(grep -o 'id="[^"]*"' "$f" | sort | uniq -d)
  if [ -z "$dupes" ]; then pass "unique ids: $f"; else fail "$f duplicate ids: $(echo "$dupes" | tr '\n' ' ')"; fi
done

# 4. Internal page links resolve to a file that exists.
for f in $pages; do
  for target in $(grep -o 'href="[a-z0-9._-]*\.html[^"]*"' "$f" | sed 's/href="//; s/#.*//; s/"//'); do
    if [ -f "$target" ]; then pass "link resolves: $f -> $target"
    else fail "$f links to missing file: $target"; fi
  done
done

# 5. Placeholder inventory.
total=0
for f in $pages README.md; do
  [ -f "$f" ] || continue
  n=$(grep -o '\[[A-Z][A-Z0-9 _—–-]*\]' "$f" | wc -l | tr -d ' ')
  total=$((total + n))
  [ "$n" -gt 0 ] && note "placeholders in $f: $n"
done
note "placeholders total: $total"

# 6. Production gate: no bracketed href may ship live.
if [ "$PRODUCTION" -eq 1 ]; then
  for f in $pages; do
    bad=$(grep -o 'href="\[[^"]*\]"' "$f")
    if [ -z "$bad" ]; then pass "no placeholder links: $f"
    else fail "$f still has placeholder links: $(echo "$bad" | tr '\n' ' ')"; fi
  done
fi

echo
if [ "$fails" -eq 0 ]; then echo "PASS — $total placeholder(s) remaining"; exit 0
else echo "FAILED — $fails problem(s)"; exit 1; fi
