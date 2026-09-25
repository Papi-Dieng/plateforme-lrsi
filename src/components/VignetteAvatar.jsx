/* Le dessin d'un avatar : une forme colorée et un visage, en SVG.
   Les six avatars eux-mêmes (couleurs, formes) sont dans
   src/data/avatars.jsx. */

function Visage({ couleur, transform, sourire = true }) {
  return (
    <g transform={transform}>
      {sourire ? (
        <path
          d="M15 19c2 1 4 1 6 0"
          fill="none"
          stroke={couleur}
          strokeLinecap="round"
        />
      ) : (
        <path d="M13,20 a1,0.75 0 0,0 10,0" fill={couleur} />
      )}
      <rect x="11" y="14" width="1.5" height="2" rx="1" fill={couleur} />
      <rect x="23" y="14" width="1.5" height="2" rx="1" fill={couleur} />
    </g>
  );
}

export default function VignetteAvatar({ cle, alt, fond, accent, visage, forme, sourire }) {
  return (
    <svg
      viewBox="0 0 36 36"
      width="40"
      height="40"
      fill="none"
      role="img"
      aria-label={alt}
      xmlns="http://www.w3.org/2000/svg"
    >
      <mask
        id={`masque-${cle}`}
        maskUnits="userSpaceOnUse"
        x="0"
        y="0"
        width="36"
        height="36"
      >
        <rect width="36" height="36" rx="72" fill="#fff" />
      </mask>
      <g mask={`url(#masque-${cle})`}>
        <rect width="36" height="36" fill={fond} />
        <rect
          width="36"
          height="36"
          rx={forme}
          transform="translate(8 -5) rotate(219 18 18)"
          fill={accent}
        />
        <Visage
          couleur={visage}
          transform="translate(4 -4) rotate(9 18 18)"
          sourire={sourire}
        />
      </g>
    </svg>
  );
}
