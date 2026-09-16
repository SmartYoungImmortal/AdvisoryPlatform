#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────
# SonarQube Analysis Report.
#   • pull_request → sticky comment on the PR + rename PR title.
#   • push (branch) → comment on the commit.
# Both set the job exit code from the Quality Gate (green ✓ / red ✗).
# Reads results from the SonarCloud public API (no token for a public
# project) and does NOT run a scanner, so it never conflicts with
# Automatic Analysis. ESLint / TypeCheck results are passed in via env.
# ─────────────────────────────────────────────────────────────────────
set -uo pipefail

API="https://sonarcloud.io/api"
PROJECT="${SONAR_PROJECT:?set SONAR_PROJECT}"
PR="${PR_NUMBER:-}"                       # empty on push events
REPO="${GITHUB_REPOSITORY:?}"
HEAD_SHA="${HEAD_SHA:-}"
COMMIT_SHORT="$(echo "${HEAD_SHA}" | cut -c1-7)"
BRANCH="${HEAD_REF:-}"

if [ -n "${PR}" ]; then MODE="pr"; else MODE="branch"; fi

# ── helpers ──────────────────────────────────────────────────────────
rating() { case "${1%%.*}" in 1) echo A;; 2) echo B;; 3) echo C;; 4) echo D;; 5) echo E;; *) echo "?";; esac; }
debt() { # minutes -> "2d 3h", "24m", "0m"
  local m=${1:-0}; local d=$((m/480)); local h=$(((m%480)/60)); local mm=$((m%60)); local o=""
  [ "$d" -gt 0 ] && o="${d}d "; [ "$h" -gt 0 ] && o="${o}${h}h "; { [ -z "$o" ] || [ "$mm" -gt 0 ]; } && o="${o}${mm}m"
  echo "${o% }"
}
mval() { jq -r --arg k "$1" '.component.measures[]? | select(.metric==$k) | .value' "$2" 2>/dev/null; }

# ── 1. wait for SonarCloud to analyse *this* commit ──────────────────
# Automatic Analysis is asynchronous, so the job has to wait for it. The check
# used to be "does Sonar know about this PR yet?", which on the second and later
# pushes to an open PR is true the instant the job starts — Sonar still held the
# *previous* commit's analysis. The report was then built from that, so a PR
# whose findings had just been fixed came back FAILED, quoting line numbers that
# no longer existed in the commit being reported on.
#
# `project_pull_requests/list` and `project_branches/list` both pin their entry
# to `commit.sha`, so waiting for that to reach HEAD_SHA is the real signal.
poll_analysis() { # url, jq filter -> /tmp/entry.json, 0 when it matches HEAD_SHA
  local url="$1" filter="$2" sha=""
  for i in $(seq 1 30); do
    if curl -sf "$url" -o /tmp/list.json; then
      jq -e "$filter" /tmp/list.json >/tmp/entry.json 2>/dev/null || echo '{}' >/tmp/entry.json
      sha=$(jq -r '.commit.sha // ""' /tmp/entry.json 2>/dev/null)
      if [ -n "$sha" ] && [ "$sha" = "$HEAD_SHA" ]; then
        echo "Analysis for ${COMMIT_SHORT} found (attempt ${i})."
        return 0
      fi
      if [ -n "$sha" ]; then
        echo "  …Sonar is still on $(echo "$sha" | cut -c1-7), waiting for ${COMMIT_SHORT} (${i}/30)"
      else
        echo "  …no analysis yet (${i}/30)"
      fi
    else
      echo "  …SonarCloud API unreachable (${i}/30)"
    fi
    sleep 10
  done
  return 1
}

FRESH=""
if [ "$MODE" = "pr" ]; then
  echo "Waiting for SonarCloud analysis of PR #${PR} at ${COMMIT_SHORT}…"
  poll_analysis "${API}/project_pull_requests/list?project=${PROJECT}" \
    ".pullRequests[]? | select(.key==\"${PR}\")" && FRESH=1
  SCOPE="&pullRequest=${PR}"
  DASH="https://sonarcloud.io/summary/new_code?id=${PROJECT}&pullRequest=${PR}"
else
  echo "Waiting for SonarCloud analysis of ${BRANCH} at ${COMMIT_SHORT}…"
  poll_analysis "${API}/project_branches/list?project=${PROJECT}" \
    ".branches[]? | select(.name==\"${BRANCH}\")" && FRESH=1
  SCOPE="&branch=${BRANCH}"
  DASH="https://sonarcloud.io/summary/new_code?id=${PROJECT}&branch=${BRANCH}"
fi

ANALYSED_SHA=$(jq -r '.commit.sha // ""' /tmp/entry.json 2>/dev/null)
ANALYSED_SHORT="$(echo "${ANALYSED_SHA}" | cut -c1-7)"

