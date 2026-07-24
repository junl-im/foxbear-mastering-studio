#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = path.resolve(__dirname, '..', '..');
const HISTORY_DIR = path.resolve(PROJECT_ROOT, 'qa/browser-history');
const HISTORY_PATH = path.join(HISTORY_DIR, 'flaky-history.json');
const RESULTS_DIR = path.resolve(PROJECT_ROOT, 'qa/browser-results');
const SUMMARY_JSON_PATH = path.join(RESULTS_DIR, 'flaky-history-summary.json');
const SUMMARY_MARKDOWN_PATH = path.join(RESULTS_DIR, 'flaky-history-summary.md');
const ISSUE_MARKDOWN_PATH = path.join(RESULTS_DIR, 'flaky-issue-report.md');
const DEFAULT_WARNING_THRESHOLD = 3;
const DEFAULT_RETENTION_DAYS = 45;
const MAX_ENTRIES = 500;

function readJsonOr(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch (_) { return fallback; }
}

function normalizedEntry(item, outcome, now) {
  return {
    key: item.key,
    file: item.file || '',
    title: item.title || item.key,
    projectName: item.projectName || 'default',
    outcome,
    seenAt: now
  };
}

function updateFlakyHistory(history, retrySummary, options = {}) {
  const now = options.now || new Date().toISOString();
  const current = history && typeof history === 'object' ? history : {};
  const entries = { ...(current.entries || {}) };
  const observations = [
    ...(retrySummary?.recovered || []).map(item => normalizedEntry(item, 'recovered', now)),
    ...(retrySummary?.repeated || []).map(item => normalizedEntry(item, 'repeated', now)),
    ...(retrySummary?.skipped || []).map(item => normalizedEntry(item, 'skipped', now)),
    ...(retrySummary?.missing || []).map(item => normalizedEntry(item, 'missing', now))
  ];

  for (const observation of observations) {
    const previous = entries[observation.key] || {
      key: observation.key,
      file: observation.file,
      title: observation.title,
      projectName: observation.projectName,
      firstSeenAt: now,
      lastSeenAt: now,
      totalEvents: 0,
      recoveredCount: 0,
      repeatedCount: 0,
      skippedCount: 0,
      missingCount: 0,
      consecutiveRecoveries: 0,
      lastOutcome: ''
    };
    previous.file = observation.file || previous.file;
    previous.title = observation.title || previous.title;
    previous.projectName = observation.projectName || previous.projectName;
    previous.lastSeenAt = now;
    previous.totalEvents += 1;
    previous.lastOutcome = observation.outcome;
    if (observation.outcome === 'recovered') {
      previous.recoveredCount += 1;
      previous.consecutiveRecoveries += 1;
    } else {
      previous.consecutiveRecoveries = 0;
      if (observation.outcome === 'repeated') previous.repeatedCount += 1;
      else if (observation.outcome === 'skipped') previous.skippedCount = Number(previous.skippedCount || 0) + 1;
      else previous.missingCount += 1;
    }
    entries[observation.key] = previous;
  }

  const retentionDays = Math.max(1, Number(options.retentionDays || process.env.FOXBEAR_FLAKY_RETENTION_DAYS || DEFAULT_RETENTION_DAYS));
  const cutoffMs = Date.parse(now) - retentionDays * 24 * 60 * 60 * 1000;
  const retained = Object.values(entries)
    .filter(item => {
      const seenMs = Date.parse(item.lastSeenAt || '');
      return !Number.isFinite(seenMs) || seenMs >= cutoffMs;
    })
    .sort((a, b) => String(b.lastSeenAt).localeCompare(String(a.lastSeenAt)))
    .slice(0, Number(options.maxEntries || MAX_ENTRIES));
  return {
    version: 2,
    updatedAt: now,
    retentionDays,
    entries: Object.fromEntries(retained.map(item => [item.key, item]))
  };
}

