import { useRef } from 'react'
import usePlayerStore from '../../store/playerStore'
import { seekAudio } from '../../hooks/useAudio'

function fmt(secs) {
  if (!secs || isNaN(secs)) return '0:00'
  const m = Math.floor(secs / 60)
  const s = Math.floor(secs % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}

export default function ProgressBar() {
  const currentTime = usePlayerStore(s => s.currentTime)
  const duration = usePlayerStore(s => s.duration)
  const barRef = useRef(null)

  function handleClick(e) {
    if (!duration) return
    const rect = barRef.current.getBoundingClientRect()
    const pct = (e.clientX - rect.left) / rect.width
    seekAudio(pct * duration)
  }

  const pct = duration ? (currentTime / duration) * 100 : 0

  return (
    <div className="flex items-center gap-2 w-full max-w-lg">
      <span className="text-xs text-yt-muted w-8 text-right">{fmt(currentTime)}</span>
      <div
        ref={barRef}
        onClick={handleClick}
        className="flex-1 h-1 bg-yt-border rounded-full cursor-pointer group relative"
      >
        <div
          className="h-full bg-yt-text group-hover:bg-yt-red rounded-full relative transition-colors"
          style={{ width: `${pct}%` }}
        >
          <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </div>
      <span className="text-xs text-yt-muted w-8">{fmt(duration)}</span>
    </div>
  )
}
