#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const css = fs.readFileSync('assets/css/ui-mode.css', 'utf8');
const studioCss = fs.readFileSync('assets/css/studio.css', 'utf8');
const app = fs.readFileSync('src/app.js', 'utf8');
const state = fs.readFileSync('src/state/app-state.js', 'utf8');
const integrityService = fs.readFileSync('src/ui/bottom-preview-dock-integrity-service.js', 'utf8');
const diagnostics = fs.readFileSync('src/boot/performance-diagnostics.js', 'utf8');

assert.strictEqual(pkg.version, '1.6.109'); // synchronized to the current release by sync-release-metadata.js
assert(pkg.qaChecks.includes('node qa/v1693_mobile_dock_visibility_integrity_recovery_smoke.js'));

// Base Dock visibility must remain state-driven in every mode.
assert(studioCss.includes('.bottom-preview-dock {'));
assert(studioCss.includes('display: none;'));
assert(studioCss.includes('.bottom-preview-dock.show { display: block; }'));
assert(!css.includes('body[data-ui-mode="ai"] .bottom-preview-dock { display: block; }'), 'AI mode must never force a hidden Dock visible');
assert(css.includes('body[data-ui-mode="ai"] .bottom-preview-dock.show[aria-hidden="false"] { display: block; }'));
assert(css.includes('body[data-ui-mode="ai"] .bottom-preview-dock[aria-hidden="true"],'));
assert(css.includes('body[data-ui-mode="ai"] .bottom-preview-dock:not(.show) { display: none !important; }'));

// A transient stale selectedId must not clear the Dock while tracks still exist.
assert(app.includes("const track = getSelectedTrack() || repairActiveTrackSelectionForRender('dock-render');"));
assert(app.includes("repairActiveTrackSelectionForRender('render-all');"));
assert(app.includes('window.FoxBearBottomPreviewDockIntegrityService?.createController?.({'));
assert(integrityService.includes('let fallback = validTrackById(state.bottomPreviewTrackId);'), 'last Dock owner is the first recovery source');
assert(integrityService.includes("state.selectedIds && typeof state.selectedIds.values === 'function'"), 'multi-selection must be a recovery source');
assert(integrityService.includes('if (!fallback) fallback = tracks[0] || null;'), 'first remaining track must be the final recovery source');
assert(integrityService.includes('state.selectedId = fallback.id;'));
assert(integrityService.includes('if (!validTrackById(state.bottomPreviewTrackId)) state.bottomPreviewTrackId = fallback.id;'));

// Dock state must be observable and self-repairable after mobile/layout lifecycle changes.
assert(state.includes('bottomPreviewIntegrityRaf: 0'));
assert(state.includes('bottomPreviewRepairCount: 0'));
assert(state.includes("bottomPreviewLastRepairReason: ''"));
assert(integrityService.includes('function getSnapshot()'));
assert(integrityService.includes('const selectionIntegrity = !Number(state.tracks?.length || 0) || Boolean(track);'));
assert(integrityService.includes('const healthy = selectionIntegrity && (expectedVisible'));
assert(integrityService.includes('renderedVisible && playerChildren > 0 && trackOwnerMatches'));
assert(integrityService.includes('dockTrackId === selectedTrackId && playerTrackId === selectedTrackId'));
assert(integrityService.includes('!before.trackOwnerMatches'));
assert(app.includes('el.bottomPreviewPlayer.dataset.trackId = String(track.id)'));
assert(app.includes('delete el.bottomPreviewPlayer.dataset.trackId'));
assert(integrityService.includes("function repair(reason = 'manual')"));
assert(integrityService.includes('before.playerChildren === 0'));
assert(integrityService.includes('renderDock({ keepPlaying: true, integrityRepair: true, skipIntegritySchedule: true });'));
assert(app.includes("scheduleBottomPreviewIntegrityCheck('layout-sync');"));
assert(app.includes("scheduleBottomPreviewIntegrityCheck('ui-mode-layout-change');"));
assert(integrityService.includes('global.FoxBearDockDiagnostics = diagnostics;'));
assert(diagnostics.includes('global.FoxBearDockDiagnostics?.getSnapshot?.()'));
assert(diagnostics.includes("warnings.push('dock-integrity-failed')"));

