import { useState, useEffect, useRef, useCallback } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import usePlayerStore from '../store/playerStore'
import SearchTrackRow from '../components/common/SearchTrackRow'
import AlbumCard from '../components/common/AlbumCard'
import ArtistCard from '../components/common/ArtistCard'
import { TrackSkeleton, RowOfCards } from '../components/common/Skeleton'

const TYPES = ['all', 'track', 'album', 'artist']
const LABELS = { all: 'All', track: 'Songs', album: 'Albums', artist: 'Artists' }

export default function Search() {
  const [searchParams, setSearchParams] = useSearchParams()
  const initialQ = searchParams.get('q') || ''
  const rawType = searchParams.get('type') || 'all'
  const initialType = TYPES.includes(rawType) ? rawType : 'all'

  const [q, setQ] = useState(initialQ)
  const [type, setType] = useState(initialType)

  // Single-type mode
  const [results, setResults] = useState([])
  const [offset, setOffset] = useState(0)
  const [hasMore, setHasMore] = useState(false)

  // All mode — flat combined list
  const [combined, setCombined] = useState([])

  const [loading, setLoading] = useState(false)
  const [searchError, setSearchError] = useState(null)
  const [suggestions, setSuggestions] = useState([])
  const [quickTracks, setQuickTracks] = useState([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [inputFocused, setInputFocused] = useState(false)
  const suggestTimer = useRef(null)
  const blurTimer = useRef(null)
  const inputRef = useRef(null)

  const recentSearches = usePlayerStore(s => s.recentSearches)
  const { addRecentSearch, removeRecentSearch, clearRecentSearches } = usePlayerStore()

  const showRecentDropdown = inputFocused && q.length < 2 && recentSearches.length > 0

  function doSearch(query, searchType, newOffset = 0) {
    if (!query.trim()) return
    setLoading(true)
    setSearchError(null)
    setShowSuggestions(false)

    if (searchType === 'all') {
      Promise.all([
        api.search(query, 'track', 0).catch(() => ({ results: [] })),
        api.search(query, 'album', 0).catch(() => ({ results: [] })),
        api.search(query, 'artist', 0).catch(() => ({ results: [] })),
      ]).then(([trackData, albumData, artistData]) => {
        // Interleave: for every 3 tracks inject 1 album or artist so the list feels natural
        const tracks = trackData.results || []
        const albums = albumData.results || []
        const artists = artistData.results || []
        const flat = []
        const maxLen = Math.max(tracks.length, albums.length, artists.length)
        let ti = 0, ali = 0, ari = 0
        for (let i = 0; i < maxLen; i++) {
          if (ti < tracks.length) flat.push(tracks[ti++])
          if (ti < tracks.length) flat.push(tracks[ti++])
          if (ti < tracks.length) flat.push(tracks[ti++])
          if (ali < albums.length) flat.push(albums[ali++])
          if (ari < artists.length) flat.push(artists[ari++])
        }
        setCombined(flat)
      }).catch(err => { setSearchError(err) }).finally(() => setLoading(false))
    } else {
      api.search(query, searchType, newOffset)
        .then(data => {
          const res = data.results || []
          setResults(prev => newOffset === 0 ? res : [...prev, ...res])
          setHasMore(res.length >= 20)
          setOffset(newOffset)
        })
        .catch(err => { setSearchError(err) })
        .finally(() => setLoading(false))
    }
  }

  useEffect(() => {
    if (initialQ) doSearch(initialQ, initialType)
  }, [])

  function handleInput(val) {
    setQ(val)
    clearTimeout(suggestTimer.current)
    if (val.length >= 2) {
      suggestTimer.current = setTimeout(() => {
        Promise.all([
          api.getSuggestions(val).catch(() => ({ suggestions: [] })),
          api.search(val, 'track', 0).catch(() => ({ results: [] })),
        ]).then(([suggestData, trackData]) => {
          setSuggestions(suggestData.suggestions || [])
          setQuickTracks((trackData.results || []).slice(0, 4))
          setShowSuggestions(true)
        })
      }, 300)
    } else {
      setSuggestions([])
      setQuickTracks([])
      setShowSuggestions(false)
    }
  }

  function handleSubmit(e) {
    e?.preventDefault()
    if (!q.trim()) return
    addRecentSearch(q.trim())
    setSearchParams({ q, type })
    doSearch(q, type)
  }

  function pickSuggestion(s) {
    setQ(s)
    setSuggestions([])
    setShowSuggestions(false)
    addRecentSearch(s)
    setSearchParams({ q: s, type })
    doSearch(s, type)
  }

  function changeType(t) {
    setType(t)
    setResults([])
    setCombined([])
    if (q.trim()) {
      setSearchParams({ q, type: t })
      doSearch(q, t)
    }
  }

  const hasResults = type === 'all' ? combined.length > 0 : results.length > 0

  return (
    <div className="px-4 md:px-8 py-6">
      {/* Search input */}
      <form onSubmit={handleSubmit} className="relative mb-6">
        <div className="flex items-center bg-yt-surface border border-yt-border rounded-full px-4 py-2 gap-2 max-w-xl">
          <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" className="text-yt-muted">
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
          </svg>
          <input
            ref={inputRef}
            value={q}
            onChange={e => handleInput(e.target.value)}
            onBlur={() => { blurTimer.current = setTimeout(() => { setShowSuggestions(false); setInputFocused(false) }, 150) }}
            onFocus={() => { clearTimeout(blurTimer.current); setInputFocused(true); if (suggestions.length && q.length >= 2) setShowSuggestions(true) }}
            placeholder="Songs, artists, podcasts"
            className="flex-1 bg-transparent outline-none text-sm"
          />
          {q && (
            <button type="button" onClick={() => { setQ(''); setResults([]); setCombined([]); inputRef.current?.focus() }} className="text-yt-muted hover:text-white">
              <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" /></svg>
            </button>
          )}
        </div>

        {/* Recent searches dropdown — shown when focused with empty input */}
        {showRecentDropdown && !showSuggestions && (
          <div onMouseDown={e => e.preventDefault()} className="absolute top-12 left-0 max-w-xl w-full bg-[#212121] rounded-2xl shadow-2xl z-50 overflow-hidden border border-yt-border">
            <div className="flex items-center justify-between px-5 pt-3 pb-2">
              <span className="text-xs font-semibold text-yt-muted uppercase tracking-wider">Recent searches</span>
              <button
                type="button"
                onClick={clearRecentSearches}
                className="text-xs text-yt-muted hover:text-white transition-colors"
              >
                Clear all
              </button>
            </div>
            {recentSearches.map(query => (
              <div key={query} className="flex items-center gap-3 px-5 py-2.5 hover:bg-yt-surface2 transition-colors group">
                <svg width="15" height="15" fill="currentColor" viewBox="0 0 24 24" className="text-yt-muted flex-shrink-0">
                  <path d="M13 3a9 9 0 1 0 9 9h-2a7 7 0 1 1-2.05-4.95L15 10h5V5l-1.76 1.76A8.97 8.97 0 0 0 13 3zm-1 5v5l4.28 2.54.72-1.21-3.5-2.08V8H12z"/>
                </svg>
                <button
                  type="button"
                  onClick={() => pickSuggestion(query)}
                  className="flex-1 text-left text-sm text-yt-text truncate"
                >
                  {query}
                </button>
                <button
                  type="button"
                  onClick={e => { e.stopPropagation(); removeRecentSearch(query) }}
                  className="p-1 text-yt-muted hover:text-white opacity-0 group-hover:opacity-100 sm:group-hover:opacity-100 transition-opacity flex-shrink-0"
                  aria-label={`Remove ${query}`}
                >
                  <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Autocomplete dropdown */}
        {showSuggestions && (suggestions.length > 0 || quickTracks.length > 0) && (
          <div onMouseDown={e => e.preventDefault()} className="absolute top-12 left-0 max-w-xl w-full bg-[#212121] rounded-2xl shadow-2xl z-50 overflow-hidden border border-yt-border">
            {suggestions.slice(0, 5).map(s => {
              const lower = s.toLowerCase()
              const qLower = q.toLowerCase()
              const matchEnd = lower.startsWith(qLower) ? q.length : 0
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => pickSuggestion(s)}
                  className="w-full text-left px-5 py-3 hover:bg-yt-surface2 flex items-center gap-4 transition-colors"
                >
                  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" className="text-yt-muted flex-shrink-0">
                    <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
                  </svg>
                  <span className="text-sm text-yt-muted">
                    {matchEnd > 0 ? (
                      <>
                        <span className="text-white font-medium">{s.slice(0, matchEnd)}</span>
                        {s.slice(matchEnd)}
                      </>
                    ) : s}
                  </span>
                </button>
              )
            })}
            {quickTracks.length > 0 && (
              <>
                {suggestions.length > 0 && <div className="border-t border-yt-border mx-4" />}
                {quickTracks.map(track => (
                  <QuickTrackItem
                    key={track.id}
                    track={track}
                    allTracks={quickTracks}
                    onSelect={() => {
                      addRecentSearch(q.trim())
                      setShowSuggestions(false)
                      setSearchParams({ q, type })
                      doSearch(q, type)
                    }}
                  />
                ))}
              </>
            )}
          </div>
        )}
      </form>

      {/* Type chips */}
      <div className="flex flex-wrap gap-2 mb-6">
        {TYPES.map(t => (
          <button
            key={t}
            onClick={() => changeType(t)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              type === t
                ? 'bg-white text-black'
                : 'bg-yt-surface text-yt-muted hover:bg-yt-surface2 hover:text-white'
            }`}
          >
            {LABELS[t]}
          </button>
        ))}
      </div>

      {/* Error state */}
      {searchError && (
        <div className="flex flex-col items-center py-16 text-yt-muted">
          <p className="mb-4">Couldn't load results. Try again.</p>
          <button
            onClick={() => doSearch(q, type)}
            className="px-4 py-2 bg-yt-surface hover:bg-yt-surface2 text-white rounded-lg text-sm"
          >
            Retry
          </button>
        </div>
      )}

      {/* Empty state — recent searches or generic prompt */}
      {!searchError && !q.trim() && !hasResults && (
        recentSearches.length > 0 ? (
          <div className="mt-2">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-yt-muted uppercase tracking-wider">Recent searches</h2>
              <button
                onClick={clearRecentSearches}
                className="text-xs text-yt-muted hover:text-white transition-colors"
              >
                Clear all
              </button>
            </div>
            <div className="space-y-0.5">
              {recentSearches.map(query => (
                <div key={query} className="flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-yt-surface transition-colors group cursor-pointer"
                  onClick={() => pickSuggestion(query)}>
                  <div className="w-10 h-10 rounded-full bg-yt-surface2 flex items-center justify-center flex-shrink-0">
                    <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24" className="text-yt-muted">
                      <path d="M13 3a9 9 0 1 0 9 9h-2a7 7 0 1 1-2.05-4.95L15 10h5V5l-1.76 1.76A8.97 8.97 0 0 0 13 3zm-1 5v5l4.28 2.54.72-1.21-3.5-2.08V8H12z"/>
                    </svg>
                  </div>
                  <span className="flex-1 text-sm text-yt-text truncate">{query}</span>
                  <button
                    onClick={e => { e.stopPropagation(); removeRecentSearch(query) }}
                    className="p-2 text-yt-muted hover:text-white opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                    aria-label={`Remove ${query}`}
                  >
                    <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center text-yt-muted py-16">
            <svg width="48" height="48" fill="currentColor" viewBox="0 0 24 24" className="mx-auto mb-4 opacity-40">
              <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
            </svg>
            <p>Search for songs, artists, and albums</p>
          </div>
        )
      )}

      {/* ── ALL mode — single flat list ── */}
      {!searchError && type === 'all' && (
        <>
          {loading && Array.from({ length: 8 }).map((_, i) => <TrackSkeleton key={i} />)}
          {!loading && combined.map((item, i) => (
            <CombinedRow key={`${item.id}-${i}`} item={item} />
          ))}
          {!loading && q.trim() && !hasResults && (
            <div className="text-center text-yt-muted py-16">No results for &ldquo;{q}&rdquo;</div>
          )}
        </>
      )}

      {/* ── Single-type mode ── */}
      {!searchError && type !== 'all' && (
        <>
          {loading && type === 'track' && Array.from({ length: 8 }).map((_, i) => <TrackSkeleton key={i} />)}
          {loading && type !== 'track' && <RowOfCards count={6} />}

          {!loading && type === 'track' && (
            <div>
              {results.map(track => (
                <SearchTrackRow key={track.id} track={track} />
              ))}
            </div>
          )}
          {!loading && type === 'album' && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {results.map(item => <AlbumCard key={item.id} item={item} />)}
            </div>
          )}
          {!loading && type === 'artist' && (
            <div className="flex flex-wrap gap-6">
              {results.map(a => <ArtistCard key={a.id} artist={a} />)}
            </div>
          )}

          {hasMore && !loading && (
            <button
              onClick={() => doSearch(q, type, offset + 20)}
              className="mt-6 w-full py-3 text-sm text-yt-muted hover:text-white border border-yt-border rounded-lg hover:border-yt-muted transition-colors"
            >
              Load more
            </button>
          )}

          {!loading && results.length === 0 && q.trim() && (
            <div className="text-center text-yt-muted py-16">No results for &ldquo;{q}&rdquo;</div>
          )}
        </>
      )}
    </div>
  )
}

// Renders any search result (track, album, artist) as a uniform row
function CombinedRow({ item }) {
  const navigate = useNavigate()
  const { play, addToQueue, playNext } = usePlayerStore()
  const [menuOpen, setMenuOpen] = useState(false)

  function handleClick() {
    if (item.type === 'album') navigate(`/album/${encodeURIComponent(item.id)}`)
    else if (item.type === 'artist') navigate(`/artist/${encodeURIComponent(item.id)}`)
    else play(item, [item])
  }

  const itemType = item.type === 'artist' ? 'Artist' : item.album_type ? 'Album' : 'Song'

  const subtitle = item.type === 'track'
    ? [item.artists, item.album].filter(Boolean).join(' · ')
    : item.type === 'album'
    ? ['Album', item.artists].filter(Boolean).join(' · ')
    : 'Artist'

  const isRound = item.type === 'artist'

  return (
    <div className="group flex items-center gap-4 px-3 py-2 rounded-lg hover:bg-yt-surface transition-colors">
      <div
        onClick={handleClick}
        className={`relative flex-shrink-0 w-14 h-14 bg-yt-surface2 flex items-center justify-center overflow-hidden cursor-pointer ${isRound ? 'rounded-full' : 'rounded'}`}
      >
        {item.album_art ? (
          <img src={item.album_art} alt="" className="w-14 h-14 object-cover"
            onError={e => { e.target.onerror = null; e.target.style.display = 'none' }} />
        ) : (
          <svg width="24" height="24" fill="currentColor" viewBox="0 0 24 24" className="text-yt-muted">
            {item.type === 'artist'
              ? <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
              : <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>}
          </svg>
        )}
        {item.type === 'track' && (
          <div className="absolute inset-0 bg-black/50 rounded flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <svg width="20" height="20" fill="white" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0 cursor-pointer" onClick={handleClick}>
        <p className="text-sm font-medium truncate text-yt-text">{item.name}</p>
        <p className="text-xs text-yt-muted truncate mt-0.5">
          <span className="inline-block px-1.5 py-0.5 text-[10px] rounded bg-white/10 text-yt-muted mr-1 uppercase tracking-wide">{itemType}</span>
          {subtitle}
        </p>
      </div>

      {/* Three-dot menu — track type only */}
      {item.type === 'track' && (
        <div className="relative flex-shrink-0" onClick={e => e.stopPropagation()}>
          <button
            onClick={() => setMenuOpen(o => !o)}
            className="p-2 rounded-full text-yt-muted hover:text-white hover:bg-yt-surface2 transition-colors"
          >
            <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
            </svg>
          </button>
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 top-9 w-48 bg-yt-surface border border-yt-border rounded-lg shadow-xl z-50 overflow-hidden">
                <CombinedMenuItem icon={<QueueAddIcon />} label="Add to queue"
                  onClick={() => { addToQueue(item); setMenuOpen(false) }} />
                <CombinedMenuItem icon={<PlayNextIcon />} label="Play next"
                  onClick={() => { playNext(item); setMenuOpen(false) }} />
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

function CombinedMenuItem({ icon, label, onClick }) {
  return (
    <button onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-yt-text hover:bg-yt-surface2 transition-colors">
      <span className="text-yt-muted">{icon}</span>{label}
    </button>
  )
}
function QueueAddIcon() {
  return <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24"><path d="M14 10H3v2h11v-2zm0-4H3v2h11V6zM3 16h7v-2H3v2zm11.5-4v-3H13v3h-3v1.5h3v3h1.5v-3h3V12h-3z" /></svg>
}
function PlayNextIcon() {
  return <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24"><path d="M3 10h11v2H3zm0-4h11v2H3zm0 8h7v2H3zm13-1v8l6-4z" /></svg>
}

function QuickTrackItem({ track, allTracks, onSelect }) {
  const { play } = usePlayerStore()

  function handleClick() {
    play(track, allTracks)
    onSelect()
  }

  const subtitle = ['Song', track.artists, track.album]
    .filter(Boolean)
    .join(' · ')

  return (
    <button
      type="button"
      onClick={handleClick}
      className="w-full text-left px-4 py-3 hover:bg-yt-surface2 flex items-center gap-4 transition-colors"
    >
      <div className="w-12 h-12 rounded flex-shrink-0 bg-yt-surface2 overflow-hidden flex items-center justify-center">
        {track.album_art ? (
          <img
            src={track.album_art}
            alt=""
            className="w-12 h-12 object-cover"
            onError={e => { e.target.onerror = null; e.target.style.display = 'none' }}
          />
        ) : (
          <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24" className="text-yt-muted">
            <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
          </svg>
        )}
      </div>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-white truncate">{track.name}</p>
        <p className="text-xs text-yt-muted truncate mt-0.5">{subtitle}</p>
      </div>
    </button>
  )
}
