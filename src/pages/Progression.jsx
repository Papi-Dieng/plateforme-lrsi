import { useEffect, useMemo, useState } from "react";
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

   Mise en page d'après la maquette « Ma progression » (7 octobre 2026,
   seconde version) : un ciel de crépuscule violet où un sentier monte
   du départ au sommet — le point « Toi » s'y place selon ce qui a été
   parcouru —, puis des cartes blanches arrondies sur fond nuit, avec un
   dégradé violet → rose pour tout ce qui avance.
   ================================================================== */

const POINTS_PAR_BONNE_REPONSE = 10;
const SEUIL_REUSSITE = 70;
const JOURS_SUIVIS = 14;
const JOURS_COURTS = ["D", "L", "M", "M", "J", "V", "S"];

const DEGRADE = "bg-gradient-to-r from-[#9b6bff] to-[#ff8fb3]";
const ENCRE = "text-[#22183d] dark:text-white";
const DOUX = "text-[#6b6280] dark:text-ink-300";
const CARTE = "rounded-[28px] bg-white p-6 shadow-[0_20px_50px_-30px_#140f3680] transition-[transform,box-shadow] duration-300 hover:-translate-y-1 hover:shadow-[0_30px_60px_-30px_#140f3699] sm:p-7 dark:bg-ink-900";

// Couleurs des niveaux (forces et faiblesses).
const TONS = {
  force: { puce: "bg-[#efe9ff] text-[#5434c9]", point: "bg-[#6b45e8]" },
  "a-consolider": { puce: "bg-[#fff1d6] text-[#7a4b00]", point: "bg-[#f5a524]" },
  faiblesse: { puce: "bg-[#ffe6ef] text-[#b52a5e]", point: "bg-[#e8579c]" },
};

/* ------------------------------------------------------------------ */
/* Briques                                                             */
/* ------------------------------------------------------------------ */

function TitreCarte({ icone, titre, texte, ton = "bg-[#efe9ff] text-[#5434c9]", children }) {
  return (
    <header className="flex flex-wrap items-start gap-3">
      <span className={cx("grid size-10 shrink-0 place-items-center rounded-2xl", ton)}>
        <Icon name={icone} className="size-4.5" />
      </span>
      <div className="min-w-0 flex-1">
        <h2 className={cx("text-lg font-extrabold tracking-tight", ENCRE)}>{titre}</h2>
        <p className={cx("text-sm", DOUX)}>{texte}</p>
      </div>
      {children}
    </header>
  );
}

/* Une avancée de 0 à 1 à l'ouverture de la page (fin ralentie), pour
   faire monter les chiffres, la jauge et le point « Toi ». Avec
   « réduire les animations », tout est en place tout de suite. */
const sansMouvement = () => typeof window !== "undefined" && Boolean(window.matchMedia?.("(prefers-reduced-motion: reduce)").matches);

function useAvance(duree = 1800, delai = 0) {
  const [t, setT] = useState(() => (sansMouvement() ? 1 : 0));
  useEffect(() => {
    if (sansMouvement()) return;
    let id;
    const debut = performance.now() + delai;
    const pas = (maintenant) => {
      const x = Math.min(Math.max((maintenant - debut) / duree, 0), 1);
      setT(1 - (1 - x) ** 3);
      if (x < 1) id = requestAnimationFrame(pas);
    };
    id = requestAnimationFrame(pas);
    return () => cancelAnimationFrame(id);
  }, [duree, delai]);
  return t;
}

// Un nombre qui compte jusqu'à sa valeur.
function Compte({ valeur, t }) {
  return <>{Math.round((valeur ?? 0) * t)}</>;
}

/* Une infobulle qui apparaît au survol ou au clavier de son parent
   (`group/b`). Purement visuelle : l'information existe déjà en texte. */
function Bulle({ children, haut = true, className, style }) {
  return (
    <span
      aria-hidden="true"
      style={style}
      className={cx(
        "pointer-events-none absolute left-1/2 z-20 -translate-x-1/2 scale-90 rounded-xl bg-[#22183d] px-2.5 py-1.5 text-[11px] font-bold whitespace-nowrap text-white opacity-0 shadow-lg transition-[opacity,transform] duration-150 group-hover/b:scale-100 group-hover/b:opacity-100 group-focus-visible/b:scale-100 group-focus-visible/b:opacity-100 dark:bg-white dark:text-[#22183d]",
        haut ? "bottom-full mb-2" : "top-full mt-2",
        className
      )}
    >
      {children}
    </span>
  );
}

