const Config = {
  IDLE_TIMEOUT: 3000,
  HIDDEN_TIMEOUT: 8000,
  SEEK_THROTTLE: 16
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
  labelIntroTag: document.getElementById('osdLabelIntroTag'),
  labelOutroTag: document.getElementById('osdLabelOutroTag')
}

let duration = 0
let introTime = 0
let outroTime = 0
let introPct = 0
let outroPct = 0
let currentPos = 0
let enabled = false
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
  els.labelIntroTag.style.left = `${introPct}%`

  els.labelOutro.textContent = formatTime(outroTime)
  els.labelOutro.style.left = `${outroPct}%`
  els.handleOutro.style.left = `${outroPct}%`
  els.labelOutroTag.style.left = `${outroPct}%`

  els.trackFill.style.left = `${introPct}%`
  els.trackFill.style.width = `${outroPct - introPct}%`

  els.currentTime.textContent = formatTime(currentPos)
  els.duration.textContent = formatTime(duration)
}

function pctToTime(pct) {
  return Math.round(pct * duration / 100)
}

function handleDragStart(e, handleType) {
  iina.postMessage('overlay-pause', null)
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
    introTime = Math.min(pctToTime(pct), outroTime - 1)
    introPct = (introTime / duration) * 100
    iina.postMessage('overlay-seek', introTime)
  } else {
    outroTime = Math.max(pctToTime(pct), introTime + 1)
    outroPct = (outroTime / duration) * 100
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

  draggingHandle = null
  resetIdleTimer()
}

function init(config) {
  duration = config.duration || 0
  introTime = config.introDuration || 0
  outroTime = duration - (config.outroDuration || 0)
  enabled = config.enabled === true

  if (!duration || duration < 10) {
    els.empty.style.display = 'flex'
    els.empty.textContent = '视频过短'
    els.btnSave.disabled = true
    return
  }

  introPct = (introTime / duration) * 100
  outroPct = (outroTime / duration) * 100
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
    enabled: enabled,
    introDuration: introTime,
    outroDuration: duration - outroTime
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
