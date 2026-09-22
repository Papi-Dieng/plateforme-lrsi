import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Icon from "../components/Icon";
import { Bouton, NoteDemo, cx } from "../components/ui";
import {
  dateLisible,
  lireExercicesTravailles,
  lireFavoris,
  lireScores,
  pourcent,
  reinitialiserProgression,
} from "../progression";
import { getMatiere, matieres } from "../data/matieres";
import { themeMatiere } from "../data/couleurs";
import { exercices } from "../data/exercices";
import { qcms } from "../data/qcm";
import {
  MINIMUM_REPONSES,
  analyserCompetences,
  faiblesses,
  forces,
  modulesAAmeliorer,
  niveaux,
  nonEvaluees,
  reponsesEnregistrees,
} from "../competences";

/* ==================================================================
   Suivi de progression, en grille « bento ».

   Chaque carte répond à une question : où j'en suis, où ça coince, et
   depuis quand je travaille. C'est la première brique du tableau de
   bord d'analyse des compétences : on n'y mesure que ce qui est
   réellement mesurable aujourd'hui.
   ================================================================== */

const POINTS_PAR_BONNE_REPONSE = 10;
const SEUIL_REUSSITE = 70;
const JOURS_SUIVIS = 14;

/* ------------------------------------------------------------------ */
/* Briques                                                             */
/* ------------------------------------------------------------------ */

const tonsIcone = {
  brand: "bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300",
  accent:
    "bg-accent-50 text-accent-600 dark:bg-accent-500/15 dark:text-accent-300",
  flame: "bg-flame-100 text-flame-600 dark:bg-flame-500/15 dark:text-flame-400",
  sun: "bg-sun-100 text-sun-600 dark:bg-sun-500/15 dark:text-sun-400",
  violet: "bg-violet-50 text-violet-600 dark:bg-violet-500/15 dark:text-violet-300",
  ink: "bg-ink-100 text-ink-600 dark:bg-ink-800 dark:text-ink-300",
};

// Carte de la grille. `large` occupe deux colonnes dès l'écran moyen.
function CarteBento({ icone, ton = "brand", titre, description, large, rang, children }) {
  return (
    <article
      style={{ animationDelay: `${rang * 60}ms` }}
      className={cx(
        "card apparition flex flex-col p-5 sm:p-6",
        large && "md:col-span-2"
      )}
    >
      <header className="flex items-start gap-3">
        <span
          className={cx(
            "grid size-9 shrink-0 place-items-center rounded-xl",
            tonsIcone[ton]
          )}
        >
          <Icon name={icone} className="size-4.5" />
        </span>
        <div className="min-w-0">
          <h2 className="font-semibold text-ink-900 dark:text-white">{titre}</h2>
          <p className="mt-0.5 text-sm text-ink-500 dark:text-ink-400">
            {description}
          </p>
        </div>
      </header>
      <div className="mt-5 flex-1">{children}</div>
    </article>
  );
}

function Anneau({ ratio, couleur, className = "size-28" }) {
  const rayon = 21;
  const perimetre = 2 * Math.PI * rayon;
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
      <circle
        cx="24"
        cy="24"
        r={rayon}
        fill="none"
        strokeWidth="5"
        className="stroke-ink-200 dark:stroke-ink-800"
      />
      <circle
        cx="24"
        cy="24"
        r={rayon}
        fill="none"
        strokeWidth="5"
        strokeLinecap="round"
        strokeDasharray={perimetre}
        strokeDashoffset={perimetre * (1 - Math.min(Math.max(ratio, 0), 1))}
        transform="rotate(-90 24 24)"
        className={cx("transition-[stroke-dashoffset] duration-700", couleur)}
      />
    </svg>
  );
}