function Barre({ valeur, etiquette, classe = DEGRADE, repere, delai = 0, bulle }) {
  return (
    <div
      className="group/b relative h-2.5 rounded-full bg-[#f1edf5] transition-[height] hover:h-3.5 dark:bg-white/10"
      role="progressbar"
      aria-valuenow={valeur}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={etiquette}
    >
      <div className={cx("barre-pousse h-full rounded-full transition-[width] duration-700", classe)} style={{ width: `${valeur}%`, animationDelay: `${delai}ms` }} />
      {repere != null && <span className="absolute -inset-y-1 w-0.5 rounded bg-[#22183d]/60 dark:bg-white/60" style={{ left: `${repere}%` }} />}
      {bulle && <Bulle style={{ left: `${Math.min(Math.max(valeur, 12), 88)}%` }}>{bulle}</Bulle>}
    </div>
  );
}

// Le ciel : montagnes, soleil, et le sentier du départ au sommet.
// Le point « Toi » suit la part du contenu déjà parcourue.
const SENTIER = "M330 470 C 420 455, 470 440, 520 418 S 610 380, 640 345 S 690 320, 705 300";

const ETOILES = [
  [80, 60, 1.6], [190, 120, 1.1], [300, 40, 1.4], [420, 95, 1], [540, 30, 1.7],
  [610, 140, 1.2], [700, 70, 1], [930, 50, 1.5], [980, 150, 1.1], [40, 190, 1.2],
];

// Chaque plan du paysage suit la souris de quelques pixels (--px, --py,
// posés par l'en-tête), les plus proches davantage : effet de profondeur.
const plan = (dx, dy = dx / 3) => ({
  transform: `translate(calc(var(--px, 0) * ${dx}px), calc(var(--py, 0) * ${dy}px))`,
  transition: "transform 0.4s ease-out",
});

function Paysage({ ratio, faits, total, projete = null }) {
  // Le chemin, gardé en état (pas en ref) pour y lire la position du point.
  const [chemin, setChemin] = useState(null);
  // Le point part du départ et monte jusqu'à sa place sur le sentier.
  const t = useAvance(2200, 500);
  const part = Math.min(Math.max(ratio, 0), 1) * t;
  const q = chemin?.getTotalLength ? chemin.getPointAtLength(chemin.getTotalLength() * part) : { x: 330, y: 470 };
  const cible = projete != null && chemin?.getTotalLength ? chemin.getPointAtLength(chemin.getTotalLength() * Math.min(projete, 1)) : null;

  return (
    <svg viewBox="0 0 1000 520" preserveAspectRatio="xMidYMax slice" className="absolute inset-0 size-full" aria-hidden="true">
      <defs>
        <radialGradient id="pg-soleil" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#ffd2a3" />
          <stop offset="1" stopColor="#ffb38c" stopOpacity="0" />
        </radialGradient>
      </defs>
      <g style={plan(-6)}>
        {ETOILES.map(([x, y, rr], i) => (
          <circle key={i} cx={x} cy={y} r={rr} fill="#fff" className="scintille" style={{ animationDelay: `${(i * 0.37) % 3}s` }} />
        ))}
      </g>
      <g style={plan(-12)}>
        <g className="flotte">
          <circle cx="860" cy="330" r="140" fill="url(#pg-soleil)" opacity="0.7" />
          <circle cx="860" cy="340" r="52" fill="#ffd2a3" />
        </g>
      </g>
      <g className="derive" opacity="0.5">
        <path d="M120 170 h120 a18 18 0 0 0 -30 -22 a26 26 0 0 0 -48 -6 a20 20 0 0 0 -42 28Z" fill="#fff" opacity="0.35" />
        <path d="M620 210 h90 a14 14 0 0 0 -22 -18 a20 20 0 0 0 -38 -4 a16 16 0 0 0 -30 22Z" fill="#fff" opacity="0.25" />
      </g>
      <path d="M-40 380 L120 330 L220 360 L330 300 L430 350 L520 320 L640 360 L760 310 L880 350 L1040 320 V560 H-40Z" fill="#5d3392" opacity="0.55" style={plan(10)} />
      <g style={plan(20)}>
      <path d="M-40 430 L150 380 L260 410 L380 370 L480 410 L560 360 L705 290 L820 380 L1040 400 V560 H-40Z" fill="#2a1f55" />
      <path d="M-40 470 C 200 440, 400 500, 1040 455 V560 H-40Z" fill="#22183d" />
      {/* Le sentier entier en pointillés, et la part parcourue en clair. */}
      <path ref={setChemin} d={SENTIER} fill="none" stroke="#ffd2a3" strokeOpacity="0.35" strokeWidth="3" strokeDasharray="2 8" strokeLinecap="round" />
      <path d={SENTIER} pathLength={1} fill="none" stroke="#ffd2a3" strokeWidth="4" strokeLinecap="round" strokeDasharray={`${part} 1`} />
      <path d="M705 300 V270" stroke="#fff" strokeWidth="2" />
      <path d="M705 270 L728 278 L705 286Z" fill="#ffb38c" className="flotte" style={{ animationDuration: "2.5s" }} />
      {cible && (
        <g>
          <circle cx={cible.x} cy={cible.y} r="11" fill="none" stroke="#fff" strokeWidth="2.5" strokeDasharray="4 3" />
          <g transform={`translate(${cible.x - 36} ${cible.y + 18})`}>
            <rect width="72" height="22" rx="11" fill="#22183d" stroke="#ffd2a3" />
            <text x="36" y="15" textAnchor="middle" fontSize="10.5" fontWeight="800" fill="#ffd2a3">
              Objectif
            </text>
          </g>
        </g>
      )}
      <circle cx={q.x} cy={q.y} r="9" fill="#ffd2a3" className="halo" />
      <circle cx={q.x} cy={q.y} r="9" fill="#ffd2a3" stroke="#fff" strokeWidth="3" />
      <g transform={`translate(${q.x - 34} ${q.y - 50})`}>
        <rect width="68" height="24" rx="12" fill="#fff" />
        <circle cx="12" cy="12" r="4" fill="#e8579c" />
        <text x="21" y="16" fontSize="11" fontWeight="800" fill="#22183d">
          Toi {Math.round(faits * t)}/{total}
        </text>
      </g>
      </g>
    </svg>
  );
}

