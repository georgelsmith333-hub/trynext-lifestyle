#!/usr/bin/env bash
set -u
ROOT=/home/ubuntu/trynext-lifestyle
OUT=/tmp/trynext_parallel_release
rm -rf "$OUT" && mkdir -p "$OUT"
(
  cd "$ROOT"
  printf 'HEAD='; git rev-parse HEAD
  printf 'BRANCH='; git branch --show-current
  printf 'STATUS='; git status --porcelain
  gh run list --limit 8 --json databaseId,headSha,status,conclusion,name,workflowName > "$OUT/github_runs.json" 2>&1 || true
) > "$OUT/repo.txt" 2>&1 & p1=$!
(
  set -o pipefail
  curl -L --max-time 45 -sS https://trynext.shop/ -o "$OUT/live.html"
  printf 'HTML_SMART_V4='; grep -o 'smart-v4' "$OUT/live.html" | wc -l
  printf 'HTML_LEGACY='; grep -oE 'source-kit-v3|smart-v3|/mockups/normalized/|normalized-cutouts' "$OUT/live.html" | wc -l
  bundle=$(grep -oE '/assets/index-[A-Za-z0-9_-]+\.js' "$OUT/live.html" | head -1)
  echo "BUNDLE=$bundle"
  curl -L --max-time 45 -sS "https://trynext.shop${bundle}" -o "$OUT/live-bundle.js"
  printf 'BUNDLE_SMART_V4='; grep -o 'smart-v4' "$OUT/live-bundle.js" | wc -l
  printf 'BUNDLE_LEGACY='; grep -oE 'source-kit-v3|smart-v3|/mockups/normalized/|normalized-cutouts' "$OUT/live-bundle.js" | wc -l
) > "$OUT/live.txt" 2>&1 & p2=$!
(
  cd "$ROOT/artifacts/trynex-storefront"
  test -f dist/sw.js
  printf 'DIST_SMART_V4='; grep -Rao 'smart-v4' dist | wc -l
  printf 'DIST_LEGACY='; grep -RaoE 'source-kit-v3|smart-v3|/mockups/normalized/|normalized-cutouts' dist | wc -l
  printf 'DIST_SMART_ASSET_URLS='; grep -RaoE '/mockups/smart-v4/[^" ]+' dist | wc -l
  printf 'DIST_HTML='; test -f dist/index.html && echo 1 || echo 0
) > "$OUT/service_worker.txt" 2>&1 & p3=$!
(
  cd "$ROOT/artifacts/trynex-storefront"
  if [ -f "$ROOT/scripts/e2e_live_flow.spec.mjs" ]; then
    npx playwright test "$ROOT/scripts/e2e_live_flow.spec.mjs" --reporter=line > "$OUT/playwright.txt" 2>&1
  elif [ -f scripts/e2e_live_flow.spec.mjs ]; then
    npx playwright test scripts/e2e_live_flow.spec.mjs --reporter=line > "$OUT/playwright.txt" 2>&1
  else
    echo 'No live Playwright spec found' > "$OUT/playwright.txt"
    exit 2
  fi
) & p4=$!
wait $p1; echo P1=$? > "$OUT/status.txt"
wait $p2; echo P2=$? >> "$OUT/status.txt"
wait $p3; echo P3=$? >> "$OUT/status.txt"
wait $p4; echo P4=$? >> "$OUT/status.txt"
cat "$OUT/status.txt"
for f in repo.txt live.txt service_worker.txt playwright.txt; do echo "===== $f ====="; cat "$OUT/$f" 2>/dev/null || true; done