// Execute the service controller so fallback precedence cannot silently regress.
function runRecovery(seed, reason = 'qa') {
    const stateRef = {
        tracks: seed.tracks || [],
        selectedId: seed.selectedId ?? null,
        selectedIds: new Set(seed.selectedIds || []),
        bottomPreviewTrackId: seed.bottomPreviewTrackId ?? null,
        bottomPreviewLastRepairReason: '',
        bottomPreviewRepairCount: 0,
        bottomPreviewLastIntegrityAt: 0,
        bottomPreviewIntegrityRaf: 0
    };
    const applied = [];
    const fakeWindow = { setTimeout, clearTimeout };
    vm.runInNewContext(integrityService, { window: fakeWindow, globalThis: fakeWindow, console, Object, String, Array, Set, Date });
    const controller = fakeWindow.FoxBearBottomPreviewDockIntegrityService.createController({
        state: stateRef,
        document: { body: { classList: { contains: () => false } } },
        getSelectedTrack: () => stateRef.tracks.find(track => track.id === stateRef.selectedId) || null,
        applyTrackToControls: track => applied.push(track.id),
        getDock: () => null,
        getPlayer: () => null,
        requestAnimationFrame: callback => { callback(); return 1; },
        cancelAnimationFrame: () => {}
    });
    const result = controller.repairSelection(reason);
    return { state: stateRef, applied, result };
}
const tracks = [{ id: 'a' }, { id: 'b' }];
let recovered = runRecovery({ tracks, selectedId: 'stale', bottomPreviewTrackId: 'b', selectedIds: ['a'] }, 'dock-owner');
assert.strictEqual(recovered.result.id, 'b');
assert.strictEqual(recovered.state.selectedId, 'b');
assert.deepStrictEqual(recovered.applied, ['b']);
recovered = runRecovery({ tracks, selectedId: 'stale', bottomPreviewTrackId: 'gone', selectedIds: ['a'] }, 'selected-set');
assert.strictEqual(recovered.result.id, 'a');
assert.strictEqual(recovered.state.bottomPreviewTrackId, 'a');
recovered = runRecovery({ tracks, selectedId: 'stale', bottomPreviewTrackId: null, selectedIds: [] }, 'first-track');
assert.strictEqual(recovered.result.id, 'a');
recovered = runRecovery({ tracks, selectedId: 'b', bottomPreviewTrackId: 'a', selectedIds: ['a'] }, 'valid-selection');
assert.strictEqual(recovered.result.id, 'b');
assert.deepStrictEqual(recovered.applied, [], 'valid selection must not be rewritten');
recovered = runRecovery({ tracks: [], selectedId: 'stale', bottomPreviewTrackId: 'b', selectedIds: ['a'] }, 'empty');
assert.strictEqual(recovered.result, null);


// A visually healthy Dock that belongs to another track must be repaired.
{
    const stateRef = {
        tracks: [{ id: 'a' }, { id: 'b' }],
        selectedId: 'b',
        selectedIds: new Set(['b']),
        bottomPreviewTrackId: 'a',
        bottomPreviewLastRepairReason: '',
        bottomPreviewRepairCount: 0,
        bottomPreviewLastIntegrityAt: 0,
        bottomPreviewIntegrityRaf: 0
    };
    const classes = new Set(['show']);
    const dock = {
        classList: { contains: name => classes.has(name) },
        getAttribute: name => name === 'aria-hidden' ? 'false' : '',
        getBoundingClientRect: () => ({ width: 320, height: 88 })
    };
    const audio = { dataset: { trackId: 'a', bottomPreviewActive: 'true' } };
    const player = {
        children: [{}],
        dataset: { trackId: 'a' },
        querySelector: selector => selector.startsWith('audio') ? audio : null
    };
    let renderCount = 0;
    const fakeWindow = { setTimeout, clearTimeout };
    vm.runInNewContext(integrityService, { window: fakeWindow, globalThis: fakeWindow, console, Object, String, Array, Set, Date });
    const controller = fakeWindow.FoxBearBottomPreviewDockIntegrityService.createController({
        state: stateRef,
        document: { body: { classList: { contains: name => name === 'bottom-preview-active' } } },
        getSelectedTrack: () => stateRef.tracks.find(track => track.id === stateRef.selectedId) || null,
        getDock: () => dock,
        getPlayer: () => player,
        getComputedStyle: () => ({ display: 'block', visibility: 'visible', opacity: '1' }),
        renderDock: () => {
            renderCount += 1;
            stateRef.bottomPreviewTrackId = 'b';
            player.dataset.trackId = 'b';
            audio.dataset.trackId = 'b';
        }
    });
    const before = controller.getSnapshot();
    assert.strictEqual(before.healthy, false, 'stale Dock owner must not be reported healthy');
    assert.strictEqual(before.trackOwnerMatches, false);
    assert.strictEqual(before.selectedTrackId, 'b');
    assert.strictEqual(before.dockTrackId, 'a');
    assert.strictEqual(before.playerTrackId, 'a');
    const after = controller.repair('stale-owner');
    assert.strictEqual(renderCount, 1, 'stale Dock owner must force a re-render');
    assert.strictEqual(after.trackOwnerMatches, true);
    assert.strictEqual(after.healthy, true);
}

console.log('PASS v1.6.93 mobile Dock visibility + active-track integrity recovery contract');
