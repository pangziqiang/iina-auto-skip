# OSD 可视化跳过设定器 — 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在视频上叠加 OSD 进度条，支持拖拽手柄可视化设定片头片尾时间

**Architecture:** 新增 overlay.html/overlay.js/overlay.css 三个文件，修改 index.js 和 sidebar。overlay 通过 IINA message API 与主控制层通信，拖拽时主控制层转发 seek 命令到 mpv。

**Tech Stack:** IINA Plugin JavaScript API (overlay, mpv, sidebar, preferences)

## Global Constraints
- 新建 3 个文件，修改 2 个文件
- 拖拽节流 100ms
- 时间精度：整数秒
- 配色 IINA 蓝色主题 (`--accent: #007aff` 亮模式 / `#0a84ff` 暗模式)
- overlay 不阻塞视频原有播放控制
- 快捷键复用现有 keybind 配置

---

### Task 1: 创建 OSD 样式文件 `src/overlay.css`

**Files:**
- Create: `src/overlay.css`

**Interfaces:**
- Consumes: sidebar.css CSS 变量命名约定
- Produces: overlay.html 引用的样式类

- [ ] **Step 1: 编写 overlay.css**

```css
:root {
    --osd-bg: linear-gradient(transparent, rgba(0,0,0,0.85) 40%);
    --osd-accent: #007aff;
    --osd-accent-dark: #0a84ff;
    --osd-text: rgba(255,255,255,0.9);
    --osd-text-secondary: rgba(255,255,255,0.4);
    --osd-track-bg: rgba(255,255,255,0.12);
    --osd-handle-border: #fff;
    --osd-btn-bg: rgba(255,255,255,0.1);
    --osd-btn-border: rgba(255,255,255,0.15);
    --osd-btn-text: rgba(255,255,255,0.6);
    --osd-save-bg: #0a84ff;
    --osd-font: -apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", sans-serif;
    --osd-mono: "SF Mono", Monaco, monospace;
}

@media (prefers-color-scheme: light) {
    :root {
        --osd-accent: #007aff;
    }
}

* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

html, body {
    width: 100%;
    height: 100%;
    overflow: hidden;
    font-family: var(--osd-font);
    color: var(--osd-text);
    user-select: none;
    -webkit-user-select: none;
}

#osd-container {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    padding: 0 10% 24px;
    background: var(--osd-bg);
    transition: opacity 0.5s ease;
}

#osd-container.idle {
    opacity: 0.4;
}

#osd-container.hidden-fade {
    opacity: 0;
    pointer-events: none;
}

#osd-container.idle .osd-header,
#osd-container.idle #osd-bottom {
    display: none;
}

.osd-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
}

.osd-header .title {
    font-size: 12px;
    color: var(--osd-text-secondary);
    letter-spacing: 1px;
}

.osd-header .hint {
    font-size: 11px;
    color: rgba(255,255,255,0.35);
}

.osd-track-area {
    position: relative;
    height: 44px;
    margin-bottom: 14px;
    cursor: pointer;
}

.osd-track {
    position: absolute;
    top: 18px;
    left: 0;
    right: 0;
    height: 4px;
    background: var(--osd-track-bg);
    border-radius: 2px;
}

.osd-track-fill {
    position: absolute;
    top: 18px;
    height: 4px;
    background: var(--osd-accent);
    border-radius: 2px;
    opacity: 0.5;
}

.osd-playhead {
    position: absolute;
    top: 15px;
    width: 10px;
    height: 10px;
    background: var(--osd-accent);
    border-radius: 50%;
    transform: translateX(-50%);
    box-shadow: 0 0 6px rgba(10,132,255,0.6);
    pointer-events: none;
}

.osd-handle {
    position: absolute;
    top: 10px;
    width: 20px;
    height: 20px;
    background: var(--osd-accent);
    border: 2px solid var(--osd-handle-border);
    border-radius: 50%;
    transform: translateX(-50%);
    cursor: ew-resize;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 2px 8px rgba(0,0,0,0.4);
    z-index: 2;
}

.osd-handle::after {
    content: '';
    width: 6px;
    height: 6px;
    background: #fff;
    border-radius: 1px;
}

.osd-handle.dragging {
    transform: translateX(-50%) scale(1.2);
    box-shadow: 0 0 12px rgba(10,132,255,0.5);
}

.osd-time-label {
    position: absolute;
    top: 32px;
    transform: translateX(-50%);
    font-size: 11px;
    color: var(--osd-accent);
    font-family: var(--osd-mono);
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
    text-shadow: 0 1px 4px rgba(0,0,0,0.6);
}

.osd-time-label.dragging {
    font-size: 13px;
    font-weight: 600;
}

.osd-bottom {
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.osd-time-info {
    font-size: 11px;
    color: var(--osd-text-secondary);
    font-family: var(--osd-mono);
}

.osd-time-info .sep {
    color: rgba(255,255,255,0.2);
    margin: 0 4px;
}

.osd-btns {
    display: flex;
    gap: 8px;
}

.osd-btn {
    background: var(--osd-btn-bg);
    color: var(--osd-btn-text);
    border: 1px solid var(--osd-btn-border);
    border-radius: 6px;
    padding: 5px 14px;
    font-size: 11px;
    cursor: pointer;
    font-family: var(--osd-font);
    transition: background 0.15s;
}

.osd-btn:hover {
    background: rgba(255,255,255,0.2);
}

.osd-btn-save {
    background: var(--osd-save-bg);
    color: #fff;
    border: none;
    font-weight: 600;
    box-shadow: 0 2px 6px rgba(10,132,255,0.3);
}

.osd-btn-save:hover {
    background: #409cff;
}

.osd-empty-state {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 60px;
    font-size: 13px;
    color: var(--osd-text-secondary);
}

.osd-hidden-hint {
    position: absolute;
    bottom: 16px;
    left: 0;
    right: 0;
    text-align: center;
    font-size: 11px;
    color: rgba(255,255,255,0.2);
    pointer-events: none;
    opacity: 0;
    transition: opacity 0.5s;
}

.osd-hidden-hint.visible {
    opacity: 1;
}
```

