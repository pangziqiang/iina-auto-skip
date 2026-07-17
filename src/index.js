const { mpv, menu, input, preferences, sidebar, event, console, overlay } = iina;

const PluginEvent = {
  INIT: 'auto-skip-init',
  SAVE: 'auto-skip-save',
  LOG: 'auto-skip-log',
  VISIBILITY: 'auto-skip-visible'
}

const states = {
  sidebarVisible: false,
  skipInProgress: false
}

const OverlayEvent = {
  INIT: 'overlay-init',
  SEEK: 'overlay-seek',
  SAVE: 'overlay-save',
  HIDE: 'overlay-hide',
  TIME: 'overlay-time',
  PAUSE: 'overlay-pause',
  RESUME: 'overlay-resume'
}

let config = {
  enabled: false,
  introDuration: 0,
  outroDuration: 0
}

let overlayVisible = false
let overlayInitPos = 0
let captureIntroKey = 'I'
let captureOutroKey = 'O'

function captureIntro() {
  const pos = parseFloat(mpv.getString("time-pos"))
  if (isNaN(pos) || pos < 0) return
  saveConfig({ introDuration: Math.floor(pos) })
  mpv.command("show-text", [`已捕获片头 ${formatTimeStr(pos)}`, "3000", "0"])
  syncSidebar()
}

function captureOutro() {
  const pos = parseFloat(mpv.getString("time-pos"))
  const duration = parseFloat(mpv.getString("duration"))
  if (isNaN(pos) || pos < 0) return
  if (isNaN(duration) || duration <= 0) return
  if (pos >= duration) {
    saveConfig({ outroDuration: 0 })
    mpv.command("show-text", ["已在视频结尾，片尾跳过设为 0", "3000", "0"])
    syncSidebar()
    return
  }
  if (config.introDuration > 0 && pos <= config.introDuration) {
    mpv.command("show-text", ["片尾必须在片头之后", "3000", "0"])
    return
  }
  const outroDuration = Math.floor(duration - pos)
  saveConfig({ outroDuration })
  mpv.command("show-text", [`已捕获片尾 ${formatTimeStr(outroDuration)}`, "3000", "0"])
  syncSidebar()
}

function syncSidebar() {
  if (!states.sidebarVisible) return
  sidebar.postMessage(PluginEvent.INIT, {
    enabled: config.enabled,
    introDuration: config.introDuration,
    outroDuration: config.outroDuration,
    autoFocus: preferences.get("autoFocus") !== false
  });
}

function loadCaptureKeys() {
  captureIntroKey = preferences.get("captureIntroKey") || "I"
  captureOutroKey = preferences.get("captureOutroKey") || "O"
}

function registerCaptureKeys() {
  input.onKeyDown(captureIntroKey, () => { captureIntro(); return true }, input.PRIORITY_LOW)
  input.onKeyDown(captureOutroKey, () => { captureOutro(); return true }, input.PRIORITY_LOW)
}

function toggleOverlay() {
  if (overlayVisible) {
    hideOverlay()
  } else {
    showOverlay()
  }
}

function registerOverlayHandlers() {
  overlay.onMessage(OverlayEvent.SEEK, overlaySeek);
  overlay.onMessage(OverlayEvent.PAUSE, overlayPause);
  overlay.onMessage(OverlayEvent.RESUME, overlayResume);
  overlay.onMessage(OverlayEvent.SAVE, overlaySave);
  overlay.onMessage(OverlayEvent.HIDE, hideOverlay);
}

function showOverlay() {
  if (typeof overlay === 'undefined') {
    console.log("ERROR: overlay API is undefined")
    return
  }
  const duration = parseFloat(mpv.getString("duration"))
  overlayInitPos = parseFloat(mpv.getString("time-pos")) || 0
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
    try {
      registerOverlayHandlers()
      overlay.show()
      overlay.postMessage(OverlayEvent.INIT, {
        duration: isNaN(duration) || duration <= 0 ? 0 : parseInt(duration, 10),
        introDuration: config.introDuration,
        outroDuration: config.outroDuration,
        currentPos: parseInt(parseFloat(mpv.getString("time-pos")), 10) || 0,
        enabled: config.enabled,
        overlayKey: preferences.get("overlayKeybind") || "v"
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
  mpv.set("pause", false)
  mpv.set("pause", true)
}

function overlayPause() {
  mpv.set("pause", true)
}

function overlayResume() {
  // not used - video stays paused in setting mode
}

function overlaySave(newConfig) {
  saveConfig(newConfig)
  addLog(`可视化设置：片头 ${formatTimeStr(newConfig.introDuration)}，片尾 ${formatTimeStr(newConfig.outroDuration)}`)
  hideOverlay()
}

function resetSkipFlag() {
  states.skipInProgress = false;
}

function addLog(message) {
  sidebar.postMessage(PluginEvent.LOG, { message });
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
    menu.item("自动跳过", () => {
      if (overlayVisible) {
        hideOverlay()
      } else {
        states.sidebarVisible ? sidebar.hide() : sidebar.show()
      }
    }, options)
  );

  const overlayKeybind = preferences.get("overlayKeybind") || "S";
  const overlayOptions = {};
  if (overlayKeybind) {
    const kc = input.normalizeKeyCode(overlayKeybind);
    if (!input.getAllKeyBindings()[kc]) {
      overlayOptions.keyBinding = overlayKeybind;
    }
  }

  menu.addItem(
    menu.item("可视化设置", () => showOverlay(), overlayOptions)
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
  if (!config.enabled || states.skipInProgress) return;

  const pos = parseFloat(mpv.getString("time-pos"));
  if (isNaN(pos) || pos < 0) return;

  const duration = parseFloat(mpv.getString("duration"));
  if (isNaN(duration) || duration <= 0) return;

  // Skip intro
  if (config.introDuration > 0 && pos < config.introDuration) {
    states.skipInProgress = true;
    mpv.command("seek", [config.introDuration.toString(), "absolute"]);
    addLog(`已跳过片头 ${formatTimeStr(config.introDuration)}`);
    setTimeout(resetSkipFlag, 500);
    return;
  }

  // Skip outro: seek to end to trigger natural EOF + next file
  if (config.outroDuration > 0) {
    const outroPoint = duration - config.outroDuration;
    if (pos >= outroPoint && pos < duration) {
      states.skipInProgress = true;
      mpv.command("seek", [duration.toString(), "absolute"]);
      addLog(`已跳过片尾 ${formatTimeStr(config.outroDuration)}`);
      setTimeout(resetSkipFlag, 500);
    }
  }
}

function fileLoaded() {
  states.skipInProgress = false;
}

event.on("iina.window-loaded", () => {

  sidebar.loadFile("src/sidebar.html");

  loadConfig();

  // Register mpv event listeners once — they stay alive for the whole plugin lifecycle
  event.on("mpv.time-pos.changed", checkSkipPosition);
  event.on("iina.file-loaded", fileLoaded);

  sidebar.onMessage(PluginEvent.VISIBILITY, visible => {
    states.sidebarVisible = visible;
    if (!visible) return;

    sidebar.postMessage(PluginEvent.INIT, {
      enabled: config.enabled,
      introDuration: config.introDuration,
      outroDuration: config.outroDuration,
      autoFocus: preferences.get("autoFocus") !== false
    });
  });

  sidebar.onMessage(PluginEvent.SAVE, (newConfig) => {
    saveConfig(newConfig);
  });

  sidebar.onMessage('overlay-open', () => {
    showOverlay();
  });

  loadCaptureKeys();
  registerCaptureKeys();
  registerMenuItem();

  console.log("自动跳过 插件已加载");
});
