import { useEffect, useRef, useState } from "react";
import Icon from "./Icon";
import { cx } from "./ui";

/* ==================================================================
   Lire un texte en plein écran : un cours, un énoncé, une correction.

   Deux boutons : « Plein écran » ouvre le texte sur tout l'écran,
   « Quitter le plein écran » (ou Échap) revient à la page.

   Le bloc passe d'abord en `fixed inset-0` : ça marche partout, même
   sur iPhone où le plein écran du navigateur n'existe pas pour un
   simple bloc. Là où il existe, on le demande en plus, pour cacher
   aussi les barres du navigateur.
   ================================================================== */

export default function PleinEcran({ titre, children, className }) {
  const bloc = useRef(null);
  const [actif, setActif] = useState(false);

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
    const surTouche = (e) => {
      if (e.key === "Escape") setActif(false);
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
          <button type="button" onClick={fermer} className={bouton}>
            <Icon name="reduire" className="size-4" />
            Quitter le plein écran
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
      <div className={cx(actif && "mx-auto max-w-3xl px-4 py-8 text-base sm:px-8")}>{children}</div>
    </div>
  );
}