- [ ] **Step 2: 检验文件存在**

Run: `ls -la src/overlay.css`
Expected: file exists, non-empty

- [ ] **Step 3: Commit**

```bash
git add src/overlay.css
git commit -m "feat: add OSD overlay styles"
```

---

### Task 2: 创建 OSD HTML `src/overlay.html`

**Files:**
- Create: `src/overlay.html`

**Interfaces:**
- Consumes: overlay.css
- Produces: overlay.js 操作 DOM 节点

- [ ] **Step 1: 编写 overlay.html**

```html
<!DOCTYPE html>
<html lang="zh">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="stylesheet" href="overlay.css">
</head>
<body>
    <div id="osd-container" class="idle">
        <div class="osd-header">
            <span class="title">拖动设置跳过区间</span>
            <span class="hint">ESC / S 关闭</span>
        </div>

        <div class="osd-track-area" id="osdTrackArea">
            <div class="osd-track" id="osdTrack"></div>
            <div class="osd-track-fill" id="osdTrackFill"></div>
            <div class="osd-playhead" id="osdPlayhead"></div>
            <div class="osd-handle" id="osdHandleIntro"></div>
            <div class="osd-handle" id="osdHandleOutro"></div>
            <div class="osd-time-label" id="osdLabelIntro">00:00:00</div>
            <div class="osd-time-label" id="osdLabelOutro">00:00:00</div>
        </div>

        <div class="osd-bottom" id="osd-bottom">
            <div class="osd-time-info">
                <span id="osdCurrentTime">00:00:00</span>
                <span class="sep">/</span>
                <span id="osdDuration">00:00:00</span>
            </div>
        <div class="osd-btns">
            <button class="osd-btn" id="osdBtnCancel">取消</button>
            <button class="osd-btn osd-btn-save" id="osdBtnSave">保存</button>
        </div>
        </div>

        <div class="osd-empty-state" id="osdEmpty" style="display:none">暂无视频</div>
    </div>

    <div class="osd-hidden-hint" id="osdHiddenHint">鼠标移入即可调整</div>

    <script src="overlay.js"></script>
</body>
</html>
```

- [ ] **Step 2: Commit**

```bash
git add src/overlay.html
git commit -m "feat: add OSD overlay HTML structure"
```

---

### Task 3: 创建 OSD 交互逻辑 `src/overlay.js`

**Files:**
- Create: `src/overlay.js`

