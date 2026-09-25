import Icon from "./Icon";
import LecteurPdf from "./LecteurPdf";
import LectureTexte from "./LectureTexte";
import TexteLibre, { EnLigne } from "./TexteLibre";

/* ==================================================================
   L'énoncé et la correction d'un exercice, tels que l'étudiant les
   voit. Partagés par la page de l'exercice et par l'aperçu de l'espace
   admin, pour que l'aperçu montre exactement ce qui sera publié.

   Le texte écrit passe avant le PDF, qui reste alors à télécharger.
   ================================================================== */

const aCorrectionEcrite = (e) => Boolean(e?.etapes?.some((s) => s.trim()) || e?.reponse || e?.explication);

export function EnonceExercice({ exercice, className = "mt-4" }) {
  if (exercice.enonce) {
    return (
      <LectureTexte
        libelle="Énoncé"
        icone="file"
        titre={`Énoncé : ${exercice.titre}`}
        pdf={exercice.pdfEnonce}
        ouvert
        className={className}
      >
        <TexteLibre texte={exercice.enonce} grand />
      </LectureTexte>
    );
  }
  if (exercice.pdfEnonce) {
    return (
      <LecteurPdf
        pdf={exercice.pdfEnonce}
        libelle="Énoncé en PDF"
        titre={`Énoncé : ${exercice.titre}`}
        ouvert
        className={className}
      />
    );
  }
  return <p className={`${className} text-sm text-ink-500 dark:text-ink-400`}>Pas encore d&apos;énoncé.</p>;
}

export function CorrectionExercice({ exercice }) {
  const etapes = (exercice.etapes ?? []).filter((s) => s.trim());

  if (!aCorrectionEcrite(exercice)) {
    return exercice.pdfCorrige ? (
      <LecteurPdf
        pdf={exercice.pdfCorrige}
        libelle="Correction en PDF"
        titre={`Correction : ${exercice.titre}`}
        ouvert
      />
    ) : (
      <p className="text-sm text-ink-500 dark:text-ink-400">
        La correction de cet exercice n&apos;a pas encore été publiée.
      </p>
    );
  }

  return (
    <LectureTexte
      libelle="Correction"
      icone="check"
      titre={`Correction : ${exercice.titre}`}
      pdf={exercice.pdfCorrige}
      ouvert
    >
      {/* Même présentation que l'énoncé : même taille, même couleur,
          lignes conservées. */}
      <div className="space-y-6 text-base/7 text-ink-800 dark:text-ink-200">
        {etapes.length > 0 && (
          <div>
            <h3 className="font-semibold text-ink-900 dark:text-white">Méthode, étape par étape</h3>
            <ol className="mt-2 list-decimal space-y-1 pl-6">
              {etapes.map((etape, i) => (
                <li key={i} className="whitespace-pre-line">
                  <EnLigne texte={etape} />
                </li>
              ))}
            </ol>
          </div>
        )}

        {exercice.reponse && (
          <div>
            <h3 className="font-semibold text-ink-900 dark:text-white">Réponse</h3>
            <TexteLibre texte={exercice.reponse} grand className="mt-2" />
          </div>
        )}

        {exercice.explication && (
          <div>
            <h3 className="flex items-center gap-2 font-semibold text-ink-900 dark:text-white">
              <Icon name="bulb" className="size-4 text-sun-600 dark:text-sun-400" />
              À retenir
            </h3>
            <TexteLibre texte={exercice.explication} grand className="mt-2" />
          </div>
        )}
      </div>
    </LectureTexte>
  );
}
