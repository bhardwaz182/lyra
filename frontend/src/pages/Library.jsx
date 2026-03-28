import { useState } from 'react'
import usePlayerStore from '../store/playerStore'
import TrackRow from '../components/common/TrackRow'

const TABS = ['liked', 'playlists', 'recent']
const TAB_LABELS = { liked: 'Liked Songs', playlists: 'Playlists', recent: 'Recently Played' }

export default function Library() {
  const [tab, setTab] = useState('liked')
  const likedTrackIds = usePlayerStore(s => s.likedTrackIds)
  const playlists = usePlayerStore(s => s.playlists)
  const recentTracks = usePlayerStore(s => s.recentTracks)
  const { play, createPlaylist, deletePlaylist } = usePlayerStore()

  // Liked songs — we only store IDs, so show recent tracks that are liked
  const likedTracks = recentTracks.filter(t => likedTrackIds.includes(t.id))

  const [newPlaylistName, setNewPlaylistName] = useState('')
  const [selectedPlaylist, setSelectedPlaylist] = useState(null)

  return (
    <div className="px-8 py-6">
      <h1 className="text-2xl font-bold mb-6">Your Library</h1>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {TABS.map(t => (
          <button
            key={t}
            onClick={() => { setTab(t); setSelectedPlaylist(null) }}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              tab === t
                ? 'bg-white text-black'
                : 'bg-yt-surface text-yt-muted hover:bg-yt-surface2 hover:text-white'
            }`}
          >
            {TAB_LABELS[t]}
          </button>
        ))}
      </div>

      {/* Liked Songs */}
      {tab === 'liked' && (
        <div>
          {likedTracks.length === 0 ? (
            <Empty label="No liked songs yet. Heart a track while it's playing." />
          ) : (
            likedTracks.map((track, i) => (
              <TrackRow key={track.id} track={track} index={i} queue={likedTracks} />
            ))
          )}
        </div>
      )}

      {/* Playlists */}
      {tab === 'playlists' && !selectedPlaylist && (
        <div>
          {/* Create playlist */}
          <form
            onSubmit={e => {
              e.preventDefault()
              if (newPlaylistName.trim()) {
                createPlaylist(newPlaylistName.trim())
                setNewPlaylistName('')
              }
            }}
            className="flex gap-2 mb-6"
          >
            <input
              value={newPlaylistName}
              onChange={e => setNewPlaylistName(e.target.value)}
              placeholder="New playlist name..."
              className="flex-1 bg-yt-surface border border-yt-border rounded-lg px-3 py-2 text-sm outline-none focus:border-yt-muted"
            />
            <button
              type="submit"
              className="bg-yt-red text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-600"
            >
              Create
            </button>
          </form>

          {playlists.length === 0 ? (
            <Empty label="No playlists yet. Create one above." />
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {playlists.map(pl => (
                <div
                  key={pl.id}
                  onClick={() => setSelectedPlaylist(pl)}
                  className="bg-yt-surface hover:bg-yt-surface2 rounded-lg p-4 cursor-pointer group relative"
                >
                  <div className="w-full aspect-square bg-yt-surface2 rounded-lg mb-3 flex items-center justify-center">
                    <svg width="32" height="32" fill="currentColor" viewBox="0 0 24 24" className="text-yt-muted">
                      <path d="M15 6H3v2h12V6zm0 4H3v2h12v-2zM3 16h8v-2H3v2zM17 6v8.18c-.31-.11-.65-.18-1-.18-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3V8h3V6h-5z" />
                    </svg>
                  </div>
                  <p className="text-sm font-medium truncate">{pl.name}</p>
                  <p className="text-xs text-yt-muted">{pl.tracks.length} songs</p>
                  <button
                    onClick={e => { e.stopPropagation(); deletePlaylist(pl.id) }}
                    className="absolute top-2 right-2 text-yt-muted hover:text-white opacity-0 group-hover:opacity-100 p-1"
                  >
                    <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Playlist detail */}
      {tab === 'playlists' && selectedPlaylist && (
        <div>
          <button
            onClick={() => setSelectedPlaylist(null)}
            className="flex items-center gap-2 text-sm text-yt-muted hover:text-white mb-4"
          >
            <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" /></svg>
            Back to playlists
          </button>
          <h2 className="text-xl font-bold mb-4">{selectedPlaylist.name}</h2>
          {selectedPlaylist.tracks.length === 0 ? (
            <Empty label="No tracks in this playlist yet." />
          ) : (
            selectedPlaylist.tracks.map((track, i) => (
              <TrackRow key={track.id} track={track} index={i} queue={selectedPlaylist.tracks} />
            ))
          )}
        </div>
      )}

      {/* Recent */}
      {tab === 'recent' && (
        <div>
          {recentTracks.length === 0 ? (
            <Empty label="Nothing played yet. Start listening!" />
          ) : (
            recentTracks.map((track, i) => (
              <TrackRow key={`${track.id}-${i}`} track={track} index={i} queue={recentTracks} />
            ))
          )}
        </div>
      )}
    </div>
  )
}

function Empty({ label }) {
  return (
    <div className="text-center text-yt-muted py-16">
      <p>{label}</p>
    </div>
  )
}
