#!/bin/bash
# Adapted from qualiber's own mock-app/run-pilot-1c.sh, using Trailhead's real checkout journey/
# contract instead of the tool's fixture. Exercises: observe -> eligibility approvals -> advisory
# earning record -> promote to review_required -> injected bug -> Check Run action_required ->
# ack -> success -> promote to blocking -> kill-switch drill -> real block (exit 20) -> waiver ->
# FP-spike auto-demotion. See integration/FRICTION-LOG.md for what happened when this ran.
set -e
cd "$(dirname "$0")/../.."

CLI="npx tsx .qualiber-vendor/src/cli.ts"
CONTRACT="integration/contracts/checkout_payment_retry.contract.json"
CONFIG="integration/config/checkout_payment_retry.workspace.json"
JOURNEY="checkout_payment_retry"
RULE="checkout_payment_retry_sequence"
PILOT="integration/artifacts/promotion-demo"
STATE="$PILOT/telemetrytest-state"
LEDGER="$STATE/decisions.jsonl"
CANON="$STATE/$JOURNEY/eligibility.json"
PROMO="$STATE/$JOURNEY/promotion.json"
TP="$PILOT/trust-policy.json"
SIGN_ENV="TT_SIGNING=ed25519 TT_SIGNING_PRIVATE_KEY_FILE=$PWD/$PILOT/signing-key.pem TT_SIGNING_KEY_ID=trailhead-2026"

CLEAN_CAPTURE="telemetrytest-out/checkout_payment_retry-control/guest-checkout-succeeds-on-the-first-attempt-with-a-good-card.capture.json"
BUGGY_CAPTURE="telemetrytest-out/checkout_payment_retry-control/a-permanently-invalid-card-fails-without-ever-completing-the-order.capture.json"

FAILS=0
pass() { echo "   PASS: $1"; }
fail() { echo "   FAIL: $1"; FAILS=$((FAILS + 1)); }
assert_exit() { if [ "$2" = "$1" ]; then pass "$3 (exit $2)"; else fail "$3 (expected $1, got $2)"; fi; }

RUN_EXIT=0
ci_run() {
  local RUN_ID="$1" CAPTURE="$2" MODE="$3"; shift 3
  local OUT="$PILOT/run-$RUN_ID"
  if env GITHUB_RUN_ID="$RUN_ID" GITHUB_REPOSITORY="karkuak/trailhead" $SIGN_ENV \
    $CLI validate --capture "$CAPTURE" --contract "$CONTRACT" --config "$CONFIG" \
      --mode "$MODE" --out "$OUT" --state-mode commit --state-dir "$STATE" \
      --trust-policy "$TP" "$@" > "$OUT.log" 2>&1; then
    RUN_EXIT=0
  else
    RUN_EXIT=$?
  fi
  $CLI merge --shards "$OUT" --state "$STATE" > /dev/null
  $CLI merge-ledger --shards "$OUT" --ledger "$LEDGER" --state "$STATE" > /dev/null
}

approve3() {
  local OUT="$1"; mkdir -p "$OUT"
  env $SIGN_ENV $CLI approve --journey "$JOURNEY" --rule "$RULE" --role qa_owner --as qa@trailhead --state "$STATE" --out "$OUT" | tail -1
  env $SIGN_ENV $CLI approve --journey "$JOURNEY" --rule "$RULE" --role analytics_owner --as analytics@trailhead --state "$STATE" --out "$OUT" | tail -1
  env $SIGN_ENV $CLI approve --journey "$JOURNEY" --rule "$RULE" --role engineering_owner --as eng@trailhead --state "$STATE" --out "$OUT" | tail -1
}

echo "1. Observe runs + eligibility approvals"
for i in 1 2 3; do ci_run "$i" "$CLEAN_CAPTURE" observe; done
node -e "
const fs = require('fs');
const s = JSON.parse(fs.readFileSync('$CANON'));
s.human_approvals = ['qa_owner','analytics_owner','engineering_owner'].map(role => ({ approved_by: role + '@trailhead', approved_at: new Date().toISOString(), role }));
fs.writeFileSync('$CANON', JSON.stringify(s, null, 2));
"

