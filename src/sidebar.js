const els = {
  enableToggle: document.getElementById('enableToggle'),
  introH: document.getElementById('introH'),
  introM: document.getElementById('introM'),
  introS: document.getElementById('introS'),
  outroH: document.getElementById('outroH'),
  outroM: document.getElementById('outroM'),
  outroS: document.getElementById('outroS'),
  saveBtn: document.getElementById('saveBtn'),
  visualBtn: document.getElementById('visualBtn'),
  statusMsg: document.getElementById('statusMsg'),
  logContainer: document.getElementById('logContainer')
}

const PluginEvent = {
  INIT: 'auto-skip-init',
  SAVE: 'auto-skip-save',
  LOG: 'auto-skip-log',
  VISIBILITY: 'auto-skip-visible'
}

let autoFocusEnabled = true

function sanitizeNumber(value) {
  return value.replace(/[^0-9]/g, '');
}

function showStatus(msg, type) {
  els.statusMsg.textContent = msg;
  els.statusMsg.className = 'status-msg ' + type;
  setTimeout(() => { els.statusMsg.className = 'status-msg'; }, 3000);
}

function getTotalSeconds(h, m, s) {
  return (parseInt(h, 10) || 0) * 3600 + (parseInt(m, 10) || 0) * 60 + (parseInt(s, 10) || 0);
}

function setTimeBoxes(hEl, mEl, sEl, totalSeconds) {
  const sec = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(sec / 3600);
  const m = Math.floor(sec % 3600 / 60);
  const s = sec % 60;
  hEl.value = h > 0 ? h : '';
  mEl.value = m > 0 ? m : '';
  sEl.value = s > 0 ? s : (totalSeconds > 0 ? '0' : '');
}

function getIntroSeconds() {
  return getTotalSeconds(els.introH.value, els.introM.value, els.introS.value);
}

function getOutroSeconds() {
  return getTotalSeconds(els.outroH.value, els.outroM.value, els.outroS.value);
}

function setIntroBoxes(totalSeconds) {
  setTimeBoxes(els.introH, els.introM, els.introS, totalSeconds);
}

function setOutroBoxes(totalSeconds) {
  setTimeBoxes(els.outroH, els.outroM, els.outroS, totalSeconds);
}

function setupAutoFocus(input, nextInput) {
  input.addEventListener('input', () => {
    if (!autoFocusEnabled) return;
    const clean = sanitizeNumber(input.value);
    if (clean.length >= 2 && nextInput) {
      nextInput.focus();
      nextInput.select();
    }
  });
}

// Sanitize all time inputs
[els.introH, els.introM, els.introS, els.outroH, els.outroM, els.outroS].forEach(input => {
  input.addEventListener('input', (e) => {
    e.target.value = sanitizeNumber(e.target.value);
  });
});

// Auto focus jump: hour→minute, minute→second
setupAutoFocus(els.introH, els.introM);
setupAutoFocus(els.introM, els.introS);
setupAutoFocus(els.outroH, els.outroM);
setupAutoFocus(els.outroM, els.outroS);

els.saveBtn.addEventListener('click', saveSettings);

els.visualBtn.addEventListener('click', () => {
  iina.postMessage('overlay-open', null)
});

els.enableToggle.addEventListener('change', () => {
  // saved on button click
});

iina.onMessage(PluginEvent.INIT, ({ enabled, introDuration, outroDuration, autoFocus }) => {
  autoFocusEnabled = autoFocus !== false;
  els.enableToggle.checked = enabled;
  setIntroBoxes(introDuration);
  setOutroBoxes(outroDuration);
});

iina.onMessage(PluginEvent.LOG, ({ message }) => {
  if (els.logContainer.querySelector('.empty-state'))
    els.logContainer.replaceChildren();

  const div = document.createElement('div');
  div.className = 'log-item';
  div.textContent = '> ' + message;
  els.logContainer.prepend(div);

  while (els.logContainer.childElementCount > 20)
    els.logContainer.lastElementChild.remove();
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') saveSettings();
});

function saveSettings() {
  const config = {
    enabled: els.enableToggle.checked,
    introDuration: getIntroSeconds(),
    outroDuration: getOutroSeconds()
  };

  iina.postMessage(PluginEvent.SAVE, config);
  showStatus('已保存', 'success');
}

document.addEventListener('visibilitychange', () => {
  iina.postMessage(PluginEvent.VISIBILITY, !document.hidden);
});