# ── 2. fetch measures / quality gate / issues ────────────────────────
METRICS="alert_status,bugs,vulnerabilities,code_smells,security_hotspots,coverage,duplicated_lines_density,ncloc,statements,functions,sqale_index,sqale_rating,reliability_rating,security_rating,security_review_rating"
curl -sf "${API}/measures/component?component=${PROJECT}${SCOPE}&metricKeys=${METRICS}" -o /tmp/m.json || echo '{}' >/tmp/m.json
curl -sf "${API}/issues/search?componentKeys=${PROJECT}${SCOPE}&resolved=false&facets=severities&ps=10&s=SEVERITY&asc=false" -o /tmp/i.json || echo '{}' >/tmp/i.json

NCLOC=$(mval ncloc /tmp/m.json);           NCLOC=${NCLOC:-0}
STMT=$(mval statements /tmp/m.json);        STMT=${STMT:-0}
FUNC=$(mval functions /tmp/m.json);         FUNC=${FUNC:-0}
COV=$(mval coverage /tmp/m.json);           COV=${COV:-0.0}
DUP=$(mval duplicated_lines_density /tmp/m.json); DUP=${DUP:-0.0}
DEBT_MIN=$(mval sqale_index /tmp/m.json);   DEBT_MIN=${DEBT_MIN:-0}
BUGS=$(mval bugs /tmp/m.json);              BUGS=${BUGS:-0}
VULN=$(mval vulnerabilities /tmp/m.json);   VULN=${VULN:-0}
SMELL=$(mval code_smells /tmp/m.json);      SMELL=${SMELL:-0}
HOT=$(mval security_hotspots /tmp/m.json);  HOT=${HOT:-0}
REL=$(rating "$(mval reliability_rating /tmp/m.json)")
SEC=$(rating "$(mval security_rating /tmp/m.json)")
MNT=$(rating "$(mval sqale_rating /tmp/m.json)")
SECREV=$(rating "$(mval security_review_rating /tmp/m.json)")

# The verdict comes from the commit-pinned entry rather than the `alert_status`
# measure: the list endpoint carries the sha it belongs to, so the pass/fail can
# never be attributed to the wrong commit even if the measures index lags behind.
GATE=$(jq -r '.status.qualityGateStatus // ""' /tmp/entry.json 2>/dev/null)
[ -z "${GATE}" ] && GATE=$(mval alert_status /tmp/m.json)
GATE=${GATE:-NONE}
# Never report a verdict that belongs to an older commit — say "checking" instead.
[ -z "${FRESH}" ] && GATE="PENDING"

# severity facet counts
sev() { jq -r --arg s "$1" '(.facets[]?|select(.property=="severities").values[]?|select(.val==$s).count) // 0' /tmp/i.json 2>/dev/null | head -1; }
BLOCKER=$(sev BLOCKER); CRITICAL=$(sev CRITICAL); MAJOR=$(sev MAJOR); MINOR=$(sev MINOR); INFO=$(sev INFO)
BLOCKER=${BLOCKER:-0}; CRITICAL=${CRITICAL:-0}; MAJOR=${MAJOR:-0}; MINOR=${MINOR:-0}; INFO=${INFO:-0}
ISSUE_TOTAL=$(jq -r '.total // 0' /tmp/i.json)

# overall score /10 = average of the three ratings (A=10,B=8,C=6,D=4,E=2)
rscore() { case "$1" in A) echo 10;; B) echo 8;; C) echo 6;; D) echo 4;; E) echo 2;; *) echo 0;; esac; }
OVERALL=$(( ( $(rscore "$REL") + $(rscore "$SEC") + $(rscore "$MNT") ) / 3 ))

case "${GATE}" in
  OK)    GATE_ICON="🟢"; GATE_TXT="✅ PASSED" ;;
  ERROR) GATE_ICON="🔴"; GATE_TXT="❌ FAILED" ;;
  *)     GATE_ICON="🔍"; GATE_TXT="⏳ CHECKING — SonarCloud has not analysed \`${COMMIT_SHORT}\` yet" ;;
esac
ESLINT_STATUS="${ESLINT_STATUS:-"⏭️ Skipped"}"; ESLINT_DETAIL="${ESLINT_DETAIL:-"—"}"
TSC_STATUS="${TSC_STATUS:-"⏭️ Skipped"}";       TSC_DETAIL="${TSC_DETAIL:-"—"}"

