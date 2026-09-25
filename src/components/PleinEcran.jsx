import { useEffect, useRef, useState } from "react";
import Icon from "./Icon";
import { cx } from "./classes";

/* ==================================================================
   Lire un texte en plein écran : un cours, un énoncé, une correction.

   Deux boutons : « Plein écran » ouvre le texte sur tout l'écran,
   « Quitter le plein écran » (ou Échap) revient à la page.

   Le bloc passe d'abord en `fixed inset-0` : ça marche partout, même
   sur iPhone où le plein écran du navigateur n'existe pas pour un
   simple bloc. Là où il existe, on le demande en plus, pour cacher
   aussi les barres du navigateur.
   ================================================================== */

/* La taille du texte en plein écran (A− / A+), gardée d'une lecture à
   l'autre dans ce navigateur. */
const CLE_TAILLE = "lrsi-taille-lecture";
const TAILLES = [0.85, 1, 1.15, 1.3, 1.5, 1.75];

function lireTaille() {
  try {
    const t = Number(localStorage.getItem(CLE_TAILLE));
    return TAILLES.includes(t) ? t : 1;
  } catch {
    return 1;
  }
}

export default function PleinEcran({ titre, children, className }) {
  const bloc = useRef(null);
  const [actif, setActif] = useState(false);
  const [taille, setTaille] = useState(lireTaille);

  const changerTaille = (sens) => {
    const suite = TAILLES[Math.min(Math.max(TAILLES.indexOf(taille) + sens, 0), TAILLES.length - 1)];
    setTaille(suite);
    try {
      localStorage.setItem(CLE_TAILLE, String(suite));
    } catch {
      /* stockage indisponible : la taille vaut pour cette lecture */
    }
  };

  const ouvrir = () => {
    setActif(true);
    bloc.current?.requestFullscreen?.().catch(() => {});
  };
  const fermer = () => {
    setActif(false);
    if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
  };

  useEffect(() => {
    if (!actif) return;
    // Échap quitte déjà le plein écran du navigateur : on suit.
    const surChangement = () => {
      if (!document.fullscreenElement) setActif(false);
    };
    // Échap ne ferme que le plein écran, pas l'aperçu admin qui le contient.
    const surTouche = (e) => {
      if (e.key !== "Escape") return;
      e.stopPropagation();
      setActif(false);
    };
    document.addEventListener("fullscreenchange", surChangement);
    document.addEventListener("keydown", surTouche);
    // La page derrière ne défile plus tant que le texte couvre l'écran.
    const avant = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("fullscreenchange", surChangement);
      document.removeEventListener("keydown", surTouche);
      document.body.style.overflow = avant;
    };
  }, [actif]);

  const bouton =
    "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold text-brand-600 ring-1 ring-ink-200 ring-inset hover:bg-ink-50 dark:text-brand-300 dark:ring-ink-700 dark:hover:bg-ink-800";

  return (
    <div
      ref={bloc}
      className={actif ? "fixed inset-0 z-50 overflow-y-auto bg-white dark:bg-ink-950" : cx("relative", className)}
      role={actif ? "dialog" : undefined}
      aria-modal={actif || undefined}
      aria-label={actif ? titre : undefined}
    >
      {actif ? (
        <div className="sticky top-0 z-10 flex items-center gap-3 border-b border-ink-200 bg-white/95 px-4 py-3 backdrop-blur sm:px-8 dark:border-ink-800 dark:bg-ink-950/95">
          <span className="min-w-0 flex-1 truncate text-sm font-semibold text-ink-900 dark:text-white">{titre}</span>
          <div className="flex items-center gap-1" role="group" aria-label="Taille du texte">
            <button
              type="button"
              onClick={() => changerTaille(-1)}
              disabled={taille === TAILLES[0]}
              aria-label="Texte plus petit"
              className={cx(bouton, "px-2.5 disabled:opacity-40")}
            >
              A−
            </button>
            <button
              type="button"
              onClick={() => changerTaille(1)}
              disabled={taille === TAILLES.at(-1)}
              aria-label="Texte plus grand"
              className={cx(bouton, "px-2.5 text-base disabled:opacity-40")}
            >
              A+
            </button>
          </div>
          <button type="button" onClick={fermer} className={bouton} aria-label="Quitter le plein écran">
            <Icon name="reduire" className="size-4" />
            <span className="hidden sm:inline">Quitter le plein écran</span>
            <span className="sm:hidden">Quitter</span>
          </button>
        </div>
      ) : (
        <div className="flex justify-end">
          <button type="button" onClick={ouvrir} className={bouton}>
            <Icon name="agrandir" className="size-4" />
            Plein écran
          </button>
        </div>
      )}
      {/* `zoom` agrandit tout le texte, titres et code compris, quelles
          que soient leurs tailles propres. */}
      <div className={cx(actif && "mx-auto max-w-3xl px-4 py-8 text-base sm:px-8")}>
        <div style={actif ? { zoom: taille } : undefined}>{children}</div>
      </div>
    </div>
  );
}
