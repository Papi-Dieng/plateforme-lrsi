import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Icon from "../components/Icon";
import { cx } from "../components/classes";
import {
  dateLisible,
  lireChapitresLus,
  lireExercicesTravailles,
  lireFavoris,
  lireScores,
  pourcent,
  reinitialiserProgression,
} from "../progression";
import { getMatiere, matieres } from "../data/matieres";
import { exercices } from "../data/exercices";
import { qcms } from "../data/qcm";
import {
  MINIMUM_REPONSES,
  SEUIL_FAIBLESSE,
  SEUIL_FORCE,
  analyserMatieres,
  chapitresARevoir,
  faiblesses,
  forces,
  niveaux,
  nonEvaluees,
  reponsesEnregistrees,
} from "../analyseMatieres";

/* ==================================================================
   Ma progression.

   Où j'en suis, où ça coince, et depuis quand je travaille. Les forces
   et faiblesses se lisent par matière (src/analyseMatieres.js) : on
   n'y mesure que ce qui est réellement mesurable aujourd'hui.

   Mise en page d'après la maquette « Ma progression » (7 octobre
   2026), façon affiche sportive : en-tête bleu électrique avec le
   tableau des chiffres et la jauge de précision, puis « La piste »
   (avancement par matière jusqu'à la ligne d'arrivée), « Les scores »,
   « Le podium » (forces et faiblesses en barres) et « L'entraînement »
   (chapitres à revoir). Titres en capitales serrées, encre marine,
   jaune pour ce qui est réussi, corail pour ce qui coince.
   ================================================================== */

const POINTS_PAR_BONNE_REPONSE = 10;
const SEUIL_REUSSITE = 70;
const JOURS_SUIVIS = 14;
const JOURS_COURTS = ["D", "L", "M", "M", "J", "V", "S"];

const MARINE = "text-[#0b1230] dark:text-white";
const DOUX = "text-[#4b5470] dark:text-ink-300";
const affiche = "font-black uppercase tracking-[-0.04em] [font-stretch:condensed]";
const mono = "font-mono text-[11px] font-bold tracking-[0.14em] uppercase";

// Couleur de chaque niveau sur le podium.
const PODIUM = {
  force: { barre: "bg-[#ffd60a]", puce: "bg-[#ffd60a] text-[#0b1230]" },
  "a-consolider": { barre: "bg-[#1f47e0]", puce: "bg-[#1f47e0] text-white" },
  faiblesse: { barre: "bg-[#ff5a4a]", puce: "bg-[#ff5a4a] text-[#0b1230]" },
};

/* ------------------------------------------------------------------ */
/* Briques                                                             */
/* ------------------------------------------------------------------ */

function EnTeteSection({ surtitre, titre, texte, children }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-x-10 gap-y-3 border-b-2 border-[#0b1230] pb-5 dark:border-white">
      <div>
        <p className={cx(mono, "text-[10px] text-[#1f47e0] dark:text-[#8fa6ff]")}>{surtitre}</p>
        <h2 className={cx(affiche, "mt-2 text-5xl sm:text-6xl", MARINE)}>{titre}</h2>
      </div>
      {texte && <p className={cx("max-w-xs text-sm sm:text-right", DOUX)}>{texte}</p>}
      {children}
    </div>
  );
}

function Chiffre({ valeur, unite, libelle }) {
  return (
    <div className="border border-white/40 p-5">
      <p className={cx(affiche, "text-6xl text-[#ffd60a]")}>
        {valeur}
        {unite && <span className="ml-1 text-2xl">{unite}</span>}
      </p>
      <p className={cx(mono, "mt-2 text-[10px] text-white")}>{libelle}</p>
    </div>
  );
}

// Demi-cercle de précision, avec le repère du seuil de réussite.
function Jauge({ valeur }) {
  const r = 80;
  const longueur = Math.PI * r;
  const angle = Math.PI * (1 - SEUIL_REUSSITE / 100);
  const sx = 100 + Math.cos(angle) * r;
  const sy = 100 - Math.sin(angle) * r;
  return (
    <svg viewBox="0 0 200 110" className="w-full max-w-64" aria-hidden="true">
      <path d="M20 100a80 80 0 0 1 160 0" fill="none" stroke="#ffffff33" strokeWidth="18" />
      <path
        d="M20 100a80 80 0 0 1 160 0"
        fill="none"
        stroke="#ffd60a"
        strokeWidth="18"
        strokeDasharray={longueur}
        strokeDashoffset={longueur * (1 - (valeur ?? 0) / 100)}
        className="transition-[stroke-dashoffset] duration-700"
      />
      <line x1={sx} y1={sy} x2={100 + Math.cos(angle) * (r + 14)} y2={100 - Math.sin(angle) * (r + 14)} stroke="#fff" strokeWidth="3" />
    </svg>
  );
}

