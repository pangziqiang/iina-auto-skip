const { mpv, menu, input, preferences, event, console, overlay, standaloneWindow, core } = iina;

const PluginEvent = {
  INIT: 'auto-skip-init',
  SAVE: 'auto-skip-save',
  LOG: 'auto-skip-log'
}

const OverlayEvent = {
  INIT: 'overlay-init',
  SEEK: 'overlay-seek',
  SAVE: 'overlay-save',
  HIDE: 'overlay-hide',
  TIME: 'overlay-time',
  PAUSE: 'overlay-pause'
}

let config = {
  enabled: false,
  introDuration: 0,
  outroDuration: 0,
  skipInProgress: false
}

let overlayVisible = false
let overlayInitPos = 0
let overlayWasPlaying = false
let windowCreated = false

function toggleOverlay() {
  overlayVisible ? hideOverlay() : showOverlay()
}

function registerOverlayHandlers() {
  overlay.onMessage(OverlayEvent.SEEK, overlaySeek);
  overlay.onMessage(OverlayEvent.PAUSE, overlayPause);
  overlay.onMessage(OverlayEvent.SAVE, overlaySave);
  overlay.onMessage('overlay-save-keep', overlaySaveKeep);
  overlay.onMessage(OverlayEvent.HIDE, hideOverlay);
}

function addLog(message) {
  if (windowCreated) standaloneWindow.postMessage(PluginEvent.LOG, { message });
}

function syncPanel() {
  if (!windowCreated) return
  standaloneWindow.postMessage(PluginEvent.INIT, {
    enabled: config.enabled,
    introDuration: config.introDuration,
    outroDuration: config.outroDuration,
    autoFocus: preferences.get("autoFocus") !== false
  });
}

function positionWindow() {
  try {
    const pf = core.window.frame
    if (!pf) return
    const screens = core.window.screens
    if (!screens) { standaloneWindow.setFrame(380, 800, pf.x + pf.width + 5, pf.y); return }
    const cur = screens.find(s => s.current)
    const sf = cur ? cur.frame : null
    const W = 380, GAP = 5
    let x = pf.x + pf.width + GAP
    if (sf && x + W > sf.x + sf.width) {
      x = pf.x - W - GAP
    }
    standaloneWindow.setFrame(W, 800, x, pf.y)
  } catch (e) {}
}

function togglePanel() {
  if (!windowCreated) {
    standaloneWindow.loadFile("src/settings.html")
    standaloneWindow.onMessage(PluginEvent.SAVE, (newConfig) => { saveConfig(newConfig); });
    standaloneWindow.onMessage('overlay-open', () => { showOverlay(); });
    standaloneWindow.onMessage('ready', () => { syncPanel(); });

    standaloneWindow.setProperty({ title: "自动跳过", resizable: false, fullSizeContentView: true })
    windowCreated = true
  }
  if (standaloneWindow.isOpen()) {
    pinned = false
    stopPinTimer()
    standaloneWindow.close()
  } else {
    positionWindow()
    standaloneWindow.open()
  }
}

function showOverlay() {
  if (typeof overlay === 'undefined') {
    console.log("ERROR: overlay API is undefined")
    return
  }
  const duration = parseFloat(mpv.getString("duration"))
  overlayInitPos = parseFloat(mpv.getString("time-pos")) || 0
  overlayWasPlaying = !mpv.getFlag("pause")
  mpv.set("pause", true)
  try {
    overlay.loadFile("src/overlay.html")
    overlay.setClickable(true)
  } catch (e) {
    console.log("overlay setup error: " + e.message)
    return
  }
  overlayVisible = true
  startOverlayTimeSync()
  setTimeout(() => {
    if (!overlayVisible) return
    try {
      registerOverlayHandlers()
      overlay.show()
      overlay.postMessage(OverlayEvent.INIT, {
        duration: isNaN(duration) || duration <= 0 ? 0 : parseInt(duration, 10),
        introDuration: config.introDuration,
        outroDuration: config.outroDuration,
        currentPos: parseInt(parseFloat(mpv.getString("time-pos")), 10) || 0,
        enabled: config.enabled,
        overlayKey: preferences.get("overlayKeybind") || ""
      })
    } catch (e) {
      console.log("overlay show/postMessage error: " + e.message)
    }
  }, 500)
}

function hideOverlay() {
  overlay.hide()
  overlayVisible = false
  stopOverlayTimeSync()
  if (overlayInitPos > 0) {
    mpv.command("seek", [overlayInitPos.toString(), "absolute"])
  }
  if (overlayWasPlaying) {
    mpv.set("pause", false)
  }
}

let overlayTimeSyncInterval = null

function startOverlayTimeSync() {
  stopOverlayTimeSync()
  overlayTimeSyncInterval = setInterval(() => {
    if (!overlayVisible) { stopOverlayTimeSync(); return }
    const pos = parseInt(parseFloat(mpv.getString("time-pos")), 10) || 0
    overlay.postMessage(OverlayEvent.TIME, pos)
  }, 500)
}

