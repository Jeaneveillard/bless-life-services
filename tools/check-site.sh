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
    if grep -q '<noscript><style>\.reveal{opacity:1!important;transform:none!important}</style></noscript>' "$f"; then
      pass "no-JS fallback present: $f"
    else
      fail "no-JS fallback missing: $f uses .reveal but has no <noscript> override for .reveal"
    fi
  fi
done

# 2. Exactly one <h1> per page.
for f in $pages; do
  n=$(grep -o '<h1' "$f" | wc -l | tr -d ' ')
  if [ "$n" -eq 1 ]; then pass "one <h1>: $f"; else fail "$f has $n <h1> (expected 1)"; fi
done

# 3. No duplicate id attributes within a page.
for f in $pages; do
  dupes=$(grep -o 'id="[^"]*"' "$f" | sort | uniq -d)
  if [ -z "$dupes" ]; then pass "unique ids: $f"; else fail "$f duplicate ids: $(echo "$dupes" | tr '\n' ' ')"; fi
done

# 4. Internal page links resolve to a file that exists.
for f in $pages; do
  for href in $(grep -o 'href="[^"]*"' "$f" | sed 's/^href="//; s/"$//'); do
    case "$href" in
      http://*|https://*|//*|mailto:*|tel:*) continue ;;
    esac
    if ! printf '%s\n' "$href" | grep -q '\.html'; then
      continue
    fi
    if printf '%s\n' "$href" | grep -qE '^[A-Za-z0-9._/-]+\.html'; then
      target=$(printf '%s\n' "$href" | sed 's/#.*//')
      if [ -f "$target" ]; then pass "link resolves: $f -> $target"
      else fail "$f links to missing file: $target"; fi
    else
      fail "$f has an unclassifiable local-looking link: $href"
    fi
  done
done

# 5. Placeholder inventory. Site pages and README.md are counted and
# reported separately — README.md documents placeholder syntax in its own
# text (e.g. this table's examples), so its count never reaches 0 and
# should not be added to the site total or it reads like a stuck counter.
site_total=0
for f in $pages; do
  n=$(grep -o '\[[A-Z][A-Z0-9 _—–-]*\]' "$f" | wc -l | tr -d ' ')
  site_total=$((site_total + n))
  [ "$n" -gt 0 ] && note "placeholders in $f: $n"
done
docs_total=0
if [ -f README.md ]; then
  docs_total=$(grep -o '\[[A-Z][A-Z0-9 _—–-]*\]' README.md | wc -l | tr -d ' ')
  [ "$docs_total" -gt 0 ] && note "placeholders in README.md: $docs_total"
fi
note "site placeholders total: $site_total"
note "docs placeholders total: $docs_total"

# 6. Production gate: no bracketed href may ship live.
if [ "$PRODUCTION" -eq 1 ]; then
  for f in $pages; do
    bad=$(grep -oE '(href|src)="[^"]*\[[A-Z][A-Z0-9 _—–-]*\][^"]*"' "$f")
    if [ -z "$bad" ]; then pass "no placeholder links: $f"
    else fail "$f still has placeholder links: $(echo "$bad" | tr '\n' ' ')"; fi
  done
fi

echo
if [ "$fails" -eq 0 ]; then echo "PASS — $site_total site placeholder(s), $docs_total doc placeholder(s) remaining"; exit 0
else echo "FAILED — $fails problem(s)"; exit 1; fi