# ── 3. build the markdown ────────────────────────────────────────────
{
echo "<!-- sonar-report -->"
echo "## ${GATE_ICON} SonarQube Analysis Report"
echo ""
echo "**Quality Gate:** ${GATE_TXT}"
echo ""
echo "---"
echo ""
echo "### 🔍 Test Build"
echo ""
echo "| Check | Status | Details |"
echo "|---|---|---|"
echo "| ESLint | ${ESLINT_STATUS} | ${ESLINT_DETAIL} |"
echo "| TypeCheck | ${TSC_STATUS} | ${TSC_DETAIL} |"
echo ""
echo "### 📊 Overall — ${OVERALL}/10"
echo ""
echo "| 🐛 Reliability **${REL}** | 🔒 Security **${SEC}** | 🧹 Maintainability **${MNT}** |"
echo ""
echo "### 📦 Code Stats"
echo ""
echo "| Lines | Statements | Functions | Coverage | Duplication | 🏗️ Tech Debt |"
echo "|---|---|---|---|---|---|"
echo "| ${NCLOC} | ${STMT} | ${FUNC} | ${COV}% | ${DUP}% | $(debt "$DEBT_MIN") |"
echo ""
echo "> 🐛 Bugs: **${BUGS}** · 🔒 Vulnerabilities: **${VULN}** · 🧹 Code Smells: **${SMELL}** · 🔥 Hotspots: **${HOT}** · 🛡️ Security Review: **${SECREV}**"
echo ""
echo "### 🐞 Issues by Severity"
echo ""
echo "| 🔴 Blocker | 🟠 Critical | 🟡 Major | 🔵 Minor | ⚪ Info |"
echo "|---|---|---|---|---|"
echo "| ${BLOCKER} | ${CRITICAL} | ${MAJOR} | ${MINOR} | ${INFO} |"
echo ""
echo "<details><summary>📋 All Issues (${ISSUE_TOTAL})</summary>"
echo ""
if [ "${ISSUE_TOTAL}" = "0" ]; then
  echo "No open issues on this analysis. 🎉"
else
  echo "| Severity | Rule | File | Message |"
  echo "|---|---|---|---|"
  jq -r '.issues[]? | "| \(.severity) | `\(.rule)` | `\(.component | sub(".*:";""))`:\(.line // "-") | \(.message | gsub("[|\n]";" ")) |"' /tmp/i.json
fi
echo ""
echo "</details>"
echo ""
# Naming the analysed commit keeps the numbers falsifiable: if it ever drifts
# from the head commit again, the report says so instead of looking authoritative.
if [ -n "${FRESH}" ]; then
  echo "🔗 [Dashboard](${DASH}) · Branch: \`${BRANCH}\` · Commit: \`${COMMIT_SHORT}\` · Scanned via SonarCloud"
else
  echo "🔗 [Dashboard](${DASH}) · Branch: \`${BRANCH}\` · Head: \`${COMMIT_SHORT}\` · Last analysed: \`${ANALYSED_SHORT:-none}\` · Scanned via SonarCloud"
  echo ""
  echo "> ⏳ The figures above belong to \`${ANALYSED_SHORT:-an earlier run}\`, not to \`${COMMIT_SHORT}\`. Re-run this job once SonarCloud catches up."
fi
} > /tmp/report.md

echo "----- report preview -----"; cat /tmp/report.md

# ── 4. post the report (PR sticky comment, or commit comment) ─────────
if [ "$MODE" = "pr" ]; then
  CID=$(gh api "repos/${REPO}/issues/${PR}/comments" --paginate \
          --jq '.[] | select(.body | contains("<!-- sonar-report -->")) | .id' 2>/dev/null | head -1)
  if [ -n "${CID}" ]; then
    gh api -X PATCH "repos/${REPO}/issues/comments/${CID}" -F body=@/tmp/report.md >/dev/null && echo "Updated PR comment ${CID}"
  else
    gh api -X POST "repos/${REPO}/issues/${PR}/comments" -F body=@/tmp/report.md >/dev/null && echo "Created PR comment"
  fi

  # rename the PR title with a status tag ([DONE] → PASSED/FAILED) — idempotent
  case "${GATE}" in
    OK)    STATUS_TAG="[🟢 PASSED]" ;;
    ERROR) STATUS_TAG="[🔴 FAILED]" ;;
    *)     STATUS_TAG="[🔍 CHECKING]" ;;
  esac
  CUR_TITLE=$(gh api "repos/${REPO}/pulls/${PR}" --jq '.title' 2>/dev/null)
  if [ -n "${CUR_TITLE}" ]; then
    REST=$(printf '%s' "${CUR_TITLE}" | sed -E 's/^[[:space:]]*\[[^]]*\][[:space:]]*//')
    NEW_TITLE="${STATUS_TAG} ${REST}"
    if [ "${NEW_TITLE}" != "${CUR_TITLE}" ]; then
      gh api -X PATCH "repos/${REPO}/pulls/${PR}" -f title="${NEW_TITLE}" >/dev/null \
        && echo "PR title → ${NEW_TITLE}"
    fi
  fi
else
  # push event → comment on the commit
  gh api -X POST "repos/${REPO}/commits/${HEAD_SHA}/comments" -F body=@/tmp/report.md >/dev/null \
    && echo "Commented on commit ${COMMIT_SHORT}"
fi

# ── 5. reflect Quality Gate as the job status (green ✓ / red ✗) ───────
case "${GATE}" in
  OK)
    echo "::notice::Quality Gate PASSED"; exit 0 ;;
  ERROR)
    echo "::error::Quality Gate FAILED"; exit 1 ;;
  *)
    echo "::warning::SonarCloud has not analysed ${COMMIT_SHORT} yet (last analysed: ${ANALYSED_SHORT:-none}) — not failing the build on another commit's verdict"
    exit 0 ;;
esac
