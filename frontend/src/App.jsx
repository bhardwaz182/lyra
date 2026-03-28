import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom'
import LyraIcon from './components/common/LyraIcon'
import Sidebar from './components/layout/Sidebar'
import PlayerBar from './components/player/PlayerBar'
import NowPlayingSheet from './components/player/NowPlayingSheet'
import QueueSidebar from './components/player/QueueSidebar'
import LyricsPanel from './components/lyrics/LyricsPanel'
import Home from './pages/Home'
import Search from './pages/Search'
import Album from './pages/Album'
import Artist from './pages/Artist'
import Library from './pages/Library'
import usePlayerStore from './store/playerStore'

export default function App() {
  const queueOpen = usePlayerStore(s => s.queueOpen)

  return (
    <BrowserRouter>
      <div className="flex h-screen bg-yt-bg text-yt-text overflow-hidden">
        <Sidebar />

        <MobileHeader />

        <main
          className="flex-1 overflow-y-auto"
          style={{
            marginLeft: 'var(--sidebar-width)',
            marginRight: queueOpen ? 'var(--queue-width)' : '0',
            paddingTop: 'var(--mobile-header-height)',
            paddingBottom: 'calc(var(--player-height) + var(--mobile-nav-height))',
          }}
        >
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/search" element={<Search />} />
            <Route path="/album/:id" element={<Album />} />
            <Route path="/artist/:id" element={<Artist />} />
            <Route path="/library" element={<Library />} />
          </Routes>
        </main>

        <QueueSidebar />
        <LyricsPanel />
        <NowPlayingSheet />
        <PlayerBar />
        <MobileNav />
      </div>
    </BrowserRouter>
  )
}

function MobileHeader() {
  return (
    <header
      className="md:hidden fixed top-0 left-0 right-0 z-30 flex items-center gap-2.5 px-4 bg-yt-bg/90 backdrop-blur-md border-b border-yt-border"
      style={{ height: 'var(--mobile-header-height)' }}
    >
      <LyraIcon size={32} />
      <span className="text-white font-lyra font-light text-base tracking-[0.35em]">LYRA</span>
    </header>
  )
}

function MobileNav() {
  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 bg-yt-surface border-t border-yt-border flex items-center justify-around z-40"
      style={{ height: 'var(--mobile-nav-height)', paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <MobileNavLink to="/" label="Home">
        <svg width="22" height="22" fill="currentColor" viewBox="0 0 24 24">
          <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
        </svg>
      </MobileNavLink>
      <MobileNavLink to="/search" label="Search">
        <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
        </svg>
      </MobileNavLink>
      <MobileNavLink to="/library" label="Library">
        <svg width="22" height="22" fill="currentColor" viewBox="0 0 24 24">
          <path d="M4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm16-4H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-1 9H9V9h10v2zm-4 4H9v-2h6v2zm4-8H9V5h10v2z" />
        </svg>
      </MobileNavLink>
    </nav>
  )
}

function MobileNavLink({ to, label, children }) {
  return (
    <NavLink
      to={to}
      end={to === '/'}
      className={({ isActive }) =>
        `flex flex-col items-center gap-0.5 px-5 py-1 transition-colors ${
          isActive ? 'text-yt-red' : 'text-yt-muted'
        }`
      }
    >
      {children}
      <span className="text-[10px] font-medium">{label}</span>
    </NavLink>
  )
}
