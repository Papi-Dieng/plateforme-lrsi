import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import Icon from "../components/Icon";
import { Bouton, Container, EtatVide } from "../components/ui";
import { cx } from "../components/classes";
import { mono } from "../components/styleAdmin";
import { getQcm, qcms } from "../data/qcm";
import { getMatiere, matieres, nomMatiere } from "../data/matieres";
import { themeMatiere } from "../data/couleurs";
import BoutonFavori from "../components/BoutonFavori";
import PartageResultat from "../components/PartageResultat";
import { dureeLisible, enregistrerScore, lireScores } from "../progression";
import { envoyerStats } from "../stats";
import { noterTentative } from "../revisions";
import { ID_EXAMEN_BLANC, MAX_QUESTIONS, MIN_QUESTIONS, composerExamenBlanc, lireReglages, questionsDisponibles } from "../examenBlanc";

/* ==================================================================
   Les QCM : la liste, le questionnaire en cours, le résultat.

   D'après la maquette « QCM interactifs » (7 octobre 2026) : un en-tête
   prune quadrillé, le très grand titre « QCM interactifs. », une
   question d'exemple en carte ; la liste en lignes numérotées ; pendant
   le QCM, le minuteur en anneau, la question en grand, les réponses en
   lignes, et à droite la grille des questions ; à la fin, une grande
   carte prune avec le score, puis la correction question par question.
   ================================================================== */

const POINTS_PAR_QUESTION = 10;
const SEUIL_REUSSITE = 70; // en pourcentage

// Le prune des en-têtes et de la carte de résultat, et son quadrillage.
const PRUNE = "bg-[#271627] text-white";
const QUADRILLAGE = {
  backgroundImage:
    "linear-gradient(rgb(255 255 255/0.04) 1px,transparent 1px),linear-gradient(90deg,rgb(255 255 255/0.04) 1px,transparent 1px)",
  backgroundSize: "56px 56px",
};
const TEXTE_PRUNE = "text-[#cbb8cd]";

const numero = (n) => String(n).padStart(2, "0");

function FilDAriane({ elements }) {
  return (
    <nav aria-label="Fil d'Ariane" className={cx("flex flex-wrap gap-2 text-xs", TEXTE_PRUNE, mono)}>
      {elements.map((e, i) => (
        <span key={e.label} className="contents">
          {i > 0 && <span aria-hidden="true">/</span>}
          {e.to ? (
            <Link to={e.to} className="hover:text-white">
              {e.label.toUpperCase()}
            </Link>
          ) : i === elements.length - 1 ? (
            <b className="font-medium text-lime-400" aria-current="page">
              {e.label.toUpperCase()}
            </b>
          ) : (
            <span>{e.label.toUpperCase()}</span>
          )}
        </span>
      ))}
    </nav>
  );
}

const defiler = (id) => (e) => {
  // Les adresses du site sont à dièse : on fait défiler au lieu de changer d'adresse.
  e.preventDefault();
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
};

/* ================================================================== */
/* Liste des QCM                                                       */
/* ================================================================== */

/* La question d'exemple de l'en-tête : décorative, deux cartes en
   éventail derrière elle. */
function CarteExemple() {
  const [premier, deuxieme, troisieme] = qcms;
  const q = premier?.questions[0];
  if (!q) return null;
  return (
    <div aria-hidden="true" className="relative hidden w-full max-w-[470px] pt-16 select-none md:block">
      {troisieme && (
        <div className="absolute top-0 right-0 left-10 h-40 rotate-[4deg] rounded-[26px] bg-lime-400 px-6 pt-5 text-ink-950">
          <p className={cx("text-[11px]", mono)}>QCM 03 · {troisieme.questions.length} QUESTIONS</p>
        </div>
      )}
      {deuxieme && (
        <div className="absolute top-6 right-6 left-0 h-40 -rotate-[3deg] rounded-[26px] bg-[#3a2340] px-6 pt-5">
          <p className={cx("text-[11px] text-[#cbb8cd]", mono)}>QCM 02 · {deuxieme.questions.length} QUESTIONS</p>
          <p className="mt-2 line-clamp-1 text-[22px] font-extrabold tracking-tight">{deuxieme.titre}</p>
        </div>
      )}
      <div className="relative rounded-[26px] bg-white p-6 text-ink-950 shadow-[0_40px_80px_-30px_rgb(0_0_0/0.6)]">
        <div className="flex items-center justify-between">
          <span className={cx("text-[11px] text-ink-500", mono)}>QUESTION 1 SUR {premier.questions.length}</span>
          <span className={cx("inline-flex items-center gap-1.5 rounded-full bg-ink-100 px-2.5 py-1 text-xs", mono)}>
            <Icon name="clock" className="size-3.5" />
            06:42
          </span>
        </div>
        <div className="mt-4 flex gap-1.5">
          {premier.questions.map((_, i) => (
            <i key={i} className={cx("h-1 flex-1 rounded-full", i === 0 ? "bg-ink-950" : "bg-ink-200")} />
          ))}
        </div>
        <p className="mt-5 text-[22px] leading-tight font-extrabold tracking-tight">{q.enonce}</p>
        <ul className="mt-4 space-y-2">
          {q.options.slice(0, 4).map((o, i) => (
            <li
              key={i}
              className={cx(
                "flex items-center gap-3 rounded-[14px] border px-4 py-2.5 text-[15px] font-bold",
                i === q.bonne ? "border-ink-950 bg-ink-950 text-white" : "border-ink-200"
              )}
            >
              <span className={cx("text-xs font-medium", mono, i === q.bonne ? "text-lime-400" : "text-ink-500")}>
                {String.fromCharCode(65 + i)}.
              </span>
              <span className="flex-1 truncate">{o}</span>
              <span className={cx("size-4.5 rounded-full border-2", i === q.bonne ? "border-lime-400 bg-[radial-gradient(circle,var(--color-lime-400)_40%,transparent_45%)]" : "border-ink-300")} />
            </li>
          ))}
        </ul>
        <div className="mt-4 flex items-center justify-between text-sm font-semibold text-ink-600">
          {premier.titre}
          <span className="inline-flex items-center gap-1.5 rounded-xl bg-lime-400 px-3.5 py-2 font-extrabold text-ink-950">
            Suivant
            <Icon name="arrow" className="size-4" />
          </span>
        </div>
      </div>
    </div>
  );
}