**Interfaces:**
- Consumes: `overlay.html` DOM (所有 id 引用)
- Produces: 通过 `iina.postMessage` 发送 `overlay-seek` 和 `overlay-save` 事件
- Receives: `overlay-init` (配置+时间信息)

- [ ] **Step 1: 编写 overlay.js**

```javascript
const Config = {
  IDLE_TIMEOUT: 3000,
  HIDDEN_TIMEOUT: 8000,
  SEEK_THROTTLE: 100
}

const els = {
  container: document.getElementById('osd-container'),
  trackArea: document.getElementById('osdTrackArea'),
  track: document.getElementById('osdTrack'),
  trackFill: document.getElementById('osdTrackFill'),
  playhead: document.getElementById('osdPlayhead'),
  handleIntro: document.getElementById('osdHandleIntro'),
  handleOutro: document.getElementById('osdHandleOutro'),
  labelIntro: document.getElementById('osdLabelIntro'),
  labelOutro: document.getElementById('osdLabelOutro'),
  currentTime: document.getElementById('osdCurrentTime'),
  duration: document.getElementById('osdDuration'),
  btnSave: document.getElementById('osdBtnSave'),
  btnCancel: document.getElementById('osdBtnCancel'),
  empty: document.getElementById('osdEmpty'),
  hiddenHint: document.getElementById('osdHiddenHint'),
  controls: document.querySelectorAll('#osd-controls')
}

let duration = 0
let introTime = 0
let outroTime = 0
let introPct = 0
let outroPct = 0
let currentPos = 0
let idleTimer = null
let hiddenTimer = null
let draggingHandle = null
let lastSeekTime = 0

function pad(n) {
  return String(n).padStart(2, '0')
}

function formatTime(sec) {
  const s = Math.max(0, Math.floor(sec))
  const h = Math.floor(s / 3600)
  const m = Math.floor(s % 3600 / 60)
  const remainder = s % 60
  if (h > 0) return `${pad(h)}:${pad(m)}:${pad(remainder)}`
  return `${pad(m)}:${pad(remainder)}`
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

function resetIdleTimer() {
  clearTimeout(idleTimer)
  clearTimeout(hiddenTimer)
  els.container.classList.remove('idle', 'hidden-fade')
  els.hiddenHint.classList.remove('visible')

  if (!draggingHandle) {
    idleTimer = setTimeout(() => {
      els.container.classList.add('idle')
      hiddenTimer = setTimeout(() => {
        els.container.classList.add('hidden-fade')
        els.hiddenHint.classList.add('visible')
      }, Config.HIDDEN_TIMEOUT - Config.IDLE_TIMEOUT)
    }, Config.IDLE_TIMEOUT)
  }
}

function updateUI() {
  const trackLeft = els.trackArea.getBoundingClientRect().left
  const trackWidth = els.trackArea.clientWidth

  const playPct = (currentPos / duration) * 100 || 0
  els.playhead.style.left = `${playPct}%`

  els.labelIntro.textContent = formatTime(introTime)
  els.labelIntro.style.left = `${introPct}%`
  els.handleIntro.style.left = `${introPct}%`

  els.labelOutro.textContent = formatTime(outroTime)
  els.labelOutro.style.left = `${outroPct}%`
  els.handleOutro.style.left = `${outroPct}%`

  els.trackFill.style.left = `${introPct}%`
  els.trackFill.style.width = `${outroPct - introPct}%`

  els.currentTime.textContent = formatTime(currentPos)
  els.duration.textContent = formatTime(duration)
}

function pctToTime(pct) {
  return Math.round(pct * duration / 100)
}

function handleDragStart(e, handleType) {
  draggingHandle = handleType
  const handle = handleType === 'intro' ? els.handleIntro : els.handleOutro
  handle.classList.add('dragging')
  const label = handleType === 'intro' ? els.labelIntro : els.labelOutro
  label.classList.add('dragging')

  resetIdleTimer()
}

function handleDragMove(clientX) {
  if (!draggingHandle) return

  const now = Date.now()
  if (now - lastSeekTime < Config.SEEK_THROTTLE) return
  lastSeekTime = now

  const rect = els.trackArea.getBoundingClientRect()
  let pct = ((clientX - rect.left) / rect.width) * 100
  pct = clamp(pct, 0, 100)

  if (draggingHandle === 'intro') {
    pct = Math.min(pct, outroPct - 1)
    introPct = pct
    introTime = pctToTime(pct)
    iina.postMessage('overlay-seek', introTime)
  } else {
    pct = Math.max(pct, introPct + 1)
    outroPct = pct
    outroTime = pctToTime(pct)
    iina.postMessage('overlay-seek', outroTime)
  }

  updateUI()
}

function handleDragEnd() {
  if (!draggingHandle) return
  const handle = draggingHandle === 'intro' ? els.handleIntro : els.handleOutro
  handle.classList.remove('dragging')
  const label = draggingHandle === 'intro' ? els.labelIntro : els.labelOutro
  label.classList.remove('dragging')

  iina.postMessage('overlay-seek', -1)
  draggingHandle = null
  resetIdleTimer()
}

function init(config) {
  duration = config.duration || 0
  introTime = config.introDuration || 0
  outroTime = config.outroDuration || 0

  if (!duration || duration < 10) {
    els.empty.style.display = 'flex'
    els.empty.textContent = '视频过短'
    els.btnSave.disabled = true
    return
  }

  introPct = (introTime / duration) * 100
  outroPct = ((duration - outroTime) / duration) * 100
  if (outroPct <= introPct) outroPct = introPct + 1
  if (outroPct > 100) outroPct = 100

  currentPos = parseInt(config.currentPos, 10) || 0
  updateUI()
  resetIdleTimer()
}

// Mouse events
els.trackArea.addEventListener('mousedown', (e) => {
  const rect = els.trackArea.getBoundingClientRect()
  const clickPct = ((e.clientX - rect.left) / rect.width) * 100
  const distIntro = Math.abs(clickPct - introPct)
  const distOutro = Math.abs(clickPct - outroPct)

  if (distIntro < distOutro && distIntro < 5) {
    handleDragStart(e, 'intro')
  } else if (distOutro < 5) {
    handleDragStart(e, 'outro')
  }
})

document.addEventListener('mousemove', (e) => {
  if (draggingHandle) handleDragMove(e.clientX)
})

document.addEventListener('mouseup', handleDragEnd)

// Touch events
els.trackArea.addEventListener('touchstart', (e) => {
  const touch = e.touches[0]
  const rect = els.trackArea.getBoundingClientRect()
  const touchPct = ((touch.clientX - rect.left) / rect.width) * 100
  const distIntro = Math.abs(touchPct - introPct)
  const distOutro = Math.abs(touchPct - outroPct)

  if (distIntro < distOutro && distIntro < 5) {
    handleDragStart(e, 'intro')
  } else if (distOutro < 5) {
    handleDragStart(e, 'outro')
  }
}, { passive: true })

document.addEventListener('touchmove', (e) => {
  if (draggingHandle) {
    const touch = e.touches[0]
    handleDragMove(touch.clientX)
  }
}, { passive: true })

document.addEventListener('touchend', handleDragEnd)

// Idle timer on mouse activity
els.container.addEventListener('mouseenter', resetIdleTimer)
document.addEventListener('mousemove', resetIdleTimer)
document.addEventListener('touchstart', resetIdleTimer)

// Buttons
els.btnCancel.addEventListener('click', () => {
  iina.postMessage('overlay-hide', null)
})

els.btnSave.addEventListener('click', () => {
  iina.postMessage('overlay-save', {
    introDuration: introTime,
    outroDuration: outroTime
  })
})

// Keyboard
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' || e.key === 's' || e.key === 'S') {
    if (!e.repeat) iina.postMessage('overlay-hide', null)
  }
  if (e.key === 'Enter') {
    els.btnSave.click()
  }
})

// Message from index.js
iina.onMessage('overlay-init', init)

// Time sync from index.js
iina.onMessage('overlay-time', (pos) => {
  if (!draggingHandle) {
    currentPos = parseInt(pos, 10) || 0
    updateUI()
  }
})
```

