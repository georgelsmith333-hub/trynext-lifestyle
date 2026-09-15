#!/usr/bin/env bash
#
# Render orchestrator for the Trynext 4-Render multi-route topology.
#
# Modes:
#   inventory                list owners + services + roles/deploy state (default)
#   apply [target]           promote target as PRIMARY: copy env/secrets from the
#                            old primary, set TRYNEXT_RUNTIME_ROLE=primary, disable
#                            backup sync, deploy, verify readiness, print summary
#
# Environment:
#   RENDER_API_KEY   required (set as a GitHub Actions secret; never logged)
#   APPLY_TARGET     optional service id/name/URL (default: newest Trynext service)
#   SOURCE_PRIMARY   optional service id/name to copy env from (default: trynext-api)
#
# Never prints RENDER_API_KEY or secret env values.

set -euo pipefail

API="https://api.render.com/v1"
AUTH_HEADER="Authorization: Bearer ${RENDER_API_KEY:?RENDER_API_KEY is required}"

mask_value() {
  local key="$1" value="$2"
  if echo "$key" | grep -qiE 'SECRET|TOKEN|KEY|PASSWORD|DATABASE|REDIS|BUCKET|ACCOUNT|WEBHOOK|CHAT|CREDENTIAL|SIGNING|PRIVATE'; then
    printf '*** (masked: %s chars) ***' "${#value}"
  else
    printf '%s' "$value"
  fi
}

api() {
  curl -fsS --max-time 30 -H "$AUTH_HEADER" "$API$1"
}

services_json() {
  local owner_id="$1"
  api "/services?ownerId=${owner_id}&limit=100"
}

service_env() {
  local service_id="$1"
  api "/services/${service_id}/env-vars" | jq -r '.envVars[]?.envVar // .envVars[]? // empty | {key, value}'
}

last_deploy() {
  local service_id="$1"
  api "/services/${service_id}/deploys?limit=1" | jq -r '.deploys[0].status // "none"'
}

role_of() {
  local service_id="$1"
  service_env "$service_id" | jq -r 'select(.key=="TRYNEXT_RUNTIME_ROLE") | .value // "unset"' 2>/dev/null | head -1
}

fmt_service() {
  local s="$1" env_src="$2" deploy_status="$3"
  local id name url repo branch plan region suspended created role
  id=$(echo "$s" | jq -r '.id')
  name=$(echo "$s" | jq -r '.name')
  url=$(echo "$s" | jq -r '.serviceDetails.url // .serviceDetails.publicUrl // empty')
  repo=$(echo "$s" | jq -r '.serviceDetails.repo // empty')
  branch=$(echo "$s" | jq -r '.serviceDetails.branch // empty')
  plan=$(echo "$s" | jq -r '.plan // empty')
  region=$(echo "$s" | jq -r '.region // empty')
  suspended=$(echo "$s" | jq -r '.suspended')
  created=$(echo "$s" | jq -r '.createdAt')
  role=$(echo "$env_src" | jq -r 'select(.key=="TRYNEXT_RUNTIME_ROLE") | .value // ""' | head -1)
  printf -- '- id=%s\n  name=%s\n  url=%s\n  repo=%s:%s plan=%s region=%s suspended=%s\n  created=%s role=%s lastDeploy=%s\n' \
    "$id" "$name" "$url" "$repo" "$branch" "$plan" "$region" "$suspended" "$created" "${role:-unset}" "$deploy_status"
}

