/* Sous le cours : où en est la lecture, d'après useLectureDetectee
   (detectionLecture.js). `lu` : déjà compté. */
export default function EtatLecture({ lu, suivi, finVue, restant, pdf = false }) {
  if (lu) {
    return <p className="mt-3 text-sm font-semibold text-accent-700 dark:text-accent-400">✓ Chapitre lu</p>;
  }
  if (!suivi) return null;
  // Un PDF n'a pas de « fin » visible par la page : seul le temps compte.
  const texte =
    !pdf && !finVue
      ? "Lis jusqu'en bas : le chapitre sera compté comme lu."
      : restant > 0
        ? `Encore ${restant} s de lecture et ce chapitre sera compté comme lu.`
        : "Chapitre compté comme lu.";
  return (
    <p role="status" className="mt-3 text-xs text-ink-500 dark:text-ink-400">
      {texte}
    </p>
  );
}