- [ ] **Step 2: Commit**

```bash
git add src/overlay.js
git commit -m "feat: add OSD overlay interaction logic"
```

---

### Task 4: 更新 `src/index.js` — overlay 生命周期管理

**Files:**
- Modify: `src/index.js`

**Interfaces:**
- Consumes: `iina.overlay` API
- Produces: `overlay-init` (发送初始数据), `overlay-seek` (接收), `overlay-save` (接收), `overlay-hide` (接收), `overlay-time` (发送)

- [ ] **Step 1: 在 index.js 文件顶部 states 后添加 overlay 事件常量**

```javascript
const OverlayEvent = {
  INIT: 'overlay-init',
  SEEK: 'overlay-seek',
  SAVE: 'overlay-save',
  HIDE: 'overlay-hide',
  TIME: 'overlay-time'
}
```

- [ ] **Step 2: 在 config 变量声明后添加 overlay 相关函数**

```javascript
let overlayVisible = false

function toggleOverlay() {
  if (overlayVisible) {
    hideOverlay()
  } else {
    showOverlay()
  }
}

function showOverlay() {
  const duration = parseFloat(mpv.getString("duration"))
  overlay.loadFile("src/overlay.html")
  overlay.setClickable(true)
  setTimeout(() => {
    overlay.postMessage(OverlayEvent.INIT, {
      duration: isNaN(duration) || duration <= 0 ? 0 : parseInt(duration, 10),
      introDuration: config.introDuration,
      outroDuration: config.outroDuration,
      currentPos: parseInt(parseFloat(mpv.getString("time-pos")), 10) || 0
    })
  }, 200)
  overlayVisible = true
  startOverlayTimeSync()
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
  if (time < 0) {
    // Restore playback
    return
  }
  mpv.setProperty("time-pos", time)
}

function overlaySave(newConfig) {
  saveConfig(newConfig)
  addLog(`可视化设置：片头 ${formatTimeStr(newConfig.introDuration)}，片尾 ${formatTimeStr(newConfig.outroDuration)}`)
  hideOverlay()
}
```