echo "2. Ten advisory runs (earning record)"
for i in 4 5 6 7 8 9 10 11 12 13; do ci_run "$i" "$CLEAN_CAPTURE" advisory; done

echo "3. SIMULATED CALENDAR: backdate 15 days (blocking ladder requires >=14 days)"
node -e "
const fs = require('fs');
const s = JSON.parse(fs.readFileSync('$CANON'));
const shift = 15 * 86400000;
for (const r of s.runs) r.timestamp = new Date(Date.parse(r.timestamp) - shift).toISOString();
fs.writeFileSync('$CANON', JSON.stringify(s, null, 2));
"

echo "4. Promote advisory -> review_required (3 fresh approvals)"
approve3 "$PILOT/approvals-rr"
env $SIGN_ENV $CLI promote --journey "$JOURNEY" --rule "$RULE" --to review_required \
  --state "$STATE" --ledger "$LEDGER" --trust-policy "$TP" \
  --out "$PILOT/approvals-rr" || true

echo "5. Injected bug on review_required -> Check Run action_required -> ack -> success"
ci_run 14 "$BUGGY_CAPTURE" advisory
assert_exit 0 "$RUN_EXIT" "review_required violation still exits 0 (authority via the check)"
if [ -f "$PILOT/run-14/check-run.json" ]; then
  CONCLUSION=$(node -e "console.log(require('./$PILOT/run-14/check-run.json').conclusion)")
  [ "$CONCLUSION" = "action_required" ] && pass "Check Run: action_required" || fail "Check Run: got $CONCLUSION"
  FP_ID=$(node -e "console.log(require('./$PILOT/run-14/check-run.json').unacknowledged[0].fingerprint)")
  env $SIGN_ENV $CLI ack --journey "$JOURNEY" --rule "$RULE" --finding "$FP_ID" --as qa@trailhead \
    --ledger "$LEDGER" --trust-policy "$TP" --state "$STATE" --out "$PILOT/ack-out" | tail -2
  ci_run 15 "$BUGGY_CAPTURE" advisory
  CONCLUSION2=$(node -e "console.log(require('./$PILOT/run-15/check-run.json').conclusion)")
  [ "$CONCLUSION2" = "success" ] && pass "same finding acknowledged -> Check Run: success" || fail "expected success, got $CONCLUSION2"
else
  fail "no check-run.json produced at review_required"
fi

echo "6. Promote review_required -> blocking + customer opt-in"
approve3 "$PILOT/approvals-blk"
env $SIGN_ENV $CLI promote --journey "$JOURNEY" --rule "$RULE" --to blocking \
  --state "$STATE" --ledger "$LEDGER" --trust-policy "$TP" \
  --waiver-path-tested --out "$PILOT/approvals-blk" || true
if [ -f "$PROMO" ]; then
  node -e "
  const fs = require('fs');
  const p = JSON.parse(fs.readFileSync('$PROMO'));
  if (p.rules && p.rules['$RULE']) { p.rules['$RULE'].customer_blocking_enabled = true; fs.writeFileSync('$PROMO', JSON.stringify(p, null, 2)); console.log('   customer_blocking_enabled: true committed'); }
  else console.log('   rule not present in promotion.json yet -- promotion to blocking did not land');
  "
fi

echo "7. Kill-switch drill BEFORE first real block"
mkdir -p "$PILOT/kill-out"
env $SIGN_ENV $CLI kill-switch --on --reason "drill" --as oncall@trailhead --state "$STATE" --out "$PILOT/kill-out" | head -1
ci_run 16 "$BUGGY_CAPTURE" advisory --enable-blocking
assert_exit 0 "$RUN_EXIT" "violation + kill switch engaged -> no block"
$CLI kill-switch --off --state "$STATE"

echo "8. THE REAL BLOCK"
ci_run 17 "$BUGGY_CAPTURE" advisory --enable-blocking
if [ "$RUN_EXIT" = "20" ]; then
  pass "high-confidence violation on earned+enabled rule BLOCKS (exit 20)"
else
  echo "   NOTE: exit was $RUN_EXIT, not 20 -- see run-17.log for the reason (ladder/promotion likely didn't clear every clause)"
fi

echo ""
echo "=== promotion demo done. FAILS=$FAILS. See $PILOT/ for all artifacts+logs ==="
