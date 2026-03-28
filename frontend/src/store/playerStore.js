import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const usePlayerStore = create(
  persist(
    (set, get) => ({
      // ── Playback state ──
      currentTrack: null,
      queue: [],
      queueIndex: 0,
      isPlaying: false,
      shuffle: false,
      repeat: 'none',   // 'none' | 'one' | 'all'
      duration: 0,
      currentTime: 0,
      volume: 0.8,
      audioQuality: null,

      // ── UI panels ──
      queueOpen: false,
      lyricsOpen: false,
      nowPlayingOpen: false,

      // ── Library (persisted) ──
      likedTracks: [],
      playlists: [],
      recentTracks: [],

      // ────────────────── ACTIONS ──────────────────

      play(track, newQueue = null) {
        const queue = newQueue || get().queue
        const idx = newQueue ? newQueue.findIndex(t => t.id === track.id) : get().queue.findIndex(t => t.id === track.id)
        const finalQueue = newQueue || get().queue
        const finalIdx = idx >= 0 ? idx : 0

        // Add to recent (max 50)
        const recent = [track, ...get().recentTracks.filter(t => t.id !== track.id)].slice(0, 50)

        set({
          currentTrack: track,
          queue: finalQueue,
          queueIndex: finalIdx,
          isPlaying: true,
          recentTracks: recent,
        })
      },

      pause() { set({ isPlaying: false }) },
      resume() { set({ isPlaying: true }) },

      next() {
        const { queue, queueIndex, repeat, shuffle } = get()
        if (!queue.length) return
        if (repeat === 'one') {
          set({ isPlaying: true })
          return
        }
        let nextIdx
        if (shuffle) {
          if (queue.length === 1) {
            nextIdx = 0
          } else {
            const pool = queue.map((_, i) => i).filter(i => i !== get().queueIndex)
            nextIdx = pool[Math.floor(Math.random() * pool.length)]
          }
        } else {
          nextIdx = queueIndex + 1
          if (nextIdx >= queue.length) {
            if (repeat === 'all') nextIdx = 0
            else { set({ isPlaying: false }); return }
          }
        }
        set({ queueIndex: nextIdx, currentTrack: queue[nextIdx], isPlaying: true, currentTime: 0 })
      },

      prev() {
        const { queue, queueIndex, currentTime } = get()
        if (currentTime > 3) {
          set({ currentTime: 0 })
          return
        }
        const prevIdx = Math.max(0, queueIndex - 1)
        set({ queueIndex: prevIdx, currentTrack: queue[prevIdx], isPlaying: true, currentTime: 0 })
      },

      seek(time) { set({ currentTime: time }) },
      setCurrentTime(time) { set({ currentTime: time }) },
      setDuration(d) { set({ duration: d }) },
      setVolume(v) { set({ volume: v }) },
      setAudioQuality(q) { set({ audioQuality: q }) },

      toggleShuffle() { set(s => ({ shuffle: !s.shuffle })) },
      cycleRepeat() {
        const map = { none: 'all', all: 'one', one: 'none' }
        set(s => ({ repeat: map[s.repeat] }))
      },

      addToQueue(track) {
        set(s => ({ queue: [...s.queue, track] }))
      },

      playNext(track) {
        set(s => {
          const q = [...s.queue]
          q.splice(s.queueIndex + 1, 0, track)
          return { queue: q }
        })
      },

      removeFromQueue(index) {
        set(s => {
          const q = [...s.queue]
          q.splice(index, 1)
          const newIdx = index < s.queueIndex ? s.queueIndex - 1 : s.queueIndex
          return { queue: q, queueIndex: Math.max(0, newIdx) }
        })
      },

      reorderQueue(fromIdx, toIdx) {
        if (fromIdx === toIdx) return
        set(s => {
          const q = [...s.queue]
          const [item] = q.splice(fromIdx, 1)
          q.splice(toIdx, 0, item)
          let idx = s.queueIndex
          if (fromIdx === idx) idx = toIdx
          else if (fromIdx < idx && toIdx >= idx) idx--
          else if (fromIdx > idx && toIdx <= idx) idx++
          return { queue: q, queueIndex: idx }
        })
      },

      clearQueue() { set({ queue: [], queueIndex: 0 }) },

      toggleQueueOpen() { set(s => ({ queueOpen: !s.queueOpen })) },
      toggleLyricsOpen() { set(s => ({ lyricsOpen: !s.lyricsOpen })) },
      toggleNowPlayingOpen() { set(s => ({ nowPlayingOpen: !s.nowPlayingOpen })) },

      toggleLike(track) {
        set(s => {
          const alreadyLiked = s.likedTracks.some(t => t.id === track.id)
          const liked = alreadyLiked
            ? s.likedTracks.filter(t => t.id !== track.id)
            : [...s.likedTracks, track]
          return { likedTracks: liked }
        })
      },

      isLiked(trackId) {
        return get().likedTracks.some(t => t.id === trackId)
      },

      createPlaylist(name) {
        const pl = { id: Date.now().toString(), name, tracks: [], createdAt: Date.now() }
        set(s => ({ playlists: [...s.playlists, pl] }))
        return pl.id
      },

      addTrackToPlaylist(playlistId, track) {
        set(s => ({
          playlists: s.playlists.map(p =>
            p.id === playlistId && !p.tracks.find(t => t.id === track.id)
              ? { ...p, tracks: [...p.tracks, track] }
              : p
          ),
        }))
      },

      deletePlaylist(playlistId) {
        set(s => ({ playlists: s.playlists.filter(p => p.id !== playlistId) }))
      },
    }),
    {
      name: 'ytm-clone-player',
      partialize: (s) => ({
        likedTracks: s.likedTracks,
        playlists: s.playlists,
        recentTracks: s.recentTracks,
        volume: s.volume,
        shuffle: s.shuffle,
        repeat: s.repeat,
      }),
    }
  )
)

export default usePlayerStore
