import { useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import Icon from "../components/Icon";
import TexteLibre from "../components/TexteLibre";
import {
  Badge,
  Bouton,
  ChampRecherche,
  Container,
  EnTetePage,
  EtatVide,
  Filtres,
  NoteDemo,
  cx,
} from "../components/ui";
import { getMatiere, matieres } from "../data/matieres";
import { themeMatiere } from "../data/couleurs";
import BoutonFavori from "../components/BoutonFavori";
import { refChapitre } from "../progression";
import { exercices } from "../data/exercices";
import { qcms } from "../data/qcm";

const normalise = (s) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");

/* ================================================================== */
/* Liste des matières                                                  */
/* ================================================================== */

export function Cours() {
  // La recherche vit dans l'URL : un lien filtre se partage tel quel,
  // et la barre de recherche de la page d'accueil arrive directement ici.
  const [params, setParams] = useSearchParams();
  const recherche = params.get("q") ?? "";
  const setRecherche = (v) => setParams(v ? { q: v } : {}, { replace: true });
  const [semestre, setSemestre] = useState("tous");

  const semestres = useMemo(() => {
    const uniques = [...new Set(matieres.map((m) => m.semestre))];
    return [
      { value: "tous", label: "Tous les semestres" },
      ...uniques.map((s) => ({ value: s, label: s })),
    ];
  }, []);

  const resultats = useMemo(() => {
    const q = normalise(recherche.trim());
    return matieres.filter((m) => {
      if (semestre !== "tous" && m.semestre !== semestre) return false;
      if (!q) return true;
      const corpus = normalise(
        [m.nom, m.resume, ...m.chapitres.map((c) => c.titre)].join(" ")
      );
      return corpus.includes(q);
    });
  }, [recherche, semestre]);

  return (
    <>
      <EnTetePage
        surtitre="Ressources"
        titre="Espace des cours"
        texte="Les chapitres sont regroupés par matière et par semestre. Cette organisation est une proposition de structure : elle ne remplace pas le programme officiel de la filière."
      />

      <Container className="py-10">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="sm:w-80">
            <label htmlFor="recherche-cours" className="sr-only">
              Rechercher une matière ou un chapitre
            </label>
            <ChampRecherche
              id="recherche-cours"
              valeur={recherche}
              onChange={setRecherche}
              placeholder="Rechercher une matière, un chapitre…"
            />
          </div>
          <Filtres
            label="Filtrer par semestre"
            options={semestres}
            actif={semestre}
            onChange={setSemestre}
          />
        </div>

        <div className="mt-8">
          {resultats.length === 0 ? (
            <EtatVide
              titre="Aucune matière ne correspond"
              texte="Essaie un autre mot-clé ou retire le filtre de semestre."
            >
              <Bouton
                variante="secondaire"
                onClick={() => {
                  setRecherche("");
                  setSemestre("tous");
                }}
              >
                Réinitialiser
              </Bouton>
            </EtatVide>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {resultats.map((m) => {
                const dispo = m.chapitres.filter(
                  (c) => c.statut === "disponible"
                ).length;
                return (
                  <Link
                    key={m.id}
                    to={`/cours/${m.id}`}
                    className="card group flex flex-col p-6 transition-shadow hover:shadow-md"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div
                        className={cx(
                          "grid size-11 place-items-center rounded-xl",
                          themeMatiere(m).pastille
                        )}
                      >
                        <Icon name={m.icone} className="size-5.5" />
                      </div>
                      <Badge>{m.semestre}</Badge>
                    </div>
                    <h2 className="mt-4 font-semibold text-ink-900 group-hover:text-brand-600 dark:text-white dark:group-hover:text-brand-300">
                      {m.nom}
                    </h2>
                    <p className="mt-2 flex-1 text-sm/6 text-ink-600 dark:text-ink-400">
                      {m.resume}
                    </p>
                    <div className="mt-4 flex items-center justify-between border-t border-ink-200 pt-4 dark:border-ink-800">
                      <span className="flex items-center gap-1.5 text-xs text-ink-500">
                        <Icon name="layers" className="size-3.5" />
                        {m.chapitres.length} chapitres · {dispo} disponibles
                      </span>
                      <Icon
                        name="arrow"
                        className="size-4 text-ink-400 transition-transform group-hover:translate-x-0.5"
                      />
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        <div className="mt-8">
          <NoteDemo>
            Contenu de démonstration. Aucun support de cours appartenant à
            l'université ou à un enseignant n'est hébergé sur cette plateforme.
            Les chapitres décrivent la structure prévue, pas des documents
            publiés.
          </NoteDemo>
        </div>
      </Container>
    </>
  );
}

/* ================================================================== */
/* Détail d'une matière                                                */
/* ================================================================== */

export function CoursDetail() {
  const { matiereId } = useParams();
  const matiere = getMatiere(matiereId);

  if (!matiere) {
    return (
      <Container className="py-20">
        <EtatVide
          titre="Matière introuvable"
          texte="Cette matière n'existe pas ou a été renommée."
        >
          <Bouton to="/cours">Retour aux cours</Bouton>
        </EtatVide>
      </Container>
    );
  }

  const theme = themeMatiere(matiere);
  const exercicesLies = exercices.filter((e) => e.matiere === matiere.id);
  const qcmsLies = qcms.filter((q) => q.matiere === matiere.id);
  const disponibles = matiere.chapitres.filter(
    (c) => c.statut === "disponible"
  ).length;

  return (
    <>
      <EnTetePage
        surtitre={matiere.semestre}
        titre={matiere.nom}
        texte={matiere.resume}
      >
        <div className="flex flex-wrap items-center gap-3">
          <Link
            to="/cours"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-500 hover:text-brand-600 dark:text-ink-400"
          >
            <Icon name="arrow" className="size-4 rotate-180" />
            Toutes les matières
          </Link>
          <span className="text-ink-300 dark:text-ink-700">·</span>
          <Badge ton="accent">{disponibles} chapitres disponibles</Badge>
          <Badge>{matiere.chapitres.length} au total</Badge>
          <BoutonFavori
            type="matiere"
            reference={matiere.id}
            libelle={matiere.nom}
          />
        </div>
      </EnTetePage>

      <Container className="py-10">
        <div className="grid gap-10 lg:grid-cols-3">
          {/* Chapitres */}
          <div className="lg:col-span-2">
            <h2 className="text-lg font-semibold text-ink-900 dark:text-white">
              Programme des chapitres
            </h2>

            <ol className="mt-5 space-y-3">
              {matiere.chapitres.map((c, i) => {
                const pret = c.statut === "disponible";
                return (
                  <li
                    key={c.titre}
                    className={cx(
                      "card flex gap-4 p-5",
                      !pret && "opacity-75"
                    )}
                  >
                    <span
                      className={cx(
                        "grid size-8 shrink-0 place-items-center rounded-lg font-mono text-xs font-semibold",
                        pret
                          ? theme.pastille
                          : "bg-ink-100 text-ink-400 dark:bg-ink-800"
                      )}
                    >
                      {String(i + 1).padStart(2, "0")}
                    </span>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold text-ink-900 dark:text-white">
                          {c.titre}
                        </h3>
                        <BoutonFavori
                          type="chapitre"
                          reference={refChapitre(matiere.id, c.titre)}
                          libelle={`le chapitre ${c.titre}`}
                          taille="sm"
                        />
                        {pret ? (
                          <Badge ton="accent" icone="check">
                            Disponible
                          </Badge>
                        ) : (
                          <Badge ton="sun" icone="clock">
                            Bientôt
                          </Badge>
                        )}
                      </div>
                      <p className="mt-1.5 text-sm/6 text-ink-600 dark:text-ink-400">
                        {c.resume}
                      </p>
                      <p className="mt-2.5 flex items-center gap-1.5 text-xs text-ink-500">
                        <Icon name="clock" className="size-3.5" />
                        Volume indicatif : {c.duree}
                      </p>
                      {pret && c.contenu && (
                        <details className="group mt-4 rounded-xl border border-ink-200 dark:border-ink-800">
                          <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-2.5 text-sm font-semibold text-brand-600 dark:text-brand-300">
                            <Icon
                              name="chevron"
                              className="size-4 -rotate-90 transition-transform group-open:rotate-0"
                            />
                            Lire le cours
                          </summary>
                          <TexteLibre texte={c.contenu} className="border-t border-ink-200 px-4 py-4 dark:border-ink-800" />
                        </details>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>

          {/* Colonne latérale */}
          <aside className="space-y-5">
            <div className="card p-5">
              <h2 className="flex items-center gap-2 font-semibold text-ink-900 dark:text-white">
                <Icon name="code" className="size-4.5 text-brand-600 dark:text-brand-400" />
                Exercices liés
              </h2>
              {exercicesLies.length === 0 ? (
                <p className="mt-3 text-sm text-ink-500 dark:text-ink-400">
                  Aucun exercice publié pour cette matière pour le moment.
                </p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {exercicesLies.map((e) => (
                    <li key={e.id}>
                      <Link
                        to={`/exercices/${e.id}`}
                        className="group flex items-start gap-2 rounded-lg px-2 py-1.5 -mx-2 hover:bg-ink-100 dark:hover:bg-ink-800"
                      >
                        <Icon
                          name="arrow"
                          className="mt-0.5 size-3.5 shrink-0 text-ink-400"
                        />
                        <span className="text-sm text-ink-700 group-hover:text-brand-600 dark:text-ink-300 dark:group-hover:text-brand-300">
                          {e.titre}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="card p-5">
              <h2 className="flex items-center gap-2 font-semibold text-ink-900 dark:text-white">
                <Icon name="target" className="size-4.5 text-accent-600 dark:text-accent-400" />
                QCM disponibles
              </h2>
              {qcmsLies.length === 0 ? (
                <p className="mt-3 text-sm text-ink-500 dark:text-ink-400">
                  Aucun QCM pour cette matière pour le moment.
                </p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {qcmsLies.map((q) => (
                    <li key={q.id}>
                      <Link
                        to={`/qcm/${q.id}`}
                        className="group flex items-start gap-2 rounded-lg px-2 py-1.5 -mx-2 hover:bg-ink-100 dark:hover:bg-ink-800"
                      >
                        <Icon
                          name="arrow"
                          className="mt-0.5 size-3.5 shrink-0 text-ink-400"
                        />
                        <span className="text-sm text-ink-700 group-hover:text-brand-600 dark:text-ink-300 dark:group-hover:text-brand-300">
                          {q.titre}
                          <span className="block text-xs text-ink-500">
                            {q.questions.length} questions · {q.duree}
                          </span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="rounded-2xl border border-ink-200 bg-ink-100/60 p-5 dark:border-ink-800 dark:bg-ink-900">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-ink-900 dark:text-white">
                <Icon name="lock" className="size-4" />
                Documents réservés
              </h2>
              <p className="mt-2 text-sm/6 text-ink-600 dark:text-ink-400">
                À partir de la version 3, certains documents pourront être
                réservés aux étudiants identifiés. Aucun support universitaire ne
                sera mis en ligne sans l'accord du département et des enseignants
                concernés.
              </p>
              <Bouton to="/projet" variante="fantome" taille="sm" className="mt-3 -ml-3">
                La démarche du projet
                <Icon name="arrow" className="size-3.5" />
              </Bouton>
            </div>
          </aside>
        </div>
      </Container>
    </>
  );
}
