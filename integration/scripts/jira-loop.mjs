#!/usr/bin/env node
// Custom Jira loop for TelemetryTest AI findings.
//
// Why this exists: the tool has NO native Jira integration (see integration/FRICTION-LOG.md
// "Step 1" — grepped the whole repo; the only real hit is `waive --ticket <id>`, a free-text
// field, not an API call). This script is the glue: it reads each journey's
// validation-evidence-pack.json + run-result.json, and for every rule_violation_detected finding,
// creates or updates a Jira issue in the existing TRAIH project, storing the finding's
// evidence_pack_id + content_hash so the issue is traceable back to the exact evidence.
//
// Degrades gracefully like the tool's own optional inputs (e.g. `github-token`): if Jira
// credentials aren't configured, this step logs a warning and exits 0 rather than failing the
// build -- this is CI glue for visibility, not a release gate.
import { readdirSync, readFileSync, existsSync } from "node:fs";
import path from "node:path";

const JIRA_CLOUD_ID = process.env.JIRA_CLOUD_ID;
const JIRA_EMAIL = process.env.JIRA_EMAIL;
const JIRA_API_TOKEN = process.env.JIRA_API_TOKEN;
const PROJECT_KEY = process.env.JIRA_PROJECT_KEY || "TRAIH";

const resultsDir = process.argv[2];
if (!resultsDir) {
  console.error("usage: jira-loop.mjs <tt-results-dir>");
  process.exit(1);
}

if (!JIRA_CLOUD_ID || !JIRA_EMAIL || !JIRA_API_TOKEN) {
  console.warn(
    "::warning::Jira credentials not configured (JIRA_CLOUD_ID/JIRA_EMAIL/JIRA_API_TOKEN) — " +
      "skipping the Jira loop. This is CI visibility glue, not a release gate."
  );
  process.exit(0);
}

const authHeader =
  "Basic " + Buffer.from(`${JIRA_EMAIL}:${JIRA_API_TOKEN}`).toString("base64");
const baseUrl = `https://api.atlassian.com/ex/jira/${JIRA_CLOUD_ID}/rest/api/3`;

async function jiraFetch(pathname, init = {}) {
  const res = await fetch(`${baseUrl}${pathname}`, {
    ...init,
    headers: {
      Authorization: authHeader,
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(init.headers ?? {}),
    },
  });
  if (!res.ok) {
    throw new Error(`Jira API ${pathname} -> ${res.status}: ${await res.text()}`);
  }
  return res.status === 204 ? null : res.json();
}

function adfParagraph(text) {
  return {
    type: "doc",
    version: 1,
    content: [{ type: "paragraph", content: [{ type: "text", text }] }],
  };
}

async function findExistingIssue(evidencePackId) {
  const jql = `project = ${PROJECT_KEY} AND text ~ "${evidencePackId}" ORDER BY created DESC`;
  const result = await jiraFetch(
    `/search/jql?jql=${encodeURIComponent(jql)}&maxResults=1&fields=summary,status`
  );
  return result?.issues?.[0] ?? null;
}

async function fileOrUpdateFinding({ journeyId, ruleId, finding, evidencePackId, contentHash, reportPath }) {
  const summary = `[TelemetryTest AI] ${journeyId}/${ruleId}: ${finding.type} — ${finding.detail?.event ?? ""}`.trim();
  const body = [
    `TelemetryTest AI flagged a telemetry rule violation (advisory; did not block CI).`,
    ``,
    `Journey: ${journeyId}`,
    `Rule: ${ruleId}`,
    `Finding type: ${finding.type}`,
    `Severity: ${finding.severity}`,
    `Detail: ${JSON.stringify(finding.detail)}`,
    ``,
    `Evidence pack id: ${evidencePackId}`,
    `Evidence content hash: ${contentHash}`,
    `Report: ${reportPath}`,
  ].join("\n");

  const existing = await findExistingIssue(evidencePackId);
  if (existing) {
    await jiraFetch(`/issue/${existing.key}`, {
      method: "PUT",
      body: JSON.stringify({ fields: { description: adfParagraph(body) } }),
    });
    console.log(`Updated ${existing.key} (${summary})`);
    return existing.key;
  }

  const created = await jiraFetch(`/issue`, {
    method: "POST",
    body: JSON.stringify({
      fields: {
        project: { key: PROJECT_KEY },
        summary,
        description: adfParagraph(body),
        issuetype: { name: "Bug" },
        labels: ["telemetrytest-ai", journeyId],
      },
    }),
  });
  console.log(`Created ${created.key} (${summary})`);
  return created.key;
}

const entries = existsSync(resultsDir) ? readdirSync(resultsDir, { withFileTypes: true }) : [];
let filedCount = 0;

for (const entry of entries) {
  if (!entry.isDirectory()) continue;
  const dir = path.join(resultsDir, entry.name);
  const runResultPath = path.join(dir, "run-result.json");
  const evidencePath = path.join(dir, "validation-evidence-pack.json");
  if (!existsSync(runResultPath) || !existsSync(evidencePath)) continue;

  const runResult = JSON.parse(readFileSync(runResultPath, "utf8"));
  const evidence = JSON.parse(readFileSync(evidencePath, "utf8"));
  if (runResult.runStatus !== "rule_violation_detected" && runResult.validationStatus !== "rule_violation_detected") {
    continue;
  }

  const findings = evidence.validation_context?.findings ?? [];
  const journeyId = evidence.journey_context?.journey_id ?? "unknown_journey";
  const ruleId = evidence.rule_context?.rule_id ?? "unknown_rule";
  const evidencePackId = evidence.evidence_pack_id;
  const contentHash = evidence.content_hash;

  if (findings.length === 0 && evidence.validation_context?.failure_type) {
    // Some schema revisions carry a single failure summary instead of a findings[] array.
    await fileOrUpdateFinding({
      journeyId,
      ruleId,
      finding: {
        type: evidence.validation_context.failure_type,
        severity: "high",
        detail: { event: evidence.validation_context.missing_event },
      },
      evidencePackId,
      contentHash,
      reportPath: path.join(dir, "report.md"),
    });
    filedCount++;
    continue;
  }

  for (const finding of findings) {
    await fileOrUpdateFinding({
      journeyId,
      ruleId,
      finding,
      evidencePackId,
      contentHash,
      reportPath: path.join(dir, "report.md"),
    });
    filedCount++;
  }
}

console.log(`Jira loop complete: ${filedCount} finding(s) filed/updated in ${PROJECT_KEY}.`);