- [ ] **Step 3: 在 `iina.window-loaded` 事件监听中添加 overlay 消息处理**

在 `registerMenuItem();` 之前添加：

```javascript
  overlay.onMessage(OverlayEvent.SEEK, overlaySeek);
  overlay.onMessage(OverlayEvent.SAVE, overlaySave);
  overlay.onMessage(OverlayEvent.HIDE, hideOverlay);
```

- [ ] **Step 4: 修改 `registerMenuItem` 中菜单项回调，增加 overlay 判定**

```javascript
  menu.addItem(
    menu.item("自动跳过", () => {
      if (overlayVisible) {
        hideOverlay()
      } else {
        states.sidebarVisible ? sidebar.hide() : sidebar.show()
      }
    }, options)
  );
```

- [ ] **Step 5: 提交**

```bash
git add src/index.js
git commit -m "feat: add overlay lifecycle management to index.js"
```

---

### Task 5: 更新侧边栏 — 添加可视化设置按钮

**Files:**
- Modify: `src/sidebar.html`
- Modify: `src/sidebar.js`

**Interfaces:**
- Consumes: 现有 `iina.postMessage` 模式
- Produces: 新增 `overlay-open` 消息（从 sidebar 发到 index.js）

- [ ] **Step 1: 修改 `src/sidebar.html`，在保存按钮下面添加可视化设置按钮**

在 `src/sidebar.html` 的 `<button id="saveBtn">保存设置</button>` 行后添加：

```html
        <button id="visualBtn">可视化设置</button>
```

- [ ] **Step 2: 修改 `src/sidebar.js`，添加可视化设置按钮的事件监听**

在 `els.saveBtn.addEventListener('click', saveSettings);` 后添加：

```javascript
els.visualBtn = document.getElementById('visualBtn')
els.visualBtn.addEventListener('click', () => {
  iina.postMessage('overlay-open', null)
})
```

- [ ] **Step 3: 提交**

```bash
git add src/sidebar.html src/sidebar.js
git commit -m "feat: add visual setting button to sidebar"
```

---

### Task 6: 更新 `src/index.js` — 集成侧边栏 overlay-open 消息

**Files:**
- Modify: `src/index.js`

**Interfaces:**
- Consumes: 来自 sidebar 的 `overlay-open` 消息

- [ ] **Step 1: 在 `sidebar.onMessage(PluginEvent.SAVE, ...)` 后添加**

```javascript
  sidebar.onMessage('overlay-open', () => {
    showOverlay();
  });
```

- [ ] **Step 2: 提交**

```bash
git add src/index.js
git commit -m "feat: wire sidebar visual button to overlay"
```