function summarizeFlakyHistory(history, options = {}) {
  const warningThreshold = Math.max(1, Number(options.warningThreshold || process.env.FOXBEAR_FLAKY_WARNING_THRESHOLD || DEFAULT_WARNING_THRESHOLD));
  const generatedAt = options.now || new Date().toISOString();
  const entries = Object.values(history?.entries || {});
  const recurringRecovered = entries
    .filter(item => item.recoveredCount >= warningThreshold)
    .sort((a, b) => b.recoveredCount - a.recoveredCount || b.totalEvents - a.totalEvents || a.title.localeCompare(b.title));
  const unresolved = entries
    .filter(item => item.lastOutcome === 'repeated' || item.lastOutcome === 'skipped' || item.lastOutcome === 'missing')
    .sort((a, b) => b.totalEvents - a.totalEvents || a.title.localeCompare(b.title));
  const top = entries
    .sort((a, b) => b.totalEvents - a.totalEvents || b.recoveredCount - a.recoveredCount || String(b.lastSeenAt).localeCompare(String(a.lastSeenAt)) || a.title.localeCompare(b.title))
    .slice(0, 20);
  const issueCandidates = Array.from(new Map([...unresolved, ...recurringRecovered].map(item => [item.key, item])).values())
    .sort((a, b) => {
      const aUnresolved = a.lastOutcome === 'repeated' || a.lastOutcome === 'skipped' || a.lastOutcome === 'missing' ? 1 : 0;
      const bUnresolved = b.lastOutcome === 'repeated' || b.lastOutcome === 'skipped' || b.lastOutcome === 'missing' ? 1 : 0;
      return bUnresolved - aUnresolved
        || b.totalEvents - a.totalEvents
        || b.recoveredCount - a.recoveredCount
        || String(b.lastSeenAt).localeCompare(String(a.lastSeenAt))
        || a.title.localeCompare(b.title);
    });
  return {
    generatedAt,
    warningThreshold,
    counts: {
      tracked: entries.length,
      recurringRecovered: recurringRecovered.length,
      unresolved: unresolved.length
    },
    recurringRecovered,
    unresolved,
    issueCandidates,
    top
  };
}

function escapeMarkdown(value) {
  return String(value || '').replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');
}

function renderFlakyHistoryMarkdown(summary) {
  const lines = [
    '## Browser flaky history',
    '',
    `- Tracked cases: **${summary.counts.tracked}**`,
    `- Recovered at least ${summary.warningThreshold} times: **${summary.counts.recurringRecovered}**`,
    `- Last observation still unresolved: **${summary.counts.unresolved}**`,
    ''
  ];
  const table = (heading, items) => {
    if (!items.length) return;
    lines.push(`### ${heading}`, '', '| Test | Recovered | Repeated | Skipped | Missing | Last outcome |', '|---|---:|---:|---:|---:|---|');
    items.slice(0, 20).forEach(item => {
      lines.push(`| ${escapeMarkdown(item.title)} | ${item.recoveredCount} | ${item.repeatedCount} | ${item.skippedCount || 0} | ${item.missingCount} | ${item.lastOutcome} |`);
    });
    lines.push('');
  };
  table('Recurring flaky recoveries', summary.recurringRecovered);
  table('Currently unresolved', summary.unresolved);
  if (!summary.recurringRecovered.length && !summary.unresolved.length && summary.top.length) table('Most frequently observed', summary.top);
  return `${lines.join('\n').trim()}\n`;
}

