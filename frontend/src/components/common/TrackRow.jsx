import usePlayerStore from '../../store/playerStore'

function fmt(ms) {
  if (!ms) return ''
  const s = Math.floor(ms / 1000)
  return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`
}

export default function TrackRow({ track, index, queue, showAlbumArt = true }) {
  const { play, addToQueue, currentTrack, isPlaying, pause, resume } = usePlayerStore()
  const isCurrent = currentTrack?.id === track.id

  function handlePlay() {
    if (isCurrent) {
      isPlaying ? pause() : resume()
    } else {
      play(track, queue || [track])
    }
  }

  return (
    <div
      className={`track-row flex items-center gap-3 px-4 py-2 rounded-lg cursor-pointer group ${
        isCurrent ? 'bg-yt-surface2' : ''
      }`}
      onClick={handlePlay}
    >
      {/* Number / Play icon */}
      <div className="w-6 text-center flex-shrink-0">
        {isCurrent && isPlaying ? (
          <div className="flex items-end justify-center gap-0.5 h-4">
            {[0, 100, 200].map(d => (
              <div
                key={d}
                className="w-0.5 bg-yt-red rounded-full animate-bounce"
                style={{ height: '100%', animationDelay: `${d}ms` }}
              />
            ))}
          </div>
        ) : (
          <>
            <span className="track-num text-yt-muted text-sm">{index + 1}</span>
            <button className="track-play-btn items-center justify-center text-white">
              <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            </button>
          </>
        )}
      </div>

      {/* Art */}
      {showAlbumArt && (
        <img
          src={track.album_art}
          alt=""
          className="w-10 h-10 rounded object-cover flex-shrink-0"
          onError={e => { e.target.style.background = '#383838'; e.target.src = '' }}
        />
      )}

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium truncate ${isCurrent ? 'text-yt-red' : ''}`}>
          {track.name}
        </p>
        <p className="text-xs text-yt-muted truncate">{track.artists}</p>
      </div>

      {/* Duration + add to queue */}
      <div className="flex items-center gap-3 flex-shrink-0">
        <button
          onClick={e => { e.stopPropagation(); addToQueue(track) }}
          className="opacity-0 group-hover:opacity-100 text-yt-muted hover:text-white p-1 transition-opacity"
          title="Add to queue"
        >
          <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
            <path d="M14 10H3v2h11v-2zm0-4H3v2h11V6zM3 16h7v-2H3v2zm11.5-4v-3H13v3h-3v1.5h3v3h1.5v-3h3V12h-3z" />
          </svg>
        </button>
        <span className="text-xs text-yt-muted w-10 text-right">{fmt(track.duration_ms)}</span>
      </div>
    </div>
  )
}