find_service() {
  local query="$1"; [ -z "$query" ] && return 1
  echo "$ALL_SERVICES" | jq -r --arg q "$query" '
    .services[]? | select(
      .id == $q or .name == $q or (.serviceDetails.url // "") == $q or (.serviceDetails.publicUrl // "") == $q
    )' | head -1
}

# ── 1. Owners ────────────────────────────────────────────────────────────────
OWNERS_JSON=$(api "/owners")
OWNER_ID=$(echo "$OWNERS_JSON" | jq -r '.owner.id // .[0].owner.id // empty')
if [ -z "$OWNER_ID" ]; then
  echo "ERROR: could not determine Render owner"; echo "$OWNERS_JSON" | head -c 500; exit 1
fi
echo "== owner: $(echo "$OWNERS_JSON" | jq -r '.owner.name // .[0].owner.name // "unknown"') (id=$OWNER_ID)"

# ── 2. Inventory ─────────────────────────────────────────────────────────────
ALL_SERVICES=$(services_json "$OWNER_ID")
COUNT=$(echo "$ALL_SERVICES" | jq '.services | length')
echo "== services: $COUNT"
echo "$ALL_SERVICES" | jq -c '.services[] | {id,name,createdAt,suspended}' | while read -r s; do
  sid=$(echo "$s" | jq -r '.id')
  echo "$s" | jq -c '.' | sed "s/^/service id=$sid /"
done

while read -r s; do
  [ -z "$s" ] && continue
  sid=$(echo "$s" | jq -r '.id')
  sname=$(echo "$s" | jq -r '.name')
  case "$sname" in
    trynext*)
      fmt_service "$s" "$(service_env "$sid")" "$(last_deploy "$sid")"
      ;;
  esac
done < <(echo "$ALL_SERVICES" | jq -c '.services[] | select(.name | test("trynext|api"; "i"))')

# ── 3. Target selection ──────────────────────────────────────────────────────
TARGET_JSON=$(find_service "${APPLY_TARGET:-}")
if [ -z "$TARGET_JSON" ]; then
  TARGET_JSON=$(echo "$ALL_SERVICES" | jq -c '[.services[] | select(.name | test("trynext"; "i"))] | sort_by(.createdAt) | reverse | .[0] // empty')
fi
if [ -z "$TARGET_JSON" ] || [ "$TARGET_JSON" = "null" ]; then
  echo "ERROR: no Trynext service found to target"; exit 1
fi
TARGET_ID=$(echo "$TARGET_JSON" | jq -r '.id')
TARGET_NAME=$(echo "$TARGET_JSON" | jq -r '.name')
TARGET_URL=$(echo "$TARGET_JSON" | jq -r '.serviceDetails.url // .serviceDetails.publicUrl // empty')
echo "== selected target: $TARGET_NAME ($TARGET_ID) -> ${TARGET_URL:-no-URL}"