function renderFlakyIssueMarkdown(summary) {
  const items = summary.issueCandidates || [];
  const lines = [
    '# Browser flaky follow-up',
    '',
    `Generated: ${summary.generatedAt}`,
    '',
    `Tracked cases: ${summary.counts.tracked} · recurring retry recoveries: ${summary.counts.recurringRecovered} · unresolved latest outcomes: ${summary.counts.unresolved}`,
    ''
  ];
  if (!items.length) {
    lines.push('No recurring or unresolved browser cases currently require an issue.', '');
    return `${lines.join('\n').trim()}\n`;
  }
  lines.push('## Candidates', '', '| Priority | Test | Project | Events | Recovered | Repeated | Skipped | Missing | Last seen |', '|---|---|---|---:|---:|---:|---:|---:|---|');
  items.slice(0, 30).forEach(item => {
    const unresolved = item.lastOutcome === 'repeated' || item.lastOutcome === 'skipped' || item.lastOutcome === 'missing';
    lines.push(`| ${unresolved ? 'P1 unresolved' : 'P2 recurring flaky'} | ${escapeMarkdown(item.title)} | ${escapeMarkdown(item.projectName)} | ${item.totalEvents} | ${item.recoveredCount} | ${item.repeatedCount} | ${item.skippedCount || 0} | ${item.missingCount} | ${escapeMarkdown(item.lastSeenAt)} |`);
  });
  lines.push('', '## Investigation checklist', '', '- [ ] Inspect the primary failure screenshot, trace, and first error.', '- [ ] Compare desktop and mobile-PWA project behavior.', '- [ ] Confirm whether retry recovery depends on timing, cache, service worker, or viewport.', '- [ ] Add a deterministic regression before relaxing timeouts or assertions.', '');
  return `${lines.join('\n').trim()}\n`;
}

function writeFlakyHistoryArtifacts(retrySummary, options = {}) {
  const historyPath = path.resolve(options.historyPath || HISTORY_PATH);
  const jsonOutputPath = path.resolve(options.jsonOutputPath || SUMMARY_JSON_PATH);
  const markdownOutputPath = path.resolve(options.markdownOutputPath || SUMMARY_MARKDOWN_PATH);
  const issueOutputPath = path.resolve(options.issueOutputPath || ISSUE_MARKDOWN_PATH);
  const previous = readJsonOr(historyPath, { version: 1, entries: {} });
  const history = updateFlakyHistory(previous, retrySummary, options);
  const summary = summarizeFlakyHistory(history, options);
  const markdown = renderFlakyHistoryMarkdown(summary);
  const issueMarkdown = renderFlakyIssueMarkdown(summary);
  fs.mkdirSync(path.dirname(historyPath), { recursive: true });
  fs.mkdirSync(path.dirname(jsonOutputPath), { recursive: true });
  fs.mkdirSync(path.dirname(markdownOutputPath), { recursive: true });
  fs.mkdirSync(path.dirname(issueOutputPath), { recursive: true });
  fs.writeFileSync(historyPath, `${JSON.stringify(history, null, 2)}\n`, 'utf8');
  fs.writeFileSync(jsonOutputPath, `${JSON.stringify(summary, null, 2)}\n`, 'utf8');
  fs.writeFileSync(markdownOutputPath, markdown, 'utf8');
  fs.writeFileSync(issueOutputPath, issueMarkdown, 'utf8');
  const githubSummary = options.githubStepSummary ?? process.env.GITHUB_STEP_SUMMARY;
  if (githubSummary) fs.appendFileSync(githubSummary, markdown, 'utf8');
  return { history, summary, markdown, issueMarkdown, historyPath, jsonOutputPath, markdownOutputPath, issueOutputPath };
}

function printFlakyHistoryAnnotations(summary) {
  if (summary.counts.recurringRecovered > 0) {
    console.log(`::warning title=Recurring browser flakiness::${summary.counts.recurringRecovered} browser case(s) have recovered on retry at least ${summary.warningThreshold} times. Review qa/browser-results/flaky-issue-report.md.`);
  }
  if (summary.counts.unresolved > 0) {
    console.log(`::error title=Unresolved browser history::${summary.counts.unresolved} browser case(s) remain unresolved in their latest observation.`);
  }
}

module.exports = {
  DEFAULT_RETENTION_DAYS,
  DEFAULT_WARNING_THRESHOLD,
  HISTORY_PATH,
  ISSUE_MARKDOWN_PATH,
  MAX_ENTRIES,
  SUMMARY_JSON_PATH,
  SUMMARY_MARKDOWN_PATH,
  printFlakyHistoryAnnotations,
  renderFlakyHistoryMarkdown,
  renderFlakyIssueMarkdown,
  summarizeFlakyHistory,
  updateFlakyHistory,
  writeFlakyHistoryArtifacts
};
