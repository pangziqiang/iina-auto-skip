const keybindInput = document.getElementById('keybindInput');
const validationInfo = document.getElementById('validationInfo');
const overlayKeybindInput = document.getElementById('overlayKeybindInput');
const overlayValidationInfo = document.getElementById('overlayValidationInfo');
const autoFocusToggle = document.getElementById('autoFocusToggle');

const MODIFIERS = {
  meta: 'Meta',
  ctrl: 'Ctrl',
  alt: 'Alt',
  shift: 'Shift'
};

const SPECIAL_KEYS = new Set([
  "ENTER", "TAB", "SPACE", "ESC", "BS", "LEFT", "RIGHT", "UP", "DOWN",
  "KP_DEL", "DEL", "KP_INS", "INS", "HOME", "END", "PGUP", "PGDWN", "PRINT",
  "F1", "F2", "F3", "F4", "F5", "F6", "F7", "F8", "F9", "F10", "F11", "F12"
]);

let conflictingBind = null;
let saveKeybindTimeout = null;
let saveAutoFocusTimeout = null;

function sanitizeInput(e, sanitizeFn) {
  const input = e.target;
  const { value: inputValue, selectionStart: pos } = input;

  const clean = sanitizeFn(inputValue);

  if (inputValue !== clean) {
    const cleanPos = sanitizeFn(inputValue.slice(0, pos)).length;
    input.value = clean;
    input.setSelectionRange(cleanPos, cleanPos);
  }

  return clean;
}

function sanitizeKeybind(input) {
  input = input.replace(/^\++/, '').replace(/\+{2,}/g, '+').replace(/\s+/g, '');
  if (!input) return "";

  const parts = input.split('+');
  const danglingPart = parts.pop();

  const seen = new Set();
  const resultParts = [];
  parts.forEach(part => {
    const lowerPart = part.toLowerCase();

    if (part !== "" && !seen.has(lowerPart)) {
      seen.add(lowerPart);
      resultParts.push(part);
    }
  });

  return [...resultParts, danglingPart].join('+');
}

function normalizeKeybind(key) {
  if (!key) return '';

  const parts = key.split('+');
  let actualKey = parts.pop();
  const upperKey = actualKey.toUpperCase();
  actualKey = SPECIAL_KEYS.has(upperKey) ? upperKey : actualKey;

  if (!parts.length) return actualKey;

  const partsSet = new Set(parts.map(p => p.toLowerCase()));

  const normalizedModifiers = Object.keys(MODIFIERS)
    .filter(key => partsSet.has(key))
    .map(key => MODIFIERS[key]);

  return [...normalizedModifiers, actualKey].join('+');
}

function invalidKeybindMessage(key) {
  if (!key) return "";
  if (key.endsWith('+')) return "无效格式：末尾多余 +";

  const parts = key.split('+');
  const actualKey = parts.pop();

  if (MODIFIERS[actualKey.toLowerCase()]) return "无效格式：末尾为修饰键";

  const invalidMods = parts.filter(p => !MODIFIERS[p.toLowerCase()]);
  if (invalidMods.length > 0) return `未知修饰键：${invalidMods.join(', ')}`;

  if (actualKey.length > 1 && !SPECIAL_KEYS.has(actualKey.toUpperCase())) {
    return `可能无效的按键：${actualKey}`;
  }

  return "";
}

function updateValidationInfo(className, message) {
  validationInfo.textContent = message;
  validationInfo.className = `info-box ${className}`;
}

function validateKeybind(input) {
  const msg = invalidKeybindMessage(input);
  if (!input) {
    updateValidationInfo('info', "ⓘ 快捷键已禁用");
  } else if (!msg) {
    updateValidationInfo('valid', '✓ 快捷键有效');
  } else if (msg.startsWith("可能无效的")) {
    updateValidationInfo('warning', "⚠ " + msg);
  } else {
    updateValidationInfo('error', "⚠ " + msg);
    return false;
  }

  return true;
}

function validateConflict(normalized) {
  if (!normalized || normalized !== conflictingBind) return false;

  updateValidationInfo('error', "⚠ 快捷键已被占用");
  return true;
}

keybindInput.addEventListener('input', e => {
  clearTimeout(saveKeybindTimeout);

  const input = sanitizeInput(e, sanitizeKeybind);
  if (!validateKeybind(input)) return;

  const normalized = normalizeKeybind(input);
  const conflicting = validateConflict(normalized);

  saveKeybindTimeout = setTimeout(() => {
    iina.preferences.set("keybind", normalized);
    iina.preferences.set("bindConflict", conflicting);
    saveKeybindTimeout = null;
  }, 200);
});

autoFocusToggle.addEventListener('change', () => {
  clearTimeout(saveAutoFocusTimeout);
  saveAutoFocusTimeout = setTimeout(() => {
    iina.preferences.set("autoFocus", autoFocusToggle.checked);
    saveAutoFocusTimeout = null;
  }, 200);
});

{
  const keybind = iina.preferences.get("keybind") || "";
  const hasConflict = iina.preferences.get("bindConflict");
  if (hasConflict) conflictingBind = keybind;
  const clean = sanitizeKeybind(keybind);
  keybindInput.value = clean;
  if (validateKeybind(clean)) {
    validateConflict(clean);
  }
}

iina.preferences.get("autoFocus", value => {
  autoFocusToggle.checked = value !== false;
});

// Standalone window toggle
const standaloneToggle = document.getElementById('standaloneToggle')
standaloneToggle.addEventListener('change', () => {
  iina.preferences.set("useStandaloneWindow", standaloneToggle.checked);
  iina.preferences.sync();
});
standaloneToggle.checked = iina.preferences.get("useStandaloneWindow") === true;

// Overlay keybind
overlayKeybindInput.addEventListener('input', e => {
  clearTimeout(saveKeybindTimeout);

  const input = sanitizeInput(e, sanitizeKeybind);
  overlayValidationInfo.textContent = input ? '✓ 快捷键有效' : 'ⓘ 快捷键已禁用';
  overlayValidationInfo.className = `info-box ${input ? 'valid' : 'info'}`;

  const normalized = normalizeKeybind(input);
  saveKeybindTimeout = setTimeout(() => {
    iina.preferences.set("overlayKeybind", normalized);
    saveKeybindTimeout = null;
  }, 200);
});

{
  const raw = iina.preferences.get("overlayKeybind");
  const clean = sanitizeKeybind(raw || "");
  overlayKeybindInput.value = clean;
  overlayValidationInfo.textContent = clean ? '✓ 快捷键有效' : 'ⓘ 快捷键已禁用';
  overlayValidationInfo.className = `info-box ${clean ? 'valid' : 'info'}`;
}
