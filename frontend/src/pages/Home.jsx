import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { api } from '../api/client'
import usePlayerStore from '../store/playerStore'
import AlbumCard from '../components/common/AlbumCard'
import ArtistCard from '../components/common/ArtistCard'
import TrackRow from '../components/common/TrackRow'
import { RowOfCards, TrackSkeleton } from '../components/common/Skeleton'

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

export default function Home() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const { play } = usePlayerStore()
  const navigate = useNavigate()

  function fetchHome() {
    setLoading(true)
    setError(null)
    api.getHome()
      .then(setData)
      .catch(err => { setError(err); setLoading(false) })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchHome()
  }, [])

  if (error) {
    return (
      <div className="px-4 md:px-8 py-6 flex flex-col items-center justify-center min-h-[40vh]">
        <p className="text-yt-muted mb-4">Couldn't load content. Try again.</p>
        <button
          onClick={fetchHome}
          className="px-4 py-2 bg-yt-surface hover:bg-yt-surface2 text-white rounded-lg text-sm"
        >
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className="px-4 md:px-8 py-6">
      <h1 className="text-2xl font-bold mb-6">{greeting()}</h1>

      {/* Trending Tracks */}
      <section className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Trending</h2>
          <button
            className="text-sm text-yt-muted hover:text-white"
            onClick={() => navigate('/search?q=trending&type=track')}
          >
            See all
          </button>
        </div>
        {loading
          ? Array.from({ length: 5 }).map((_, i) => <TrackSkeleton key={i} />)
          : (data?.trending_tracks || []).slice(0, 10).map((track, i) => (
              <TrackRow
                key={track.id}
                track={track}
                index={i}
                queue={data.trending_tracks}
              />
            ))}
      </section>

      {/* New Releases */}
      <section className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">New Releases</h2>
          <Link to="/search?q=new+releases&type=album" className="text-sm text-yt-muted hover:text-white">See all</Link>
        </div>
        {loading
          ? <RowOfCards />
          : <div className="carousel-scroll">
              {(data?.new_releases || []).map(album => (
                <AlbumCard key={album.id} item={album} />
              ))}
            </div>
        }
      </section>

      {/* Featured Artists */}
      <section className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Top Artists</h2>
          <Link to="/search?q=top+artists&type=artist" className="text-sm text-yt-muted hover:text-white">See all</Link>
        </div>
        {loading
          ? <RowOfCards />
          : <div className="carousel-scroll">
              {(data?.featured_artists || []).map(artist => (
                <ArtistCard key={artist.id} artist={artist} />
              ))}
            </div>
        }
      </section>

      {/* Mood chips */}
      {!loading && data?.moods?.length > 0 && (
        <section className="mb-6">
          <h2 className="text-lg font-semibold mb-4">Moods & Genres</h2>
          <div className="flex flex-wrap gap-2">
            {data.moods.map(m => (
              <button
                key={m.label}
                onClick={() => {
                  navigate(`/search?q=${encodeURIComponent(m.query)}&type=track`)
                }}
                className="px-4 py-2 rounded-full text-sm font-medium transition-colors bg-yt-surface text-yt-muted hover:bg-yt-surface2 hover:text-white"
              >
                {m.label}
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