function Barre({ valeur, classe, etiquette }) {
  return (
    <div
      className="h-2 overflow-hidden rounded-full bg-ink-200 dark:bg-ink-800"
      role="progressbar"
      aria-valuenow={valeur}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={etiquette}
    >
      <div
        className={cx(
          "h-full rounded-full transition-[width] duration-700",
          classe ?? "bg-brand-600 dark:bg-brand-500"
        )}
        style={{ width: `${valeur}%` }}
      />
    </div>
  );
}

function MiniStat({ valeur, unite, libelle }) {
  return (
    <div className="rounded-2xl bg-ink-50 p-4 dark:bg-ink-950">
      <p className="text-2xl font-bold text-ink-900 dark:text-white">
        {valeur}
        {unite && (
          <span className="ml-1 text-sm font-medium text-ink-400">{unite}</span>
        )}
      </p>
      <p className="mt-0.5 text-xs text-ink-500 dark:text-ink-400">{libelle}</p>
    </div>
  );
}

/* ================================================================== */

export default function Progression() {
  const [scores, setScores] = useState({});
  const [exercicesFaits, setExercicesFaits] = useState({});
  const [favoris, setFavoris] = useState([]);
  const [confirmation, setConfirmation] = useState(false);

  const charger = () => {
    setScores(lireScores());
    setExercicesFaits(lireExercicesTravailles());
    setFavoris(lireFavoris());
  };

  useEffect(charger, []);

  /* ---- Synthèse ---- */

  const bilan = useMemo(() => {
    const idsQcmFaits = Object.keys(scores).filter((id) =>
      qcms.some((q) => q.id === id)
    );
    const exosFaits = exercices.filter((e) => exercicesFaits[e.id]);

    const pourcentages = idsQcmFaits.map((id) =>
      pourcent(scores[id].score, scores[id].total)
    );
    const moyenne =
      pourcentages.length > 0
        ? Math.round(pourcentages.reduce((a, b) => a + b, 0) / pourcentages.length)
        : null;

    const points = idsQcmFaits.reduce(
      (n, id) => n + scores[id].score * POINTS_PAR_BONNE_REPONSE,
      0
    );
    const tentatives = idsQcmFaits.reduce(
      (n, id) => n + (scores[id].tentatives ?? 1),
      0
    );

    return {
      exosFaits: exosFaits.length,
      exosTotal: exercices.length,
      qcmFaits: idsQcmFaits.length,
      qcmTotal: qcms.length,
      moyenne,
      points,
      tentatives,
      idsQcmFaits,
    };
  }, [scores, exercicesFaits]);

  const rienFait =
    bilan.exosFaits === 0 && bilan.qcmFaits === 0 && favoris.length === 0;

  /* ---- Régularité, sur les deux dernières semaines ---- */

  const activite = useMemo(() => {
    const dates = [
      ...Object.values(scores).map((s) => s.date),
      ...Object.values(exercicesFaits).map((e) => e.date),
    ].filter(Boolean);
    const joursActifs = new Set(dates.map((iso) => iso.slice(0, 10)));

    const jours = [];
    for (let i = JOURS_SUIVIS - 1; i >= 0; i -= 1) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const cle = d.toISOString().slice(0, 10);
      jours.push({ cle, actif: joursActifs.has(cle), date: d });
    }
    return { jours, total: jours.filter((j) => j.actif).length };
  }, [scores, exercicesFaits]);

  /* ---- Par matière ---- */

  const parMatiere = useMemo(
    () =>
      matieres
        .map((m) => {
          const exos = exercices.filter((e) => e.matiere === m.id);
          const quiz = qcms.filter((q) => q.matiere === m.id);
          const exosFaits = exos.filter((e) => exercicesFaits[e.id]).length;
          const quizFaits = quiz.filter((q) => scores[q.id]).length;
          const total = exos.length + quiz.length;
          const faits = exosFaits + quizFaits;
          return {
            m,
            exos: exos.length,
            exosFaits,
            quiz: quiz.length,
            quizFaits,
            total,
            faits,
            taux: pourcent(faits, total),
          };
        })
        .filter((l) => l.total > 0)
        .sort((a, b) => b.taux - a.taux),
    [scores, exercicesFaits]
  );

  const resultatsQcm = useMemo(
    () =>
      bilan.idsQcmFaits
        .map((id) => {
          const q = qcms.find((x) => x.id === id);
          const s = scores[id];
          return { q, ...s, taux: pourcent(s.score, s.total) };
        })
        .sort((a, b) => b.taux - a.taux),
    [bilan.idsQcmFaits, scores]
  );

  const aReprendre = resultatsQcm.filter((r) => r.taux < SEUIL_REUSSITE);

  /* ---- Compétences ---- */

  const analyse = useMemo(() => analyserCompetences(scores), [scores]);
  const mesForces = forces(analyse);
  const mesFaiblesses = faiblesses(analyse);
  const enAttente = nonEvaluees(analyse);
  const modules = modulesAAmeliorer(analyse);
  const evaluees = mesForces.length + mesFaiblesses.length;
  const totalReponses = reponsesEnregistrees(analyse);

  const remettreAZero = () => {
    reinitialiserProgression();
    charger();
    setConfirmation(false);
  };

  let rang = 0;
  const suivant = () => {
    rang += 1;
    return rang - 1;
  };

  return (
    <div className="px-4 py-6 sm:px-7 sm:py-8">
      <h1 className="text-3xl font-bold tracking-tight text-ink-900 dark:text-white">
        Ma progression
      </h1>
      <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">
        Où tu en es, où ça coince, et depuis quand tu travailles.
      </p>

      {rienFait && (
        <section className="mt-6 rounded-3xl bg-lime-400 p-6 sm:p-8">
          <h2 className="text-2xl font-bold text-balance text-ink-950">
            Ta progression est encore vide.
          </h2>
          <p className="mt-2 max-w-lg text-sm/6 text-lime-900">
            Ouvre la correction d'un exercice ou termine un QCM : les cartes
            ci-dessous se remplissent toutes seules.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              to="/exercices"
              className="rounded-xl bg-ink-950 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-ink-800"
            >
              Travailler un exercice
            </Link>
            <Link
              to="/qcm"
              className="rounded-xl bg-white px-5 py-3 text-sm font-semibold text-ink-950 transition-colors hover:bg-lime-50"
            >
              Faire un QCM
            </Link>
          </div>
        </section>
      )}

      {/* ---------------------------------------------------------- */}
      {/* Grille                                                      */}
      {/* ---------------------------------------------------------- */}
      <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
        {/* Vue d'ensemble */}
        <CarteBento
          rang={suivant()}
          large
          icone="grid"
          ton="brand"
          titre="Vue d'ensemble"
          description="Ce que tu as parcouru sur la plateforme."
        >
          <div className="grid grid-cols-2 gap-3">
            <MiniStat
              valeur={bilan.exosFaits}
              unite={`/ ${bilan.exosTotal}`}
              libelle="exercices travaillés"
            />
            <MiniStat
              valeur={bilan.qcmFaits}
              unite={`/ ${bilan.qcmTotal}`}
              libelle="QCM tentés"
            />
            <MiniStat valeur={bilan.points} unite="pts" libelle="points cumulés" />
            <MiniStat
              valeur={bilan.tentatives}
              libelle={`tentative${bilan.tentatives > 1 ? "s" : ""} de QCM`}
            />
          </div>
        </CarteBento>

        {/* Précision */}
        <CarteBento
          rang={suivant()}
          icone="target"
          ton="accent"
          titre="Précision"
          description="Moyenne de tes meilleurs scores."
        >
          <div className="flex flex-col items-center">
            <div className="relative">
              <Anneau
                ratio={(bilan.moyenne ?? 0) / 100}
                couleur={
                  (bilan.moyenne ?? 0) >= SEUIL_REUSSITE
                    ? "stroke-accent-500"
                    : "stroke-sun-500"
                }
              />
              <span className="absolute inset-0 grid place-items-center text-2xl font-bold text-ink-900 dark:text-white">
                {bilan.moyenne === null ? "—" : `${bilan.moyenne}%`}
              </span>
            </div>
            <p className="mt-3 text-center text-xs text-ink-500 dark:text-ink-400">
              {bilan.moyenne === null
                ? "Aucun QCM terminé pour l'instant."
                : bilan.moyenne >= SEUIL_REUSSITE
                  ? "Au-dessus du seuil de réussite."
                  : `Le seuil de réussite est à ${SEUIL_REUSSITE} %.`}
            </p>
          </div>
        </CarteBento>

        {/* Régularité */}
        <CarteBento
          rang={suivant()}
          icone="clock"
          ton="flame"
          titre="Régularité"
          description={`Tes ${JOURS_SUIVIS} derniers jours.`}
        >
          <div>
            <p className="text-2xl font-bold text-ink-900 dark:text-white">
              {activite.total}
              <span className="ml-1 text-sm font-medium text-ink-400">
                jour{activite.total > 1 ? "s" : ""} actif
                {activite.total > 1 ? "s" : ""}
              </span>
            </p>
            <ul className="mt-4 flex flex-wrap gap-1.5">
              {activite.jours.map((j) => (
                <li
                  key={j.cle}
                  title={`${j.cle}${j.actif ? " : activité" : ""}`}
                  className={cx(
                    "size-5 rounded-[5px]",
                    j.actif
                      ? "bg-flame-500"
                      : "bg-ink-200 dark:bg-ink-800"
                  )}
                />
              ))}
            </ul>
            <p className="mt-3 text-xs text-ink-500 dark:text-ink-400">
              Une case s'allume dès qu'un exercice ou un QCM a été travaillé ce
              jour-là.
            </p>
          </div>
        </CarteBento>

        {/* Progression par matière */}
        <CarteBento
          rang={suivant()}
          large
          icone="layers"
          ton="violet"
          titre="Progression par matière"
          description="Exercices et QCM ouverts, sur ceux disponibles."
        >
          <ul className="space-y-4">
            {parMatiere.map((l) => (
              <li key={l.m.id}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Link
                    to={`/cours/${l.m.id}`}
                    className="flex items-center gap-2.5 text-sm font-medium text-ink-900 hover:text-brand-600 dark:text-white dark:hover:text-brand-300"
                  >
                    <span
                      className={cx(
                        "grid size-7 shrink-0 place-items-center rounded-full",
                        themeMatiere(l.m).pastille
                      )}
                    >
                      <Icon name={l.m.icone} className="size-3.5" />
                    </span>
                    {l.m.nom}
                  </Link>
                  <span className="font-mono text-xs text-ink-500 tabular-nums">
                    {l.faits}/{l.total}
                  </span>
                </div>
                <div className="mt-2">
                  <Barre
                    valeur={l.taux}
                    classe={
                      l.taux > 0
                        ? themeMatiere(l.m).barre
                        : "bg-ink-300 dark:bg-ink-700"
                    }
                    etiquette={`Progression en ${l.m.nom}`}
                  />
                </div>
              </li>
            ))}
          </ul>
        </CarteBento>

        {/* Résultats des QCM */}
        <CarteBento
          rang={suivant()}
          large
          icone="graduation"
          ton="brand"
          titre="Résultats des QCM"
          description="Seul le meilleur score de chaque questionnaire est gardé."
        >
          {resultatsQcm.length === 0 ? (
            <p className="text-sm text-ink-500 dark:text-ink-400">
              Aucun questionnaire terminé pour l'instant.{" "}
              <Link
                to="/qcm"
                className="font-medium text-brand-600 hover:underline dark:text-brand-400"
              >
                En commencer un
              </Link>
              .
            </p>
          ) : (
            <ul className="space-y-3">
              {resultatsQcm.map((r) => (
                <li
                  key={r.q.id}
                  className="flex flex-wrap items-center gap-x-4 gap-y-2"
                >
                  <span className="min-w-0 flex-1">
                    <Link
                      to={`/qcm/${r.q.id}`}
                      className="block truncate text-sm font-medium text-ink-900 hover:text-brand-600 dark:text-white dark:hover:text-brand-300"
                    >
                      {r.q.titre}
                    </Link>
                    <span className="mt-0.5 block text-xs text-ink-500">
                      {getMatiere(r.q.matiere)?.nom} ·{" "}
                      {r.tentatives ?? 1} tentative
                      {(r.tentatives ?? 1) > 1 ? "s" : ""} ·{" "}
                      {dateLisible(r.date) ?? "—"}
                    </span>
                  </span>
                  <span className="flex w-40 shrink-0 items-center gap-2.5">
                    <span className="flex-1">
                      <Barre
                        valeur={r.taux}
                        classe={
                          r.taux >= SEUIL_REUSSITE
                            ? "bg-accent-500"
                            : "bg-sun-500"
                        }
                        etiquette={`Score sur ${r.q.titre}`}
                      />
                    </span>
                    <span className="font-mono text-xs whitespace-nowrap text-ink-600 tabular-nums dark:text-ink-300">
                      {r.score}/{r.total}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CarteBento>

        {/* Forces et faiblesses */}
        <CarteBento
          rang={suivant()}
          large
          icone="target"
          ton="accent"
          titre="Forces et faiblesses"
          description={`Par compétence, dès ${MINIMUM_REPONSES} réponses enregistrées.`}
        >
          {evaluees === 0 ? (
            <div className="space-y-3">
              <p className="text-sm/6 text-ink-600 dark:text-ink-400">
                Aucune compétence n'a encore assez de réponses pour être jugée.
                Il en faut au moins {MINIMUM_REPONSES} par compétence, et tu en
                as enregistré {totalReponses} au total.
              </p>
              <p className="text-sm/6 text-ink-600 dark:text-ink-400">
                Termine d'autres QCM : chaque question rejoint automatiquement
                la compétence qu'elle vise.
              </p>
              <Bouton to="/qcm" taille="sm">
                <Icon name="target" className="size-4" />
                Faire un QCM
              </Bouton>
            </div>
          ) : (
            <>
              <ul className="space-y-4">
                {[...mesForces, ...mesFaiblesses].map((c) => {
                  const n = niveaux[c.niveau];
                  return (
                    <li key={c.id}>
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="flex items-center gap-2">
                          <span className="text-sm font-medium text-ink-900 dark:text-white">
                            {c.nom}
                          </span>
                          <span
                            className={cx(
                              "rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset",
                              n.puce
                            )}
                          >
                            {n.label}
                          </span>
                        </span>
                        <span className="font-mono text-xs text-ink-500 tabular-nums">
                          {c.justes}/{c.total} · {c.taux} %
                        </span>
                      </div>
                      <div className="mt-2">
                        <Barre
                          valeur={c.taux}
                          classe={n.barre}
                          etiquette={`Niveau en ${c.nom}`}
                        />
                      </div>
                      <p className="mt-1 text-xs text-ink-500 dark:text-ink-400">
                        {c.nomMatiere}
                      </p>
                    </li>
                  );
                })}
              </ul>

              {enAttente.length > 0 && (
                <p className="mt-5 border-t border-ink-200 pt-4 text-xs text-ink-500 dark:border-ink-800 dark:text-ink-400">
                  {enAttente.length} compétence{enAttente.length > 1 ? "s" : ""}{" "}
                  n'{enAttente.length > 1 ? "ont" : "a"} pas encore assez de
                  réponses pour être jugée{enAttente.length > 1 ? "s" : ""}.
                </p>
              )}
            </>
          )}
        </CarteBento>

        {/* Modules à améliorer */}
        <CarteBento
          rang={suivant()}
          large
          icone="book"
          ton="flame"
          titre="Modules à améliorer"
          description="Les chapitres à relire, déduits des compétences fragiles."
        >
          {modules.length === 0 ? (
            <p className="text-sm/6 text-ink-600 dark:text-ink-400">
              {evaluees === 0
                ? "Cette liste se remplira dès que des compétences auront été évaluées."
                : "Aucune compétence évaluée n'est sous le seuil. Rien à reprendre pour l'instant."}
            </p>
          ) : (
            <ul className="space-y-2.5">
              {modules.map((m) => (
                <li key={m.cle}>
                  <Link
                    to={`/cours/${m.matiere}`}
                    className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-ink-200 p-3 transition-colors hover:bg-ink-50 dark:border-ink-800 dark:hover:bg-ink-800/50"
                  >
                    <span
                      className={cx(
                        "grid size-8 shrink-0 place-items-center rounded-lg",
                        themeMatiere(getMatiere(m.matiere)).pastille
                      )}
                    >
                      <Icon
                        name={getMatiere(m.matiere)?.icone ?? "book"}
                        className="size-4"
                      />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium text-ink-900 dark:text-white">
                        {m.chapitre}
                      </span>
                      <span className="block text-xs text-ink-500 dark:text-ink-400">
                        {m.nomMatiere} · déclenché par « {m.motif} »
                      </span>
                    </span>
                    <span
                      className={cx(
                        "shrink-0 rounded-full px-2 py-0.5 font-mono text-[11px] font-medium ring-1 ring-inset",
                        niveaux[m.niveau].puce
                      )}
                    >
                      {m.taux} %
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CarteBento>

        {/* À reprendre */}
        {aReprendre.length > 0 && (
          <CarteBento
            rang={suivant()}
            large
            icone="bulb"
            ton="sun"
            titre="À reprendre en priorité"
            description={`Sous le seuil de ${SEUIL_REUSSITE} %. Relis le chapitre avant de refaire.`}
          >
            <ul className="flex flex-wrap gap-2.5">
              {aReprendre.map((r) => (
                <li key={r.q.id}>
                  <Link
                    to={`/cours/${r.q.matiere}`}
                    className="inline-flex items-center gap-2 rounded-xl border border-sun-400/50 bg-sun-100/60 px-3.5 py-2 text-sm font-medium text-sun-900 transition-opacity hover:opacity-80 dark:border-sun-500/30 dark:bg-sun-500/10 dark:text-sun-200"
                  >
                    {r.q.titre}
                    <span className="font-mono text-xs">{r.taux} %</span>
                  </Link>
                </li>
              ))}
            </ul>
          </CarteBento>
        )}

        {/* Données */}
        <CarteBento
          rang={suivant()}
          large
          icone="lock"
          ton="ink"
          titre="Mes données de progression"
          description="Conservées dans ce navigateur, et nulle part ailleurs."
        >
          <div className="flex flex-wrap items-center gap-3">
            {confirmation ? (
              <>
                <p className="text-sm font-medium text-ink-900 dark:text-white">
                  Effacer toute ta progression ? C'est définitif.
                </p>
                <Bouton
                  taille="sm"
                  className="bg-red-600 hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-500"
                  onClick={remettreAZero}
                >
                  Oui, tout effacer
                </Bouton>
                <Bouton
                  variante="secondaire"
                  taille="sm"
                  onClick={() => setConfirmation(false)}
                >
                  Annuler
                </Bouton>
              </>
            ) : (
              <>
                <Bouton
                  variante="secondaire"
                  taille="sm"
                  onClick={() => setConfirmation(true)}
                  disabled={rienFait}
                >
                  Réinitialiser ma progression
                </Bouton>
                <Bouton to="/parametres" variante="fantome" taille="sm">
                  Voir toutes mes données
                </Bouton>
              </>
            )}
          </div>
        </CarteBento>
      </div>

      <div className="mt-5">
        <NoteDemo>
          Un exercice compte comme travaillé dès que tu en ouvres la correction,
          et un QCM dès que tu arrives à l'écran de résultat.
        </NoteDemo>
      </div>
    </div>
  );
}
