import { useNavigate } from 'react-router-dom'

export default function ArtistCard({ artist }) {
  const navigate = useNavigate()
  return (
    <div
      className="flex-shrink-0 w-36 cursor-pointer text-center group"
      onClick={() => navigate(`/artist/${encodeURIComponent(artist.id)}`)}
    >
      <div className="relative mb-2">
        <img
          src={artist.album_art || artist.picture}
          alt={artist.name}
          className="w-36 h-36 object-cover rounded-full mx-auto"
          onError={e => { e.target.style.background = '#383838'; e.target.src = '' }}
        />
        <div className="play-overlay absolute bottom-1 right-2 w-9 h-9 bg-yt-red rounded-full flex items-center justify-center shadow-lg">
          <svg width="16" height="16" fill="white" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z" />
          </svg>
        </div>
      </div>
      <p className="text-sm font-medium truncate">{artist.name}</p>
      <p className="text-xs text-yt-muted">Artist</p>
    </div>
  )
}
