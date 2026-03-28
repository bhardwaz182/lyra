import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import usePlayerStore from '../store/playerStore'
import TrackRow from '../components/common/TrackRow'
import { TrackSkeleton } from '../components/common/Skeleton'

export default function Album() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [album, setAlbum] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const { play } = usePlayerStore()

  function fetchAlbum() {
    setLoading(true)
    setError(null)
    api.getAlbum(decodeURIComponent(id))
      .then(setAlbum)
      .catch(err => { setError(err); setLoading(false) })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchAlbum()
  }, [id])

  if (loading) {
    return (
      <div className="px-4 md:px-8 py-6">
        <div className="flex gap-6 mb-8">
          <div className="skeleton w-48 h-48 rounded-lg flex-shrink-0" />
          <div className="flex-1 flex flex-col justify-end gap-3">
            <div className="skeleton h-4 w-24 rounded" />
            <div className="skeleton h-8 w-64 rounded" />
            <div className="skeleton h-4 w-40 rounded" />
          </div>
        </div>
        {Array.from({ length: 8 }).map((_, i) => <TrackSkeleton key={i} />)}
      </div>
    )
  }

  if (error) {
    return (
      <div className="px-4 md:px-8 py-6 flex flex-col items-center justify-center min-h-[40vh]">
        <p className="text-yt-muted mb-4">Couldn't load content. Try again.</p>
        <button
          onClick={fetchAlbum}
          className="px-4 py-2 bg-yt-surface hover:bg-yt-surface2 text-white rounded-lg text-sm"
        >
          Retry
        </button>
      </div>
    )
  }

  if (!album) return <div className="px-4 md:px-8 py-6 text-yt-muted">Album not found.</div>

  const tracks = album.tracks || []

  return (
    <div>
      {/* Hero */}
      <div
        className="px-4 md:px-8 py-8 flex flex-col md:flex-row gap-4 md:gap-6 items-center md:items-end"
        style={{
          background: 'linear-gradient(180deg, #1a1a2e 0%, #0f0f0f 100%)',
        }}
      >
        <img
          src={album.album_art}
          alt={album.name}
          className="w-32 h-32 md:w-48 md:h-48 rounded-lg object-cover shadow-2xl flex-shrink-0"
          onError={e => { e.target.style.background = '#282828'; e.target.src = '' }}
        />
        <div className="min-w-0">
          <p className="text-xs text-yt-muted uppercase tracking-wider mb-1">Album</p>
          <h1 className="text-3xl font-bold mb-2 truncate">{album.name}</h1>
          <p
            className="text-yt-muted hover:text-white cursor-pointer text-sm"
            onClick={() => navigate(`/search?q=${encodeURIComponent(album.artists || '')}&type=artist`)}
          >
            {album.artists}
          </p>
          {album.release_date && (
            <p className="text-xs text-yt-muted mt-1">{album.release_date?.slice(0, 4)} · {tracks.length} songs</p>
          )}

          <div className="flex items-center gap-3 mt-4">
            <button
              onClick={() => tracks.length && play(tracks[0], tracks)}
              className="flex items-center gap-2 bg-yt-red hover:bg-red-600 text-white px-5 py-2 rounded-full text-sm font-semibold transition-colors"
            >
              <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
              Play
            </button>
            <button
              onClick={() => {
                const shuffled = [...tracks].sort(() => Math.random() - 0.5)
                shuffled.length && play(shuffled[0], shuffled)
              }}
              className="flex items-center gap-2 bg-yt-surface hover:bg-yt-surface2 text-white px-5 py-2 rounded-full text-sm font-semibold border border-yt-border transition-colors"
            >
              Shuffle
            </button>
          </div>
        </div>
      </div>

      {/* Track list */}
      <div className="px-4 py-4">
        <div className="flex items-center gap-3 px-4 py-2 text-xs text-yt-muted border-b border-yt-border mb-2">
          <span className="w-6 text-center">#</span>
          <span className="w-10">Art</span>
          <span className="flex-1">Title</span>
          <span className="w-10 text-right">Time</span>
        </div>
        {tracks.map((track, i) => (
          <TrackRow key={track.id || i} track={track} index={i} queue={tracks} />
        ))}
      </div>
    </div>
  )
}
