let lang = 'zh'
if (typeof navigator !== 'undefined' && navigator.language) {
  lang = navigator.language.startsWith('zh') ? 'zh' : 'en'
} else if (typeof utils !== 'undefined') {
  try {
    const locales = utils.preferredLocalizations()
    lang = (locales && locales.length > 0 && locales[0].startsWith('zh')) ? 'zh' : 'en'
  } catch (e) {}
}

const strings = {
  'settings.title': { zh: '自动跳过', en: 'Auto Skip' },
  'settings.enable': { zh: '启用自动跳过', en: 'Enable Auto Skip' },
  'settings.intro': { zh: '跳过片头', en: 'Skip Intro' },
  'settings.outro': { zh: '跳过片尾', en: 'Skip Outro' },
  'settings.outroHint': { zh: '在结尾前停止', en: 'Stop before the end' },
  'settings.save': { zh: '保存设置', en: 'Save Settings' },
  'settings.visual': { zh: '可视化设置', en: 'Visual Setting' },
  'settings.log': { zh: '跳过日志', en: 'Skip Log' },
  'settings.emptyLog': { zh: '暂无记录', en: 'No records' },
  'settings.saved': { zh: '已保存', en: 'Saved' },
  'overlay.hint': { zh: '按 ESC 关闭（不保存）', en: 'Press ESC to close (no save)' },
  'overlay.dragHint': { zh: '拖动 I(片头) 和 O(片尾) 设置跳过区间', en: 'Drag I(Intro) and O(Outro) to set skip range' },
  'overlay.currentPos': { zh: '当前位置', en: 'Current' },
  'overlay.introTag': { zh: '片头', en: 'Intro' },
  'overlay.outroTag': { zh: '片尾', en: 'Outro' },
  'overlay.cancel': { zh: '取消', en: 'Cancel' },
  'overlay.saveClose': { zh: '保存并关闭', en: 'Save & Close' },
  'overlay.saveKeep': { zh: '保存', en: 'Save' },
  'overlay.noVideo': { zh: '暂无视频', en: 'No video' },
  'overlay.tooShort': { zh: '视频过短', en: 'Video too short' },
  'overlay.idleHint': { zh: '鼠标移入即可调整', en: 'Hover to adjust' },
  'overlay.capturedIntro': { zh: '已捕获片头 {time}', en: 'Intro captured at {time}' },
  'overlay.capturedOutro': { zh: '已捕获片尾 {time}', en: 'Outro captured at {time}' },
  'pref.sidebarKey': { zh: '侧边栏快捷键', en: 'Sidebar Shortcut' },
  'pref.overlayKey': { zh: '可视化设置快捷键', en: 'Visual Setting Shortcut' },
  'pref.autoFocus': { zh: '输入框自动跳转', en: 'Auto Focus Input' },
  'pref.autoFocusHint': { zh: '开启后，在时/分/秒框中输入两位数字自动跳至下一框', en: 'Auto-advance to next input after 2 digits' },
  'pref.restartHint': { zh: 'ⓘ 快捷键修改需要重启 IINA 才能生效', en: 'ⓘ Changes take effect after restarting IINA' },
  'pref.keyValid': { zh: '✓ 快捷键有效', en: '✓ Shortcut valid' },
  'pref.keyDisabled': { zh: 'ⓘ 快捷键已禁用', en: 'ⓘ Shortcut disabled' },
  'pref.formatLabel': { zh: '格式', en: 'Format' },
  'pref.formatExample': { zh: '修饰键+按键（例如 s、Ctrl+Shift+L）', en: 'Modifier+Key (e.g. s, Ctrl+Shift+L)' },
  'pref.modifiers': { zh: '修饰键', en: 'Modifiers' },
  'pref.modifiersList': { zh: 'Meta (⌘)、Ctrl、Alt、Shift', en: 'Meta (⌘), Ctrl, Alt, Shift' },
  'pref.emptyHint': { zh: '留空可禁用快捷键', en: 'Leave empty to disable shortcut' },
  'skip.introSkipped': { zh: '已跳过片头 {time}', en: 'Intro skipped ({time})' },
  'skip.outroSkipped': { zh: '已跳过片尾 {time}', en: 'Outro skipped ({time})' },
  'skip.visualSaved': { zh: '可视化设置：片头 {intro}，片尾 {outro}', en: 'Visual set: intro {intro}, outro {outro}' },
  'skip.saved': { zh: '已保存：片头 {intro}，片尾 {outro}', en: 'Saved: intro {intro}, outro {outro}' },
  'menu.autoSkip': { zh: '自动跳过', en: 'Auto Skip' },
  'menu.visualSetting': { zh: '可视化设置', en: 'Visual Setting' },
}

function _(key, params) {
  let s = strings[key]
  if (!s) return key
  let t = s[lang] || s.en || key
  if (params) {
    for (const k in params) {
      t = t.replace(`{${k}}`, params[k])
    }
  }
  return t
}

function translatePage(root) {
  root = root || document
  root.querySelectorAll('[data-i18n]').forEach(el => {
    el.textContent = _(el.getAttribute('data-i18n'))
  })
  root.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    el.placeholder = _(el.getAttribute('data-i18n-placeholder'))
  })
}
