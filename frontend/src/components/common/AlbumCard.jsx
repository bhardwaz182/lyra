import { useNavigate } from 'react-router-dom'
import usePlayerStore from '../../store/playerStore'

export default function AlbumCard({ item }) {
  const navigate = useNavigate()
  const { play } = usePlayerStore()

  function handleClick() {
    if (item.type === 'album') {
      navigate(`/album/${encodeURIComponent(item.id)}`)
    } else if (item.type === 'artist') {
      navigate(`/artist/${encodeURIComponent(item.id)}`)
    } else {
      play(item, [item])
    }
  }

  return (
    <div
      className="flex-shrink-0 w-40 cursor-pointer group"
      onClick={handleClick}
    >
      <div className="relative mb-2">
        <img
          src={item.album_art}
          alt={item.name}
          className="w-40 h-40 object-cover rounded-lg"
          onError={e => { e.target.style.background = '#282828'; e.target.src = '' }}
        />
        <div className="play-overlay absolute bottom-2 right-2 w-10 h-10 bg-yt-red rounded-full flex items-center justify-center shadow-lg">
          <svg width="18" height="18" fill="white" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z" />
          </svg>
        </div>
      </div>
      <p className="text-sm font-medium truncate">{item.name}</p>
      <p className="text-xs text-yt-muted truncate">{item.artists}</p>
    </div>
  )
}
