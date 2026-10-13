import { cx } from "./classes";

/* ==================================================================
   Les deux logos du site (choisis le 13 octobre 2026, maquette « Les
   autres pistes ») :

   - Sunu Cours : le baobab binaire. L'arbre du Sénégal, dont les
     branches forment un arbre binaire, comme en algorithmique. Tronc et
     branches blancs sur la tuile bleue ; les feuilles orange (le départ)
     et citron (l'arrivée), les couleurs du site.
   - L'assistant : la bulle-étincelle. Une bulle de dialogue avec
     l'étincelle de l'IA découpée dedans, un point citron et un point
     orange.

   public/logo.svg (onglet du navigateur, icônes de l'application) et
   design/apercu-partage.svg reprennent exactement ces tracés : les
   changer ici demande de les changer là aussi, puis de relancer
   `node scripts/icones-pwa.mjs`.
   ================================================================== */

const BLEU = "#1f47e0";
const ORANGE = "#ff5a2b";
const CITRON = "#cdef3e";
const NUIT = "#0d101a";

/* ---- Le baobab binaire (repère de 120) ---- */

const TRONC = "M47 112 C50 98 50 86 45 72 Q60 66 75 72 C70 86 70 98 73 112 Z";
const BRANCHES = ["M60 70L36 50", "M60 70L84 50", "M36 50L20 34", "M36 50L44 26", "M84 50L76 26", "M84 50L100 34"];
const NOEUDS = [
  [36, 50],
  [84, 50],
];
const FEUILLES = [
  [20, 34, ORANGE],
  [44, 26, CITRON],
  [76, 26, ORANGE],
  [100, 34, CITRON],
];

/* Le dessin seul : `trait` pour l'arbre, `fond` pour le cerne des
   nœuds et des feuilles (la couleur sur laquelle il est posé). */
export function Baobab({ trait = "#ffffff", fond = BLEU }) {
  return (
    <>
      <path d={TRONC} fill={trait} />
      {BRANCHES.map((d) => (
        <path key={d} d={d} stroke={trait} strokeWidth="7" strokeLinecap="round" />
      ))}
      {NOEUDS.map(([x, y]) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r="5.5" fill={fond} stroke={trait} strokeWidth="3.5" />
      ))}
      {FEUILLES.map(([x, y, c]) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r="9" fill={c} stroke={fond} strokeWidth="3.5" />
      ))}
    </>
  );
}

/* Le logo du site : le baobab blanc sur la tuile bleue arrondie. */
export function Logo({ className = "size-9" }) {
  return (
    <svg viewBox="0 0 120 120" className={className} aria-hidden="true">
      <rect width="120" height="120" rx="30" fill={BLEU} />
      <g transform="translate(12 6) scale(.8)">
        <Baobab />
      </g>
    </svg>
  );
}

/* ---- La bulle-étincelle (repère de 120) ---- */

const BULLE = "M30 18 H90 A22 22 0 0 1 112 40 V72 A22 22 0 0 1 90 94 H50 L28 110 L32 94 H30 A22 22 0 0 1 8 72 V40 A22 22 0 0 1 30 18 Z";
const ETINCELLE = "M60 32 C62 48 68 54 84 56 C68 58 62 64 60 80 C58 64 52 58 36 56 C52 54 58 48 60 32 Z";

const VARIANTES = {
  // Sur fond sombre (la page de l'assistant) : bulle blanche, étincelle nuit.
  nuit: { bulle: "#ffffff", etincelle: NUIT },
  // Sur fond clair : bulle bleue, étincelle blanche.
  bleu: { bulle: BLEU, etincelle: "#ffffff" },
};

/* `anime` : l'étincelle respire pendant que l'IA prépare sa réponse. */
export function LogoAssistant({ variante = "nuit", anime = false, className = "size-9" }) {
  const v = VARIANTES[variante] ?? VARIANTES.nuit;
  return (
    <svg viewBox="0 0 120 120" className={className} aria-hidden="true">
      <path d={BULLE} fill={v.bulle} />
      <path d={ETINCELLE} fill={v.etincelle} className={cx(anime && "etincelle-anime")} />
      <circle cx="86" cy="36" r="6" fill={CITRON} />
      <circle cx="34" cy="76" r="4.5" fill={ORANGE} />
    </svg>
  );
}
