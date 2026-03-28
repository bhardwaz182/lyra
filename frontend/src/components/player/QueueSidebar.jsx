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

  // ── Drag-to-reorder (mouse) ──
  const dragIdx = useRef(null)
  const [dragOver, setDragOver] = useState(null)
  const dragOverRef = useRef(null)

  function setDragOverBoth(val) {
    dragOverRef.current = val
    setDragOver(val)
  }

  function onDragStart(e, i) {
    dragIdx.current = i
    e.dataTransfer.effectAllowed = 'move'
  }
  function onDragOver(e, i) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (dragOverRef.current !== i) setDragOverBoth(i)
  }
  function onDrop(i) {
    if (dragIdx.current !== null && dragIdx.current !== i) reorderQueue(dragIdx.current, i)
    dragIdx.current = null
    setDragOverBoth(null)
  }
  function onDragEnd() { dragIdx.current = null; setDragOverBoth(null) }

  // ── Touch drag-to-reorder ──
  const touchDragActive = useRef(false)
  const touchTimer = useRef(null)
  const listRef = useRef(null)
  const [touchDragging, setTouchDragging] = useState(false)

  useEffect(() => {
    const el = listRef.current
    if (!el) return
    function handleTouchMove(e) {
      if (!touchDragActive.current) return
      e.preventDefault()
      const touch = e.touches[0]
      const target = document.elementFromPoint(touch.clientX, touch.clientY)
      const row = target?.closest('[data-qi]')
      if (row) {
        const idx = parseInt(row.dataset.qi)
        if (!isNaN(idx) && idx !== dragOverRef.current) setDragOverBoth(idx)
      }
    }
    el.addEventListener('touchmove', handleTouchMove, { passive: false })
    return () => el.removeEventListener('touchmove', handleTouchMove)
  }, [])

  function onTouchStartItem(e, i) {
    dragIdx.current = i
    touchDragActive.current = false
    clearTimeout(touchTimer.current)
    touchTimer.current = setTimeout(() => {
      touchDragActive.current = true
      setTouchDragging(true)
      navigator.vibrate?.(50)
    }, 250)
  }

  function onTouchEndItem() {
    clearTimeout(touchTimer.current)
    if (
      touchDragActive.current &&
      dragIdx.current !== null &&
      dragOverRef.current !== null &&
      dragIdx.current !== dragOverRef.current
    ) {
      reorderQueue(dragIdx.current, dragOverRef.current)
    }
    dragIdx.current = null
    touchDragActive.current = false
    setTouchDragging(false)
    setDragOverBoth(null)
  }

  if (!queueOpen) return null

  return (
    <aside
      className="fixed right-0 bg-yt-surface border-l border-t border-yt-border z-30 flex flex-col rounded-tl-xl shadow-2xl"
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
          >
            <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24">
              {isExpanded
                ? <path d="M7.41 15.41L12 10.83l4.59 4.58L18 14l-6-6-6 6z" />
                : <path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6z" />
              }
            </svg>
          </button>

          {/* Close */}
          <button onClick={toggleQueueOpen} className="text-yt-muted hover:text-white p-1">
            <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
            </svg>
          </button>
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
            draggable
            onDragStart={e => onDragStart(e, i)}
            onDragOver={e => onDragOver(e, i)}
            onDrop={() => onDrop(i)}
            onDragEnd={onDragEnd}
            onTouchStart={e => onTouchStartItem(e, i)}
            onTouchEnd={onTouchEndItem}
            className={`flex items-center gap-2 px-3 py-2.5 select-none transition-colors
              ${i === queueIndex ? 'bg-yt-surface2' : 'hover:bg-yt-surface2'}
              ${dragOver === i ? 'border-t-2 border-yt-red' : 'border-t-2 border-transparent'}
              ${touchDragging && dragIdx.current === i ? 'opacity-40 scale-95' : ''}
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
              onClick={() => !touchDragging && play(track, queue)}
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
