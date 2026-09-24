import Icon from "./Icon";
import PleinEcran from "./PleinEcran";
import { cx } from "./ui";
import { urlPdf } from "../contenu";
import { useLectureDetectee } from "./detectionLecture";

/* ==================================================================
   Un texte écrit dans l'espace admin, côté étudiant : cours, énoncé ou
   correction d'exercice.

   Même allure que `LecteurPdf` : une barre avec le libellé et, s'il y a
   aussi un PDF, le lien pour le télécharger ; puis « Lire ici », qui
   déplie le texte, avec son bouton « Plein écran ».

   `onLu` (cours) : appelé quand l'étudiant a lu le texte jusqu'au bout,
   assez longtemps (`tempsMin` secondes) ; voir `detectionLecture.js`.
   ================================================================== */

export default function LectureTexte({ libelle, titre, pdf, icone = "book", ouvert = false, onLu, tempsMin = 15, className, children }) {
  const { refFin, surBascule, marquerLu } = useLectureDetectee({ onLu, tempsMin, ouvertAuDepart: ouvert });
  return (
    <div className={cx("overflow-hidden rounded-xl border border-ink-200 dark:border-ink-800", className)}>
      <div className="flex flex-wrap items-center gap-3 px-4 py-2.5">
        <Icon name={icone} className="size-4 text-brand-500" />
        <span className="min-w-0 flex-1 truncate text-sm font-semibold text-ink-900 dark:text-white">{libelle}</span>
        {pdf && (
          <a
            href={urlPdf(pdf.id)}
            target="_blank"
            rel="noopener noreferrer"
            onClick={marquerLu}
            className="text-sm font-medium text-brand-600 hover:underline dark:text-brand-300"
          >
            Télécharger le PDF ↗
          </a>
        )}
      </div>
      <details open={ouvert} onToggle={surBascule} className="group border-t border-ink-200 dark:border-ink-800">
        <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-2.5 text-sm font-semibold text-brand-600 dark:text-brand-300">
          <Icon name="chevron" className="size-4 -rotate-90 transition-transform group-open:rotate-0" />
          Lire ici
        </summary>
        <PleinEcran titre={titre ?? libelle} className="border-t border-ink-200 px-4 py-4 dark:border-ink-800">
          <div className="mt-3">{children}</div>
          {/* Repère de fin de texte, pour savoir que tout a été lu. */}
          <div ref={refFin} aria-hidden="true" className="h-px" />
        </PleinEcran>
      </details>
    </div>
  );
}
