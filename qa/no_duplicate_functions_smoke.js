#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const FILES_TO_CHECK = [
  'src/app.js',
  'src/firebase-bootstrap.js',
  'src/config/mastering-presets.js',
  'src/config/genre-presets.js',
  'src/config/reference-targets.js',
  'src/state/app-state.js',
  'src/utils/core-utils.js',
  'src/audio/mastering-inspector.js',
  'src/ui/modal-controller.js',
  'src/ui/dock-controller.js',
  'src/ui/mobile-native-view.js',
  'src/download/download-service.js',
  'src/ui/download-dialog-view.js',
  'src/security/site-guards.js',
  'src/workers/analysis.worker.js',
  'src/workers/wav-encoder.worker.js',
  'src/workers/mp3-encoder.worker.js',
  'src/workers/master-finalizer.worker.js',
  'src/workers/pitch-wsola.worker.js',
  'src/engines/pitch-engine-adapter.js',
  'sw.js'
];

const failures = [];

for (const relativePath of FILES_TO_CHECK) {
  const filePath = path.join(ROOT, relativePath);
  if (!fs.existsSync(filePath)) continue;

  const source = fs.readFileSync(filePath, 'utf8');
  const declarations = [...source.matchAll(/^function\s+([A-Za-z0-9_$]+)\s*\(/gm)].map(match => ({
    name: match[1],
    line: source.slice(0, match.index).split('\n').length
  }));

  const seen = new Map();
  for (const declaration of declarations) {
    if (!seen.has(declaration.name)) {
      seen.set(declaration.name, [declaration.line]);
      continue;
    }
    seen.get(declaration.name).push(declaration.line);
  }

  for (const [name, lines] of seen) {
    if (lines.length > 1) failures.push(`${relativePath}: ${name} at lines ${lines.join(', ')}`);
  }
}

if (failures.length) {
  console.error('FAIL duplicate function declarations');
  failures.forEach(failure => console.error(`- ${failure}`));
  process.exit(1);
}

console.log('PASS no duplicate function declarations');
