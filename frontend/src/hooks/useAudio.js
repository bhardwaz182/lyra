import { useEffect, useRef } from 'react'
import usePlayerStore from '../store/playerStore'
import { api } from '../api/client'

let audioEl = null
const recsFetchedFor = new Set()  // shared across all hook instances

function getAudio() {
  if (!audioEl) {
    audioEl = new Audio()
    audioEl.preload = 'auto'
  }
  return audioEl
}

export function useAudio() {
  const {
    currentTrack,
    isPlaying,
    volume,
    currentTime,
    next,
    setCurrentTime,
    setDuration,
    setAudioQuality,
    seek: seekStore,
  } = usePlayerStore()

  const seekingRef = useRef(false)
  const trackRef = useRef(null)

  // ── Auto-queue recommendations when on the last track (or only track) ──
  useEffect(() => {
    if (!currentTrack) return
    const { queue, queueIndex } = usePlayerStore.getState()
    const isLastTrack = queueIndex >= queue.length - 1
    if (!isLastTrack) return
    if (recsFetchedFor.has(currentTrack.id)) return
    recsFetchedFor.add(currentTrack.id)

    api.getRecommendations(
      currentTrack.name,
      currentTrack.artists || '',
      currentTrack.isrc || currentTrack.id,
      10
    ).then(data => {
      const recs = data.recommendations || []
      recs.forEach(t => usePlayerStore.getState().addToQueue(t))
    }).catch(() => {})
  }, [currentTrack?.id])

  // ── Load new track when currentTrack changes ──
  useEffect(() => {
    if (!currentTrack) return
    if (trackRef.current?.id === currentTrack.id) return
    trackRef.current = currentTrack

    const audio = getAudio()
    const src = api.streamUrl(
      currentTrack.isrc || currentTrack.id,
      `${currentTrack.name} ${currentTrack.artists}`,
      currentTrack.source || ''
    )
    audio.src = src
    audio.load()

    // Read quality from response header via HEAD request
    fetch(src.replace('/api/stream/', '/api/stream/'), { method: 'HEAD' })
      .then(r => setAudioQuality(r.headers.get('X-Audio-Quality') || null))
      .catch(() => {})

    if (isPlaying) audio.play().catch(() => {})
  }, [currentTrack?.id])

  // ── Play / Pause ──
  useEffect(() => {
    const audio = getAudio()
    if (!currentTrack) return
    if (isPlaying) {
      audio.play().catch(() => {})
    } else {
      audio.pause()
    }
  }, [isPlaying])

  // ── Volume ──
  useEffect(() => {
    getAudio().volume = volume
  }, [volume])

  // ── Seek when store's currentTime is set externally (scrubber drag) ──
  useEffect(() => {
    if (seekingRef.current) return
    const audio = getAudio()
    if (Math.abs(audio.currentTime - currentTime) > 1.5) {
      audio.currentTime = currentTime
    }
  }, [currentTime])

  // ── Wire audio events to store ──
  useEffect(() => {
    const audio = getAudio()

    const onTimeUpdate = () => {
      seekingRef.current = false
      setCurrentTime(audio.currentTime)
    }
    const onDurationChange = () => setDuration(audio.duration || 0)
    const onEnded = () => {
      usePlayerStore.getState().next()
    }
    const onError = () => {
      console.warn('Audio error — skipping to next')
      next()
    }

    audio.addEventListener('timeupdate', onTimeUpdate)
    audio.addEventListener('durationchange', onDurationChange)
    audio.addEventListener('ended', onEnded)
    audio.addEventListener('error', onError)

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate)
      audio.removeEventListener('durationchange', onDurationChange)
      audio.removeEventListener('ended', onEnded)
      audio.removeEventListener('error', onError)
    }
  }, [])

  // ── Public seek helper ──
  function seek(time) {
    seekingRef.current = true
    getAudio().currentTime = time
    seekStore(time)
  }

  return { seek, audio: getAudio }
}

// Standalone seek — lets ProgressBar seek without calling the full hook
export function seekAudio(time) {
  getAudio().currentTime = time
  usePlayerStore.getState().seek(time)
}
