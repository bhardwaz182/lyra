import { NavLink } from 'react-router-dom'
import LyraIcon from '../common/LyraIcon'

const links = [
  { to: '/', label: 'Home', icon: HomeIcon },
  { to: '/search', label: 'Search', icon: SearchIcon },
  { to: '/library', label: 'Library', icon: LibraryIcon },
]

export default function Sidebar() {
  return (
    <aside
      className="hidden md:flex fixed top-0 left-0 h-full bg-yt-bg border-r border-yt-border flex-col pt-4 z-20"
      style={{ width: 'var(--sidebar-width)', paddingBottom: 'var(--player-height)' }}
    >
      {/* Logo */}
      <div className="px-5 mb-6 flex items-center gap-3">
        <LyraIcon size={32} />
        <span className="text-white font-lyra font-light text-xl tracking-[0.35em]">LYRA</span>
      </div>

      <nav className="flex-1 px-2">
        {links.map(({ to, label, Icon = () => null, icon: Icon2 }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors mb-1 ${
                isActive
                  ? 'bg-yt-surface2 text-yt-text'
                  : 'text-yt-muted hover:text-yt-text hover:bg-yt-surface'
              }`
            }
          >
            <Icon2 />
            {label}
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}

function HomeIcon() {
  return (
    <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24">
      <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
    </svg>
  )
}

function SearchIcon() {
  return (
    <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.35-4.35" />
    </svg>
  )
}

function LibraryIcon() {
  return (
    <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24">
      <path d="M4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm16-4H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-1 9H9V9h10v2zm-4 4H9v-2h6v2zm4-8H9V5h10v2z" />
    </svg>
  )
}
