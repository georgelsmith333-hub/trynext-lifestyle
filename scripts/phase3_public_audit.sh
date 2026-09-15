#!/usr/bin/env bash
set -u
STORE='https://trynext.pages.dev'
API='https://trynext.pages.dev'
printf 'PUBLIC ROUTES\n'
for path in / /products /categories /design-studio /cart /checkout /track /admin/login /hampers /blog; do
  code=$(curl -L -sS --connect-timeout 15 --max-time 40 -o /dev/null -w '%{http_code}' "$STORE$path" || printf 'ERR')
  printf '%-24s %s\n' "$path" "$code"
done
printf '\nAPI ROUTES\n'
for path in /api/healthz /api/health/liveness /api/health/readiness /api/categories /api/products?limit=100 /api/blog /api/hampers /api/testimonials /api/public-stats /api/announcement /api/sitemap.xml /api/robots.txt; do
  code=$(curl -L -sS --connect-timeout 15 --max-time 45 -o /dev/null -w '%{http_code}' "$API$path" || printf 'ERR')
  printf '%-32s %s\n' "$path" "$code"
done
printf '\nPROTECTED ROUTES\n'
for path in /api/admin/backup/sync-status /api/promo-codes /api/referrals; do
  code=$(curl -L -sS --connect-timeout 15 --max-time 30 -o /dev/null -w '%{http_code}' "$API$path" || printf 'ERR')
  printf '%-40s %s\n' "$path" "$code"
done
printf '\nREPRESENTATIVE ASSETS\n'
for path in /assets/products/bottle_name.png /assets/products/bottle_space.png /assets/products/longsleeve_corporate.png /assets/products/longsleeve_floral.png /assets/products/hoodie_abstract.png /assets/products/bottle_fitness.png /products/main-combo.png /images/product-placeholder.svg; do
  result=$(curl -L -sS --connect-timeout 15 --max-time 30 -o /tmp/trynext_asset_probe -w '%{http_code} %{content_type} %{size_download}' "$STORE$path" || printf 'ERR')
  printf '%-48s %s\n' "$path" "$result"
done
