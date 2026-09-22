/* ==================================================================
   Avatars.

   Six vignettes dessinées en SVG, sans photo et sans dépendance : rien
   n'est téléversé, l'étudiant choisit simplement un motif. `rgb` sert
   à colorer l'anneau autour du grand aperçu, dans la page profil.

   Pour en ajouter un, copier un bloc et changer l'identifiant, les
   trois couleurs et l'identifiant du masque, qui doit rester unique.
   ================================================================== */

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

function Vignette({ cle, alt, fond, accent, visage, forme, sourire }) {
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

export const avatars = [
  {
    id: 1,
    alt: "Corail",
    rgb: "255, 91, 73",
    svg: (
      <Vignette
        cle="corail"
        alt="Corail"
        fond="#ff5b49"
        accent="#ffb238"
        visage="#0a0310"
        forme={6}
      />
    ),
  },
  {
    id: 2,
    alt: "Océan",
    rgb: "31, 71, 224",
    svg: (
      <Vignette
        cle="ocean"
        alt="Océan"
        fond="#1f47e0"
        accent="#8eb6ff"
        visage="#0a0310"
        forme={36}
      />
    ),
  },
  {
    id: 3,
    alt: "Menthe",
    rgb: "137, 252, 179",
    svg: (
      <Vignette
        cle="menthe"
        alt="Menthe"
        fond="#d8fcb3"
        accent="#89fcb3"
        visage="#0a0310"
        forme={6}
      />
    ),
  },
  {
    id: 4,
    alt: "Violet",
    rgb: "124, 58, 237",
    svg: (
      <Vignette
        cle="violet"
        alt="Violet"
        fond="#7c3aed"
        accent="#f0abfc"
        visage="#0a0310"
        forme={36}
        sourire={false}
      />
    ),
  },
  {
    id: 5,
    alt: "Nuit",
    rgb: "255, 0, 91",
    svg: (
      <Vignette
        cle="nuit"
        alt="Nuit"
        fond="#0a0310"
        accent="#ff005b"
        visage="#ffffff"
        forme={36}
        sourire={false}
      />
    ),
  },
  {
    id: 6,
    alt: "Safran",
    rgb: "255, 125, 16",
    svg: (
      <Vignette
        cle="safran"
        alt="Safran"
        fond="#ff7d10"
        accent="#0a0310"
        visage="#ffffff"
        forme={6}
      />
    ),
  },
];

export const getAvatar = (id) =>
  avatars.find((a) => a.id === id) ?? avatars[0];