/* ================================================================== */

export default function Progression() {
  const [scores, setScores] = useState(lireScores);
  const [exercicesFaits, setExercicesFaits] = useState(lireExercicesTravailles);
  const [favoris, setFavoris] = useState(lireFavoris);
  const [confirmation, setConfirmation] = useState(false);

  const charger = () => {
    setScores(lireScores());
    setExercicesFaits(lireExercicesTravailles());
    setFavoris(lireFavoris());
  };

  /* ---- Synthèse ---- */

  const bilan = useMemo(() => {
    const idsQcmFaits = Object.keys(scores).filter((id) => qcms.some((q) => q.id === id));
    const exosFaits = exercices.filter((e) => exercicesFaits[e.id]);
    const pourcentages = idsQcmFaits.map((id) => pourcent(scores[id].score, scores[id].total));
    const moyenne =
      pourcentages.length > 0 ? Math.round(pourcentages.reduce((a, b) => a + b, 0) / pourcentages.length) : null;
    const points = idsQcmFaits.reduce((n, id) => n + scores[id].score * POINTS_PAR_BONNE_REPONSE, 0);
    const tentatives = idsQcmFaits.reduce((n, id) => n + (scores[id].tentatives ?? 1), 0);
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

  const rienFait = bilan.exosFaits === 0 && bilan.qcmFaits === 0 && favoris.length === 0;

  /* ---- Régularité, sur les deux dernières semaines ---- */

  const activite = useMemo(() => {
    const dates = [...Object.values(scores).map((s) => s.date), ...Object.values(exercicesFaits).map((e) => e.date)].filter(Boolean);
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
          return { m, exos: exos.length, exosFaits, quiz: quiz.length, quizFaits, total, faits, taux: pourcent(faits, total) };
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

  /* ---- Forces et faiblesses, par matière ---- */

  const analyse = useMemo(() => analyserMatieres(scores), [scores]);
  const mesForces = forces(analyse);
  const mesFaiblesses = faiblesses(analyse);
  const enAttente = nonEvaluees(analyse);
  const modules = chapitresARevoir(analyse, lireChapitresLus());
  const evaluees = mesForces.length + mesFaiblesses.length;
  const totalReponses = reponsesEnregistrees(analyse);

  // Chapitres regroupés par matière, dans l'ordre reçu (la plus faible d'abord).
  const parMatiereARevoir = [];
  for (const m of modules) {
    let groupe = parMatiereARevoir.find((g) => g.matiere === m.matiere);
    if (!groupe) {
      groupe = { matiere: m.matiere, nom: m.nomMatiere, taux: m.taux, chapitres: [] };
      parMatiereARevoir.push(groupe);
    }
    groupe.chapitres.push(m);
  }

  const remettreAZero = () => {
    reinitialiserProgression();
    charger();
    setConfirmation(false);
  };

  return (
    <div className="bg-white dark:bg-ink-950">
      {/* ---------------------------------------------------------- */}
      {/* En-tête bleu                                                */}
      {/* ---------------------------------------------------------- */}
      <header
        className="bg-[#1f47e0] px-4 pt-10 pb-12 text-white sm:px-8"
        style={{ backgroundImage: "radial-gradient(#ffffff26 1px, transparent 1px)", backgroundSize: "14px 14px" }}
      >
        <div className="mx-auto max-w-6xl">
          <h1 className={cx(affiche, "text-6xl/[0.9] sm:text-8xl/[0.9]")}>Ma progression</h1>
          <p className="mt-3 text-white/90">Où tu en es, où ça coince, et depuis quand tu travailles.</p>

          {rienFait && (
            <section className="mt-8 bg-[#ffd60a] p-6 text-[#0b1230] sm:p-8">
              <h2 className={cx(affiche, "text-4xl")}>Ta progression est encore vide.</h2>
              <p className="mt-2 max-w-lg text-sm/6">
                Ouvre la correction d'un exercice ou termine un QCM : les cartes ci-dessous se remplissent toutes seules.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link to="/exercices" className="inline-flex min-h-12 items-center bg-[#0b1230] px-5 font-extrabold text-white hover:bg-[#1c2550]">
                  Travailler un exercice
                </Link>
                <Link to="/qcm" className="inline-flex min-h-12 items-center border-2 border-[#0b1230] px-5 font-extrabold hover:bg-white">
                  Faire un QCM
                </Link>
              </div>
            </section>
          )}

          <div className="mt-8 grid gap-5 lg:grid-cols-[2fr_1fr]">
            <div className="grid grid-cols-2">
              <Chiffre valeur={bilan.exosFaits} unite={`/ ${bilan.exosTotal}`} libelle="exercices travaillés" />
              <Chiffre valeur={bilan.qcmFaits} unite={`/ ${bilan.qcmTotal}`} libelle="QCM tentés" />
              <Chiffre valeur={bilan.points} unite="pts" libelle="points cumulés" />
              <Chiffre valeur={bilan.tentatives} libelle={`tentative${bilan.tentatives > 1 ? "s" : ""} de QCM`} />
            </div>
            <section className="flex flex-col items-center border border-white/40 bg-[#1a3cc4] p-5 text-center">
              <h2 className={cx(mono, "text-[10px] text-[#ffd60a]")}>Précision</h2>
              <div className="relative mt-3 w-full max-w-64">
                <Jauge valeur={bilan.moyenne} />
                <span className={cx(affiche, "absolute inset-x-0 bottom-0 text-6xl")}>
                  {bilan.moyenne === null ? "—" : `${bilan.moyenne} %`}
                </span>
              </div>
              <p className="mt-3 text-sm">Moyenne de tes meilleurs scores.</p>
              <p className="mt-1 text-sm font-bold">
                {bilan.moyenne === null
                  ? "Aucun QCM terminé pour l'instant."
                  : bilan.moyenne >= SEUIL_REUSSITE
                    ? "Au-dessus du seuil de réussite."
                    : `Le seuil de réussite est à ${SEUIL_REUSSITE} %.`}
              </p>
            </section>
          </div>

          <section className="mt-8 border-t border-white/40 pt-6">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <h2 className={cx(mono, "text-[10px]")}>Régularité · tes {JOURS_SUIVIS} derniers jours</h2>
              <p className={cx(mono, "flex items-baseline gap-2 text-[10px]")}>
                <span className={cx(affiche, "text-4xl text-[#ffd60a]")}>{activite.total}</span>
                jour{activite.total > 1 ? "s" : ""} actif{activite.total > 1 ? "s" : ""}
              </p>
            </div>
            <ol className="mt-3 grid grid-cols-7 gap-1 sm:grid-cols-14">
              {activite.jours.map((j) => (
                <li key={j.cle} title={`${j.cle}${j.actif ? " : activité" : ""}`} className="text-center">
                  <span className={cx("block h-10 sm:h-12", j.actif ? "bg-[#ffd60a]" : "bg-white/15")} />
                  <span className={cx(mono, "mt-2 block text-[10px]")} aria-hidden="true">{JOURS_COURTS[j.date.getDay()]}</span>
                  <span className="block text-[11px] text-white/80" aria-hidden="true">{j.date.getDate()}</span>
                  <span className="sr-only">{j.actif ? "actif" : "sans activité"}</span>
                </li>
              ))}
            </ol>
            <p className="mt-4 text-sm text-white/90">Une case s'allume dès qu'un exercice ou un QCM a été travaillé ce jour-là.</p>
          </section>
        </div>
      </header>

      <div className="mx-auto max-w-6xl space-y-24 px-4 py-20 sm:px-8">
        {/* ---------------------------------------------------------- */}
        {/* La piste                                                    */}
        {/* ---------------------------------------------------------- */}
        <section>
          <EnTeteSection surtitre="Progression par matière" titre="La piste" texte="Exercices et QCM ouverts, sur ceux disponibles." />
          <div aria-hidden="true" className={cx(mono, "mt-4 hidden grid-cols-[16rem_1fr_5rem] text-[10px] sm:grid", DOUX)}>
            <span />
            <span className="flex justify-between">
              <span>Départ</span><span>25 %</span><span>50 %</span><span>75 %</span><span>Arrivée</span>
            </span>
          </div>
          <ol className="mt-2 border-y-2 border-[#0b1230] dark:border-white">
            {parMatiere.map((l, i) => (
              <li key={l.m.id} className="grid grid-cols-[2.5rem_1fr_auto] items-center gap-x-4 gap-y-2 border-b border-[#0b1230]/15 py-3 last:border-0 sm:grid-cols-[2.5rem_13.5rem_1fr_5rem] dark:border-white/15">
                <span className={cx(affiche, "text-4xl text-transparent [-webkit-text-stroke:1.5px_#4b5470]")} aria-hidden="true">{i + 1}</span>
                <span className="min-w-0">
                  <Link to={`/cours/${l.m.id}`} className={cx("block text-sm font-extrabold hover:underline", MARINE)}>
                    {l.m.nom}
                  </Link>
                  <span className={cx("block text-xs", DOUX)}>
                    {[l.exos > 0 && `Exercices ${l.exosFaits}/${l.exos}`, l.quiz > 0 && `QCM ${l.quizFaits}/${l.quiz}`].filter(Boolean).join(" · ")}
                  </span>
                </span>
                <span
                  className="relative col-span-3 h-10 border-r-4 border-dotted border-[#0b1230] max-sm:order-last sm:col-span-1 dark:border-white"
                  role="progressbar"
                  aria-valuenow={l.taux}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`Progression en ${l.m.nom}`}
                >
                  <span className="absolute inset-y-0 left-0 border-l-2 border-[#0b1230] dark:border-white" />
                  <span className="absolute top-1/2 left-0 h-1 -translate-y-1/2 bg-[#1f47e0] transition-[width] duration-700 dark:bg-[#8fa6ff]" style={{ width: `${l.taux}%` }} />
                  <span
                    className="absolute top-1/2 grid size-9 -translate-1/2 place-items-center rounded-full border-2 border-[#0b1230] bg-[#ffd60a] text-[11px] font-black text-[#0b1230]"
                    style={{ left: `${l.taux}%` }}
                    aria-hidden="true"
                  >
                    {l.faits}/{l.total}
                  </span>
                </span>
                <span className={cx(affiche, "text-right text-3xl", MARINE)}>{l.taux} %</span>
              </li>
            ))}
          </ol>
        </section>

        {/* ---------------------------------------------------------- */}
        {/* Les scores                                                  */}
        {/* ---------------------------------------------------------- */}
        <section>
          <EnTeteSection surtitre="Résultats des QCM" titre="Les scores" texte="Seul le meilleur score de chaque questionnaire est gardé." />
          {resultatsQcm.length === 0 ? (
            <p className={cx("mt-6", DOUX)}>
              Aucun questionnaire terminé pour l'instant.{" "}
              <Link to="/qcm" className="font-bold text-[#1f47e0] underline dark:text-[#8fa6ff]">
                En commencer un
              </Link>
              .
            </p>
          ) : (
            <ul>
              {resultatsQcm.map((r) => (
                <li key={r.q.id} className="grid grid-cols-[4rem_1fr_auto] items-center gap-x-6 gap-y-3 border-b border-[#0b1230]/15 py-4 sm:grid-cols-[4rem_1fr_14rem_5rem] dark:border-white/15">
                  <span className={cx(affiche, "text-5xl", MARINE)}>
                    {r.score}
                    <span className={cx("text-2xl", DOUX)}>/{r.total}</span>
                  </span>
                  <span className="min-w-0">
                    <Link to={`/qcm/${r.q.id}`} className={cx("block font-extrabold hover:underline", MARINE)}>
                      {r.q.titre}
                    </Link>
                    <span className={cx("block text-xs", DOUX)}>
                      {getMatiere(r.q.matiere)?.nom} · {r.tentatives ?? 1} tentative{(r.tentatives ?? 1) > 1 ? "s" : ""} · {dateLisible(r.date) ?? "—"}
                    </span>
                  </span>
                  <span
                    className="relative col-span-3 h-3 bg-[#0b1230]/10 max-sm:order-last sm:col-span-1 dark:bg-white/15"
                    role="progressbar"
                    aria-valuenow={r.taux}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`Score sur ${r.q.titre}`}
                  >
                    <span className={cx("absolute inset-y-0 left-0", r.taux >= SEUIL_REUSSITE ? "bg-[#1f47e0] dark:bg-[#8fa6ff]" : "bg-[#ff5a4a]")} style={{ width: `${r.taux}%` }} />
                    <span className="absolute -inset-y-1.5 w-0.5 bg-[#0b1230] dark:bg-white" style={{ left: `${SEUIL_REUSSITE}%` }} title={`Seuil ${SEUIL_REUSSITE} %`} />
                  </span>
                  <span className={cx(affiche, "text-right text-3xl", MARINE)}>{r.taux} %</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {/* ---------------------------------------------------------- */}
      {/* Le podium                                                   */}
      {/* ---------------------------------------------------------- */}
      <section className="bg-[#f3f3f0] px-4 py-20 sm:px-8 dark:bg-ink-900">
        <div className="mx-auto max-w-6xl">
          <EnTeteSection surtitre="Forces et faiblesses" titre="Le podium" texte={`Par matière, dès ${MINIMUM_REPONSES} réponses de QCM enregistrées.`} />
          {evaluees === 0 ? (
            <div className="mt-6 max-w-2xl space-y-3">
              <p className={DOUX}>
                Aucune matière n'a encore assez de réponses pour être jugée. Il en faut au moins {MINIMUM_REPONSES} par matière, et tu en as enregistré {totalReponses} au total.
              </p>
              <p className={DOUX}>Termine d'autres QCM : chaque réponse compte dans la matière du QCM.</p>
              <Link to="/qcm" className="inline-flex min-h-12 items-center gap-2 bg-[#0b1230] px-5 font-extrabold text-white hover:bg-[#1c2550] dark:bg-white dark:text-[#0b1230]">
                <Icon name="target" className="size-4" />
                Faire un QCM
              </Link>
            </div>
          ) : (
            <>
              <div className="relative mt-10">
                <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-64">
                  {[SEUIL_FORCE, SEUIL_FAIBLESSE].map((s) => (
                    <span key={s} className={cx(mono, "absolute inset-x-0 border-t border-dashed border-[#4b5470]/60 pt-1 text-right text-[9px]", DOUX)} style={{ bottom: `${s}%` }}>
                      {s === SEUIL_FORCE ? `Force dès ${s} %` : `À consolider dès ${s} %`}
                    </span>
                  ))}
                </div>
                <ul className="relative grid grid-cols-2 gap-x-3 gap-y-8 sm:grid-cols-3 lg:grid-cols-6">
                  {[...mesForces, ...mesFaiblesses, ...enAttente].map((c) => {
                    const p = PODIUM[c.niveau];
                    return (
                      <li key={c.id}>
                        <div className="flex h-64 flex-col justify-end">
                          {p ? (
                            <>
                              <span className={cx(affiche, "mb-1 text-center text-3xl", MARINE)}>{c.taux} %</span>
                              <span
                                className={cx("border-2 border-[#0b1230] transition-[height] duration-700 dark:border-white", p.barre)}
                                style={{ height: `${c.taux}%` }}
                                role="img"
                                aria-label={`Niveau en ${c.nom} : ${c.taux} %`}
                              />
                            </>
                          ) : (
                            <>
                              <span className={cx(affiche, "mb-1 text-center text-3xl", DOUX)} aria-hidden="true">—</span>
                              <span className="h-12 border-2 border-dashed border-[#4b5470]/60" />
                            </>
                          )}
                        </div>
                        <p className={cx("mt-3 border-t-2 border-[#0b1230] pt-2 text-sm font-extrabold dark:border-white", MARINE)}>{c.nom}</p>
                        <span className={cx(mono, "mt-1 inline-block px-1.5 py-0.5 text-[9px]", p ? p.puce : cx("border border-dashed border-[#4b5470]/60", DOUX))}>
                          {niveaux[c.niveau].label}
                        </span>
                        <p className={cx("mt-1 text-xs", DOUX)}>{p ? `${c.justes}/${c.total} · ${c.taux} %` : `Moins de ${MINIMUM_REPONSES} réponses`}</p>
                      </li>
                    );
                  })}
                </ul>
              </div>
              {enAttente.length > 0 && (
                <p className={cx("mt-8 text-sm", DOUX)}>
                  {enAttente.length} matière{enAttente.length > 1 ? "s" : ""} n'{enAttente.length > 1 ? "ont" : "a"} pas encore assez de réponses pour être jugée{enAttente.length > 1 ? "s" : ""}.
                </p>
              )}
            </>
          )}
        </div>
      </section>

      <div className="mx-auto max-w-6xl space-y-20 px-4 py-20 sm:px-8">
        {/* ---------------------------------------------------------- */}
        {/* L'entraînement                                              */}
        {/* ---------------------------------------------------------- */}
        <div className="grid items-start gap-10 lg:grid-cols-[1fr_22rem]">
          <section>
            <EnTeteSection surtitre="Chapitres à revoir" titre="L'entraînement" texte="Dans tes matières fragiles, de la plus faible à la moins faible." />
            {modules.length === 0 ? (
              <p className={cx("mt-6", DOUX)}>
                {evaluees === 0
                  ? "Cette liste se remplira dès que des matières auront été évaluées."
                  : "Aucune matière évaluée n'est sous le seuil. Rien à reprendre pour l'instant."}
              </p>
            ) : (
              parMatiereARevoir.map((g) => (
                <div key={g.matiere} className="mt-8">
                  <p className={cx(affiche, "flex justify-between border-b-2 border-current pb-1 text-3xl", g.taux < SEUIL_FAIBLESSE ? "text-[#d63a2b] dark:text-[#ff8a80]" : "text-[#1f47e0] dark:text-[#8fa6ff]")}>
                    <span>{g.nom}</span>
                    <span>{g.taux} %</span>
                  </p>
                  <ul>
                    {g.chapitres.map((m) => (
                      <li key={m.cle}>
                        <Link to={`/cours/${m.matiere}`} className={cx("flex items-center gap-3 border-b border-[#0b1230]/15 py-3.5 text-sm font-bold hover:bg-[#f3f3f0] dark:border-white/15 dark:hover:bg-white/5", MARINE)}>
                          <span className="min-w-0 flex-1">{m.chapitre}</span>
                          <span className={cx(mono, "px-1.5 py-0.5 text-[9px]", m.dejaLu ? "bg-[#ffd60a] text-[#0b1230]" : "border border-[#0b1230]/20 dark:border-white/30")}>
                            {m.dejaLu ? "À relire" : "Pas encore lu"}
                          </span>
                          <Icon name="arrow" className="size-4" />
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))
            )}
          </section>

          {aReprendre.length > 0 && (
            <section className="border-2 border-[#0b1230] bg-[#ffd60a] p-6 text-[#0b1230]">
              <p className={cx(mono, "text-[10px]")}>Sous le seuil de {SEUIL_REUSSITE} %</p>
              <h2 className={cx(affiche, "mt-2 text-4xl/[0.95]")}>À reprendre en priorité</h2>
              <p className="mt-2 text-sm">Relis le chapitre avant de refaire.</p>
              <ul className="mt-5 space-y-4">
                {aReprendre.map((r) => (
                  <li key={r.q.id}>
                    <Link to={`/cours/${r.q.matiere}`} className={cx(affiche, "flex items-start justify-between gap-4 text-2xl/[1.05] hover:underline")}>
                      <span>{r.q.titre}</span>
                      <span className="shrink-0">{r.taux} %</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        {/* ---------------------------------------------------------- */}
        {/* Données                                                     */}
        {/* ---------------------------------------------------------- */}
        <section className="flex flex-wrap items-center justify-between gap-5 border-2 border-[#0b1230] p-6 dark:border-white">
          <div>
            <h2 className={cx(affiche, "flex items-center gap-3 text-3xl", MARINE)}>
              <Icon name="lock" className="size-5" />
              Mes données de progression
            </h2>
            <p className={cx("mt-1 text-sm", DOUX)}>Conservées dans ce navigateur, et nulle part ailleurs.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {confirmation ? (
              <>
                <p className={cx("text-sm font-bold", MARINE)}>Effacer toute ta progression ? C'est définitif.</p>
                <button type="button" onClick={remettreAZero} className="min-h-11 bg-[#c22f22] px-4 font-extrabold text-white hover:bg-[#a3261a]">
                  Oui, tout effacer
                </button>
                <button type="button" onClick={() => setConfirmation(false)} className={cx("min-h-11 border-2 border-[#0b1230] px-4 font-extrabold dark:border-white", MARINE)}>
                  Annuler
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setConfirmation(true)}
                  disabled={rienFait}
                  className={cx("min-h-11 border-2 border-[#0b1230] px-4 font-extrabold hover:bg-[#f3f3f0] disabled:cursor-not-allowed disabled:opacity-50 dark:border-white dark:hover:bg-white/10", MARINE)}
                >
                  Réinitialiser ma progression
                </button>
                <Link to="/parametres" className={cx("px-2 font-extrabold underline", "text-[#1f47e0] dark:text-[#8fa6ff]")}>
                  Voir toutes mes données
                </Link>
              </>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
