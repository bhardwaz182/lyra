import { useRef, useState, useEffect } from 'react'
import usePlayerStore from '../../store/playerStore'

const MIN_WIDTH    = 260
const MAX_WIDTH    = 600
const DEFAULT_WIDTH = 320
const MIN_HEIGHT   = 220

function getDefaultHeight() {
  return typeof window !== 'undefined' ? Math.round(window.innerHeight * 0.5) : 400
}

function getMaxHeight() {
  if (typeof window === 'undefined') return 800
  const playerH = parseInt(
    getComputedStyle(document.documentElement).getPropertyValue('--player-height')
  ) || 72
  const navH = parseInt(
    getComputedStyle(document.documentElement).getPropertyValue('--mobile-nav-height')
  ) || 0
  return window.innerHeight - playerH - navH
}

export default function QueueSidebar() {
  const queue      = usePlayerStore(s => s.queue)
  const queueIndex = usePlayerStore(s => s.queueIndex)
  const queueOpen  = usePlayerStore(s => s.queueOpen)
  const { play, removeFromQueue, reorderQueue, toggleQueueOpen } = usePlayerStore()

  // ── Resizable width ──
  const [width, setWidth] = useState(DEFAULT_WIDTH)
  const resizingW = useRef(false)

  useEffect(() => {
    document.documentElement.style.setProperty('--queue-width', `${width}px`)
    return () => {
      document.documentElement.style.setProperty('--queue-width', `${DEFAULT_WIDTH}px`)
    }
  }, [width])

  function startWidthResize(e) {
    e.preventDefault()
    resizingW.current = true
    const startX = e.clientX
    const startW = width
    function onMove(e) {
      if (!resizingW.current) return
      const delta = startX - e.clientX
      setWidth(Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, startW + delta)))
    }
    function onUp() {
      resizingW.current = false
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  // ── Resizable height ──
  const [height, setHeight] = useState(getDefaultHeight)
  const resizingH = useRef(false)
  const isExpanded = height >= getMaxHeight() - 10

  function toggleExpand() {
    setHeight(isExpanded ? getDefaultHeight() : getMaxHeight())
  }

  function startHeightResize(e) {
    e.preventDefault()
    resizingH.current = true
    const startY = e.clientY
    const startH = height
    function onMove(e) {
      if (!resizingH.current) return
      const delta = startY - e.clientY
      setHeight(Math.max(MIN_HEIGHT, Math.min(getMaxHeight(), startH + delta)))
    }
    function onUp() {
      resizingH.current = false
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  // Touch height resize — non-passive so we can prevent scroll
  function startHeightResizeTouch(e) {
    e.preventDefault()
    const startY = e.touches[0].clientY
    const startH = height
    function onMove(e) {
      e.preventDefault()
      const delta = startY - e.touches[0].clientY
      setHeight(Math.max(MIN_HEIGHT, Math.min(getMaxHeight(), startH + delta)))
    }
    function onEnd() {
      window.removeEventListener('touchmove', onMove)
      window.removeEventListener('touchend', onEnd)
    }
    window.addEventListener('touchmove', onMove, { passive: false })
    window.addEventListener('touchend', onEnd)
  }

  // ── Drag-to-reorder (mouse + touch) ──
  const dragIdx     = useRef(null)
  const [dragOver, setDragOver] = useState(null)
  const dragOverRef = useRef(null)
  const isDragging  = useRef(false)
  const dragOffsetY = useRef(28)
  const ghostRef    = useRef(null)
  const [ghostTrack, setGhostTrack] = useState(null)
  const listRef     = useRef(null)
  const currentRowRef = useRef(null)

  // Touch drag state
  const touchDragActive = useRef(false)
  const touchTimer      = useRef(null)
  const [touchDragging, setTouchDragging]   = useState(false)
  const [pressActive, setPressActive]       = useState(false)
  const pressActiveIdx  = useRef(null)

  function setDragOverBoth(val) {
    dragOverRef.current = val
    setDragOver(val)
  }

  function showGhost(track, listRect, startY) {
    setGhostTrack(track)
    if (ghostRef.current) {
      ghostRef.current.style.left   = `${listRect.left}px`
      ghostRef.current.style.width  = `${listRect.width}px`
      ghostRef.current.style.transform = `translateY(${startY - dragOffsetY.current}px)`
      ghostRef.current.style.display = 'flex'
    }
  }

  function hideGhost() {
    setGhostTrack(null)
    if (ghostRef.current) ghostRef.current.style.display = 'none'
  }

  // ── Mouse drag ──
  function onMouseDownItem(e, i) {
    if (e.button !== 0) return
    e.preventDefault()

    const listRect = listRef.current?.getBoundingClientRect()
    const rowEl    = e.currentTarget
    const rowRect  = rowEl?.getBoundingClientRect()
    if (!listRect) return

    dragIdx.current  = i
    isDragging.current = false
    dragOffsetY.current = e.clientY - (rowRect?.top ?? e.clientY - 28)

    function onMouseMove(ev) {
      if (!isDragging.current) {
        isDragging.current = true
        showGhost(queue[i], listRect, ev.clientY)
      }
      if (ghostRef.current) {
        ghostRef.current.style.transform = `translateY(${ev.clientY - dragOffsetY.current}px)`
      }
      const target = document.elementFromPoint(ev.clientX, ev.clientY)
      const row    = target?.closest('[data-qi]')
      if (row) {
        const idx = parseInt(row.dataset.qi)
        if (!isNaN(idx) && idx !== dragOverRef.current) setDragOverBoth(idx)
      }
    }

    function onMouseUp() {
      if (
        isDragging.current &&
        dragIdx.current !== null &&
        dragOverRef.current !== null &&
        dragIdx.current !== dragOverRef.current
      ) {
        reorderQueue(dragIdx.current, dragOverRef.current)
      }
      dragIdx.current = null
      isDragging.current = false
      hideGhost()
      setDragOverBoth(null)
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup',   onMouseUp)
    }

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup',   onMouseUp)
  }

  // ── Touch drag ──
  useEffect(() => {
    const el = listRef.current
    if (!el) return
    function handleTouchMove(e) {
      if (!touchDragActive.current) return
      e.preventDefault()
      const touch = e.touches[0]
      if (ghostRef.current) {
        ghostRef.current.style.transform = `translateY(${touch.clientY - dragOffsetY.current}px)`
      }
      const target = document.elementFromPoint(touch.clientX, touch.clientY)
      const row    = target?.closest('[data-qi]')
      if (row) {
        const idx = parseInt(row.dataset.qi)
        if (!isNaN(idx) && idx !== dragOverRef.current) setDragOverBoth(idx)
      }
    }
    el.addEventListener('touchmove', handleTouchMove, { passive: false })
    return () => el.removeEventListener('touchmove', handleTouchMove)
  }, [])

  function onTouchStartItem(e, i) {
    const touch  = e.touches[0]
    const rowEl  = e.currentTarget
    const rowRect = rowEl?.getBoundingClientRect()
    dragIdx.current     = i
    pressActiveIdx.current = i
    dragOffsetY.current = touch.clientY - (rowRect?.top ?? touch.clientY - 28)
    touchDragActive.current = false
    setPressActive(true)
    clearTimeout(touchTimer.current)
    touchTimer.current = setTimeout(() => {
      touchDragActive.current = true
      setTouchDragging(true)
      setPressActive(false)
      const listRect = listRef.current?.getBoundingClientRect()
      if (listRect) showGhost(queue[i], listRect, touch.clientY)
      navigator.vibrate?.(50)
    }, 250)
  }

  function onTouchEndItem() {
    clearTimeout(touchTimer.current)
    setPressActive(false)
    hideGhost()
    if (
      touchDragActive.current &&
      dragIdx.current !== null &&
      dragOverRef.current !== null &&
      dragIdx.current !== dragOverRef.current
    ) {
      reorderQueue(dragIdx.current, dragOverRef.current)
    }
    dragIdx.current        = null
    pressActiveIdx.current = null
    touchDragActive.current = false
    setTouchDragging(false)
    setDragOverBoth(null)
  }

  useEffect(() => {
    if (queueOpen) {
      requestAnimationFrame(() => currentRowRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }))
    }
  }, [queueOpen])

  if (!queueOpen) return null

  return (
    <aside
      className="fixed right-0 bg-yt-surface border-l border-t border-yt-border z-30 hidden md:flex flex-col rounded-tl-xl shadow-2xl"
      style={{
        width,
        height,
        bottom: 'calc(var(--player-height) + var(--mobile-nav-height))',
      }}
    >
      {/* Left-edge resize handle (width) */}
      <div
        onMouseDown={startWidthResize}
        className="absolute left-0 top-0 h-full w-1 cursor-col-resize hover:bg-yt-red/60 transition-colors z-10"
        title="Drag to resize width"
      />

      {/* Combined drag + header bar */}
      <div
        onMouseDown={startHeightResize}
        onTouchStart={startHeightResizeTouch}
        className="flex-shrink-0 flex items-center justify-between px-4 py-3 cursor-row-resize hover:bg-yt-surface2 transition-colors rounded-tl-xl border-b border-yt-border select-none touch-none"
      >
        {/* Pill indicator */}
        <div className="absolute left-1/2 -translate-x-1/2 top-1.5 w-10 h-1 rounded-full bg-yt-border" />

        <h2 className="font-semibold text-sm pt-1">Queue</h2>

        <div className="flex items-center gap-2 pt-1" onClick={e => e.stopPropagation()}>
          <span className="text-xs text-yt-muted">{queue.length} tracks</span>

          {/* Expand / collapse */}
          <button
            onClick={toggleExpand}
            className="text-yt-muted hover:text-white p-1"
            title={isExpanded ? 'Collapse' : 'Expand to full screen'}
            aria-label={isExpanded ? 'Collapse' : 'Expand to full screen'}
          >
            <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24">
              {isExpanded
                ? <path d="M7.41 15.41L12 10.83l4.59 4.58L18 14l-6-6-6 6z" />
                : <path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6z" />
              }
            </svg>
          </button>

          {/* Close */}
          <button onClick={toggleQueueOpen} aria-label="Close Queue" className="text-yt-muted hover:text-white p-1">
            <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Ghost — always mounted, positioned via transform for GPU-accelerated movement */}
      <div
        ref={ghostRef}
        className="fixed z-50 pointer-events-none items-center gap-2 px-3 py-2.5"
        style={{
          display: 'none',
          top: 0,
          left: 0,
          width: '100%',
          willChange: 'transform',
          background: 'rgba(18,18,30,0.97)',
          borderTop: '1px solid rgba(255,255,255,0.1)',
          borderBottom: '1px solid rgba(255,255,255,0.1)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.8), 0 4px 12px rgba(0,0,0,0.4)',
          transform: 'translateY(0px)',
        }}
      >
        <div className="flex-shrink-0 cursor-grab text-yt-muted px-0.5">
          <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 6h2v2H8V6zm0 4h2v2H8v-2zm0 4h2v2H8v-2zm6-8h2v2h-2V6zm0 4h2v2h-2v-2zm0 4h2v2h-2v-2z"/>
          </svg>
        </div>
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="w-10 h-10 rounded overflow-hidden flex-shrink-0 bg-yt-surface2">
            {ghostTrack?.album_art && (
              <img src={ghostTrack.album_art} alt="" className="w-10 h-10 object-cover" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate text-white">{ghostTrack?.name}</p>
            <p className="text-xs text-yt-muted truncate">{ghostTrack?.artists}</p>
          </div>
        </div>
      </div>

      {/* Scrollable list */}
      <div ref={listRef} className="flex-1 overflow-y-auto">
        {queue.length === 0 && (
          <div className="px-4 py-8 text-center text-yt-muted text-sm">Queue is empty</div>
        )}

        {queue.map((track, i) => (
          <div
            key={`${track.id}-${i}`}
            data-qi={i}
            ref={i === queueIndex ? currentRowRef : null}
            onMouseDown={e => onMouseDownItem(e, i)}
            onTouchStart={e => onTouchStartItem(e, i)}
            onTouchEnd={onTouchEndItem}
            style={{
              paddingTop: dragOver === i && ghostTrack && dragIdx.current !== i ? '48px' : '0px',
              transition: 'padding-top 0.18s cubic-bezier(0.4,0,0.2,1)',
            }}
            className={`flex items-center gap-2 px-3 py-2.5 select-none transition-colors
              ${i === queueIndex ? 'bg-yt-surface2' : 'hover:bg-yt-surface2'}
              ${ghostTrack && dragIdx.current === i ? 'opacity-0' : ''}
              ${pressActive && pressActiveIdx.current === i ? 'scale-95 bg-white/10' : ''}
            `}
          >
            {/* Drag handle */}
            <div className="flex-shrink-0 cursor-grab active:cursor-grabbing text-yt-muted hover:text-white px-0.5 touch-none">
              <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 6h2v2H8V6zm0 4h2v2H8v-2zm0 4h2v2H8v-2zm6-8h2v2h-2V6zm0 4h2v2h-2v-2zm0 4h2v2h-2v-2z"/>
              </svg>
            </div>

            {/* Thumbnail + info */}
            <div
              className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer"
              onClick={() => !ghostTrack && !touchDragging && play(track, queue)}
            >
              <div className="w-10 h-10 rounded overflow-hidden flex-shrink-0 bg-yt-surface2">
                <img
                  src={track.album_art}
                  alt=""
                  className="w-10 h-10 object-cover"
                  onError={e => { e.target.style.display = 'none' }}
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium truncate ${i === queueIndex ? 'text-yt-red' : ''}`}>
                  {track.name}
                </p>
                <p className="text-xs text-yt-muted truncate">{track.artists}</p>
              </div>
            </div>

            {/* Remove */}
            <button
              onClick={e => { e.stopPropagation(); removeFromQueue(i) }}
              className="flex-shrink-0 text-yt-muted hover:text-white p-1"
            >
              <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
              </svg>
            </button>
          </div>
        ))}
      </div>
    </aside>
  )
}