# ── 4. Apply (promotion) ─────────────────────────────────────────────────────
if [ "${APPLY:-false}" = "true" ]; then
  echo "== APPLY: promoting ${TARGET_NAME} to PRIMARY"

  SOURCE_ID=$(find_service "${SOURCE_PRIMARY:-trynext-api}" | jq -r '.id // empty')
  if [ -z "$SOURCE_ID" ]; then
    SOURCE_ID=$(echo "$ALL_SERVICES" | jq -r --arg n "${SOURCE_PRIMARY:-trynext-api}" '[.services[] | select(.name==$n)] | .[0].id // empty')
  fi
  echo "== env source: ${SOURCE_ID:-<none>} (old primary)"

  PAYLOAD_JSON='[]'
  if [ -n "$SOURCE_ID" ]; then
    PAYLOAD_JSON=$(service_env "$SOURCE_ID" | jq -c '[.key, .value] | @base64' | while read -r b64; do
      key=$(echo "$b64" | base64 -d | jq -r '.[0]')
      value=$(echo "$b64" | base64 -d | jq -r '.[1]')
      case "$key" in
        PORT|TRYNEXT_RUNTIME_ROLE|SCHEDULER_ENABLED|BACKUP_SYNC_ENABLED|RENDER_API_KEY) continue ;;
      esac
      jq -cn --arg k "$key" --arg v "$value" '{key:$k, value:$v}'
    done)
    echo "  copied env keys: $(echo "$PAYLOAD_JSON" | jq -r '.[].key' | sort | tr '\n' ' ')"
  fi

  # Force the explicit primary contract on the target.
  SCHED_VALUE=$(if [ -n "$SOURCE_ID" ]; then service_env "$SOURCE_ID" | jq -r 'select(.key=="SCHEDULER_ENABLED") | .value' | head -1; fi)
  SCHED_VALUE=${SCHED_VALUE:-"true"}
  PAYLOAD_JSON=$(echo "$PAYLOAD_JSON" | jq -c \
    --arg role "primary" --arg sched "$SCHED_VALUE" \
    '. + [ {key:"TRYNEXT_RUNTIME_ROLE", value:$role}, {key:"SCHEDULER_ENABLED", value:$sched}, {key:"BACKUP_SYNC_ENABLED", value:"false"} ]')

  echo "  applying env vars (values masked)..."
  ENV_RESP=$(curl -fsS --max-time 60 -X POST -H "$AUTH_HEADER" -H "Content-Type: application/json" \
    -d "$(echo "$PAYLOAD_JSON" | jq -c '{envVars: .}')" \
    "$API/services/${TARGET_ID}/env-vars" || true)
  echo "  env apply response: $(echo "${ENV_RESP:-<empty>}" | jq -c '{status: .status // "ok"}' 2>/dev/null || echo "$ENV_RESP")"

  echo "  triggering deploy on ${TARGET_NAME}..."
  DEPLOY_RESP=$(curl -fsS --max-time 60 -X POST -H "$AUTH_HEADER" -H "Content-Type: application/json" \
    -d '{"clearCache": false, "git": {"branch": "main", "ref": "main"}}' \
    "$API/services/${TARGET_ID}/deploys" 2>/dev/null \
    || curl -fsS --max-time 60 -X POST -H "$AUTH_HEADER" -H "Content-Type: application/json" \
      -d '{"clearCache": false}' "$API/services/${TARGET_ID}/deploys")
  DEPLOY_ID=$(echo "$DEPLOY_RESP" | jq -r '.deploy.id // empty')
  echo "  deploy id: ${DEPLOY_ID:-<none>}"

  if [ -n "$DEPLOY_ID" ]; then
    for i in $(seq 1 40); do
      sleep 15
      STATUS=$(api "/services/${TARGET_ID}/deploys/${DEPLOY_ID}" | jq -r '.deploy.status')
      echo "  deploy status: $STATUS"
      case "$STATUS" in
        live) break ;;
        build_failed|update_failed|canceled|deactivated) echo "  FAILED deploy"; break ;;
      esac
    done
  fi

  if [ -n "$TARGET_URL" ]; then
    echo "  probing ${TARGET_URL}/api/health/readiness ..."
    for i in 1 2 3 4 5; do
      if READY=$(curl -fsS --max-time 45 "${TARGET_URL}/api/health/readiness" 2>/dev/null); then
        echo "  readiness: $READY"
        break
      fi
      sleep 12
    done
    echo "  probing ${TARGET_URL}/api/sitemap.xml ..."
    SITEMAP_STATUS=$(curl -sS -o /dev/null -w '%{http_code}' --max-time 45 "${TARGET_URL}/api/sitemap.xml" || echo 000)
    echo "  sitemap http: $SITEMAP_STATUS"
  fi
else
  echo "== DRY RUN (APPLY != true) — no environment changes or deploys performed"
fi

# ── 5. Machine-readable summary ──────────────────────────────────────────────
SUM_READS=$(echo "$ALL_SERVICES" | jq -c '[.services[] | select(.name | test("standby"; "i")) | {id, name, url: (.serviceDetails.url // .serviceDetails.publicUrl // "")}]')
SUM_PRIMARY=$(echo "$ALL_SERVICES" | jq -c --arg id "$TARGET_ID" '[.services[] | select(.id==$id) | {id, name, url: (.serviceDetails.url // .serviceDetails.publicUrl // "")}][0]')
{
  echo "### RENDER_SUMMARY_JSON_BEGIN"
  jq -cn --argjson primary "$SUM_PRIMARY" --argjson reads "$SUM_READS" \
    '{primary: $primary, reads: $reads}'
  echo "### RENDER_SUMMARY_JSON_END"
} >&2
echo "== done"
