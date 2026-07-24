'use strict';

function stageBulkMasteringHudFixture(options = {}) {
  const required = selector => {
    const element = document.querySelector(selector);
    if (!element) throw new Error(`foxbear-fixture-missing:${selector}`);
    return element;
  };
  const total = Math.max(1, Number(options.total || 6));
  const currentIndex = Math.min(total - 1, Math.max(0, Number(options.currentIndex ?? 1)));
  const currentProgress = Math.min(100, Math.max(0, Number(options.currentProgress ?? 48)));
  const remainingText = String(options.remainingText || '약 1분 12초');
  const hud = required('#bulkImportHud');
  const title = required('#bulkImportHudTitle');
  const text = required('#bulkImportHudText');
  const list = required('#bulkImportHudList');
  const masterAll = required('#bulkImportHudMasterAll');
  const cancel = required('#bulkImportHudCancel');
  const retryFailed = required('#bulkImportHudRetryFailed');
  const filter = required('#bulkImportHudFilter');
  const filterWrap = filter.closest('.bulk-import-hud-filter-wrap');
  if (!filterWrap) throw new Error('foxbear-fixture-missing:.bulk-import-hud-filter-wrap');

  hud.classList.add('show', 'has-current-track');
  hud.setAttribute('aria-hidden', 'false');
  hud.dataset.phase = 'mastering';
  hud.dataset.complete = 'false';
  hud.dataset.foxbearQaFixture = 'bulk-mastering-v1586';
  title.textContent = `여러 곡 마스터링 · ${total}곡`;
  text.textContent = `현재 ${currentIndex + 1}/${total} · sample-${String(currentIndex + 1).padStart(2, '0')}.wav · ${currentProgress}% · 현재 곡 ${remainingText} 남음`;
  masterAll.hidden = true;
  cancel.hidden = false;
  retryFailed.hidden = true;
  filter.hidden = false;
  filterWrap.hidden = false;

  const rows = Array.from({ length: total }, (_, index) => {
    const isCurrent = index === currentIndex;
    const isDone = index < currentIndex;
    const progress = isDone ? 100 : isCurrent ? currentProgress : 0;
    const row = document.createElement('div');
    row.className = `bulk-import-row is-${isCurrent ? 'running is-current' : isDone ? 'done' : 'queued'}`;
    row.setAttribute('role', 'listitem');
    if (isCurrent) row.setAttribute('aria-current', 'step');

    const number = document.createElement('span');
    number.className = 'bulk-import-row-number';
    number.textContent = String(index + 1).padStart(2, '0');

    const main = document.createElement('span');
    main.className = 'bulk-import-row-main';
    const name = document.createElement('strong');
    name.textContent = `sample-${String(index + 1).padStart(2, '0')}.wav`;
    const detail = document.createElement('small');
    detail.textContent = isCurrent
      ? `마스터링 중 · 남은 ${remainingText}`
      : isDone
        ? '완료 · 소요 2분 03초'
        : `완료 예상 약 ${index + 2}분 후`;
    main.append(name, detail);

    const state = document.createElement('span');
    state.className = 'bulk-import-row-state';
    state.textContent = isCurrent ? '현재 진행' : isDone ? '완성' : '마스터링 대기';

    const meter = document.createElement('span');
    meter.className = 'bulk-import-row-meter';
    meter.setAttribute('role', 'progressbar');
    meter.setAttribute('aria-valuemin', '0');
    meter.setAttribute('aria-valuemax', '100');
    meter.setAttribute('aria-valuenow', String(progress));
    const meterFill = document.createElement('i');
    meterFill.style.width = `${progress}%`;
    meter.appendChild(meterFill);

    const percent = document.createElement('span');
    percent.className = 'bulk-import-row-percent';
    percent.textContent = `${progress}%`;

    row.append(number, main, state, meter, percent);
    return row;
  });
  list.replaceChildren(...rows);
  return { total, currentIndex, currentProgress, rowCount: list.children.length };
}

function stageDownloadOptionsFixture(options = {}) {
  const familyLabels = Array.isArray(options.familyLabels) && options.familyLabels.length
    ? options.familyLabels.map(String)
    : ['MP3', 'WAV'];
  const bitrates = Array.isArray(options.bitrates) && options.bitrates.length
    ? options.bitrates.map(value => Number(value)).filter(Number.isFinite)
    : [128, 192, 320];
  const fixtureId = String(options.fixtureId || 'download-options-v1586');
  document.querySelectorAll(`[data-foxbear-qa-fixture="${fixtureId}"]`).forEach(node => node.remove());
  document.body.classList.add('download-options-open');

  const sheet = document.createElement('section');
  sheet.className = 'download-options-panel download-options-panel-v1574';
  sheet.dataset.formatFamily = String(options.formatFamily || 'mp3');
  sheet.dataset.foxbearQaFixture = fixtureId;
  sheet.setAttribute('role', 'dialog');
  sheet.setAttribute('aria-modal', 'true');
  sheet.setAttribute('aria-label', String(options.ariaLabel || '다운로드 형식 선택'));

  const families = document.createElement('div');
  families.className = 'download-format-families';
  familyLabels.forEach((label, index) => {
    const button = document.createElement('button');
    button.className = `download-format-family${index === 0 ? ' current' : ''}`;
    button.type = 'button';
    button.textContent = label;
    button.setAttribute('aria-pressed', index === 0 ? 'true' : 'false');
    families.appendChild(button);
  });

  const optionsList = document.createElement('div');
  optionsList.className = 'download-options-list';
  for (const bitrate of bitrates) {
    const button = document.createElement('button');
    button.className = 'download-format-option';
    button.type = 'button';
    button.setAttribute('aria-label', `${bitrate} kbps`);
    const value = document.createElement('span');
    value.textContent = String(bitrate);
    const unit = document.createElement('b');
    unit.textContent = 'kbps';
    button.append(value, unit);
    optionsList.appendChild(button);
  }

  const actions = document.createElement('div');
  actions.className = 'download-options-actions download-options-actions-primary';
  const download = document.createElement('button');
  download.type = 'button';
  download.textContent = String(options.actionLabel || '선택 형식 다운로드');
  actions.appendChild(download);

  sheet.append(families, optionsList, actions);
  const backdrop = document.createElement('div');
  backdrop.className = 'download-options-backdrop';
  backdrop.dataset.foxbearQaFixture = fixtureId;
  backdrop.appendChild(sheet);
  document.body.appendChild(backdrop);
  return { familyCount: families.children.length, optionCount: optionsList.children.length, fixtureId };
}

module.exports = {
  stageBulkMasteringHudFixture,
  stageDownloadOptionsFixture
};