const ETAPES = [
  ["Réponds à ton rythme", "Un minuteur, comme le jour de l'examen."],
  ["Reviens en arrière", "Marque une question à revoir, change d'avis."],
  ["La correction à la fin", "Chaque réponse expliquée, question par question."],
];

export function QcmListe() {
  const [matiere, setMatiere] = useState("toutes");
  const [scores] = useState(lireScores);

  const matieresAvecQcm = matieres.filter((m) => qcms.some((q) => q.matiere === m.id));
  const resultats = qcms.filter((q) => matiere === "toutes" || q.matiere === matiere);
  const nbFaits = Object.keys(scores).filter((id) => qcms.some((q) => q.id === id)).length;
  const nbQuestions = qcms.reduce((n, q) => n + q.questions.length, 0);

  const pastille = (actif) =>
    cx(
      "inline-flex min-h-10 items-center gap-2 rounded-full border px-4 text-sm font-bold transition-colors",
      actif
        ? "border-[#271627] bg-[#271627] text-white dark:border-white dark:bg-white dark:text-ink-950"
        : "border-ink-200 bg-white text-ink-950 hover:border-ink-400 dark:border-ink-700 dark:bg-ink-900 dark:text-white"
    );

  return (
    <>
      <header className={cx(PRUNE, "overflow-hidden")} style={QUADRILLAGE}>
        <Container className="pt-10 pb-16 sm:pt-12 sm:pb-20">
          <FilDAriane elements={[{ label: "Accueil", to: "/tableau-de-bord" }, { label: "Se tester" }, { label: "QCM interactifs" }]} />
          <div className="mt-6 flex flex-wrap items-center justify-between gap-x-14 gap-y-10">
            <div className="min-w-0 flex-[1_1_min(520px,100%)]">
              <h1>
                <span className="-ml-1 block text-[clamp(6rem,15vw,13.5rem)] leading-[0.8] font-extrabold tracking-[-0.07em]">QCM</span>
                <span className="mt-3 block text-[clamp(2.5rem,4.8vw,4.25rem)] leading-none font-extrabold tracking-[-0.045em] text-lime-400">
                  interactifs.
                </span>
              </h1>
              <p className={cx("mt-6 max-w-[540px] text-lg/8 sm:text-[19px]/8", TEXTE_PRUNE)}>
                Chaque questionnaire se déroule comme un examen : tu réponds à ton rythme, tu peux revenir en arrière et marquer
                une question à revoir. La correction complète arrive à la fin.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <a
                  href="#questionnaires"
                  onClick={defiler("questionnaires")}
                  className="inline-flex min-h-13 items-center gap-2.5 rounded-[14px] bg-lime-400 px-5.5 text-[15.5px] font-extrabold text-[#1a0f1c] transition-colors hover:bg-lime-300"
                >
                  Choisir un QCM
                  <Icon name="arrow" className="size-4" />
                </a>
                <a
                  href="#comment-ca-marche"
                  onClick={defiler("comment-ca-marche")}
                  className="inline-flex min-h-13 items-center rounded-[14px] border border-white/20 px-5 text-[15px] font-bold transition-colors hover:bg-white/10"
                >
                  Comment ça marche
                </a>
              </div>
              <dl className="mt-9 grid max-w-[560px] grid-cols-3 gap-4 border-t border-white/12 pt-6">
                {[
                  [qcms.length, `questionnaire${qcms.length > 1 ? "s" : ""}`],
                  [nbQuestions, "questions"],
                  [`${SEUIL_REUSSITE} %`, "pour réussir"],
                ].map(([n, libelle]) => (
                  <div key={libelle} className="flex flex-col-reverse">
                    <dt className={cx("text-sm", TEXTE_PRUNE)}>{libelle}</dt>
                    <dd className="m-0 text-[36px] leading-none font-extrabold tracking-[-0.04em]">{n}</dd>
                  </div>
                ))}
              </dl>
            </div>
            <CarteExemple />
          </div>
        </Container>
      </header>

      <Container className="py-14">
        <ReglageExamenBlanc matieresAvecQcm={matieresAvecQcm} />

        <div id="questionnaires" className="flex scroll-mt-24 flex-wrap items-end justify-between gap-4">
          <h2 className="text-[clamp(2.2rem,4.5vw,3.4rem)] leading-none font-extrabold tracking-[-0.045em] text-ink-950 dark:text-white">
            Choisis ton questionnaire
          </h2>
          {nbFaits > 0 && (
            <p className="text-[15px] text-ink-600 dark:text-ink-300">
              {nbFaits} QCM déjà tenté{nbFaits > 1 ? "s" : ""} sur cet appareil.
            </p>
          )}
        </div>

        <div className="mt-6 flex flex-wrap gap-2" role="group" aria-label="Filtrer par matière">
          <button type="button" onClick={() => setMatiere("toutes")} aria-pressed={matiere === "toutes"} className={pastille(matiere === "toutes")}>
            Toutes les matières
            <span className="font-mono text-[10.5px] font-medium opacity-70">{qcms.length}</span>
          </button>
          {matieresAvecQcm.map((m) => (
            <button key={m.id} type="button" onClick={() => setMatiere(m.id)} aria-pressed={matiere === m.id} className={pastille(matiere === m.id)}>
              <i aria-hidden="true" className={cx("size-2 rounded-full", themeMatiere(m).point)} />
              {m.nom}
              <span className="font-mono text-[10.5px] font-medium opacity-70">{qcms.filter((q) => q.matiere === m.id).length}</span>
            </button>
          ))}
        </div>

        {resultats.length === 0 ? (
          <div className="mt-8">
            <EtatVide titre="Aucun QCM pour cette matière" texte="D'autres questionnaires seront ajoutés au fil des versions.">
              <Bouton variante="secondaire" onClick={() => setMatiere("toutes")}>
                Voir tous les QCM
              </Bouton>
            </EtatVide>
          </div>
        ) : (
          <ol className="mt-6 space-y-3">
            {resultats.map((q) => {
              const meilleur = scores[q.id];
              const pourcentage = meilleur ? Math.round((meilleur.score / meilleur.total) * 100) : null;
              const rang = qcms.findIndex((x) => x.id === q.id) + 1;
              return (
                <li key={q.id}>
                  <Link
                    to={`/qcm/${q.id}`}
                    className="group flex flex-wrap items-center gap-x-8 gap-y-4 rounded-[26px] border border-ink-200 bg-white px-6 py-5 transition-colors hover:border-[#271627]/40 sm:px-7 dark:border-ink-800 dark:bg-ink-900 dark:hover:border-white/30"
                  >
                    <span aria-hidden="true" className="w-16 shrink-0 text-[52px] leading-none font-extrabold tracking-[-0.05em] text-[#271627] dark:text-white">
                      {numero(rang)}
                    </span>
                    <span className="min-w-0 flex-[1_1_260px]">
                      <span className="block text-[22px] leading-tight font-extrabold tracking-[-0.025em] text-ink-950 dark:text-white">{q.titre}</span>
                      <span className="mt-1 block text-[15px] text-ink-600 dark:text-ink-300">{q.description}</span>
                      {meilleur && (
                        <span className="mt-2.5 flex max-w-[280px] items-center gap-3">
                          <span className="font-mono text-xs font-bold text-ink-700 dark:text-ink-200">
                            record {meilleur.score}/{meilleur.total}
                          </span>
                          <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-ink-100 dark:bg-ink-800">
                            <span
                              className={cx("block h-full rounded-full", pourcentage >= SEUIL_REUSSITE ? "bg-[#271627] dark:bg-lime-400" : "bg-sun-500")}
                              style={{ width: `${pourcentage}%` }}
                            />
                          </span>
                        </span>
                      )}
                    </span>
                    <span className="flex flex-col items-start gap-1.5">
                      <span className="rounded-lg bg-ink-100 px-2.5 py-1 text-xs font-bold text-ink-800 dark:bg-ink-800 dark:text-ink-200">{nomMatiere(q.matiere)}</span>
                      <span className="rounded-lg bg-ink-100 px-2.5 py-1 text-xs font-bold text-ink-800 dark:bg-ink-800 dark:text-ink-200">{q.niveau}</span>
                    </span>
                    <span className="flex items-center gap-4 text-sm font-bold text-ink-700 dark:text-ink-200">
                      <span className="inline-flex items-center gap-1.5">
                        <Icon name="layers" className="size-4" />
                        {q.questions.length} questions
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <Icon name="clock" className="size-4" />
                        {q.duree}
                      </span>
                    </span>
                    <span className="ml-auto flex items-center gap-2">
                      <BoutonFavori type="qcm" reference={q.id} libelle={q.titre} variante="encadre" taille="lg" />
                      <span className="inline-flex min-h-11 items-center gap-2 rounded-[14px] bg-ink-950 px-5 text-sm font-extrabold text-white transition-colors group-hover:bg-[#271627] dark:bg-white dark:text-ink-950">
                        Commencer
                        <Icon name="arrow" className="size-4" />
                      </span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ol>
        )}

        <section id="comment-ca-marche" aria-label="Comment ça marche" className="mt-16 scroll-mt-24">
          <ol className="grid border-y border-ink-200 sm:grid-cols-3 dark:border-ink-800">
            {ETAPES.map(([titre, texte], i) => (
              <li key={titre} className="border-ink-200 py-8 sm:border-l sm:px-8 sm:first:border-l-0 sm:first:pl-0 dark:border-ink-800">
                <span
                  aria-hidden="true"
                  className="block text-[56px] leading-none font-extrabold tracking-[-0.05em] text-transparent [-webkit-text-stroke:1.5px_var(--color-ink-900)] dark:[-webkit-text-stroke-color:var(--color-ink-200)]"
                >
                  {numero(i + 1)}
                </span>
                <p className="mt-4 text-xl font-extrabold text-ink-950 dark:text-white">{titre}</p>
                <p className="mt-1.5 text-[15px] text-ink-600 dark:text-ink-300">{texte}</p>
              </li>
            ))}
          </ol>
          <p className="mt-5 text-sm text-ink-600 dark:text-ink-400">
            Seuil de réussite : {SEUIL_REUSSITE} %. Chaque bonne réponse vaut {POINTS_PAR_QUESTION} points.
          </p>
        </section>
      </Container>
    </>
  );
}

/* ================================================================== */
/* Outils de la session                                                */
/* ================================================================== */

// « 7 min » → 420 secondes. Sert de temps imparti pour le questionnaire.
function dureeEnSecondes(texte) {
  const minutes = parseInt(String(texte).replace(/\D/g, ""), 10);
  return Number.isFinite(minutes) && minutes > 0 ? minutes * 60 : 300;
}

const chrono = (s) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

/* ---- Anneau de progression réutilisable ---- */

function Anneau({ ratio, className, epaisseur = 4, couleur = "stroke-brand-600", fond = "stroke-ink-200 dark:stroke-ink-800" }) {
  const rayon = 24 - epaisseur / 2;
  const perimetre = 2 * Math.PI * rayon;
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
      <circle cx="24" cy="24" r={rayon} fill="none" strokeWidth={epaisseur} className={fond} />
      <circle
        cx="24"
        cy="24"
        r={rayon}
        fill="none"
        strokeWidth={epaisseur}
        strokeLinecap="round"
        strokeDasharray={perimetre}
        strokeDashoffset={perimetre * (1 - Math.min(Math.max(ratio, 0), 1))}
        transform="rotate(-90 24 24)"
        className={cx("transition-[stroke-dashoffset] duration-500", couleur)}
      />
    </svg>
  );
}

/* ---- Navigateur de questions ---- */

const legende = [
  { cle: "repondue", label: "Répondue", pastille: "bg-brand-600" },
  { cle: "courante", label: "En cours", pastille: "border-2 border-ink-950 dark:border-white" },
  { cle: "marquee", label: "À revoir", pastille: "bg-lime-400" },
  { cle: "vierge", label: "Sans réponse", pastille: "bg-ink-200 dark:bg-ink-700" },
];

function Navigateur({ questions, reponses, marquees, index, aller, onTerminer }) {
  const repondues = reponses.filter((r) => r !== null).length;
  const aRevoir = marquees.filter(Boolean).length;
  const restantes = questions.length - repondues;

  return (
    <aside className="h-fit rounded-[26px] border border-ink-200 bg-white p-6 xl:sticky xl:top-24 dark:border-ink-800 dark:bg-ink-900">
      <h2 className="text-[24px] font-extrabold tracking-tight text-ink-950 dark:text-white">Questions</h2>

      <ul className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2">
        {legende.map((l) => (
          <li key={l.cle} className="flex items-center gap-2 text-[13px] text-ink-600 dark:text-ink-300">
            <span className={cx("size-3 rounded-[4px]", l.pastille)} />
            {l.label}
          </li>
        ))}
      </ul>

      <ol className="mt-5 grid grid-cols-6 gap-2 sm:grid-cols-10 xl:grid-cols-5">
        {questions.map((_, i) => {
          const courante = i === index;
          const repondue = reponses[i] !== null;
          const marquee = marquees[i];
          return (
            <li key={i}>
              <button
                type="button"
                onClick={() => aller(i)}
                aria-current={courante ? "true" : undefined}
                aria-label={`Question ${i + 1}${repondue ? ", répondue" : ", sans réponse"}${marquee ? ", à revoir" : ""}`}
                className={cx(
                  "grid aspect-square w-full place-items-center rounded-[12px] text-sm font-extrabold transition-colors",
                  marquee
                    ? "bg-lime-400 text-ink-950 hover:bg-lime-300"
                    : repondue
                      ? "bg-brand-600 text-white hover:bg-brand-700"
                      : "bg-ink-100 text-ink-600 hover:bg-ink-200 dark:bg-ink-800 dark:text-ink-300 dark:hover:bg-ink-700",
                  courante && "ring-2 ring-ink-950 ring-offset-2 ring-offset-white dark:ring-white dark:ring-offset-ink-900"
                )}
              >
                {i + 1}
              </button>
            </li>
          );
        })}
      </ol>

      <dl className="mt-5 border-t border-ink-100 text-sm dark:border-ink-800">
        {[
          ["Répondues", `${repondues} / ${questions.length}`],
          ["À revoir", aRevoir],
          ["Sans réponse", restantes],
        ].map(([quoi, n]) => (
          <div key={quoi} className="flex justify-between border-b border-ink-100 py-3 dark:border-ink-800">
            <dt className="text-ink-600 dark:text-ink-300">{quoi}</dt>
            <dd className="m-0 font-mono font-bold text-ink-950 tabular-nums dark:text-white">{n}</dd>
          </div>
        ))}
      </dl>

      <button
        type="button"
        onClick={onTerminer}
        className="mt-5 min-h-12 w-full rounded-[14px] bg-ink-950 px-4 text-[15px] font-extrabold text-white transition-colors hover:bg-[#271627] dark:bg-white dark:text-ink-950 dark:hover:bg-ink-200"
      >
        Terminer le QCM
      </button>
    </aside>
  );
}

/* ================================================================== */
/* Session de QCM                                                      */
/* ================================================================== */

// Même route d'un questionnaire à l'autre : la clé fait repartir la
// session de zéro, au lieu de reprendre le suivant au milieu, avec les
// réponses du précédent.
export function QcmSession() {
  const { qcmId } = useParams();
  const [params] = useSearchParams();
  // Un nouveau tirage à chaque changement de réglages (adresse).
  if (qcmId === ID_EXAMEN_BLANC) return <ExamenBlanc key={params.toString()} params={params} />;
  return <SessionQcm key={qcmId} qcmId={qcmId} />;
}

/* L'examen blanc : tiré une fois à l'ouverture, puis passé comme un QCM. */
function ExamenBlanc({ params }) {
  const [qcm] = useState(() => composerExamenBlanc(qcms, lireReglages(params, matieres)));
  if (!qcm) {
    return (
      <Container className="py-20">
        <EtatVide titre="Pas de question pour ces matières" texte="Choisis d'autres matières pour composer ton examen blanc.">
          <Bouton to="/qcm#examen-blanc">Régler l'examen blanc</Bouton>
        </EtatVide>
      </Container>
    );
  }
  return <SessionQcm qcm={qcm} />;
}

/* Le réglage de l'examen blanc, sur la liste des QCM : les matières
   (toutes au départ), le nombre de questions, puis le départ. */
function ReglageExamenBlanc({ matieresAvecQcm }) {
  const naviguer = useNavigate();
  const [choisies, setChoisies] = useState([]);
  const dispo = questionsDisponibles(qcms, choisies).length;
  const max = Math.min(MAX_QUESTIONS, dispo);
  const [n, setN] = useState(20);
  const nombre = Math.min(Math.max(n, Math.min(MIN_QUESTIONS, max)), max);
  const basculer = (id) => setChoisies((c) => (c.includes(id) ? c.filter((x) => x !== id) : [...c, id]));
  const lancer = () => {
    const p = new URLSearchParams({ n: String(nombre) });
    if (choisies.length) p.set("m", choisies.join(","));
    naviguer(`/qcm/${ID_EXAMEN_BLANC}?${p}`);
  };
  if (dispo === 0 && choisies.length === 0) return null;

  const pastille = (actif) =>
    cx(
      "min-h-10 rounded-full border px-4 text-sm font-bold transition-colors",
      actif ? "border-lime-400 bg-lime-400 text-ink-950" : "border-white/25 hover:bg-white/10"
    );

  return (
    <section
      id="examen-blanc"
      aria-labelledby="titre-examen-blanc"
      className="mb-12 scroll-mt-24 overflow-hidden rounded-[28px] bg-[#271627] p-6 text-white sm:p-9"
      style={QUADRILLAGE}
    >
      <div className="flex flex-wrap items-start justify-between gap-6">
        <div className="max-w-xl">
          <p className={cx("text-xs font-medium text-lime-400", mono)}>S&apos;ENTRAÎNER AVANT L&apos;EXAMEN</p>
          <h2 id="titre-examen-blanc" className="mt-2 text-[clamp(1.8rem,3.5vw,2.6rem)] leading-none font-extrabold tracking-[-0.04em]">
            Examen blanc
          </h2>
          <p className="mt-3 text-[15px]/6 text-ink-200">
            Des questions tirées au hasard dans les QCM des matières choisies, chronométrées : une minute par question. Chaque tirage est différent.
          </p>
        </div>
        <span className="grid size-16 place-items-center rounded-[18px] bg-lime-400 text-ink-950">
          <Icon name="clock" className="size-7" />
        </span>
      </div>

      <div role="group" aria-label="Matières de l'examen blanc" className="mt-6 flex flex-wrap gap-2">
        <button type="button" onClick={() => setChoisies([])} aria-pressed={choisies.length === 0} className={pastille(choisies.length === 0)}>
          Toutes les matières
        </button>
        {matieresAvecQcm.map((m) => (
          <button key={m.id} type="button" onClick={() => basculer(m.id)} aria-pressed={choisies.includes(m.id)} className={pastille(choisies.includes(m.id))}>
            {m.nom}
          </button>
        ))}
      </div>

      <div className="mt-6 flex flex-wrap items-end gap-6">
        <div className="min-w-0 flex-[1_1_18rem]">
          <label htmlFor="examen-blanc-nombre" className="flex justify-between text-sm font-bold">
            Nombre de questions
            <output htmlFor="examen-blanc-nombre">
              {nombre} question{nombre > 1 ? "s" : ""} · {nombre} min
            </output>
          </label>
          <input
            id="examen-blanc-nombre"
            type="range"
            min={Math.min(MIN_QUESTIONS, max)}
            max={max}
            value={nombre}
            onChange={(e) => setN(Number(e.target.value))}
            disabled={max <= 1}
            className="mt-2 w-full cursor-grab accent-lime-400 active:cursor-grabbing"
          />
          <p className="mt-1 text-xs text-ink-300">
            {dispo} question{dispo > 1 ? "s" : ""} disponible{dispo > 1 ? "s" : ""} pour ce choix.
          </p>
        </div>
        <button
          type="button"
          onClick={lancer}
          disabled={dispo === 0}
          className="inline-flex min-h-12 items-center gap-2.5 rounded-[14px] bg-lime-400 px-6 text-[15px] font-extrabold text-ink-950 transition-colors hover:bg-lime-300 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Commencer l&apos;examen blanc
          <Icon name="arrow" className="size-4" />
        </button>
      </div>
    </section>
  );
}

const boutonClair =
  "inline-flex min-h-12 items-center gap-2 rounded-[14px] border border-ink-200 bg-white px-4 text-sm font-bold text-ink-950 transition-colors hover:bg-ink-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-ink-700 dark:bg-ink-900 dark:text-white dark:hover:bg-ink-800";

function SessionQcm({ qcmId, qcm: fourni }) {
  const qcm = fourni ?? getQcm(qcmId);

  const total = qcm?.questions.length ?? 0;
  const tempsImparti = useMemo(() => (qcm ? dureeEnSecondes(qcm.duree) : 300), [qcm]);

  const [index, setIndex] = useState(0);
  const [reponses, setReponses] = useState(() => Array(total).fill(null));
  const [marquees, setMarquees] = useState(() => Array(total).fill(false));
  const [restant, setRestant] = useState(tempsImparti);
  const [termine, setTermine] = useState(false);
  // Révision espacée : ce que cette tentative change (voir src/revisions.js).
  const [revision, setRevision] = useState(null);
  const [tempsFinal, setTempsFinal] = useState(0);
  const [detailsVisibles, setDetailsVisibles] = useState(false);
  const [alerteFin, setAlerteFin] = useState(false);

  // Garde-fou : le score ne doit être enregistré qu'une seule fois par
  // tentative, même si la clôture est déclenchée deux fois de suite.
  const dejaEnregistre = useRef(false);
  // Choisir une réponse passe à la question suivante après un court
  // instant (le temps de voir le choix s'allumer) ; à la dernière, la
  // confirmation de fin s'ouvre.
  const avance = useRef(null);
  useEffect(() => () => clearTimeout(avance.current), []);

  const recommencer = useCallback(() => {
    dejaEnregistre.current = false;
    setIndex(0);
    setReponses(Array(total).fill(null));
    setMarquees(Array(total).fill(false));
    setRestant(tempsImparti);
    setTermine(false);
    setTempsFinal(0);
    setDetailsVisibles(false);
    setAlerteFin(false);
    setRevision(null);
  }, [total, tempsImparti]);

  const score = useMemo(() => {
    if (!qcm) return 0;
    return qcm.questions.reduce((n, q, i) => n + (reponses[i] === q.bonne ? 1 : 0), 0);
  }, [qcm, reponses]);

  const terminer = useCallback(() => {
    if (!qcm || termine || dejaEnregistre.current) return;
    dejaEnregistre.current = true;
    const ecoule = tempsImparti - restant;
    setTempsFinal(ecoule);
    // Le détail alimente les forces et faiblesses par matière (page
    // progression, src/analyseMatieres.js).
    const detail = qcm.questions.map((q, i) => ({ correct: reponses[i] === q.bonne }));
    enregistrerScore(qcm.id, score, total, ecoule, detail);
    // L'examen blanc change à chaque tirage : ni statistiques ni
    // révision espacée, seulement son score (et le jour d'activité).
    if (!qcm.blanc) {
      // Les réponses, anonymes, pour les statistiques de l'admin (sauf refus).
      envoyerStats(qcm, qcm.questions.map((_, i) => reponses[i]));
      setRevision(noterTentative(qcm.id, total > 0 && (score / total) * 100 >= SEUIL_REUSSITE));
    }
    setTermine(true);
    setAlerteFin(false);
  }, [qcm, termine, tempsImparti, restant, score, total, reponses]);

  // Décompte du temps imparti.
  useEffect(() => {
    if (termine || !qcm) return undefined;
    const minuteur = setInterval(() => setRestant((r) => (r <= 1 ? 0 : r - 1)), 1000);
    return () => clearInterval(minuteur);
  }, [termine, qcm]);

  // Temps écoulé : le questionnaire se clôture tout seul.
  // (Juste après l'affichage, pour ne pas enchaîner les rendus.)
  useEffect(() => {
    if (restant !== 0 || termine || !qcm) return undefined;
    const fin = setTimeout(terminer, 0);
    return () => clearTimeout(fin);
  }, [restant, termine, qcm, terminer]);

  if (!qcm) {
    return (
      <Container className="py-20">
        <EtatVide titre="QCM introuvable" texte="Ce questionnaire n'existe pas ou a été renommé.">
          <Bouton to="/qcm">Retour aux QCM</Bouton>
        </EtatVide>
      </Container>
    );
  }

  if (termine) {
    return (
      <EcranResultat
        qcm={qcm}
        score={score}
        total={total}
        temps={tempsFinal}
        reponses={reponses}
        detailsVisibles={detailsVisibles}
        basculerDetails={() => setDetailsVisibles((v) => !v)}
        recommencer={recommencer}
        revision={revision}
      />
    );
  }

  /* ---------------- Déroulé du questionnaire ---------------- */

  const question = qcm.questions[index];
  const repondues = reponses.filter((r) => r !== null).length;
  const sansReponse = total - repondues;
  const urgent = restant <= 60;

  const allerA = (i) => {
    clearTimeout(avance.current);
    setIndex(i);
  };
  const repondre = (choix) => {
    setReponses((r) => r.map((v, i) => (i === index ? choix : v)));
    clearTimeout(avance.current);
    const ici = index;
    avance.current = setTimeout(() => (ici + 1 < total ? setIndex(ici + 1) : setAlerteFin(true)), 350);
  };
  const effacer = () => setReponses((r) => r.map((v, i) => (i === index ? null : v)));
  const basculerMarque = () => setMarquees((m) => m.map((v, i) => (i === index ? !v : v)));

  return (
    <>
      <header className={PRUNE} style={QUADRILLAGE}>
        <Container className="flex flex-wrap items-end justify-between gap-5 pt-10 pb-10">
          <div className="min-w-0">
            <p className={cx("text-xs font-medium text-lime-400", mono)}>
              {qcm.blanc ? (qcm.matieres ?? []).map((m) => nomMatiere(m)).join(" · ").toUpperCase() : nomMatiere(qcm.matiere).toUpperCase()}
            </p>
            <h1 className="mt-3 text-[clamp(2.2rem,5.5vw,4rem)] leading-[0.95] font-extrabold tracking-[-0.045em] text-balance">{qcm.titre}</h1>
          </div>
          <Link
            to="/qcm"
            className="inline-flex min-h-12 items-center gap-2 rounded-[14px] border border-white/20 px-4 text-sm font-bold transition-colors hover:bg-white/10"
          >
            <Icon name="arrow" className="size-4 rotate-180" />
            Quitter le QCM
          </Link>
        </Container>
      </header>

      <Container className="py-8">
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_18.5rem]">
          <div className="min-w-0 space-y-5">
            {/* ---- Minuteur et avancement ---- */}
            <section
              aria-label="Temps et avancement"
              className="flex flex-col gap-5 rounded-[26px] border border-ink-200 bg-white p-5 sm:flex-row sm:items-center sm:gap-8 sm:px-6 dark:border-ink-800 dark:bg-ink-900"
            >
              <div className="flex items-center gap-4">
                <div className="relative size-16 shrink-0">
                  <Anneau ratio={restant / tempsImparti} className="size-16" epaisseur={5} couleur={urgent ? "stroke-flame-500" : "stroke-brand-600"} />
                  <span className="absolute inset-0 grid place-items-center text-xs font-extrabold text-ink-950 dark:text-white">
                    {Math.ceil((restant / tempsImparti) * 100)}%
                  </span>
                </div>
                <div>
                  <p
                    className={cx("font-mono text-[28px] leading-none font-bold tabular-nums", urgent ? "text-flame-600 dark:text-flame-400" : "text-ink-950 dark:text-white")}
                    role="timer"
                  >
                    {chrono(restant)}
                  </p>
                  <p className="mt-1.5 text-[13px] text-ink-600 dark:text-ink-300">Temps restant</p>
                </div>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-extrabold text-ink-950 dark:text-white">
                    Question {index + 1} sur {total}
                  </span>
                  <span className="font-mono text-ink-600 tabular-nums dark:text-ink-300">
                    {repondues}/{total}
                  </span>
                </div>
                <div className="mt-2.5 h-2 overflow-hidden rounded-full bg-ink-100 dark:bg-ink-800">
                  <div className="h-full rounded-full bg-brand-600 transition-[width] duration-300 dark:bg-brand-500" style={{ width: `${(repondues / total) * 100}%` }} />
                </div>
              </div>
            </section>

            {/* ---- Question ---- */}
            <section className="rounded-[26px] border border-ink-200 bg-white p-6 sm:p-9 dark:border-ink-800 dark:bg-ink-900">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className={cx("text-xs text-ink-600 dark:text-ink-300", mono)}>QUESTION À CHOIX MULTIPLE {index + 1}</span>
                {marquees[index] && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-lime-400 px-3 py-1 text-xs font-extrabold text-ink-950">
                    <Icon name="bookmark" className="size-3.5" fill="currentColor" />À revoir
                  </span>
                )}
              </div>

              <h2 className="mt-4 text-[clamp(1.6rem,3vw,2.2rem)] leading-[1.15] font-extrabold tracking-[-0.03em] text-balance text-ink-950 dark:text-white">
                {question.enonce}
              </h2>

              <ul className="mt-7 space-y-2.5">
                {question.options.map((option, i) => {
                  const choisi = reponses[index] === i;
                  return (
                    <li key={i}>
                      <button
                        type="button"
                        onClick={() => repondre(i)}
                        aria-pressed={choisi}
                        className={cx(
                          "flex min-h-15 w-full items-center gap-4 rounded-[18px] border px-5 py-3.5 text-left text-base font-bold transition-colors",
                          choisi
                            ? "border-ink-950 bg-ink-950 text-white dark:border-white dark:bg-white dark:text-ink-950"
                            : "border-ink-200 bg-white text-ink-950 hover:border-ink-400 dark:border-ink-700 dark:bg-ink-900 dark:text-white dark:hover:border-ink-500"
                        )}
                      >
                        <span
                          aria-hidden="true"
                          className={cx(
                            "grid size-6 shrink-0 place-items-center rounded-full border-2",
                            choisi ? "border-lime-400 dark:border-brand-600" : "border-ink-300 dark:border-ink-600"
                          )}
                        >
                          {choisi && <span className="size-3 rounded-full bg-lime-400 dark:bg-brand-600" />}
                        </span>
                        <span className="flex-1">
                          <span className={cx("mr-1.5 font-mono text-sm font-medium", choisi ? "text-lime-400 dark:text-brand-600" : "text-ink-500 dark:text-ink-400")}>
                            {String.fromCharCode(65 + i)}.
                          </span>
                          {option}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>

              {/* ---- Actions ---- */}
              <div className="mt-8 flex flex-wrap items-center gap-2.5 border-t border-ink-100 pt-6 dark:border-ink-800">
                <button
                  type="button"
                  onClick={() => allerA(index - 1)}
                  disabled={index === 0}
                  className="inline-flex min-h-12 items-center gap-2 rounded-[14px] px-3 text-sm font-bold text-ink-700 transition-colors hover:bg-ink-100 disabled:cursor-not-allowed disabled:opacity-40 dark:text-ink-200 dark:hover:bg-ink-800"
                >
                  <Icon name="arrow" className="size-4 rotate-180" />
                  Précédent
                </button>
                <button type="button" onClick={effacer} disabled={reponses[index] === null} className={boutonClair}>
                  Effacer ma réponse
                </button>
                <button type="button" onClick={basculerMarque} className={boutonClair}>
                  <Icon name="bookmark" className="size-4" fill={marquees[index] ? "currentColor" : "none"} />
                  {marquees[index] ? "Ne plus marquer" : "Marquer à revoir"}
                </button>
                {index + 1 < total ? (
                  <button type="button" onClick={() => allerA(index + 1)} className={cx(boutonClair, "ml-auto")}>
                    Passer
                    <Icon name="arrow" className="size-4" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setAlerteFin(true)}
                    className="ml-auto inline-flex min-h-12 items-center gap-2.5 rounded-[14px] bg-lime-400 px-5.5 text-[15px] font-extrabold text-ink-950 transition-colors hover:bg-lime-300"
                  >
                    Terminer le QCM
                    <Icon name="arrow" className="size-4" />
                  </button>
                )}
              </div>
            </section>
          </div>

          {/* ---- Navigateur ---- */}
          <Navigateur
            questions={qcm.questions}
            reponses={reponses}
            marquees={marquees}
            index={index}
            aller={allerA}
            onTerminer={() => setAlerteFin(true)}
          />
        </div>
      </Container>

      {/* ---- Confirmation de fin ---- */}
      {alerteFin && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-[#271627]/60 p-4 backdrop-blur-sm">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="titre-fin"
            className="w-full max-w-md rounded-[26px] bg-white p-7 shadow-xl dark:bg-ink-900"
          >
            <h2 id="titre-fin" className="text-[24px] leading-tight font-extrabold tracking-tight text-ink-950 dark:text-white">
              Terminer le questionnaire ?
            </h2>
            <p className="mt-2 text-[15px]/6 text-ink-600 dark:text-ink-300">
              {sansReponse > 0
                ? `Il reste ${sansReponse} question${sansReponse > 1 ? "s" : ""} sans réponse. Elles seront comptées comme fausses.`
                : "Toutes les questions ont une réponse. Tu verras ensuite ton résultat et la correction détaillée."}
            </p>
            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <button type="button" onClick={() => setAlerteFin(false)} className={boutonClair}>
                Continuer le QCM
              </button>
              <button
                type="button"
                onClick={terminer}
                className="inline-flex min-h-12 items-center rounded-[14px] bg-ink-950 px-5 text-sm font-extrabold text-white transition-colors hover:bg-[#271627] dark:bg-lime-400 dark:text-ink-950"
              >
                Voir mon résultat
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* ================================================================== */
/* Écran de résultat                                                   */
/* ================================================================== */

/* Révision espacée : quand refaire ce QCM. */
const formatJourCourt = (jour) => {
  const [a, m, j] = jour.split("-").map(Number);
  return new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long" }).format(new Date(a, m - 1, j));
};

function MessageRevision({ revision }) {
  if (!revision || revision.action === "inchange") return null;
  const textes = {
    programme:
      "À refaire dans 2 jours, le " + (revision.du ? formatJourCourt(revision.du) : "") + ". Revoir une notion après un petit temps aide à la retenir.",
    avance: "Bien retenu ! Prochaine révision le " + (revision.du ? formatJourCourt(revision.du) : "") + ", un peu plus tard cette fois.",
    acquis: "Réussi après un mois : ce QCM est acquis, il sort de tes révisions.",
  };
  return (
    <div className="mt-6 flex max-w-[560px] items-start gap-3 rounded-[18px] border border-white/12 bg-white/6 px-4 py-3 text-sm/6 text-white">
      <Icon name="clock" className="mt-0.5 size-4.5 shrink-0 text-lime-400" />
      <p>
        {textes[revision.action]}{" "}
        <Link to="/planning" className="font-bold text-lime-400 underline">
          Voir mon planning
        </Link>
      </p>
    </div>
  );
}

function EcranResultat({ qcm, score, total, temps, reponses, detailsVisibles, basculerDetails, recommencer, revision }) {
  const taux = total > 0 ? Math.round((score / total) * 100) : 0;
  const reussi = taux >= SEUIL_REUSSITE;
  const points = score * POINTS_PAR_QUESTION;
  const matiere = getMatiere(qcm.matiere);

  return (
    <>
      <header className={PRUNE} style={QUADRILLAGE}>
        <Container className="pt-10 pb-24">
          <FilDAriane elements={[{ label: "QCM", to: "/qcm" }, { label: qcm.titre }, { label: "Résultat" }]} />
        </Container>
      </header>

      <Container className="pb-14">
        <section
          className="relative -mt-16 flex flex-wrap items-start justify-between gap-10 rounded-[32px] bg-[#271627] p-7 text-white sm:p-12 dark:ring-1 dark:ring-white/10"
          style={QUADRILLAGE}
        >
          <div className="min-w-0 flex-[1_1_min(480px,100%)]">
            <span className={cx("grid size-13 place-items-center rounded-[14px]", reussi ? "bg-lime-400 text-ink-950" : "bg-[#ffc94d] text-ink-950")}>
              <Icon name={reussi ? "check" : "bulb"} className="size-6" />
            </span>
            <h1 className="mt-6 text-[clamp(2.4rem,5vw,4rem)] leading-[0.98] font-extrabold tracking-[-0.045em] text-balance">
              {reussi ? (
                <>
                  Bravo, ce QCM est <span className="text-lime-400">acquis !</span>
                </>
              ) : (
                <>
                  Ce chapitre mérite <span className="text-lime-400">une relecture.</span>
                </>
              )}
            </h1>
            <p className={cx("mt-5 max-w-[520px] text-[17px]/7", TEXTE_PRUNE)}>
              Tu as terminé «&nbsp;{qcm.titre}&nbsp;». Consulte le détail des réponses, ou reviens au cours correspondant.
            </p>
            <p className="mt-3 text-[17px] font-semibold text-white">
              Tu as répondu correctement à {score} question{score > 1 ? "s" : ""} sur {total}.
            </p>

            <MessageRevision revision={revision} />

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={basculerDetails}
                aria-expanded={detailsVisibles}
                className="inline-flex min-h-12 items-center rounded-[14px] border border-white/20 px-4.5 text-sm font-bold transition-colors hover:bg-white/10"
              >
                {detailsVisibles ? "Masquer le détail" : "Voir le détail"}
              </button>
              <button
                type="button"
                onClick={recommencer}
                className="inline-flex min-h-12 items-center gap-2 rounded-[14px] bg-lime-400 px-5 text-sm font-extrabold text-ink-950 transition-colors hover:bg-lime-300"
              >
                <Icon name="target" className="size-4" />
                Refaire ce QCM
              </button>
              <Link to="/qcm" className="px-2 text-sm font-bold underline underline-offset-4 hover:text-lime-400">
                Terminer
              </Link>
            </div>
            {/* Un QCM réussi se partage (image sans donnée personnelle). */}
            {reussi && <PartageResultat titre={qcm.titre} taux={taux} score={score} total={total} className="mt-4" />}
            <p className={cx("mt-5 text-[13px]", TEXTE_PRUNE)}>
              Seuil de réussite : {SEUIL_REUSSITE} %. Chaque bonne réponse vaut {POINTS_PAR_QUESTION} points.
            </p>
          </div>

          {/* ---- Trois indicateurs ---- */}
          <dl className="w-full max-w-[420px] overflow-hidden rounded-[24px] border border-white/12">
            <div className="flex items-center justify-between gap-4 border-b border-white/12 px-6 py-5">
              <dt className={cx("text-sm font-semibold", TEXTE_PRUNE)}>Score total</dt>
              <dd className="m-0 text-[40px] leading-none font-extrabold tracking-[-0.04em]">
                {points}
                <span className={cx("ml-1 text-base font-semibold tracking-normal", TEXTE_PRUNE)}>points</span>
              </dd>
            </div>
            <div className="flex items-center justify-between gap-4 border-b border-white/12 px-6 py-5">
              <dt className={cx("text-sm font-semibold", TEXTE_PRUNE)}>Temps passé</dt>
              <dd className="m-0 text-[30px] leading-none font-extrabold tracking-[-0.03em]">{dureeLisible(temps) ?? "—"}</dd>
            </div>
            <div className="flex items-center justify-between gap-4 px-6 py-5">
              <dt className={cx("flex items-center gap-3 text-sm font-semibold", TEXTE_PRUNE)}>
                <Anneau ratio={taux / 100} className="size-14 shrink-0" epaisseur={5} couleur={reussi ? "stroke-lime-400" : "stroke-[#ffc94d]"} fond="stroke-white/12" />
                Précision
              </dt>
              <dd className="m-0 text-[40px] leading-none font-extrabold tracking-[-0.04em]">
                {taux}
                <span className={cx("ml-0.5 text-base font-semibold", TEXTE_PRUNE)}>%</span>
              </dd>
            </div>
          </dl>
        </section>

        {/* ---- Correction détaillée ---- */}
        {detailsVisibles && (
          <section className="mt-12" aria-labelledby="titre-correction">
            <h2 id="titre-correction" className="text-[clamp(1.9rem,3.5vw,2.6rem)] leading-tight font-extrabold tracking-[-0.04em] text-ink-950 dark:text-white">
              Correction question par question
            </h2>
            <ol className="mt-6 space-y-3">
              {qcm.questions.map((q, i) => {
                const choix = reponses[i];
                const juste = choix === q.bonne;
                return (
                  <li key={i} className="flex gap-5 rounded-[24px] border border-ink-200 bg-white p-6 dark:border-ink-800 dark:bg-ink-900">
                    <span
                      className={cx(
                        "grid size-9 shrink-0 place-items-center rounded-[11px]",
                        juste ? "bg-ink-950 text-lime-400 dark:bg-white dark:text-lime-700" : "border-2 border-ink-950 text-ink-950 dark:border-white dark:text-white"
                      )}
                    >
                      <Icon name={juste ? "check" : "close"} className="size-4.5" />
                      <span className="sr-only">{juste ? "Juste" : "Faux"}</span>
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[17px] font-extrabold text-ink-950 dark:text-white">
                        <span className={cx("mr-2 text-xs font-medium text-ink-500 dark:text-ink-400", mono)}>{numero(i + 1)}</span>
                        {q.enonce}
                      </p>
                      {!juste && (
                        <p className="mt-2 text-[15px] text-ink-700 dark:text-ink-300">
                          {choix === null ? (
                            "Tu n'as pas répondu."
                          ) : (
                            <>
                              Ta réponse : <s className="text-flame-700 dark:text-flame-300">{q.options[choix]}</s>
                            </>
                          )}
                        </p>
                      )}
                      <p className="mt-2 text-[15px] font-bold text-ink-950 dark:text-white">
                        Bonne réponse :{" "}
                        <span className="rounded-md bg-[#271627] px-1.5 py-0.5 text-white dark:bg-lime-400 dark:text-ink-950">{q.options[q.bonne]}</span>
                      </p>
                      {q.explication && <p className="mt-3 text-[15px]/7 text-ink-700 dark:text-ink-300">{q.explication}</p>}
                    </div>
                  </li>
                );
              })}
            </ol>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              {qcm.matiere ? (
                <Link to={`/cours/${qcm.matiere}`} className={boutonClair}>
                  Revoir le cours{matiere ? ` de ${matiere.nomCourt}` : ""}
                </Link>
              ) : (
                <Link to="/qcm#examen-blanc" className={boutonClair}>
                  Nouvel examen blanc
                </Link>
              )}
              <Link to="/qcm" className="px-2 text-sm font-bold text-ink-800 underline underline-offset-4 hover:text-ink-950 dark:text-ink-200 dark:hover:text-white">
                Choisir un autre QCM
              </Link>
            </div>
          </section>
        )}
      </Container>
    </>
  );
}