function stopOverlayTimeSync() {
  if (overlayTimeSyncInterval) {
    clearInterval(overlayTimeSyncInterval)
    overlayTimeSyncInterval = null
  }
}

function overlaySeek(time) {
  mpv.set("time-pos", time)
  if (overlayVisible) {
    overlay.postMessage(OverlayEvent.TIME, time)
  }
}

function overlayPause() {
  mpv.set("pause", true)
}

function overlaySave(newConfig) {
  saveConfig(newConfig)
  addLog(`可视化设置：片头 ${formatTimeStr(newConfig.introDuration)}，片尾 ${formatTimeStr(newConfig.outroDuration)}`)
  syncPanel()
  hideOverlay()
}

function overlaySaveKeep(newConfig) {
  saveConfig(newConfig)
  addLog(`已保存：片头 ${formatTimeStr(newConfig.introDuration)}，片尾 ${formatTimeStr(newConfig.outroDuration)}`)
  syncPanel()
}

function resetSkipFlag() {
  config.skipInProgress = false;
}

function registerMenuItem() {
  const keybind = preferences.get("keybind");
  const options = {};
  let hasConflict = false;

  if (keybind) {
    const kc = input.normalizeKeyCode(keybind);
    hasConflict = !!input.getAllKeyBindings()[kc];
    if (!hasConflict) options.keyBinding = keybind;
  }

  preferences.set("bindConflict", hasConflict);
  preferences.sync();

  menu.addItem(
    menu.item("自动跳过", () => togglePanel(), options)
  );

  const overlayKeybind = preferences.get("overlayKeybind");
  const overlayOptions = {};
  if (overlayKeybind) {
    const kc = input.normalizeKeyCode(overlayKeybind);
    if (!input.getAllKeyBindings()[kc]) {
      overlayOptions.keyBinding = overlayKeybind;
    }
  }

  menu.addItem(
    menu.item("可视化设置", () => { overlayVisible ? hideOverlay() : showOverlay() }, overlayOptions)
  );
}

function loadConfig() {
  const saved = preferences.get("skipConfig");
  if (saved && typeof saved === 'object') {
    config = {
      enabled: !!saved.enabled,
      introDuration: Math.max(0, parseInt(saved.introDuration, 10) || 0),
      outroDuration: Math.max(0, parseInt(saved.outroDuration, 10) || 0)
    }
  }
}

function saveConfig(newConfig) {
  config = {
    enabled: newConfig.hasOwnProperty('enabled') ? !!newConfig.enabled : config.enabled,
    introDuration: Math.max(0, parseInt(newConfig.introDuration, 10) || 0),
    outroDuration: Math.max(0, parseInt(newConfig.outroDuration, 10) || 0)
  }
  preferences.set("skipConfig", config);
  preferences.sync();
}

function formatTimeStr(totalSeconds) {
  const sec = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(sec / 3600);
  const m = Math.floor(sec % 3600 / 60);
  const s = sec % 60;
  const pad = n => String(n).padStart(2, '0');
  if (h > 0) return `${pad(h)}:${pad(m)}:${pad(s)}`;
  return `${pad(m)}:${pad(s)}`;
}

function checkSkipPosition() {
  if (!config.enabled || config.skipInProgress) return;

  const pos = parseFloat(mpv.getString("time-pos"));
  if (isNaN(pos) || pos < 0) return;

  const duration = parseFloat(mpv.getString("duration"));
  if (isNaN(duration) || duration <= 0) return;

  if (config.introDuration > 0 && pos < config.introDuration) {
    config.skipInProgress = true;
    mpv.command("seek", [config.introDuration.toString(), "absolute"]);
    addLog(`已跳过片头 ${formatTimeStr(config.introDuration)}`);
    setTimeout(resetSkipFlag, 500);
    return;
  }

  if (config.outroDuration > 0) {
    const outroPoint = duration - config.outroDuration;
    if (pos >= outroPoint && pos < duration) {
      config.skipInProgress = true;
      mpv.command("seek", [duration.toString(), "absolute"]);
      addLog(`已跳过片尾 ${formatTimeStr(config.outroDuration)}`);
      setTimeout(resetSkipFlag, 500);
    }
  }
}

function fileLoaded() {
  config.skipInProgress = false;
}

event.on("iina.window-loaded", () => {
  loadConfig();

  event.on("mpv.time-pos.changed", checkSkipPosition);
  event.on("iina.file-loaded", fileLoaded);

  registerMenuItem();

  input.onKeyDown('ESC', () => {
    if (overlayVisible) { hideOverlay(); return true }
  }, input.PRIORITY_HIGH);

  console.log("自动跳过 插件已加载");
});
