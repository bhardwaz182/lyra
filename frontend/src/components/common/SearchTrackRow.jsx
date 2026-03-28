import { useState } from 'react'
import usePlayerStore from '../../store/playerStore'

function fmt(ms) {
  if (!ms) return ''
  const s = Math.floor(ms / 1000)
  return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`
}

export default function SearchTrackRow({ track, queue }) {
  const { play, addToQueue, playNext, currentTrack, isPlaying, pause, resume, likedTrackIds, toggleLike } = usePlayerStore()
  const isCurrent = currentTrack?.id === track.id
  const isLiked = likedTrackIds.includes(track.id)
  const [menuOpen, setMenuOpen] = useState(false)

  function handlePlay() {
    if (isCurrent) {
      isPlaying ? pause() : resume()
    } else {
      play(track, queue || [track])
    }
  }

  const subtitle = [track.artists, track.album, fmt(track.duration_ms)]
    .filter(Boolean)
    .join(' · ')

  return (
    <div
      className={`group flex items-center gap-4 px-3 py-2 rounded-lg cursor-pointer transition-colors ${
        isCurrent ? 'bg-yt-surface2' : 'hover:bg-yt-surface'
      }`}
      onClick={handlePlay}
    >
      {/* Thumbnail with play overlay */}
      <div className="relative flex-shrink-0 w-14 h-14 rounded bg-yt-surface2 flex items-center justify-center overflow-hidden">
        {track.album_art ? (
          <img
            src={track.album_art}
            alt=""
            className="w-14 h-14 rounded object-cover"
            onError={e => { e.target.onerror = null; e.target.style.display = 'none' }}
          />
        ) : (
          <svg width="24" height="24" fill="currentColor" viewBox="0 0 24 24" className="text-yt-muted">
            <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
          </svg>
        )}
        {/* Play/pause overlay */}
        <div className={`absolute inset-0 bg-black/50 rounded flex items-center justify-center transition-opacity ${
          isCurrent ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
        }`}>
          {isCurrent && isPlaying ? (
            <svg width="22" height="22" fill="white" viewBox="0 0 24 24">
              <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
            </svg>
          ) : (
            <svg width="22" height="22" fill="white" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          )}
        </div>
        {/* Playing indicator bar (no overlay) */}
        {isCurrent && isPlaying && (
          <div className="absolute bottom-1 left-1 flex items-end gap-0.5 h-3">
            {[0, 150, 300].map(d => (
              <div
                key={d}
                className="w-0.5 bg-yt-red rounded-full animate-bounce"
                style={{ height: '100%', animationDelay: `${d}ms` }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Track info */}
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium truncate ${isCurrent ? 'text-yt-red' : 'text-yt-text'}`}>
          {track.name}
        </p>
        <p className="text-xs text-yt-muted truncate mt-0.5">{subtitle}</p>
      </div>

      {/* Right actions — visible on hover */}
      <div
        className="flex items-center gap-1 flex-shrink-0"
        onClick={e => e.stopPropagation()}
      >
        {/* Like */}
        <button
          onClick={() => toggleLike(track.id)}
          className={`p-2 rounded-full hover:bg-yt-surface2 transition-colors ${isLiked ? 'text-yt-red' : 'text-yt-muted hover:text-white'}`}
          title={isLiked ? 'Unlike' : 'Like'}
        >
          <svg width="18" height="18" fill={isLiked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
        </button>

        {/* Three-dot menu */}
        <div className="relative">
          <button
            onClick={() => setMenuOpen(o => !o)}
            className="p-2 rounded-full text-yt-muted hover:text-white hover:bg-yt-surface2 transition-colors"
            title="More options"
          >
            <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
            </svg>
          </button>

          {menuOpen && (
            <>
              {/* Click-away backdrop */}
              <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 top-9 w-48 bg-yt-surface border border-yt-border rounded-lg shadow-xl z-50 overflow-hidden">
                <MenuItem
                  icon={<QueueIcon />}
                  label="Add to queue"
                  onClick={() => { addToQueue(track); setMenuOpen(false) }}
                />
                <MenuItem
                  icon={<PlayNextIcon />}
                  label="Play next"
                  onClick={() => { playNext(track); setMenuOpen(false) }}
                />
                <MenuItem
                  icon={isLiked ? <HeartFilledIcon /> : <HeartIcon />}
                  label={isLiked ? 'Remove from liked' : 'Save to liked songs'}
                  onClick={() => { toggleLike(track.id); setMenuOpen(false) }}
                />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function MenuItem({ icon, label, onClick }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-yt-text hover:bg-yt-surface2 transition-colors"
    >
      <span className="text-yt-muted">{icon}</span>
      {label}
    </button>
  )
}

function QueueIcon() {
  return (
    <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
      <path d="M14 10H3v2h11v-2zm0-4H3v2h11V6zM3 16h7v-2H3v2zm11.5-4v-3H13v3h-3v1.5h3v3h1.5v-3h3V12h-3z" />
    </svg>
  )
}

function HeartIcon() {
  return (
    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  )
}

function PlayNextIcon() {
  return (
    <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
      <path d="M3 10h11v2H3zm0-4h11v2H3zm0 8h7v2H3zm13-1v8l6-4z" />
    </svg>
  )
}

function HeartFilledIcon() {
  return (
    <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  )
}
