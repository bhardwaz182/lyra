const BASE = ''  // same-origin in prod; Vite proxy in dev

async function get(path) {
  const res = await fetch(BASE + path)
  if (!res.ok) throw new Error(`API ${path} → ${res.status}`)
  return res.json()
}

export const api = {
  getHome: () => get('/api/home'),
  getCharts: () => get('/api/home/charts'),

  search: (q, type = 'track', offset = 0) =>
    get(`/api/search?q=${encodeURIComponent(q)}&type=${type}&offset=${offset}`),

  getSuggestions: (q) =>
    get(`/api/search/suggestions?q=${encodeURIComponent(q)}`),

  getAlbum: (id) => get(`/api/album/${encodeURIComponent(id)}`),

  getArtist: (id) => get(`/api/artist/${encodeURIComponent(id)}`),

  getArtistBio: (name) =>
    get(`/api/artist/${encodeURIComponent(name)}/bio`),

  getSimilarArtists: (name) =>
    get(`/api/artist/${encodeURIComponent(name)}/similar`),

  getArtistAlbums: (name, limit = 20) =>
    get(`/api/artist/${encodeURIComponent(name)}/albums?limit=${limit}`),

  getLyrics: (artist, title) =>
    get(`/api/lyrics?artist=${encodeURIComponent(artist)}&title=${encodeURIComponent(title)}`),

  getRecommendations: (name, artist, isrc = null, limit = 10) => {
    const params = new URLSearchParams({ name: name || '', artist: artist || '', limit })
    if (isrc) params.append('isrc', isrc)
    return get(`/api/recommendations?${params}`)
  },

  streamUrl: (isrc, q = '', source = '') => {
    const params = new URLSearchParams({ q, source, hires: 'false' })
    return `${BASE}/api/stream/${encodeURIComponent(isrc)}?${params}`
  },

  proxyImage: (url) =>
    `${BASE}/api/proxy_image?url=${encodeURIComponent(url)}`,
}
