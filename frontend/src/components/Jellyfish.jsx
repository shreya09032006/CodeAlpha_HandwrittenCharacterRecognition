// A small, friendly jellyfish. Drawn from scratch so it matches the pink of the hero.
export default function Jellyfish({ className = '' }) {
  return (
    <svg viewBox="0 0 120 150" className={className} role="img" aria-label="A little pink jellyfish" fill="none">
      <defs>
        <linearGradient id="jf-bell" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fbd0e2" />
          <stop offset=".55" stopColor="#f4a3c4" />
          <stop offset="1" stopColor="#e8709f" />
        </linearGradient>
      </defs>

      {/* tentacles (behind the bell) */}
      <g strokeLinecap="round" fill="none">
        <path className="jf-sway" style={{ animationDelay: '-.4s' }} d="M38 70 C32 88 44 98 36 118 C32 128 36 134 34 140" stroke="#f4a3c4" strokeWidth="5" />
        <path className="jf-sway" style={{ animationDelay: '-1.2s' }} d="M52 72 C48 92 58 102 52 124 C50 132 54 138 52 146" stroke="#e8709f" strokeWidth="5" />
        <path className="jf-sway" style={{ animationDelay: '-.8s' }} d="M68 72 C72 92 62 104 68 124 C70 132 66 138 68 146" stroke="#e8709f" strokeWidth="5" />
        <path className="jf-sway" style={{ animationDelay: '-1.6s' }} d="M82 70 C88 88 76 98 84 118 C88 128 84 134 86 140" stroke="#f4a3c4" strokeWidth="5" />
        <path className="jf-sway" style={{ animationDelay: '-2s' }} d="M60 72 C56 82 64 90 60 100" stroke="#fbd0e2" strokeWidth="8" opacity=".8" />
      </g>

      {/* bell */}
      <g className="jf-bell">
        <path d="M18 64 C18 30 38 10 60 10 C82 10 102 30 102 64 C102 70 96 72 90 70 C84 75 77 75 71 70 C65 75 55 75 49 70 C43 75 36 75 30 70 C24 72 18 70 18 64 Z" fill="url(#jf-bell)" />
        <ellipse cx="42" cy="30" rx="13" ry="7" fill="#fff" opacity=".45" transform="rotate(-25 42 30)" />
        {/* face */}
        <g className="jf-eye"><circle cx="46" cy="50" r="4" fill="#0b0b10" /><circle cx="47.4" cy="48.6" r="1.3" fill="#fff" /></g>
        <g className="jf-eye"><circle cx="74" cy="50" r="4" fill="#0b0b10" /><circle cx="75.4" cy="48.6" r="1.3" fill="#fff" /></g>
        <ellipse cx="36" cy="58" rx="5" ry="3" fill="#e8709f" opacity=".5" />
        <ellipse cx="84" cy="58" rx="5" ry="3" fill="#e8709f" opacity=".5" />
        <path d="M55 58 Q60 64 65 58" stroke="#0b0b10" strokeWidth="2" strokeLinecap="round" />
      </g>
    </svg>
  )
}
