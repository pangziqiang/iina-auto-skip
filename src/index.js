const { mpv, menu, input, preferences, sidebar, event, console } = iina;

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

let config = {
  enabled: false,
  introDuration: 0,
  outroDuration: 0
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
    menu.item("自动跳过", () => states.sidebarVisible ? sidebar.hide() : sidebar.show(), options)
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
    enabled: !!newConfig.enabled,
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

  // Skip outro: seek near end to trigger natural EOF + next file
  if (config.outroDuration > 0) {
    const outroPoint = duration - config.outroDuration;
    if (pos >= outroPoint && pos < duration) {
      states.skipInProgress = true;
      const nearEnd = Math.max(0, duration - 0.3);
      mpv.command("seek", [nearEnd.toString(), "absolute"]);
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

  registerMenuItem();

  console.log("自动跳过 插件已加载");
});
