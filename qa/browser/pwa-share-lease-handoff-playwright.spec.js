// @ts-check
'use strict';
const { test, expect } = require('@playwright/test');

const DB_NAME = 'foxbear-mobile-native-share-v1';
const STORE_NAME = 'sharedFiles';

async function resetShareStorage(page) {
  await page.goto('/qa/browser/fixtures/pwa-share-target-harness.html');
  await page.evaluate(async ({ dbName }) => {
    localStorage.removeItem('foxbear-harness-import-count');
    await new Promise(resolve => {
      const request = indexedDB.deleteDatabase(dbName);
      request.onsuccess = request.onerror = request.onblocked = () => resolve();
    });
  }, { dbName: DB_NAME });
}

async function putRecord(page, record) {
  await page.evaluate(async ({ dbName, storeName, record }) => {
    const db = await new Promise((resolve, reject) => {
      const request = indexedDB.open(dbName, 1);
      request.onupgradeneeded = () => request.result.createObjectStore(storeName, { keyPath: 'id' });
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    await new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      const file = new File([new Uint8Array([82, 73, 70, 70, 1, 2, 3, 4])], 'shared.wav', { type: 'audio/wav' });
      tx.objectStore(storeName).put({ ...record, files: [file], totalBytes: file.size });
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  }, { dbName: DB_NAME, storeName: STORE_NAME, record });
}

async function readRecord(page, id) {
  return page.evaluate(async ({ dbName, storeName, id }) => {
    const db = await new Promise((resolve, reject) => {
      const request = indexedDB.open(dbName, 1);
      request.onupgradeneeded = () => request.result.createObjectStore(storeName, { keyPath: 'id' });
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const value = await new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readonly');
      const request = tx.objectStore(storeName).get(id);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
    db.close();
    return value && { id: value.id, claimOwner: value.claimOwner || '', claimExpiresAt: value.claimExpiresAt || 0 };
  }, { dbName: DB_NAME, storeName: STORE_NAME, id });
}

test.describe('PWA share lease, retry, Android boundary, and worker handoff', () => {
  test('success removes record only after import finishes', async ({ page }) => {
    await resetShareStorage(page);
    const id = `success-${Date.now()}`;
    await putRecord(page, { id, createdAt: Date.now() });
    await page.goto(`/qa/browser/fixtures/pwa-share-target-harness.html?foxbearSharedAudio=${encodeURIComponent(id)}&delay=120`);
    await expect(page.locator('body')).toHaveAttribute('data-done', 'true');
    const result = await page.evaluate(() => window.__FOXBEAR_SHARE_HARNESS_RESULT__);
    expect(result.result.ok).toBe(true);
    expect(result.href).not.toContain('foxbearSharedAudio');
    expect(await readRecord(page, id)).toBeNull();
  });

  test('failed import survives reload and succeeds on retry', async ({ page }) => {
    await resetShareStorage(page);
    const id = `retry-${Date.now()}`;
    await putRecord(page, { id, createdAt: Date.now() });
    const url = `/qa/browser/fixtures/pwa-share-target-harness.html?foxbearSharedAudio=${encodeURIComponent(id)}&failOnce=1`;
    await page.goto(url);
    await expect(page.locator('body')).toHaveAttribute('data-done', 'true');
    expect((await page.evaluate(() => window.__FOXBEAR_SHARE_HARNESS_RESULT__)).result.reason).toBe('import-failed');
    expect(await readRecord(page, id)).not.toBeNull();
    await page.reload();
    await expect(page.locator('body')).toHaveAttribute('data-done', 'true');
    expect((await page.evaluate(() => window.__FOXBEAR_SHARE_HARNESS_RESULT__)).result.ok).toBe(true);
    expect(await readRecord(page, id)).toBeNull();
  });

  test('two tabs cannot import the same share id twice', async ({ page, context }) => {
    await resetShareStorage(page);
    const id = `race-${Date.now()}`;
    await putRecord(page, { id, createdAt: Date.now() });
    const second = await context.newPage();
    const url = `/qa/browser/fixtures/pwa-share-target-harness.html?foxbearSharedAudio=${encodeURIComponent(id)}&delay=350`;
    await Promise.all([page.goto(url), second.goto(url)]);
    await Promise.all([
      expect(page.locator('body')).toHaveAttribute('data-done', 'true'),
      expect(second.locator('body')).toHaveAttribute('data-done', 'true')
    ]);
    const results = await Promise.all([
      page.evaluate(() => window.__FOXBEAR_SHARE_HARNESS_RESULT__.result),
      second.evaluate(() => window.__FOXBEAR_SHARE_HARNESS_RESULT__.result)
    ]);
    expect(results.filter(result => result.ok).length).toBe(1);
    expect(results.some(result => result.reason === 'claimed-by-other-tab')).toBe(true);
    expect(await page.evaluate(() => Number(localStorage.getItem('foxbear-harness-import-count') || 0))).toBe(1);
  });

  test('forced IndexedDB deletion is recreated without consuming the launch query', async ({ page }) => {
    await resetShareStorage(page);
    const id = `deleted-${Date.now()}`;
    await putRecord(page, { id, createdAt: Date.now() });
    await page.evaluate(async dbName => {
      await new Promise(resolve => {
        const request = indexedDB.deleteDatabase(dbName);
        request.onsuccess = request.onerror = request.onblocked = () => resolve();
      });
    }, DB_NAME);
    await page.goto(`/qa/browser/fixtures/pwa-share-target-harness.html?foxbearSharedAudio=${encodeURIComponent(id)}`);
    await expect(page.locator('body')).toHaveAttribute('data-done', 'true');
    const result = await page.evaluate(() => window.__FOXBEAR_SHARE_HARNESS_RESULT__);
    expect(result.result.reason).toBe('missing');
    expect(result.href).not.toContain('foxbearSharedAudio');
    const recreated = await page.evaluate(async ({ dbName, storeName }) => {
      const db = await new Promise((resolve, reject) => {
        const request = indexedDB.open(dbName, 1);
        request.onupgradeneeded = () => request.result.createObjectStore(storeName, { keyPath: 'id' });
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      const exists = db.objectStoreNames.contains(storeName);
      db.close();
      return exists;
    }, { dbName: DB_NAME, storeName: STORE_NAME });
    expect(recreated).toBe(true);
  });

  test('Android-sized policy accepts 12 files at 512 MiB and rejects overflow safely', async ({ page }) => {
    await resetShareStorage(page);
    const boundary = await page.evaluate(() => {
      const policy = window.FoxBearPwaSharePolicy.createPolicy();
      const MiB = 1024 * 1024;
      const sizes = Array.from({ length: 12 }, (_, index) => index === 11 ? 50 * MiB : 42 * MiB);
      const exact = window.FoxBearPwaSharePolicy.selectFiles(sizes.map((size, index) => ({ name: `${index}.wav`, type: 'audio/wav', size })), policy);
      const overflowCount = window.FoxBearPwaSharePolicy.selectFiles([...sizes, 1].map((size, index) => ({ name: `${index}.wav`, type: 'audio/wav', size })), policy);
      const overflowBytes = window.FoxBearPwaSharePolicy.selectFiles([{ name: 'too-large.wav', type: 'audio/wav', size: 220 * MiB }, { name: 'a.wav', type: 'audio/wav', size: 220 * MiB }, { name: 'b.wav', type: 'audio/wav', size: 73 * MiB }], policy);
      return { exactCount: exact.files.length, exactBytes: exact.totalBytes, countRejected: overflowCount.rejected, overflowAccepted: overflowBytes.files.length, overflowRejected: overflowBytes.rejected };
    });
    expect(boundary.exactCount).toBe(12);
    expect(boundary.exactBytes).toBe(512 * 1024 * 1024);
    expect(boundary.countRejected).toBe(1);
    expect(boundary.overflowAccepted).toBe(2);
    expect(boundary.overflowRejected).toBe(1);
  });

  test('service-worker activation preserves records and releases expired leases', async ({ page }) => {
    await resetShareStorage(page);
    const id = `handoff-${Date.now()}`;
    await putRecord(page, { id, createdAt: Date.now(), claimOwner: 'dead-tab', claimExpiresAt: Date.now() - 1000 });
    const payloadPromise = page.evaluate(() => new Promise(resolve => {
      navigator.serviceWorker.addEventListener('message', event => {
        if (event.data?.type === 'FOXBEAR_SHARE_HANDOFF_READY') resolve(event.data);
      }, { once: true });
      navigator.serviceWorker.register(`/sw.js?handoff=${Date.now()}`).then(registration => registration.update());
    }));
    const payload = await payloadPromise;
    expect(payload.schemaVersion).toBe(2);
    const record = await readRecord(page, id);
    expect(record).not.toBeNull();
    expect(record.claimOwner).toBe('');
  });
});
