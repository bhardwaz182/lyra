import { useState, useEffect, useRef } from 'react'
import usePlayerStore from '../../store/playerStore'
import { api } from '../../api/client'

function parseLRC(lrc) {
  if (!lrc) return null
  const lines = []
  const regex = /\[(\d+):(\d+\.\d+)\](.*)/g
  let m
  while ((m = regex.exec(lrc)) !== null) {
    const time = parseInt(m[1]) * 60 + parseFloat(m[2])
    lines.push({ time, text: m[3].trim() })
  }
  return lines.length > 0 ? lines : null
}

export default function LyricsPanel() {
  const lyricsOpen = usePlayerStore(s => s.lyricsOpen)
  const toggleLyricsOpen = usePlayerStore(s => s.toggleLyricsOpen)
  const currentTrack = usePlayerStore(s => s.currentTrack)
  const currentTime = usePlayerStore(s => s.currentTime)

  const [lyrics, setLyrics] = useState(null)
  const [syncedLines, setSyncedLines] = useState(null)
  const [loading, setLoading] = useState(false)
  const [activeIdx, setActiveIdx] = useState(0)
  const lineRefs = useRef([])

  useEffect(() => {
    if (!lyricsOpen || !currentTrack) return
    setLyrics(null)
    setSyncedLines(null)
    setLoading(true)
    api.getLyrics(currentTrack.artists, currentTrack.name)
      .then(data => {
        setLyrics(data)
        const parsed = parseLRC(data?.syncedLyrics)
        setSyncedLines(parsed)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [currentTrack?.id, lyricsOpen])

  // Highlight current line for synced lyrics
  useEffect(() => {
    if (!syncedLines) return
    let idx = syncedLines.findIndex(l => l.time > currentTime) - 1
    if (idx < 0) idx = 0
    setActiveIdx(idx)
    lineRefs.current[idx]?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [currentTime, syncedLines])

  if (!lyricsOpen) return null

  return (
    <div className="hidden md:flex fixed inset-0 z-50 items-stretch">
      {/* Blurred backdrop */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: currentTrack?.album_art ? `url(${currentTrack.album_art})` : undefined,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          filter: 'blur(40px) brightness(0.3)',
          transform: 'scale(1.1)',
        }}
      />
      <div className="absolute inset-0 bg-black/60" />

      {/* Panel */}
      <div className="relative z-10 ml-auto w-full max-w-lg h-full flex flex-col bg-black/40 backdrop-blur-sm">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            {currentTrack && (
              <img
                src={currentTrack.album_art}
                alt=""
                className="w-10 h-10 rounded object-cover"
                onError={e => { e.target.style.display = 'none' }}
              />
            )}
            <div>
              <p className="text-sm font-medium truncate max-w-xs">{currentTrack?.name}</p>
              <p className="text-xs text-white/60 truncate">{currentTrack?.artists}</p>
            </div>
          </div>
          <button
            onClick={toggleLyricsOpen}
            className="text-white/60 hover:text-white p-2"
          >
            <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
            </svg>
          </button>
        </div>

        {/* Lyrics content */}
        <div className="flex-1 overflow-y-auto px-8 py-6">
          {loading && (
            <div className="space-y-3">
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="skeleton h-4 rounded" style={{ width: `${60 + Math.random() * 40}%` }} />
              ))}
            </div>
          )}

          {!loading && !lyrics?.found && (
            <div className="text-center text-white/40 py-16">
              <p>Lyrics not found for this track.</p>
            </div>
          )}

          {!loading && syncedLines && (
            <div className="space-y-3">
              {syncedLines.map((line, i) => (
                <p
                  key={i}
                  ref={el => lineRefs.current[i] = el}
                  className={`text-lg leading-relaxed transition-all duration-300 ${
                    i === activeIdx
                      ? 'text-white font-semibold scale-105 origin-left'
                      : i < activeIdx
                      ? 'text-white/30'
                      : 'text-white/60'
                  }`}
                >
                  {line.text || '\u00A0'}
                </p>
              ))}
            </div>
          )}

          {!loading && lyrics?.found && !syncedLines && lyrics?.lyrics && (
            <pre className="text-sm text-white/80 leading-relaxed whitespace-pre-wrap font-sans">
              {lyrics.lyrics}
            </pre>
          )}

          {/* Genius annotations */}
          {!loading && lyrics?.annotations?.length > 0 && (
            <div className="mt-8 border-t border-white/10 pt-6">
              <h3 className="text-sm font-semibold text-white/60 mb-4 uppercase tracking-wider">
                Annotations
              </h3>
              {lyrics.annotations.slice(0, 5).map((ann, i) => (
                <details key={i} className="mb-3 group">
                  <summary className="text-sm text-white/80 italic cursor-pointer list-none flex items-start gap-2">
                    <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24" className="flex-shrink-0 mt-0.5 text-yt-red">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" />
                    </svg>
                    &ldquo;{ann.fragment}&rdquo;
                  </summary>
                  <p className="text-xs text-white/50 mt-2 ml-5 leading-relaxed">{ann.text}</p>
                </details>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
