#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const STRICT_INSTALLED = process.argv.includes('--strict-installed');
const JSON_OUTPUT = process.argv.includes('--json');

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function collectDirectDependencies(pkg) {
  return {
    ...(pkg.dependencies || {}),
    ...(pkg.devDependencies || {}),
    ...(pkg.optionalDependencies || {})
  };
}

function isExactVersion(value) {
  return /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(String(value || ''));
}

function inspectWorkspace({ name, rootDir, packagePath, lockPath, browser = false }) {
  const errors = [];
  const warnings = [];
  const info = [];
  const pkg = readJson(packagePath);
  const lock = readJson(lockPath);
  const rootLock = lock.packages?.[''] || {};

  if (lock.lockfileVersion !== 3) errors.push(`${name}: package-lock.json must use lockfileVersion 3`);
  if (lock.name !== pkg.name) errors.push(`${name}: lockfile name does not match package.json`);
  if (lock.version !== pkg.version || rootLock.version !== pkg.version) {
    errors.push(`${name}: package and lockfile versions are not synchronized`);
  }

  const direct = collectDirectDependencies(pkg);
  for (const [dependency, declaredVersion] of Object.entries(direct)) {
    const lockEntry = lock.packages?.[`node_modules/${dependency}`];
    if (!lockEntry) {
      errors.push(`${name}: lockfile is missing direct dependency ${dependency}`);
      continue;
    }
    if (isExactVersion(declaredVersion) && lockEntry.version !== declaredVersion) {
      errors.push(`${name}: ${dependency} lock version ${lockEntry.version || 'missing'} does not match ${declaredVersion}`);
    }

    const installedPackage = path.join(rootDir, 'node_modules', dependency, 'package.json');
    if (!fs.existsSync(installedPackage)) {
      warnings.push(`${name}: ${dependency} is not installed`);
      continue;
    }
    try {
      const installed = readJson(installedPackage);
      if (isExactVersion(declaredVersion) && installed.version !== declaredVersion) {
        warnings.push(`${name}: installed ${dependency}@${installed.version || 'unknown'} does not match ${declaredVersion}`);
      } else {
        info.push(`${name}: installed ${dependency}@${installed.version || 'unknown'}`);
      }
    } catch (error) {
      warnings.push(`${name}: cannot read installed ${dependency} metadata (${error.message})`);
    }
  }

  if (browser) {
    try {
      const playwrightPath = require.resolve('playwright', { paths: [rootDir] });
      const playwright = require(playwrightPath);
      const executablePath = playwright.chromium?.executablePath?.() || '';
      if (!executablePath || !fs.existsSync(executablePath)) {
        warnings.push(`${name}: Playwright Chromium binary is not installed; run npm run qa:browser:install`);
      } else {
        info.push(`${name}: Chromium executable available at ${executablePath}`);
      }
    } catch (error) {
      warnings.push(`${name}: Playwright runtime is unavailable; run npm ci`);
    }
  }

  return { name, packageVersion: pkg.version, directDependencyCount: Object.keys(direct).length, errors, warnings, info };
}

function buildReport() {
  const workspaces = [
    inspectWorkspace({
      name: 'root',
      rootDir: ROOT,
      packagePath: path.join(ROOT, 'package.json'),
      lockPath: path.join(ROOT, 'package-lock.json'),
      browser: true
    }),
    inspectWorkspace({
      name: 'functions',
      rootDir: path.join(ROOT, 'functions'),
      packagePath: path.join(ROOT, 'functions/package.json'),
      lockPath: path.join(ROOT, 'functions/package-lock.json')
    })
  ];
  const errors = workspaces.flatMap(workspace => workspace.errors);
  const warnings = workspaces.flatMap(workspace => workspace.warnings);
  return {
    ok: errors.length === 0 && (!STRICT_INSTALLED || warnings.length === 0),
    strictInstalled: STRICT_INSTALLED,
    workspaces,
    errors,
    warnings
  };
}

function printReport(report) {
  if (JSON_OUTPUT) {
    console.log(JSON.stringify(report, null, 2));
    return;
  }
  for (const workspace of report.workspaces) {
    console.log(`Dependency health ${workspace.name}: version=${workspace.packageVersion}, direct=${workspace.directDependencyCount}`);
    workspace.info.forEach(message => console.log(`  INFO ${message}`));
    workspace.warnings.forEach(message => console.log(`  WARN ${message}`));
    workspace.errors.forEach(message => console.error(`  FAIL ${message}`));
  }
  console.log(`${report.ok ? 'PASS' : 'FAIL'} dependency health: errors=${report.errors.length}, warnings=${report.warnings.length}, strictInstalled=${report.strictInstalled}`);
}

function main() {
  const report = buildReport();
  printReport(report);
  if (!report.ok) process.exitCode = 1;
}

if (require.main === module) main();

module.exports = { buildReport, collectDirectDependencies, inspectWorkspace, isExactVersion };
