let _id = 0

export default function LyraIcon({ size = 28 }) {
  // Unique gradient ID per instance to avoid SVG defs collision
  const uid = `lyra-g-${++_id}`

  return (
    <svg width={size} height={size * 90 / 80} viewBox="0 0 80 90" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
      <defs>
        <linearGradient id={uid} x1="10%" y1="0%" x2="90%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="55%" stopColor="#bae6fd" />
          <stop offset="100%" stopColor="#38bdf8" />
        </linearGradient>
      </defs>

      {/* Left outer arm */}
      <path d="M28,46 C16,38 12,22 18,10 C21,4 26,2 30,4"
        fill="none" stroke={`url(#${uid})`} strokeWidth="3" strokeLinecap="round"/>
      {/* Right outer arm */}
      <path d="M52,46 C64,38 68,22 62,10 C59,4 54,2 50,4"
        fill="none" stroke={`url(#${uid})`} strokeWidth="3" strokeLinecap="round"/>
      {/* Top crossbar */}
      <line x1="18" y1="33" x2="62" y2="33"
        stroke={`url(#${uid})`} strokeWidth="2.5" strokeLinecap="round"/>
      {/* 5 strings */}
      <line x1="30" y1="33" x2="30" y2="70" stroke={`url(#${uid})`} strokeWidth="2" strokeLinecap="round"/>
      <line x1="35" y1="33" x2="34" y2="75" stroke={`url(#${uid})`} strokeWidth="2" strokeLinecap="round"/>
      <line x1="40" y1="33" x2="40" y2="77" stroke={`url(#${uid})`} strokeWidth="2.5" strokeLinecap="round"/>
      <line x1="45" y1="33" x2="46" y2="75" stroke={`url(#${uid})`} strokeWidth="2" strokeLinecap="round"/>
      <line x1="50" y1="33" x2="50" y2="70" stroke={`url(#${uid})`} strokeWidth="2" strokeLinecap="round"/>
      {/* Body left curve */}
      <path d="M28,46 C20,54 20,65 26,72 C30,77 36,79 40,79"
        fill="none" stroke={`url(#${uid})`} strokeWidth="3" strokeLinecap="round"/>
      {/* Body right curve */}
      <path d="M52,46 C60,54 60,65 54,72 C50,77 44,79 40,79"
        fill="none" stroke={`url(#${uid})`} strokeWidth="3" strokeLinecap="round"/>
      {/* Lower crossing arc */}
      <path d="M28,46 C34,60 46,60 52,46"
        fill="none" stroke={`url(#${uid})`} strokeWidth="2.2" strokeLinecap="round"/>

      {/* Cyan dots at joints */}
      <circle cx="18" cy="33" r="3.5" fill="#38bdf8"/>
      <circle cx="62" cy="33" r="3.5" fill="#38bdf8"/>
      <circle cx="28" cy="46" r="3" fill="#7dd3fc"/>
      <circle cx="52" cy="46" r="3" fill="#7dd3fc"/>
      <circle cx="40" cy="79" r="3" fill="#7dd3fc"/>
    </svg>
  )
}
