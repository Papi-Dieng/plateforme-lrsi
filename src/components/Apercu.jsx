import { useEffect } from "react";
import Icon from "./Icon";

/* ==================================================================
   L'aperçu de l'espace admin : un cours ou un exercice tel que les
   étudiants le verront, avant de publier. Il couvre toute la page et
   se ferme par « Fermer l'aperçu » ou Échap.

   Pas de flou ni de transformation sur ce calque : le plein écran d'un
   texte, à l'intérieur, doit pouvoir couvrir toute la fenêtre.
   ================================================================== */

export default function Apercu({ titre, onFermer, children }) {
  useEffect(() => {
    const surTouche = (e) => {
      if (e.key === "Escape") onFermer();
    };
    window.addEventListener("keydown", surTouche);
    const avant = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", surTouche);
      document.body.style.overflow = avant;
    };
  }, [onFermer]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Aperçu : ${titre}`}
      className="fixed inset-0 z-50 overflow-y-auto bg-ink-50 dark:bg-ink-950"
    >
      <div className="sticky top-0 z-10 flex items-center gap-3 border-b border-sun-400/50 bg-sun-100 px-4 py-3 sm:px-8 dark:border-sun-500/30 dark:bg-ink-900">
        <Icon name="info" className="size-4.5 shrink-0 text-sun-700 dark:text-sun-400" />
        <p className="min-w-0 flex-1 text-sm text-sun-900 dark:text-sun-100">
          <span className="font-semibold">Aperçu</span> : ce que verront les étudiants. Rien n&apos;est
          publié tant que tu ne cliques pas « Publier ».
        </p>
        <button
          type="button"
          onClick={onFermer}
          className="shrink-0 rounded-lg bg-white px-3 py-1.5 text-sm font-semibold text-ink-800 ring-1 ring-ink-200 ring-inset hover:bg-ink-50 dark:bg-ink-800 dark:text-white dark:ring-ink-700"
        >
          Fermer l&apos;aperçu
        </button>
      </div>
      <div className="mx-auto max-w-3xl space-y-6 px-4 py-8 sm:px-6">
        <h1 className="text-2xl font-bold tracking-tight text-ink-900 dark:text-white">{titre}</h1>
        {children}
      </div>
    </div>
  );
}
