import usePlayerStore from '../../store/playerStore'
import { useAudio, seekAudio } from '../../hooks/useAudio'
import ProgressBar from './ProgressBar'

export default function PlayerBar() {
  const currentTrack = usePlayerStore(s => s.currentTrack)
  const isPlaying = usePlayerStore(s => s.isPlaying)
  const shuffle = usePlayerStore(s => s.shuffle)
  const repeat = usePlayerStore(s => s.repeat)
  const volume = usePlayerStore(s => s.volume)
  const audioQuality = usePlayerStore(s => s.audioQuality)
  const likedTracks = usePlayerStore(s => s.likedTracks)

  const {
    pause, resume, next, prev,
    toggleShuffle, cycleRepeat, setVolume,
    toggleLike, toggleQueueOpen, toggleLyricsOpen, toggleNowPlayingOpen,
  } = usePlayerStore()

  useAudio()

  const isLiked = currentTrack && likedTracks.some(t => t.id === currentTrack.id)

  return (
    <div
      className="fixed left-0 right-0 bg-yt-surface border-t border-yt-border z-40"
      style={{ bottom: 'var(--mobile-nav-height)', height: 'var(--player-height)' }}
    >
      {/* ── Mobile (< md) ── */}
      <div className="md:hidden flex flex-col h-full">
        <MobileProgressLine />
        <div className="flex items-center gap-3 px-3 flex-1 min-h-0">
          {currentTrack ? (
            <>
              <img
                src={currentTrack.album_art}
                alt=""
                aria-label="Open Now Playing"
                className="w-10 h-10 rounded object-cover flex-shrink-0 cursor-pointer"
                onClick={toggleNowPlayingOpen}
                onError={e => { e.target.style.background = '#383838'; e.target.src = '' }}
              />
              <div className="flex-1 min-w-0 cursor-pointer" onClick={toggleNowPlayingOpen}>
                <p className="text-sm font-medium truncate">{currentTrack.name}</p>
                <p className="text-xs text-yt-muted truncate">{currentTrack.artists}</p>
              </div>
              <button
                onClick={() => toggleLike(currentTrack)}
                aria-label={isLiked ? 'Unlike' : 'Like'}
                className={`flex-shrink-0 p-2.5 ${isLiked ? 'text-yt-red' : 'text-yt-muted'}`}
              >
                <svg width="20" height="20" fill={isLiked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                </svg>
              </button>
              <button
                onClick={() => isPlaying ? pause() : resume()}
                aria-label={isPlaying ? 'Pause' : 'Play'}
                className="flex-shrink-0 w-11 h-11 rounded-full bg-white text-black flex items-center justify-center"
              >
                {isPlaying
                  ? <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" /></svg>
                  : <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>}
              </button>
              <button onClick={next} aria-label="Next" className="flex-shrink-0 p-2.5 text-yt-muted">
                <svg width="22" height="22" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
                </svg>
              </button>
            </>
          ) : (
            <span className="text-yt-muted text-sm">Nothing playing</span>
          )}
        </div>
      </div>

      {/* ── Desktop (≥ md) ── */}
      <div className="hidden md:flex items-center px-4 gap-4 h-full">
        {/* Left */}
        <div className="flex items-center gap-3 w-64 flex-shrink-0">
          {currentTrack ? (
            <>
              <img
                src={currentTrack.album_art}
                alt=""
                title="Open Lyrics"
                aria-label="Open Lyrics"
                className="w-14 h-14 rounded object-cover cursor-pointer"
                onClick={toggleLyricsOpen}
                onError={e => { e.target.style.background = '#383838'; e.target.src = '' }}
              />
              <div className="min-w-0">
                <p className="text-sm font-medium truncate cursor-pointer hover:underline" onClick={toggleLyricsOpen}>
                  {currentTrack.name}
                </p>
                <p className="text-xs text-yt-muted truncate">{currentTrack.artists}</p>
                {audioQuality && (
                  <span className="text-xs bg-yt-surface2 text-yt-muted px-1 rounded">{audioQuality}</span>
                )}
              </div>
              <button
                onClick={() => toggleLike(currentTrack)}
                className={`flex-shrink-0 ${isLiked ? 'text-yt-red' : 'text-yt-muted hover:text-white'}`}
              >
                <svg width="20" height="20" fill={isLiked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                </svg>
              </button>
            </>
          ) : (
            <div className="text-yt-muted text-sm">Nothing playing</div>
          )}
        </div>

        {/* Center */}
        <div className="flex-1 flex flex-col items-center gap-1">
          <div className="flex items-center gap-5">
            <ControlBtn onClick={toggleShuffle} active={shuffle} title="Shuffle">
              <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24">
                <path d="M10.59 9.17L5.41 4 4 5.41l5.17 5.17 1.42-1.41zM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.46 20 9.5V4h-5.5zm.33 9.41l-1.41 1.41 3.13 3.13L14.5 20H20v-5.5l-2.04 2.04-3.13-3.13z" />
              </svg>
            </ControlBtn>
            <ControlBtn onClick={prev} title="Previous">
              <svg width="22" height="22" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 6h2v12H6zm3.5 6 8.5 6V6z" />
              </svg>
            </ControlBtn>
            <button
              onClick={() => isPlaying ? pause() : resume()}
              className="w-10 h-10 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 transition-transform"
            >
              {isPlaying
                ? <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" /></svg>
                : <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>}
            </button>
            <ControlBtn onClick={next} title="Next">
              <svg width="22" height="22" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
              </svg>
            </ControlBtn>
            <ControlBtn onClick={cycleRepeat} active={repeat !== 'none'} title={`Repeat: ${repeat}`}>
              {repeat === 'one' ? (
                <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4zm-4-2V9h-1l-2 1v1h1.5v4H13z" />
                </svg>
              ) : (
                <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z" />
                </svg>
              )}
            </ControlBtn>
          </div>
          <ProgressBar />
        </div>

        {/* Right */}
        <div className="flex items-center gap-3 w-64 justify-end flex-shrink-0">
          <ControlBtn onClick={toggleLyricsOpen} title="Lyrics">
            <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24">
              <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z" />
            </svg>
          </ControlBtn>
          <ControlBtn onClick={toggleQueueOpen} title="Queue">
            <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24">
              <path d="M15 6H3v2h12V6zm0 4H3v2h12v-2zM3 16h8v-2H3v2zM17 6v8.18c-.31-.11-.65-.18-1-.18-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3V8h3V6h-5z" />
            </svg>
          </ControlBtn>
          <div className="flex items-center gap-2">
            <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24" className="text-yt-muted flex-shrink-0">
              <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
            </svg>
            <input
              type="range" min="0" max="1" step="0.01" value={volume}
              onChange={e => setVolume(parseFloat(e.target.value))}
              className="w-20 accent-yt-red"
            />
          </div>
        </div>
      </div>
    </div>
  )
}

function MobileProgressLine() {
  const currentTime = usePlayerStore(s => s.currentTime)
  const duration = usePlayerStore(s => s.duration)
  const pct = duration ? (currentTime / duration) * 100 : 0

  function handleClick(e) {
    if (!duration) return
    const rect = e.currentTarget.getBoundingClientRect()
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    seekAudio(ratio * duration)
  }

  return (
    <div className="w-full py-2 flex-shrink-0 cursor-pointer" onClick={handleClick}>
      <div className="w-full h-0.5 bg-yt-border">
        <div className="h-full bg-yt-red" style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

function ControlBtn({ onClick, active, title, children }) {
  return (
    <button
      onClick={onClick}
      title={title}
      aria-label={title}
      className={`p-2 rounded hover:bg-yt-surface2 transition-colors ${
        active ? 'text-yt-red' : 'text-yt-muted hover:text-white'
      }`}
    >
      {children}
    </button>
  )
}
