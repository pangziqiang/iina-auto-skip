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
  'help.usage': { zh: '使用方法', en: 'Usage' },
  'help.usageDesc': { zh: '可通过以下方式打开设置窗口：', en: 'Open the settings window via:' },
  'help.menu1': { zh: '菜单：<strong>插件 → 自动跳过</strong>', en: 'Menu: <strong>Plugin → Auto Skip</strong>' },
  'help.menu2': { zh: '快捷键 <kbd>S</kbd> 开关设置窗口（可在<strong>偏好设置</strong>中修改）', en: 'Press <kbd>S</kbd> to toggle the settings window (customizable in <strong>Preferences</strong>)' },
  'help.features': { zh: '功能', en: 'Features' },
  'help.feature1': { zh: '<strong>设置面板</strong> — 独立窗口，不遮挡视频，可放在另一块屏幕', en: '<strong>Settings Panel</strong> — A standalone window that doesn\'t overlap the video' },
  'help.feature2': { zh: '<strong>可视化设定</strong> — 按 <kbd>A</kbd> 在视频上拖拽手柄设定片头片尾，实时预览', en: '<strong>Visual Setting</strong> — Press <kbd>A</kbd> to drag handles on the video, real-time preview' },
  'help.feature3': { zh: '<strong>中/英文自动切换</strong> — 跟随系统语言', en: '<strong>Chinese/English</strong> — Auto-detects system language' },
  'help.shortcuts': { zh: '快捷键', en: 'Shortcuts' },
  'help.shortcut1': { zh: '<kbd>S</kbd> — 开关设置窗口', en: '<kbd>S</kbd> — Toggle settings window' },
  'help.shortcut2': { zh: '<kbd>A</kbd> — 开关可视化设定覆盖层', en: '<kbd>A</kbd> — Toggle visual setting overlay' },
  'help.skipDesc': { zh: '自动跳过说明', en: 'Auto Skip' },
  'help.introDesc': { zh: '<strong>跳过片头：</strong>设置要从开头跳过的时长，播放到该位置前自动快进', en: '<strong>Skip Intro:</strong> Set how much to skip from the start' },
  'help.outroDesc': { zh: '<strong>跳过片尾：</strong>设置在结尾前停止的时长，播放到该位置时自动跳至末尾', en: '<strong>Skip Outro:</strong> Set how much to skip before the end' },
  'help.inputHint': { zh: '<b>输入方式：</b>时/分/秒三框输入。秒数不限制范围，偏好设置可控制自动跳转', en: '<b>Input:</b> Hours/minutes/seconds. Seconds accept any value. Auto-advance in Preferences' },
  'help.visualHint': { zh: '<b>可视化设定：</b>按 <kbd>A</kbd> 打开 OSD 覆盖层，拖拽手柄设定，松开即预览', en: '<b>Visual Setting:</b> Press <kbd>A</kbd> for OSD overlay, drag handles to set, real-time preview' },
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
    el.innerHTML = _(el.getAttribute('data-i18n'))
  })
  root.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    el.placeholder = _(el.getAttribute('data-i18n-placeholder'))
  })
}