// Demi-cercle de précision, avec le repère du seuil de réussite.
function Jauge({ valeur, t = 1, objectif = null }) {
  const r = 80;
  const longueur = Math.PI * r;
  const angle = Math.PI * (1 - SEUIL_REUSSITE / 100);
  return (
    <svg viewBox="0 0 200 112" className="w-full max-w-60" aria-hidden="true">
      <defs>
        <linearGradient id="pg-jauge" x1="0" x2="1">
          <stop offset="0" stopColor="#9b6bff" />
          <stop offset="1" stopColor="#ff8fb3" />
        </linearGradient>
      </defs>
      <path d="M20 100a80 80 0 0 1 160 0" fill="none" stroke="#f1edf5" strokeWidth="16" strokeLinecap="round" />
      <path
        d="M20 100a80 80 0 0 1 160 0"
        fill="none"
        stroke="url(#pg-jauge)"
        strokeWidth="16"
        strokeLinecap="round"
        strokeDasharray={longueur}
        strokeDashoffset={longueur * (1 - ((valeur ?? 0) * t) / 100)}
      />
      <line
        x1={100 + Math.cos(angle) * (r - 14)}
        y1={100 - Math.sin(angle) * (r - 14)}
        x2={100 + Math.cos(angle) * (r + 14)}
        y2={100 - Math.sin(angle) * (r + 14)}
        stroke="#22183d"
        strokeWidth="3"
      />
      {objectif != null && (
        <circle
          cx={100 + Math.cos(Math.PI * (1 - objectif / 100)) * r}
          cy={100 - Math.sin(Math.PI * (1 - objectif / 100)) * r}
          r="9"
          fill="#fff"
          stroke="#e8579c"
          strokeWidth="4"
          className="transition-all duration-200"
        />
      )}
    </svg>
  );
}

