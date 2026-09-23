import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import Icon from "../components/Icon";
import LecteurPdf from "../components/LecteurPdf";
import LectureTexte from "../components/LectureTexte";
import VerifierReponse from "../components/VerifierReponse";
import {
  Badge,
  BlocCode,
  Bouton,
  ChampRecherche,
  Container,
  EnTetePage,
  EtatVide,
  Filtres,
  NoteDemo,
  cx,
} from "../components/ui";
import { difficultes, exercices, getExercice } from "../data/exercices";
import { matieres, nomMatiere } from "../data/matieres";
import { marquerExerciceTravaille } from "../progression";
import BoutonFavori from "../components/BoutonFavori";

const tonsDifficulte = {
  Facile: "accent",
  Moyen: "brand",
  Difficile: "sun",
};

const normalise = (s) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");

/* ================================================================== */
/* Liste des exercices                                                 */
/* ================================================================== */

export function Exercices() {
  const [recherche, setRecherche] = useState("");
  const [matiere, setMatiere] = useState("toutes");
  const [difficulte, setDifficulte] = useState("toutes");

  const optionsMatiere = [
    { value: "toutes", label: "Toutes les matières" },
    ...matieres
      .filter((m) => exercices.some((e) => e.matiere === m.id))
      .map((m) => ({ value: m.id, label: m.nom })),
  ];

  const optionsDifficulte = [
    { value: "toutes", label: "Tous niveaux" },
    ...difficultes.map((d) => ({ value: d, label: d })),
  ];

  const resultats = useMemo(() => {
    const q = normalise(recherche.trim());
    return exercices.filter((e) => {
      if (matiere !== "toutes" && e.matiere !== matiere) return false;
      if (difficulte !== "toutes" && e.difficulte !== difficulte) return false;
      if (!q) return true;
      const corpus = normalise(
        [e.titre, e.enonce, ...e.tags, nomMatiere(e.matiere)].join(" ")
      );
      return corpus.includes(q);
    });
  }, [recherche, matiere, difficulte]);

  return (
    <>
      <EnTetePage
        surtitre="S'entraîner"
        titre="Exercices corrigés"
        texte="Cherche d'abord, utilise l'indice si tu bloques, puis compare ta méthode à la correction détaillée. Chaque corrigé explique le raisonnement, pas seulement le résultat."
      />

      <Container className="py-10">
        <div className="space-y-4">
          <div className="sm:w-96">
            <label htmlFor="recherche-exercices" className="sr-only">
              Rechercher un exercice
            </label>
            <ChampRecherche
              id="recherche-exercices"
              valeur={recherche}
              onChange={setRecherche}
              placeholder="Rechercher un exercice, un mot-clé…"
            />
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-3">
            <Filtres
              label="Filtrer par matière"
              options={optionsMatiere}
              actif={matiere}
              onChange={setMatiere}
            />
            <Filtres
              label="Filtrer par difficulté"
              options={optionsDifficulte}
              actif={difficulte}
              onChange={setDifficulte}
            />
          </div>
        </div>

        <p className="mt-6 text-sm text-ink-500 dark:text-ink-400">
          {resultats.length} exercice{resultats.length > 1 ? "s" : ""} affiché
          {resultats.length > 1 ? "s" : ""} sur {exercices.length}.
        </p>

        <div className="mt-4">
          {resultats.length === 0 ? (
            <EtatVide
              titre="Aucun exercice ne correspond"
              texte="Élargis la recherche ou retire un filtre."
            >
              <Bouton
                variante="secondaire"
                onClick={() => {
                  setRecherche("");
                  setMatiere("toutes");
                  setDifficulte("toutes");
                }}
              >
                Réinitialiser les filtres
              </Bouton>
            </EtatVide>
          ) : (
            <ul className="grid gap-4 md:grid-cols-2">
              {resultats.map((e) => (
                <li key={e.id}>
                  <Link
                    to={`/exercices/${e.id}`}
                    className="card group flex h-full flex-col p-5 transition-shadow hover:shadow-md"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge ton={tonsDifficulte[e.difficulte]}>
                        {e.difficulte}
                      </Badge>
                      <Badge>{nomMatiere(e.matiere)}</Badge>
                      <span className="flex items-center gap-1 text-xs text-ink-500">
                        <Icon name="clock" className="size-3.5" />
                        {e.duree}
                      </span>
                    </div>

                    <div className="mt-3 flex items-start justify-between gap-2">
                      <h2 className="font-semibold text-ink-900 group-hover:text-brand-600 dark:text-white dark:group-hover:text-brand-300">
                        {e.titre}
                      </h2>
                      <BoutonFavori
                        type="exercice"
                        reference={e.id}
                        libelle={e.titre}
                        taille="sm"
                      />
                    </div>
                    <p className="mt-2 line-clamp-3 flex-1 text-sm/6 text-ink-600 dark:text-ink-400">
                      {!e.enonce && e.pdfEnonce ? (
                        <span className="inline-flex items-center gap-1.5">
                          <Icon name="file" className="size-4 text-flame-500" />
                          Énoncé en PDF
                          {e.pdfCorrige ? ", avec sa correction" : ""}
                        </span>
                      ) : (
                        e.enonce
                      )}
                    </p>

                    <div className="mt-4 flex flex-wrap gap-1.5">
                      {e.tags.map((t) => (
                        <span
                          key={t}
                          className="rounded-md bg-ink-100 px-2 py-0.5 font-mono text-[11px] text-ink-600 dark:bg-ink-800 dark:text-ink-400"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="mt-8">
          <NoteDemo>
            Énoncés originaux rédigés pour la plateforme. Aucun sujet d'examen ni
            document universitaire n'est reproduit ici.
          </NoteDemo>
        </div>
      </Container>
    </>
  );
}

/* ================================================================== */
/* Détail d'un exercice                                                */
/* ================================================================== */

// La route est la même d'un exercice à l'autre : la clé recrée la page à
// chaque exercice, sans quoi l'indice et la correction resteraient ouverts
// sur le suivant.
export function ExerciceDetail() {
  const { exerciceId } = useParams();
  return <DetailExercice key={exerciceId} exerciceId={exerciceId} />;
}

function DetailExercice({ exerciceId }) {
  const exercice = getExercice(exerciceId);

  const [indiceVisible, setIndiceVisible] = useState(false);
  const [correctionVisible, setCorrectionVisible] = useState(false);
  // La correction écrite passe avant le PDF, qui reste à télécharger.
  const correctionEcrite = Boolean(exercice?.etapes?.length || exercice?.reponse || exercice?.explication);

  // Ouvrir la correction compte comme « exercice travaillé » dans le profil.
  const basculerCorrection = () => {
    if (!correctionVisible && exercice) marquerExerciceTravaille(exercice.id);
    setCorrectionVisible((v) => !v);
  };

  if (!exercice) {
    return (
      <Container className="py-20">
        <EtatVide
          titre="Exercice introuvable"
          texte="Cet exercice n'existe pas ou a été renommé."
        >
          <Bouton to="/exercices">Retour aux exercices</Bouton>
        </EtatVide>
      </Container>
    );
  }

  const suivants = exercices
    .filter((e) => e.id !== exercice.id && e.matiere === exercice.matiere)
    .slice(0, 3);

  return (
    <>
      <EnTetePage surtitre={nomMatiere(exercice.matiere)} titre={exercice.titre}>
        <div className="flex flex-wrap items-center gap-3">
          <Link
            to="/exercices"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-500 hover:text-brand-600 dark:text-ink-400"
          >
            <Icon name="arrow" className="size-4 rotate-180" />
            Tous les exercices
          </Link>
          <span className="text-ink-300 dark:text-ink-700">·</span>
          <Badge ton={tonsDifficulte[exercice.difficulte]}>
            {exercice.difficulte}
          </Badge>
          <Badge icone="clock">{exercice.duree}</Badge>
          <BoutonFavori
            type="exercice"
            reference={exercice.id}
            libelle={exercice.titre}
          />
        </div>
      </EnTetePage>

      <Container className="py-10">
        <div className="mx-auto max-w-3xl space-y-6">
          {/* Énoncé */}
          <section className="card p-6">
            <h2 className="flex items-center gap-2 text-sm font-semibold tracking-wide text-brand-600 uppercase dark:text-brand-400">
              <Icon name="file" className="size-4" />
              Énoncé
            </h2>
            {/* L'énoncé écrit passe avant le PDF, qui reste à télécharger. */}
            {exercice.enonce ? (
              <LectureTexte
                libelle="Énoncé"
                icone="file"
                titre={`Énoncé : ${exercice.titre}`}
                pdf={exercice.pdfEnonce}
                ouvert
                className="mt-4"
              >
                <p className="text-base/7 whitespace-pre-line text-ink-800 dark:text-ink-200">
                  {exercice.enonce}
                </p>
              </LectureTexte>
            ) : (
              <LecteurPdf
                pdf={exercice.pdfEnonce}
                libelle="Énoncé en PDF"
                titre={`Énoncé : ${exercice.titre}`}
                ouvert
                className="mt-4"
              />
            )}
          </section>

          {/* Indice : facultatif pour un exercice donné en PDF */}
          {exercice.indice && (
          <section className="rounded-2xl border border-sun-400/40 bg-sun-100/50 p-5 dark:border-sun-500/25 dark:bg-sun-500/10">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="flex items-center gap-2 font-semibold text-sun-900 dark:text-sun-400">
                <Icon name="bulb" className="size-4.5" />
                Besoin d'un coup de pouce ?
              </h2>
              <Bouton
                variante="secondaire"
                taille="sm"
                onClick={() => setIndiceVisible((v) => !v)}
                aria-expanded={indiceVisible}
              >
                {indiceVisible ? "Masquer l'indice" : "Afficher l'indice"}
              </Bouton>
            </div>
            {indiceVisible && (
              <p className="mt-4 text-sm/7 text-sun-900 dark:text-sun-100/90">
                {exercice.indice}
              </p>
            )}
          </section>
          )}

          {/* Vérifier sa réponse avant la correction */}
          {exercice.verification?.length > 0 && (
            <VerifierReponse
              key={exercice.id}
              lignes={exercice.verification}
              indiceDisponible={Boolean(exercice.indice)}
              onBesoinIndice={() => setIndiceVisible(true)}
              onReussi={() => marquerExerciceTravaille(exercice.id)}
            />
          )}

          {/* Correction */}
          <section className="card overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink-200 px-6 py-4 dark:border-ink-800">
              <h2 className="flex items-center gap-2 font-semibold text-ink-900 dark:text-white">
                <Icon
                  name="check"
                  className="size-4.5 text-accent-600 dark:text-accent-400"
                />
                Correction détaillée
              </h2>
              <Bouton
                variante={correctionVisible ? "secondaire" : "accent"}
                taille="sm"
                onClick={basculerCorrection}
                aria-expanded={correctionVisible}
              >
                {correctionVisible ? "Masquer" : "J'ai cherché, voir la correction"}
              </Bouton>
            </div>

            {correctionVisible && correctionEcrite ? (
              <div className="px-6 py-6">
                <LectureTexte
                  libelle="Correction"
                  icone="check"
                  titre={`Correction : ${exercice.titre}`}
                  pdf={exercice.pdfCorrige}
                  ouvert
                >
                  <div className="space-y-6">
                    {exercice.etapes?.length > 0 && (
                      <div>
                        <h3 className="text-sm font-semibold text-ink-900 dark:text-white">
                          Méthode, étape par étape
                        </h3>
                        <ol className="mt-3 space-y-3">
                          {exercice.etapes.map((etape, i) => (
                            <li key={i} className="flex gap-3">
                              <span className="grid size-6 shrink-0 place-items-center rounded-full bg-brand-50 font-mono text-[11px] font-semibold text-brand-700 dark:bg-brand-500/15 dark:text-brand-300">
                                {i + 1}
                              </span>
                              <p className="text-sm/7 text-ink-700 dark:text-ink-300">
                                {etape}
                              </p>
                            </li>
                          ))}
                        </ol>
                      </div>
                    )}

                    {exercice.reponse && (
                      <div>
                        <h3 className="text-sm font-semibold text-ink-900 dark:text-white">
                          Réponse
                        </h3>
                        <BlocCode className="mt-3">{exercice.reponse}</BlocCode>
                      </div>
                    )}

                    {exercice.explication && (
                      <div className="rounded-xl bg-ink-100 p-4 dark:bg-ink-800/60">
                        <h3 className="flex items-center gap-2 text-sm font-semibold text-ink-900 dark:text-white">
                          <Icon name="bulb" className="size-4 text-sun-600 dark:text-sun-400" />
                          À retenir
                        </h3>
                        <p className="mt-2 text-sm/7 text-ink-700 dark:text-ink-300">
                          {exercice.explication}
                        </p>
                      </div>
                    )}
                  </div>
                </LectureTexte>
              </div>
            ) : correctionVisible ? (
              <div className="px-6 py-6">
                {exercice.pdfCorrige ? (
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
                )}
              </div>
            ) : (
              <p className="px-6 py-8 text-center text-sm text-ink-500 dark:text-ink-400">
                Prends le temps de chercher avant d'ouvrir la correction. C'est
                là que l'apprentissage se joue.
              </p>
            )}
          </section>

          {/* Suite */}
          {suivants.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-ink-900 dark:text-white">
                Continuer en {nomMatiere(exercice.matiere).toLowerCase()}
              </h2>
              <ul className="mt-3 grid gap-3 sm:grid-cols-3">
                {suivants.map((e) => (
                  <li key={e.id}>
                    <Link
                      to={`/exercices/${e.id}`}
                      className={cx(
                        "card group flex h-full flex-col p-4 transition-shadow hover:shadow-md"
                      )}
                    >
                      <Badge ton={tonsDifficulte[e.difficulte]} className="self-start">
                        {e.difficulte}
                      </Badge>
                      <span className="mt-2 text-sm font-medium text-ink-800 group-hover:text-brand-600 dark:text-ink-200 dark:group-hover:text-brand-300">
                        {e.titre}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </Container>
    </>
  );
}
