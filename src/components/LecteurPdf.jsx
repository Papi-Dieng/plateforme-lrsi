import Icon from "./Icon";
import { cx } from "./ui";
import { urlPdf } from "../contenu";
import { EtatLecture, TEMPS_MINIMUM_PDF, useLectureDetectee } from "./detectionLecture";

/* ==================================================================
   Un PDF téléversé depuis l'espace admin, côté étudiant : cours,
   énoncé ou correction d'exercice, sujet ou corrigé d'examen.

   Toujours un lien « Ouvrir ou télécharger » : sur téléphone, beaucoup
   de navigateurs n'affichent pas un PDF intégré. Le lecteur intégré se
   replie ou s'ouvre selon `ouvert`.

   `onLu` (cours) : appelé quand le PDF est resté ouvert ici assez
   longtemps, ou a été ouvert ou téléchargé ; voir `detectionLecture.jsx`. `lu` : déjà compté.
   ================================================================== */

export default function LecteurPdf({ pdf, titre, libelle = "Document en PDF", ouvert = false, onLu, lu = false, className }) {
  const { surBascule, marquerLu, restant } = useLectureDetectee({ onLu, tempsMin: TEMPS_MINIMUM_PDF, ouvertAuDepart: ouvert, avecFin: false });
  if (!pdf) return null;
  const url = urlPdf(pdf.id);

  return (
    <div className={cx("overflow-hidden rounded-xl border border-ink-200 dark:border-ink-800", className)}>
      <div className="flex flex-wrap items-center gap-3 px-4 py-2.5">
        <Icon name="file" className="size-4 text-flame-500" />
        <span className="min-w-0 flex-1 truncate text-sm font-semibold text-ink-900 dark:text-white">
          {libelle}
        </span>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={marquerLu}
          className="text-sm font-medium text-brand-600 hover:underline dark:text-brand-300"
        >
          Ouvrir ou télécharger ↗
        </a>
      </div>
      <details open={ouvert} onToggle={surBascule} className="group border-t border-ink-200 dark:border-ink-800">
        <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-2.5 text-sm font-semibold text-brand-600 dark:text-brand-300">
          <Icon name="chevron" className="size-4 -rotate-90 transition-transform group-open:rotate-0" />
          Lire ici
        </summary>
        <iframe
          src={url}
          title={titre ?? libelle}
          loading="lazy"
          className="h-[75vh] w-full border-t border-ink-200 bg-white dark:border-ink-800"
        />
        {(lu || onLu) && (
          <div className="px-4 pb-3">
            <EtatLecture lu={lu} suivi={Boolean(onLu)} restant={restant} pdf />
          </div>
        )}
      </details>
    </div>
  );
}
