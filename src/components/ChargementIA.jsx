import { useEffect, useId, useRef, useState } from "react";

/* ==================================================================
   Animation d'attente de l'IA : un anneau coloré qui tourne, l'étape
   en cours, et les lignes de travail qui défilent.

   D'après « AI Loading State » de kokonutUI (https://kokonutui.com),
   licence MIT, Copyright (c) 2025 kokonutUI : voir LICENCES-TIERS.md.
   Réécrit en JavaScript et adapté :
   - les étapes viennent de src/chargementIA.js, en français, et
     décrivent ce que fait réellement la plateforme ;
   - le fondu des anciennes lignes est un masque, et non un dégradé
     blanc posé par-dessus : il marche sur n'importe quel fond ;
   - « réduire les animations » arrête l'anneau et le défilement doux ;
   - seul le nom de l'étape est lu par les lecteurs d'écran, pas
     chaque ligne qui passe.
   Comme l'original, l'animation ne tourne que visible à l'écran. Les
   rotations de l'anneau sont dans src/index.css (`.anneau-ia`).
   ================================================================== */

const HAUTEUR_LIGNE = 28;
const LIGNES_VISIBLES = 3;
const RYTHME = 2000;

const COULEURS_ANNEAU = ["#FF2E7E", "#00E5FF", "#4ADE80", "#FFA726", "#FFEB3B", "#FF4081"];

function Anneau({ progression }) {
  const masque = `masque-${useId().replace(/:/g, "")}`;
  return (
    <svg className="size-6 shrink-0" fill="none" viewBox="0 0 240 240" aria-hidden="true">
      <defs>
        <mask id={masque}>
          <rect fill="black" height="240" width="240" />
          <circle
            cx="120"
            cy="120"
            fill="white"
            r="120"
            strokeDasharray={`${(progression / 100) * 754}, 754`}
            transform="rotate(-90 120 120)"
          />
        </mask>
      </defs>
      <g className="anneau-ia" mask={`url(#${masque})`} strokeDasharray="18% 40%" strokeWidth="16">
        {COULEURS_ANNEAU.map((c, i) => (
          <circle key={c + i} cx="120" cy="120" opacity="0.95" r={150 - i * 20} stroke={c} />
        ))}
      </g>
    </svg>
  );
}

export default function ChargementIA({ etapes, className }) {
  const racine = useRef(null);
  const [visible, setVisible] = useState(true);
  const [etape, setEtape] = useState(0);
  const [position, setPosition] = useState(0);

  // N'animer que ce qui est à l'écran : un minuteur hors champ réveille
  // la page pour rien.
  useEffect(() => {
    const element = racine.current;
    if (!element || typeof IntersectionObserver === "undefined") return undefined;
    const observateur = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { rootMargin: "100px" });
    observateur.observe(element);
    return () => observateur.disconnect();
  }, []);

  const lignes = etapes[etape].lignes;
  const dernierePosition = Math.max(lignes.length - LIGNES_VISIBLES, 0);

  // Une ligne de plus toutes les deux secondes ; au bout, l'étape suivante.
  useEffect(() => {
    if (!visible) return undefined;
    const minuteur = setInterval(() => {
      if (position < dernierePosition) {
        setPosition((p) => p + 1);
      } else {
        setEtape((e) => (e + 1) % etapes.length);
        setPosition(0);
      }
    }, RYTHME);
    return () => clearInterval(minuteur);
  }, [visible, position, dernierePosition, etapes.length]);

  return (
    <div ref={racine} className={className}>
      <div className="space-y-3">
        <p role="status" className="flex items-center gap-2 text-sm font-medium text-ink-600 dark:text-ink-300">
          <Anneau progression={(etape / etapes.length) * 100} />
          <span>{etapes[etape].statut}…</span>
        </p>

        <div
          aria-hidden="true"
          className="relative overflow-hidden font-mono text-xs [mask-image:linear-gradient(to_bottom,transparent_0%,black_45%,black_100%)]"
          style={{ height: HAUTEUR_LIGNE * LIGNES_VISIBLES }}
        >
          <div
            className="motion-safe:transition-transform motion-safe:duration-500"
            style={{ transform: `translateY(-${position * HAUTEUR_LIGNE}px)` }}
          >
            {lignes.map((texte, i) => (
              <div key={`${etape}-${texte}`} className="flex items-center px-2" style={{ height: HAUTEUR_LIGNE }}>
                <span className="w-6 pr-3 text-right text-ink-500 select-none dark:text-ink-400">{i + 1}</span>
                <span className="ml-1 min-w-0 flex-1 truncate text-ink-800 dark:text-ink-200">{texte}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
