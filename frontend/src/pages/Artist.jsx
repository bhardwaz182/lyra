import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { api } from '../api/client'
import usePlayerStore from '../store/playerStore'
import TrackRow from '../components/common/TrackRow'
import AlbumCard from '../components/common/AlbumCard'
import ArtistCard from '../components/common/ArtistCard'
import { TrackSkeleton, RowOfCards } from '../components/common/Skeleton'

export default function Artist() {
  const { id } = useParams()
  const [artist, setArtist] = useState(null)
  const [bio, setBio] = useState(null)
  const [similar, setSimilar] = useState([])
  const [albums, setAlbums] = useState([])
  const [bioExpanded, setBioExpanded] = useState(false)
  const [loading, setLoading] = useState(true)
  const { play } = usePlayerStore()

  const decodedId = decodeURIComponent(id)

  useEffect(() => {
    setLoading(true)
    api.getArtist(decodedId)
      .then(data => {
        setArtist(data)
        // Fire secondary fetches with artist name
        const name = data?.name
        if (name) {
          api.getArtistBio(name).then(setBio).catch(() => {})
          api.getSimilarArtists(name).then(d => setSimilar(d.artists || [])).catch(() => {})
          api.getArtistAlbums(name).then(d => setAlbums(d.albums || [])).catch(() => {})
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [id])

  if (loading) {
    return (
      <div className="px-8 py-6">
        <div className="skeleton h-48 w-full rounded-xl mb-6" />
        {Array.from({ length: 5 }).map((_, i) => <TrackSkeleton key={i} />)}
      </div>
    )
  }

  if (!artist) return <div className="px-8 py-6 text-yt-muted">Artist not found.</div>

  const tracks = artist.tracks || []
  const visibleTracks = tracks.slice(0, 5)
  const heroImage = bio?.image || artist.album_art || artist.picture_xl || artist.picture_big

  return (
    <div>
      {/* Hero */}
      <div className="relative h-64 overflow-hidden">
        {heroImage && (
          <img
            src={heroImage}
            alt={artist.name}
            className="w-full h-full object-cover object-top"
            onError={e => { e.target.style.display = 'none' }}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-yt-bg via-yt-bg/60 to-transparent" />
        <div className="absolute bottom-0 left-0 px-8 pb-6">
          <h1 className="text-4xl font-bold drop-shadow-lg">{artist.name}</h1>
          {artist.nb_fan && (
            <p className="text-sm text-yt-muted mt-1">
              {Number(artist.nb_fan).toLocaleString()} monthly listeners
            </p>
          )}
        </div>
      </div>

      <div className="px-8 py-2 mb-4 flex items-center gap-3">
        <button
          onClick={() => visibleTracks.length && play(visibleTracks[0], visibleTracks)}
          className="flex items-center gap-2 bg-yt-red hover:bg-red-600 text-white px-5 py-2 rounded-full text-sm font-semibold"
        >
          <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
          Play
        </button>
      </div>

      {/* Top tracks */}
      <section className="px-4 mb-8">
        <h2 className="text-lg font-semibold px-4 mb-2">Top Songs</h2>
        {visibleTracks.map((track, i) => (
          <TrackRow key={track.id || i} track={track} index={i} queue={visibleTracks} />
        ))}
      </section>

      {/* Discography */}
      {albums.length > 0 && (
        <section className="px-8 mb-8">
          <h2 className="text-lg font-semibold mb-4">Discography</h2>
          <div className="carousel-scroll">
            {albums.map(a => <AlbumCard key={a.id} item={a} />)}
          </div>
        </section>
      )}

      {/* Bio */}
      {bio?.bio && (
        <section className="px-8 mb-8">
          <h2 className="text-lg font-semibold mb-3">About</h2>
          <div
            className={`text-sm text-yt-muted leading-relaxed overflow-hidden transition-all ${
              bioExpanded ? '' : 'line-clamp-4'
            }`}
          >
            {bio.bio}
          </div>
          <button
            onClick={() => setBioExpanded(e => !e)}
            className="text-xs text-white mt-2 hover:underline"
          >
            {bioExpanded ? 'Show less' : 'Show more'}
          </button>

          {/* Socials */}
          {bio.socials?.length > 0 && (
            <div className="flex gap-3 mt-3 flex-wrap">
              {bio.socials.map(s => (
                <a
                  key={s.url}
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs bg-yt-surface hover:bg-yt-surface2 px-3 py-1.5 rounded-full flex items-center gap-1.5 transition-colors"
                >
                  <span>{s.icon}</span>
                  <span>{s.label}</span>
                </a>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Similar Artists */}
      {similar.length > 0 && (
        <section className="px-8 mb-8">
          <h2 className="text-lg font-semibold mb-4">Similar Artists</h2>
          <div className="carousel-scroll">
            {similar.slice(0, 10).map(a => (
              <ArtistCard key={a.name} artist={{ id: `dz_search_${a.name}`, name: a.name, album_art: a.image }} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