/* Le détail d'une matière dépliée : ce qui est fait, ce qui reste. */
function DetailMatiere({ m, exercicesFaits, scores }) {
  const exos = exercices.filter((e) => e.matiere === m.id);
  const quiz = qcms.filter((q) => q.matiere === m.id);
  const ligne = (fait, to, titre, etat) => (
    <li key={to}>
      <Link
        to={to}
        className={cx("group flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition-colors hover:bg-white dark:hover:bg-white/10", ENCRE)}
      >
        <span className={cx("grid size-5 shrink-0 place-items-center rounded-full", fait ? "bg-[#6b45e8] text-white" : "border-2 border-dashed border-[#9a92ad]")}>
          {fait && <Icon name="check" className="size-3" />}
        </span>
        <span className="min-w-0 flex-1 font-bold">{titre}</span>
        <span className={cx("text-xs", DOUX)}>{etat}</span>
        <Icon name="arrow" className={cx("size-3.5 transition-transform group-hover:translate-x-1", DOUX)} />
      </Link>
    </li>
  );
  return (
    <div className="apparition mb-4 grid gap-4 rounded-2xl bg-[#f4eef7] p-3 sm:grid-cols-2 dark:bg-white/5">
      {exos.length > 0 && (
        <div>
          <p className={cx("px-3 pt-1 text-[11px] font-extrabold tracking-wide uppercase", DOUX)}>Exercices</p>
          <ul className="mt-1">{exos.map((e) => ligne(Boolean(exercicesFaits[e.id]), `/exercices/${e.id}`, e.titre, exercicesFaits[e.id] ? "travaillé" : "à faire"))}</ul>
        </div>
      )}
      {quiz.length > 0 && (
        <div>
          <p className={cx("px-3 pt-1 text-[11px] font-extrabold tracking-wide uppercase", DOUX)}>QCM</p>
          <ul className="mt-1">
            {quiz.map((q) => ligne(Boolean(scores[q.id]), `/qcm/${q.id}`, q.titre, scores[q.id] ? `${pourcent(scores[q.id].score, scores[q.id].total)} %` : "à tenter"))}
          </ul>
        </div>
      )}
    </div>
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

  const t = useAvance();
  const faitsTotal = bilan.exosFaits + bilan.qcmFaits;
  const totalContenus = bilan.exosTotal + bilan.qcmTotal;
  const reste = Math.max(totalContenus - faitsTotal, 0);

  // Les deux curseurs de la page : « et si j'en faisais encore… » (un
  // point « Objectif » apparaît sur le sentier) et l'objectif de précision.
  const [encore, setEncore] = useState(0);
  const enPlus = Math.min(encore, reste);
  const projete = enPlus > 0 && totalContenus ? (faitsTotal + enPlus) / totalContenus : null;
  const [objectif, setObjectif] = useState(80);
  // La matière dépliée dans « Progression par matière ».
  const [deplie, setDeplie] = useState(null);

  // Le ciel suit la souris : la position, de -1 à 1, va dans --px / --py.
  const suivre = (e) => {
    const b = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty("--px", ((e.clientX - b.left) / b.width - 0.5) * 2);
    e.currentTarget.style.setProperty("--py", ((e.clientY - b.top) / b.height - 0.5) * 2);
  };
  const lacher = (e) => {
    e.currentTarget.style.setProperty("--px", 0);
    e.currentTarget.style.setProperty("--py", 0);
  };

  return (
    <div className="bg-[#22183d] pb-16">
      {/* ---------------------------------------------------------- */}
      {/* Le ciel                                                     */}
      {/* ---------------------------------------------------------- */}
      <header
        onPointerMove={suivre}
        onPointerLeave={lacher}
        className="relative overflow-hidden bg-[linear-gradient(180deg,#2a1f55_0%,#5d3392_55%,#e8579c_100%)] px-4 pt-10 pb-56 text-white sm:px-8 sm:pb-64"
      >
        <Paysage ratio={totalContenus ? faitsTotal / totalContenus : 0} faits={faitsTotal} total={totalContenus} projete={projete} />
        <div className="relative mx-auto max-w-6xl">
          <p className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-3 py-1 text-xs font-bold backdrop-blur-sm">
            <Icon name="target" className="size-3.5" />
            Ce que tu as parcouru sur la plateforme
          </p>
          <h1 className="mt-5 text-6xl font-extrabold tracking-[-0.05em] sm:text-7xl">Ma progression</h1>
          <p className="mt-3 text-lg text-white/90">Où tu en es, où ça coince, et depuis quand tu travailles.</p>

          {rienFait && (
            <section className="mt-8 max-w-xl rounded-[24px] bg-white p-6 text-[#22183d]">
              <h2 className="text-2xl font-extrabold tracking-tight">Ta progression est encore vide.</h2>
              <p className="mt-2 text-sm/6 text-[#4a4163]">
                Ouvre la correction d'un exercice ou termine un QCM : les cartes ci-dessous se remplissent toutes seules.
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <Link to="/exercices" className={cx("inline-flex min-h-11 items-center rounded-full px-5 font-extrabold text-white", "bg-[#5434c9] hover:bg-[#4528ad]")}>
                  Travailler un exercice
                </Link>
                <Link to="/qcm" className="inline-flex min-h-11 items-center rounded-full border border-[#22183d]/20 px-5 font-extrabold hover:bg-[#fbf7f5]">
                  Faire un QCM
                </Link>
              </div>
            </section>
          )}

          <dl className="mt-8 grid max-w-2xl grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              [bilan.exosFaits, `/ ${bilan.exosTotal}`, "exercices travaillés", `Encore ${bilan.exosTotal - bilan.exosFaits} à ouvrir`],
              [bilan.qcmFaits, `/ ${bilan.qcmTotal}`, "QCM tentés", `Encore ${bilan.qcmTotal - bilan.qcmFaits} à tenter`],
              [bilan.points, "pts", "points cumulés", `${POINTS_PAR_BONNE_REPONSE} points par bonne réponse`],
              [bilan.tentatives, "", `tentative${bilan.tentatives > 1 ? "s" : ""} de QCM`, "Chaque essai compte, seul le meilleur score reste"],
            ].map(([v, u, l, aide]) => (
              <div
                key={l}
                tabIndex={0}
                className="group/b relative cursor-default rounded-[20px] border border-white/20 bg-white/10 p-4 backdrop-blur-md transition-[transform,background-color] duration-200 outline-none hover:z-10 hover:-translate-y-1 hover:bg-white/20 focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-white"
              >
                <Bulle>{aide}</Bulle>
                <dd className="text-3xl font-extrabold">
                  <Compte valeur={v} t={t} />
                  {u && <span className="ml-1 text-base font-bold text-white/80">{u}</span>}
                </dd>
                <dt className="mt-1 text-xs text-white/90">{l}</dt>
              </div>
            ))}
          </dl>

          {reste > 0 && (
            <div className="mt-4 max-w-2xl rounded-[20px] border border-white/20 bg-white/10 p-4 backdrop-blur-md">
              <label htmlFor="curseur-encore" className="flex flex-wrap items-baseline justify-between gap-2 text-sm font-bold">
                <span>Et si j&apos;en faisais encore… ?</span>
                <output htmlFor="curseur-encore" className="text-white/90">
                  {enPlus === 0
                    ? "Fais glisser le curseur"
                    : `+${enPlus} exercice${enPlus > 1 ? "s" : ""} ou QCM : tu serais à ${Math.round(projete * 100)} % du chemin`}
                </output>
              </label>
              <input
                id="curseur-encore"
                type="range"
                min={0}
                max={reste}
                step={1}
                value={enPlus}
                onChange={(e) => setEncore(Number(e.target.value))}
                className="mt-3 w-full cursor-grab accent-[#ffd2a3] active:cursor-grabbing"
              />
            </div>
          )}
        </div>
      </header>

      <div className="relative mx-auto -mt-16 max-w-6xl space-y-5 px-4 sm:px-8">
        {/* ---- Régularité et précision ---- */}
        <div className="grid gap-5 lg:grid-cols-[1.6fr_1fr]">
          <section className={cx(CARTE, "apparition")} style={{ animationDelay: "90ms" }}>
            <TitreCarte icone="clock" ton="bg-[#ffe6ef] text-[#b52a5e]" titre="Régularité" texte={`Tes ${JOURS_SUIVIS} derniers jours.`}>
              <p className={cx("self-end text-sm font-bold", ENCRE)}>
                {activite.total} jour{activite.total > 1 ? "s" : ""} actif{activite.total > 1 ? "s" : ""}
              </p>
            </TitreCarte>
            <ol className="mt-6 grid grid-cols-7 gap-1.5 sm:grid-cols-14">
              {activite.jours.map((j, n) => (
                <li key={j.cle} tabIndex={0} className="group relative flex flex-col items-center rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-[#e8579c]">
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute -top-11 left-1/2 z-10 -translate-x-1/2 scale-90 rounded-xl bg-[#22183d] px-2.5 py-1.5 text-[11px] font-bold whitespace-nowrap text-white opacity-0 shadow-lg transition-[opacity,transform] group-hover:scale-100 group-hover:opacity-100 group-focus-visible:scale-100 group-focus-visible:opacity-100"
                  >
                    {j.date.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })} · {j.actif ? "actif" : "rien"}
                  </span>
                  <span className="flex h-20 w-full items-end">
                    <span
                      className={cx(
                        "barre-monte block w-full rounded-xl transition-[filter,transform] group-hover:brightness-110 group-hover:scale-x-110",
                        j.actif ? "h-full bg-gradient-to-b from-[#ff8fb3] to-[#9b6bff]" : "h-6 bg-[#f1edf5] dark:bg-white/10",
                        n === activite.jours.length - 1 && "ring-2 ring-[#22183d] ring-offset-2 dark:ring-white"
                      )}
                      style={{ animationDelay: `${300 + n * 50}ms` }}
                    />
                  </span>
                  <span className={cx("mt-2 text-[11px] font-bold", ENCRE)} aria-hidden="true">{JOURS_COURTS[j.date.getDay()]}</span>
                  <span className={cx("text-[11px]", DOUX)} aria-hidden="true">{j.date.getDate()}</span>
                  <span className="sr-only">{j.actif ? "actif" : "sans activité"}</span>
                </li>
              ))}
            </ol>
            <p className={cx("mt-4 text-xs", DOUX)}>Une case s'allume dès qu'un exercice ou un QCM a été travaillé ce jour-là.</p>
          </section>

          <section className={cx(CARTE, "apparition")} style={{ animationDelay: "180ms" }}>
            <TitreCarte icone="target" titre="Précision" texte="Moyenne de tes meilleurs scores." />
            <div className="relative mx-auto mt-4 w-full max-w-60">
              <Jauge valeur={bilan.moyenne} t={t} objectif={bilan.moyenne === null ? null : objectif} />
              <span className={cx("absolute inset-x-0 bottom-1 text-center text-3xl font-extrabold", ENCRE)}>
                {bilan.moyenne === null ? "—" : <><Compte valeur={bilan.moyenne} t={t} /> %</>}
              </span>
            </div>
            <p className="mt-4 rounded-2xl bg-[#fff1e6] px-4 py-2.5 text-center text-sm font-bold text-[#9a3b12]">
              {bilan.moyenne === null
                ? "Aucun QCM terminé pour l'instant."
                : bilan.moyenne >= SEUIL_REUSSITE
                  ? "Au-dessus du seuil de réussite."
                  : `Le seuil de réussite est à ${SEUIL_REUSSITE} %.`}
            </p>
            {bilan.moyenne !== null && (
              <div className="mt-4">
                <label htmlFor="curseur-objectif" className={cx("flex justify-between text-sm font-bold", ENCRE)}>
                  Mon objectif
                  <output htmlFor="curseur-objectif">{objectif} %</output>
                </label>
                <input
                  id="curseur-objectif"
                  type="range"
                  min={50}
                  max={100}
                  step={5}
                  value={objectif}
                  onChange={(e) => setObjectif(Number(e.target.value))}
                  className="mt-2 w-full cursor-grab accent-[#e8579c] active:cursor-grabbing"
                />
                <p className={cx("mt-1 text-xs", DOUX)}>
                  {bilan.moyenne >= objectif
                    ? "Objectif atteint : bravo !"
                    : `Encore ${objectif - bilan.moyenne} point${objectif - bilan.moyenne > 1 ? "s" : ""} de moyenne à gagner.`}
                </p>
              </div>
            )}
          </section>
        </div>

        {/* ---- Progression par matière ---- */}
        <section className={cx(CARTE, "apparition")} style={{ animationDelay: "270ms" }}>
          <TitreCarte icone="layers" titre="Progression par matière" texte="Exercices et QCM ouverts, sur ceux disponibles." />
          <ul className="mt-5 divide-y divide-[#f1edf5] dark:divide-white/10">
            {parMatiere.map((l, n) => (
              <li key={l.m.id} className="-mx-3 rounded-2xl px-3 transition-colors hover:bg-[#fbf7f5] dark:hover:bg-white/5">
                <div className="grid grid-cols-[2.5rem_1fr_auto_2.25rem] items-center gap-x-4 gap-y-2 py-3.5 sm:grid-cols-[2.5rem_14rem_1fr_4.5rem_2.25rem]">
                <span className="grid size-10 place-items-center rounded-2xl bg-[#efe9ff] text-[#5434c9]">
                  <Icon name={l.m.icone ?? "book"} className="size-4" />
                </span>
                <span className="min-w-0">
                  <Link to={`/cours/${l.m.id}`} className={cx("block text-sm font-extrabold hover:underline", ENCRE)}>
                    {l.m.nom}
                  </Link>
                  <span className={cx("block text-xs", DOUX)}>
                    {[l.exos > 0 && `Exercices ${l.exosFaits}/${l.exos}`, l.quiz > 0 && `QCM ${l.quizFaits}/${l.quiz}`].filter(Boolean).join(" · ")}
                  </span>
                </span>
                <span className="col-span-4 max-sm:order-last sm:col-span-1">
                  <Barre
                    valeur={l.taux}
                    etiquette={`Progression en ${l.m.nom}`}
                    delai={400 + n * 90}
                    bulle={l.faits === l.total ? "Tout est fait !" : `Encore ${l.total - l.faits} à faire`}
                  />
                </span>
                <span className="text-right">
                  <span className={cx("block text-lg font-extrabold", ENCRE)}>{l.taux} %</span>
                  <span className={cx("block text-[11px]", DOUX)}>{l.faits} sur {l.total}</span>
                </span>
                <button
                  type="button"
                  onClick={() => setDeplie(deplie === l.m.id ? null : l.m.id)}
                  aria-expanded={deplie === l.m.id}
                  aria-label={`${deplie === l.m.id ? "Masquer" : "Voir"} le détail : ${l.m.nom}`}
                  className="grid size-9 place-items-center rounded-full bg-[#efe9ff] text-[#5434c9] transition-transform hover:scale-110"
                >
                  <Icon name="chevron" className={cx("size-4 transition-transform", deplie === l.m.id && "rotate-180")} />
                </button>
                </div>
                {deplie === l.m.id && <DetailMatiere m={l.m} exercicesFaits={exercicesFaits} scores={scores} />}
              </li>
            ))}
          </ul>
        </section>

        {/* ---- Résultats et forces ---- */}
        <div className="grid items-start gap-5 lg:grid-cols-2">
          <section className={cx(CARTE, "apparition")} style={{ animationDelay: "360ms" }}>
            <TitreCarte icone="graduation" ton="bg-[#ffe6ef] text-[#b52a5e]" titre="Résultats des QCM" texte="Seul le meilleur score de chaque questionnaire est gardé." />
            {resultatsQcm.length === 0 ? (
              <p className={cx("mt-5 text-sm", DOUX)}>
                Aucun questionnaire terminé pour l'instant.{" "}
                <Link to="/qcm" className="font-bold text-[#5434c9] underline dark:text-[#b9a4ff]">
                  En commencer un
                </Link>
                .
              </p>
            ) : (
              <ul className="mt-5 space-y-3">
                {resultatsQcm.map((r) => {
                  const ok = r.taux >= SEUIL_REUSSITE;
                  return (
                    <li key={r.q.id} className="flex items-center gap-4 rounded-[20px] bg-[#fbf7f5] p-3 transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-md dark:bg-white/5">
                      <span className={cx("grid size-14 shrink-0 place-content-center rounded-2xl text-center text-white", ok ? "bg-gradient-to-br from-[#6b45e8] to-[#9b6bff]" : "bg-gradient-to-br from-[#e8579c] to-[#ffb38c]")}>
                        <span className="text-base font-extrabold">{r.taux}%</span>
                        <span className="text-[10px]">{r.score}/{r.total}</span>
                      </span>
                      <span className="min-w-0 flex-1">
                        <Link to={`/qcm/${r.q.id}`} className={cx("block truncate text-sm font-extrabold hover:underline", ENCRE)}>
                          {r.q.titre}
                        </Link>
                        <span className={cx("block truncate text-xs", DOUX)}>
                          {getMatiere(r.q.matiere)?.nom} · {r.tentatives ?? 1} tentative{(r.tentatives ?? 1) > 1 ? "s" : ""} · {dateLisible(r.date) ?? "—"}
                        </span>
                        <span className="mt-2 block">
                          <Barre
                            valeur={r.taux}
                            repere={SEUIL_REUSSITE}
                            etiquette={`Score sur ${r.q.titre}`}
                            bulle={ok ? `Réussi : ${r.taux} % (seuil ${SEUIL_REUSSITE} %)` : `Encore ${SEUIL_REUSSITE - r.taux} points pour le seuil`}
                            classe={ok ? "bg-gradient-to-r from-[#6b45e8] to-[#9b6bff]" : "bg-gradient-to-r from-[#e8579c] to-[#ffb38c]"}
                          />
                        </span>
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section className={cx(CARTE, "apparition")} style={{ animationDelay: "450ms" }}>
            <TitreCarte icone="target" ton="bg-[#fff1d6] text-[#7a4b00]" titre="Forces et faiblesses" texte={`Par matière, dès ${MINIMUM_REPONSES} réponses de QCM enregistrées.`} />
            {evaluees === 0 ? (
              <div className="mt-5 space-y-3">
                <p className={cx("text-sm/6", DOUX)}>
                  Aucune matière n'a encore assez de réponses pour être jugée. Il en faut au moins {MINIMUM_REPONSES} par matière, et tu en as enregistré {totalReponses} au total.
                </p>
                <p className={cx("text-sm/6", DOUX)}>Termine d'autres QCM : chaque réponse compte dans la matière du QCM.</p>
                <Link to="/qcm" className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[#5434c9] px-5 font-extrabold text-white hover:bg-[#4528ad]">
                  <Icon name="target" className="size-4" />
                  Faire un QCM
                </Link>
              </div>
            ) : (
              <>
                <ul className="mt-5 space-y-5">
                  {[...mesForces, ...mesFaiblesses].map((c) => {
                    const t = TONS[c.niveau];
                    return (
                      <li key={c.id}>
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="flex items-center gap-2">
                            <span className={cx("text-sm font-extrabold", ENCRE)}>{c.nom}</span>
                            <span className={cx("rounded-full px-2 py-0.5 text-[11px] font-bold", t.puce)}>{niveaux[c.niveau].label}</span>
                          </span>
                          <span className={cx("text-xs", DOUX)}>{c.justes}/{c.total} · {c.taux} %</span>
                        </div>
                        <div
                          className="relative mt-2 flex h-2.5 overflow-hidden rounded-full"
                          role="img"
                          aria-label={`Niveau en ${c.nom} : ${c.taux} %`}
                        >
                          <span className="bg-[#ffe6ef]" style={{ width: `${SEUIL_FAIBLESSE}%` }} />
                          <span className="bg-[#fff1d6]" style={{ width: `${SEUIL_FORCE - SEUIL_FAIBLESSE}%` }} />
                          <span className="flex-1 bg-[#efe9ff]" />
                        </div>
                        <span className="relative -mt-3.5 block h-4">
                          <span
                            tabIndex={0}
                            className={cx("group/b absolute size-4 -translate-x-1/2 cursor-default rounded-full border-2 border-white shadow outline-none transition-transform hover:scale-150 focus-visible:scale-150", t.point)}
                            style={{ left: `${c.taux}%` }}
                          >
                            <Bulle>
                              {c.justes} bonne{c.justes > 1 ? "s" : ""} réponse{c.justes > 1 ? "s" : ""} sur {c.total}
                            </Bulle>
                          </span>
                        </span>
                      </li>
                    );
                  })}
                </ul>
                <p className={cx("mt-4 flex justify-between text-[11px]", DOUX)} aria-hidden="true">
                  <span>Faiblesse</span>
                  <span>À consolider dès {SEUIL_FAIBLESSE} %</span>
                  <span>Force dès {SEUIL_FORCE} %</span>
                </p>
                {enAttente.length > 0 && (
                  <p className={cx("mt-4 border-t border-[#f1edf5] pt-4 text-xs dark:border-white/10", DOUX)}>
                    {enAttente.length} matière{enAttente.length > 1 ? "s" : ""} n'{enAttente.length > 1 ? "ont" : "a"} pas encore assez de réponses pour être jugée{enAttente.length > 1 ? "s" : ""}.
                  </p>
                )}
              </>
            )}
          </section>
        </div>

        {/* ---- Chapitres à revoir et priorités ---- */}
        <div className="grid items-start gap-5 lg:grid-cols-[1.6fr_1fr]">
          <section className={cx(CARTE, "apparition")} style={{ animationDelay: "540ms" }}>
            <TitreCarte icone="book" ton="bg-[#ffe6ef] text-[#b52a5e]" titre="Chapitres à revoir" texte="Dans tes matières fragiles, de la plus faible à la moins faible." />
            {modules.length === 0 ? (
              <p className={cx("mt-5 text-sm/6", DOUX)}>
                {evaluees === 0
                  ? "Cette liste se remplira dès que des matières auront été évaluées."
                  : "Aucune matière évaluée n'est sous le seuil. Rien à reprendre pour l'instant."}
              </p>
            ) : (
              parMatiereARevoir.map((g) => (
                <div key={g.matiere} className="mt-5">
                  <p className="flex justify-between">
                    <span className="rounded-full bg-[#ffe6ef] px-2.5 py-0.5 text-[11px] font-extrabold tracking-wide text-[#b52a5e] uppercase">{g.nom}</span>
                    <span className="rounded-full bg-[#ffe6ef] px-2.5 py-0.5 text-[11px] font-extrabold text-[#b52a5e]">{g.taux} %</span>
                  </p>
                  <ul className="mt-2 space-y-2">
                    {g.chapitres.map((m) => (
                      <li key={m.cle}>
                        <Link to={`/cours/${m.matiere}`} className={cx("group flex items-center gap-3 rounded-2xl bg-[#fbf7f5] px-4 py-3 text-sm font-bold transition-[background-color,transform] hover:translate-x-1 hover:bg-[#f4eef7] dark:bg-white/5 dark:hover:bg-white/10", ENCRE)}>
                          <span className="min-w-0 flex-1">{m.chapitre}</span>
                          <span className={cx("rounded-full px-2 py-0.5 text-[11px] font-bold", m.dejaLu ? "bg-[#efe9ff] text-[#5434c9]" : "bg-white text-[#4a4163] dark:bg-white/10 dark:text-ink-200")}>
                            {m.dejaLu ? "à relire" : "pas encore lu"}
                          </span>
                          <Icon name="arrow" className={cx("size-4 transition-transform group-hover:translate-x-1", DOUX)} />
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))
            )}
          </section>

          {aReprendre.length > 0 && (
            <section className="rounded-[28px] bg-[linear-gradient(160deg,#5d3392,#e8579c_70%,#ffb38c)] p-6 text-white sm:p-7">
              <span className="grid size-10 place-items-center rounded-2xl bg-white/15">
                <Icon name="bulb" className="size-4.5" />
              </span>
              <h2 className="mt-4 text-2xl font-extrabold tracking-tight">À reprendre en priorité</h2>
              <p className="mt-1 text-sm">Sous le seuil de {SEUIL_REUSSITE} %. Relis le chapitre avant de refaire.</p>
              <ul className="mt-5 space-y-2.5">
                {aReprendre.map((r) => (
                  <li key={r.q.id}>
                    <Link to={`/cours/${r.q.matiere}`} className="flex items-center gap-3 rounded-2xl bg-white/15 p-2 transition-[background-color,transform] hover:scale-[1.02] hover:bg-white/25">
                      <span className="min-w-0 flex-1 rounded-xl bg-white px-3 py-2 text-sm font-extrabold text-[#b52a5e]">{r.q.titre}</span>
                      <span className="shrink-0 rounded-full bg-white px-3 py-1 text-xs font-extrabold text-[#b52a5e]">{r.taux} %</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        {/* ---- Données ---- */}
        <section className={cx(CARTE, "flex flex-wrap items-center justify-between gap-5")}>
          <TitreCarte icone="lock" titre="Mes données de progression" texte="Conservées dans ce navigateur, et nulle part ailleurs." />
          <div className="flex flex-wrap items-center gap-3">
            {confirmation ? (
              <>
                <p className={cx("text-sm font-bold", ENCRE)}>Effacer toute ta progression ? C'est définitif.</p>
                <button type="button" onClick={remettreAZero} className="min-h-11 rounded-full bg-[#b52a5e] px-5 font-extrabold text-white hover:bg-[#9a2350]">
                  Oui, tout effacer
                </button>
                <button type="button" onClick={() => setConfirmation(false)} className={cx("min-h-11 rounded-full border border-[#22183d]/20 px-5 font-extrabold dark:border-white/30", ENCRE)}>
                  Annuler
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setConfirmation(true)}
                  disabled={rienFait}
                  className={cx("min-h-11 rounded-full border border-[#22183d]/20 px-5 font-extrabold hover:bg-[#fbf7f5] disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/30 dark:hover:bg-white/10", ENCRE)}
                >
                  Réinitialiser ma progression
                </button>
                <Link to="/parametres" className="px-2 font-extrabold text-[#5434c9] hover:underline dark:text-[#b9a4ff]">
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
