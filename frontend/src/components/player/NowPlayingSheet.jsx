import { useState, useEffect, useRef } from 'react'
import usePlayerStore from '../../store/playerStore'
import { api } from '../../api/client'
import { seekAudio } from '../../hooks/useAudio'

function parseLRC(lrc) {
  if (!lrc) return null
  const lines = []
  const regex = /\[(\d+):(\d+\.\d+)\](.*)/g
  let m
  while ((m = regex.exec(lrc)) !== null) {
    lines.push({ time: parseInt(m[1]) * 60 + parseFloat(m[2]), text: m[3].trim() })
  }
  return lines.length > 0 ? lines : null
}

function fmt(secs) {
  if (!secs || isNaN(secs)) return '0:00'
  return `${Math.floor(secs / 60)}:${Math.floor(secs % 60).toString().padStart(2, '0')}`
}

export default function NowPlayingSheet() {
  const nowPlayingOpen = usePlayerStore(s => s.nowPlayingOpen)
  const currentTrack   = usePlayerStore(s => s.currentTrack)
  const isPlaying      = usePlayerStore(s => s.isPlaying)
  const shuffle        = usePlayerStore(s => s.shuffle)
  const repeat         = usePlayerStore(s => s.repeat)
  const currentTime    = usePlayerStore(s => s.currentTime)
  const duration       = usePlayerStore(s => s.duration)
  const likedTrackIds  = usePlayerStore(s => s.likedTrackIds)
  const queue          = usePlayerStore(s => s.queue)
  const queueIndex     = usePlayerStore(s => s.queueIndex)

  const {
    pause, resume, next, prev,
    toggleShuffle, cycleRepeat,
    toggleLike, toggleNowPlayingOpen, play, removeFromQueue, reorderQueue, playNext, addToQueue,
  } = usePlayerStore()

  const [tab, setTab] = useState('queue')
  const [expanded, setExpanded] = useState(false)
  const swipeStartY = useRef(null)

  // Swipe up on upper section → expand queue
  function onUpperTouchStart(e) {
    swipeStartY.current = e.touches[0].clientY
  }
  function onUpperTouchEnd(e) {
    if (swipeStartY.current === null) return
    const dy = swipeStartY.current - e.changedTouches[0].clientY
    if (dy > 60) setExpanded(true)
    swipeStartY.current = null
  }

  // Swipe down on tab bar → collapse
  function onTabTouchStart(e) {
    swipeStartY.current = e.touches[0].clientY
  }
  function onTabTouchEnd(e) {
    if (swipeStartY.current === null) return
    const dy = e.changedTouches[0].clientY - swipeStartY.current
    if (dy > 60) setExpanded(false)
    swipeStartY.current = null
  }

  if (!nowPlayingOpen) return null

  const isLiked = currentTrack && likedTrackIds.includes(currentTrack.id)
  const pct = duration ? (currentTime / duration) * 100 : 0

  return (
    <div className="md:hidden fixed inset-0 z-50 flex flex-col overflow-hidden">
      {/* Blurred album art background */}
      <div className="absolute inset-0">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: currentTrack?.album_art ? `url(${currentTrack.album_art})` : undefined,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            filter: 'blur(40px) brightness(0.25)',
            transform: 'scale(1.1)',
          }}
        />
        <div className="absolute inset-0 bg-black/50" />
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col h-full" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>

        {expanded ? (
          /* ── Expanded: mini player + full queue/lyrics ── */
          <>
            {/* Mini player bar */}
            <div className="flex items-center gap-3 px-4 pt-4 pb-3 flex-shrink-0 border-b border-white/10">
              <button onClick={toggleNowPlayingOpen} className="p-1 text-white/70">
                <svg width="22" height="22" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
                </svg>
              </button>
              {currentTrack?.album_art && (
                <img
                  src={currentTrack.album_art}
                  alt=""
                  className="w-10 h-10 rounded object-cover flex-shrink-0"
                  onError={e => { e.target.style.display = 'none' }}
                />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white truncate">{currentTrack?.name}</p>
                <p className="text-xs text-white/50 truncate">{currentTrack?.artists}</p>
              </div>
              <button
                onClick={() => isPlaying ? pause() : resume()}
                className="w-10 h-10 rounded-full bg-white text-black flex items-center justify-center flex-shrink-0"
              >
                {isPlaying
                  ? <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" /></svg>
                  : <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>}
              </button>
              <button onClick={() => setExpanded(false)} className="p-1 text-white/50">
                <svg width="22" height="22" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M7.41 15.41L12 10.83l4.59 4.58L18 14l-6-6-6 6z" />
                </svg>
              </button>
            </div>

            {/* Tabs */}
            <div
              className="flex border-b border-white/10 mx-6 flex-shrink-0"
              onTouchStart={onTabTouchStart}
              onTouchEnd={onTabTouchEnd}
            >
              {['queue', 'lyrics'].map(t => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`flex-1 py-2.5 text-sm font-medium capitalize transition-colors ${
                    tab === t ? 'text-white border-b-2 border-white' : 'text-white/40'
                  }`}
                >
                  {t === 'queue' ? 'Queue' : 'Lyrics'}
                </button>
              ))}
            </div>

            {/* Full-height tab content */}
            <div className="flex-1 overflow-y-auto">
              {tab === 'queue' && (
                <QueueTab queue={queue} queueIndex={queueIndex} play={play} removeFromQueue={removeFromQueue} reorderQueue={reorderQueue} />
              )}
              {tab === 'lyrics' && (
                <LyricsTab track={currentTrack} currentTime={currentTime} />
              )}
            </div>
          </>
        ) : (
          /* ── Normal: album art + controls + peek of queue ── */
          <>
            {/* Header */}
            <div className="flex items-center justify-between px-4 pt-4 pb-2">
              <button onClick={toggleNowPlayingOpen} className="p-2 text-white/70 hover:text-white">
                <svg width="24" height="24" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
                </svg>
              </button>
              <span className="text-sm font-medium text-white/80">Now Playing</span>
              <div className="w-10" />
            </div>

            {/* Swipe-up zone: album art + info + controls */}
            <div
              className="flex flex-col flex-shrink-0"
              onTouchStart={onUpperTouchStart}
              onTouchEnd={onUpperTouchEnd}
            >
              {/* Album art */}
              <div className="px-10 py-4">
                <div className="w-full aspect-square rounded-2xl overflow-hidden bg-yt-surface2 shadow-2xl">
                  {currentTrack?.album_art ? (
                    <img
                      src={currentTrack.album_art}
                      alt=""
                      className="w-full h-full object-cover"
                      onError={e => { e.target.style.display = 'none' }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <svg width="64" height="64" fill="currentColor" viewBox="0 0 24 24" className="text-white/20">
                        <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
                      </svg>
                    </div>
                  )}
                </div>
              </div>

              {/* Track info + like */}
              <div className="px-6 flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-lg font-bold text-white truncate">{currentTrack?.name}</p>
                  <p className="text-sm text-white/60 truncate mt-0.5">{currentTrack?.artists}</p>
                </div>
                <button
                  onClick={() => currentTrack && toggleLike(currentTrack.id)}
                  className={`flex-shrink-0 ml-4 p-2 ${isLiked ? 'text-yt-red' : 'text-white/50'}`}
                >
                  <svg width="24" height="24" fill={isLiked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                  </svg>
                </button>
              </div>

              {/* Progress bar */}
              <div className="px-6 pt-4 pb-1">
                <ScrubBar pct={pct} duration={duration} currentTime={currentTime} />
                <div className="flex justify-between mt-1">
                  <span className="text-xs text-white/50">{fmt(currentTime)}</span>
                  <span className="text-xs text-white/50">{fmt(duration)}</span>
                </div>
              </div>

              {/* Controls */}
              <div className="px-4 py-2 flex items-center justify-between">
                <button onClick={toggleShuffle} className={`p-3 ${shuffle ? 'text-yt-red' : 'text-white/50'}`}>
                  <svg width="22" height="22" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M10.59 9.17L5.41 4 4 5.41l5.17 5.17 1.42-1.41zM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.46 20 9.5V4h-5.5zm.33 9.41l-1.41 1.41 3.13 3.13L14.5 20H20v-5.5l-2.04 2.04-3.13-3.13z" />
                  </svg>
                </button>
                <button onClick={prev} className="p-3 text-white/80">
                  <svg width="28" height="28" fill="currentColor" viewBox="0 0 24 24"><path d="M6 6h2v12H6zm3.5 6 8.5 6V6z" /></svg>
                </button>
                <button
                  onClick={() => isPlaying ? pause() : resume()}
                  className="w-16 h-16 rounded-full bg-white text-black flex items-center justify-center shadow-lg"
                >
                  {isPlaying
                    ? <svg width="28" height="28" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" /></svg>
                    : <svg width="28" height="28" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>}
                </button>
                <button onClick={next} className="p-3 text-white/80">
                  <svg width="28" height="28" fill="currentColor" viewBox="0 0 24 24"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" /></svg>
                </button>
                <button onClick={cycleRepeat} className={`p-3 ${repeat !== 'none' ? 'text-yt-red' : 'text-white/50'}`}>
                  {repeat === 'one' ? (
                    <svg width="22" height="22" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4zm-4-2V9h-1l-2 1v1h1.5v4H13z" />
                    </svg>
                  ) : (
                    <svg width="22" height="22" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Tabs — swipe up to expand, swipe down to collapse */}
            <div
              className="flex border-b border-white/10 mx-6 flex-shrink-0"
              onTouchStart={onUpperTouchStart}
              onTouchEnd={onUpperTouchEnd}
            >
              {['queue', 'lyrics'].map(t => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`flex-1 py-2.5 text-sm font-medium capitalize transition-colors ${
                    tab === t ? 'text-white border-b-2 border-white' : 'text-white/40'
                  }`}
                >
                  {t === 'queue' ? 'Queue' : 'Lyrics'}
                </button>
              ))}
            </div>

            {/* Peek of tab content */}
            <div className="flex-1 overflow-y-auto">
              {tab === 'queue' && (
                <QueueTab queue={queue} queueIndex={queueIndex} play={play} removeFromQueue={removeFromQueue} reorderQueue={reorderQueue} />
              )}
              {tab === 'lyrics' && (
                <LyricsTab track={currentTrack} currentTime={currentTime} />
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function ScrubBar({ pct, duration, currentTime }) {
  const barRef = useRef(null)
  function handleClick(e) {
    if (!duration) return
    const rect = barRef.current.getBoundingClientRect()
    seekAudio(((e.clientX - rect.left) / rect.width) * duration)
  }
  return (
    <div ref={barRef} onClick={handleClick} className="w-full h-1 bg-white/20 rounded-full cursor-pointer group">
      <div className="h-full bg-white rounded-full relative" style={{ width: `${pct}%` }}>
        <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full opacity-0 group-hover:opacity-100" />
      </div>
    </div>
  )
}

function QueueTab({ queue, queueIndex, play, removeFromQueue, reorderQueue }) {
  const [expanded, setExpanded] = useState(null)
  const [dragOver, setDragOver] = useState(null)
  const [touchDragging, setTouchDragging] = useState(false)
  const dragIdx = useRef(null)
  const dragOverRef = useRef(null)
  const touchDragActive = useRef(false)
  const touchTimer = useRef(null)
  const listRef = useRef(null)

  function setDragOverBoth(val) {
    dragOverRef.current = val
    setDragOver(val)
  }

  // Non-passive touchmove to prevent scroll while dragging
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
      setExpanded(null)
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

  return (
    <div ref={listRef} className="py-2">
      {queue.length === 0 && (
        <p className="text-center text-white/40 py-8 text-sm">Queue is empty</p>
      )}
      {queue.map((track, i) => (
        <div key={`${track.id}-${i}`} data-qi={i}>
          <div
            onTouchStart={e => onTouchStartItem(e, i)}
            onTouchEnd={onTouchEndItem}
            className={`flex items-center gap-3 px-4 py-3 select-none transition-colors
              ${i === queueIndex ? 'border-l-2 border-yt-red' : 'border-l-2 border-transparent'}
              ${dragOver === i ? 'border-t-2 border-white/60' : 'border-t border-transparent'}
              ${touchDragging && dragIdx.current === i ? 'opacity-40' : ''}
            `}
          >
            {/* Grip handle */}
            <div className="flex-shrink-0 text-white/20 touch-none">
              <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 6h2v2H8V6zm0 4h2v2H8v-2zm0 4h2v2H8v-2zm6-8h2v2h-2V6zm0 4h2v2h-2v-2zm0 4h2v2h-2v-2z"/>
              </svg>
            </div>

            <div className="w-10 h-10 rounded overflow-hidden flex-shrink-0 bg-white/10 cursor-pointer"
              onClick={() => !touchDragging && play(track, queue)}>
              {track.album_art && (
                <img src={track.album_art} alt="" className="w-full h-full object-cover"
                  onError={e => { e.target.style.display = 'none' }} />
              )}
            </div>
            <div className="flex-1 min-w-0 cursor-pointer" onClick={() => !touchDragging && play(track, queue)}>
              <p className={`text-sm font-medium truncate ${i === queueIndex ? 'text-yt-red' : 'text-white'}`}>
                {track.name}
              </p>
              <p className="text-xs text-white/50 truncate">{track.artists}</p>
            </div>
            {/* ⋮ menu toggle */}
            <button
              onClick={() => setExpanded(expanded === i ? null : i)}
              className="p-1.5 text-white/40 hover:text-white"
            >
              <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>
              </svg>
            </button>
          </div>

          {/* Inline actions row */}
          {expanded === i && (
            <div className="flex items-center gap-1 px-4 pb-2 ml-13">
              <ActionBtn
                label="↑"
                disabled={i === 0}
                onClick={() => { reorderQueue(i, i - 1); setExpanded(i - 1) }}
              />
              <ActionBtn
                label="↓"
                disabled={i === queue.length - 1}
                onClick={() => { reorderQueue(i, i + 1); setExpanded(i + 1) }}
              />
              <ActionBtn label="Remove" onClick={() => { removeFromQueue(i); setExpanded(null) }} />
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

function ActionBtn({ label, onClick, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="px-3 py-1 text-xs rounded-full bg-white/10 text-white/70 hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed"
    >
      {label}
    </button>
  )
}

function LyricsTab({ track, currentTime }) {
  const [lyrics, setLyrics] = useState(null)
  const [syncedLines, setSyncedLines] = useState(null)
  const [loading, setLoading] = useState(false)
  const [activeIdx, setActiveIdx] = useState(0)
  const lineRefs = useRef([])

  useEffect(() => {
    if (!track) return
    setLyrics(null)
    setSyncedLines(null)
    setLoading(true)
    api.getLyrics(track.artists, track.name)
      .then(data => {
        setLyrics(data)
        setSyncedLines(parseLRC(data?.syncedLyrics))
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [track?.id])

  useEffect(() => {
    if (!syncedLines) return
    let idx = syncedLines.findIndex(l => l.time > currentTime) - 1
    if (idx < 0) idx = 0
    setActiveIdx(idx)
    lineRefs.current[idx]?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [currentTime, syncedLines])

  if (loading) {
    return (
      <div className="px-6 py-6 space-y-3">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="skeleton h-4 rounded" style={{ width: `${50 + (i * 17) % 50}%` }} />
        ))}
      </div>
    )
  }

  if (!lyrics?.found) {
    return <p className="text-center text-white/40 py-12 text-sm">No lyrics found</p>
  }

  if (syncedLines) {
    return (
      <div className="px-6 py-4 space-y-3">
        {syncedLines.map((line, i) => (
          <p
            key={i}
            ref={el => lineRefs.current[i] = el}
            className={`text-base leading-relaxed transition-all duration-300 ${
              i === activeIdx ? 'text-white font-semibold' : i < activeIdx ? 'text-white/30' : 'text-white/60'
            }`}
          >
            {line.text || '\u00A0'}
          </p>
        ))}
      </div>
    )
  }

  return (
    <pre className="px-6 py-4 text-sm text-white/70 leading-relaxed whitespace-pre-wrap font-sans">
      {lyrics.lyrics}
    </pre>
  )
}
