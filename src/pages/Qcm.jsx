import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import Icon from "../components/Icon";
import {
  Badge,
  Bouton,
  Container,
  EnTetePage,
  EtatVide,
  Filtres,
  NoteDemo,
  cx,
} from "../components/ui";
import { getQcm, qcms } from "../data/qcm";
import { getMatiere, matieres, nomMatiere } from "../data/matieres";
import { themeMatiere } from "../data/couleurs";
import BoutonFavori from "../components/BoutonFavori";
import { dureeLisible, enregistrerScore, lireScores } from "../progression";
import { envoyerStats } from "../stats";
import { noterTentative } from "../revisions";

const POINTS_PAR_QUESTION = 10;
const SEUIL_REUSSITE = 70; // en pourcentage

/* ================================================================== */
/* Liste des QCM                                                       */
/* ================================================================== */

export function QcmListe() {
  const [matiere, setMatiere] = useState("toutes");
  const [scores] = useState(lireScores);

  const options = [
    { value: "toutes", label: "Toutes les matières" },
    ...matieres
      .filter((m) => qcms.some((q) => q.matiere === m.id))
      .map((m) => ({ value: m.id, label: m.nom })),
  ];

  const resultats = qcms.filter(
    (q) => matiere === "toutes" || q.matiere === matiere
  );

  const nbFaits = Object.keys(scores).length;

  return (
    <>
      <EnTetePage
        surtitre="Se tester"
        titre="QCM interactifs"
        texte="Chaque questionnaire se déroule comme un examen : tu réponds à ton rythme, tu peux revenir en arrière et marquer une question à revoir. La correction complète arrive à la fin."
      />

      <Container className="py-10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Filtres
            label="Filtrer par matière"
            options={options}
            actif={matiere}
            onChange={setMatiere}
          />
          {nbFaits > 0 && (
            <p className="text-sm text-ink-500 dark:text-ink-400">
              {nbFaits} QCM déjà tenté{nbFaits > 1 ? "s" : ""} sur cet appareil.
            </p>
          )}
        </div>

        <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {resultats.map((q) => {
            const meilleur = scores[q.id];
            const pourcentage = meilleur
              ? Math.round((meilleur.score / meilleur.total) * 100)
              : null;
            return (
              <Link
                key={q.id}
                to={`/qcm/${q.id}`}
                className="card group flex flex-col p-6 transition-shadow hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-3">
                  <div
                    className={cx(
                      "grid size-11 place-items-center rounded-xl",
                      themeMatiere(getMatiere(q.matiere)).pastille
                    )}
                  >
                    <Icon name="target" className="size-5.5" />
                  </div>
                  <span className="flex items-center gap-1">
                    <Badge>{q.niveau}</Badge>
                    <BoutonFavori
                      type="qcm"
                      reference={q.id}
                      libelle={q.titre}
                      taille="sm"
                    />
                  </span>
                </div>

                <h2 className="mt-4 font-semibold text-ink-900 group-hover:text-brand-600 dark:text-white dark:group-hover:text-brand-300">
                  {q.titre}
                </h2>
                <p className="mt-2 flex-1 text-sm/6 text-ink-600 dark:text-ink-400">
                  {q.description}
                </p>

                <div className="mt-4 flex items-center gap-3 border-t border-ink-200 pt-4 text-xs text-ink-500 dark:border-ink-800">
                  <span className="flex items-center gap-1">
                    <Icon name="layers" className="size-3.5" />
                    {q.questions.length} questions
                  </span>
                  <span className="flex items-center gap-1">
                    <Icon name="clock" className="size-3.5" />
                    {q.duree}
                  </span>
                </div>

                {meilleur && (
                  <div className="mt-3 flex items-center gap-2">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-ink-200 dark:bg-ink-800">
                      <div
                        className={cx(
                          "h-full rounded-full",
                          pourcentage >= SEUIL_REUSSITE
                            ? "bg-accent-500"
                            : "bg-sun-500"
                        )}
                        style={{ width: `${pourcentage}%` }}
                      />
                    </div>
                    <span className="font-mono text-[11px] text-ink-500">
                      record {meilleur.score}/{meilleur.total}
                    </span>
                  </div>
                )}
              </Link>
            );
          })}
        </div>

        {resultats.length === 0 && (
          <div className="mt-8">
            <EtatVide
              titre="Aucun QCM pour cette matière"
              texte="D'autres questionnaires seront ajoutés au fil des versions."
            >
              <Bouton variante="secondaire" onClick={() => setMatiere("toutes")}>
                Voir tous les QCM
              </Bouton>
            </EtatVide>
          </div>
        )}

        <div className="mt-8">
          <NoteDemo>
            Les scores sont conservés dans ton navigateur uniquement. Aucun
            compte n'est nécessaire et aucune donnée n'est envoyée : le suivi de
            progression par compte arrivera en version 3.
          </NoteDemo>
        </div>
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

const chrono = (s) =>
  `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

/* ---- Anneau de progression réutilisable ---- */

function Anneau({ ratio, className, epaisseur = 4, couleur = "stroke-brand-600" }) {
  const rayon = 24 - epaisseur / 2;
  const perimetre = 2 * Math.PI * rayon;
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
      <circle
        cx="24"
        cy="24"
        r={rayon}
        fill="none"
        strokeWidth={epaisseur}
        className="stroke-ink-200 dark:stroke-ink-800"
      />
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
  {
    cle: "courante",
    label: "En cours",
    pastille: "bg-brand-100 ring-2 ring-brand-500",
  },
  { cle: "marquee", label: "À revoir", pastille: "bg-sun-400" },
  { cle: "vierge", label: "Sans réponse", pastille: "bg-ink-200 dark:bg-ink-700" },
];

function Navigateur({ questions, reponses, marquees, index, aller, onTerminer }) {
  const repondues = reponses.filter((r) => r !== null).length;
  const aRevoir = marquees.filter(Boolean).length;
  const restantes = questions.length - repondues;

  return (
    <aside className="card h-fit p-5">
      <h2 className="text-sm font-semibold text-ink-900 dark:text-white">
        Questions
      </h2>

      <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-2">
        {legende.map((l) => (
          <li
            key={l.cle}
            className="flex items-center gap-1.5 text-[11px] text-ink-500 dark:text-ink-400"
          >
            <span className={cx("size-2.5 rounded-full", l.pastille)} />
            {l.label}
          </li>
        ))}
      </ul>

      <ol className="mt-4 grid grid-cols-6 gap-2 sm:grid-cols-10 xl:grid-cols-5">
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
                aria-label={`Question ${i + 1}${
                  repondue ? ", répondue" : ", sans réponse"
                }${marquee ? ", à revoir" : ""}`}
                className={cx(
                  "grid aspect-square w-full place-items-center rounded-lg text-sm font-semibold transition-colors",
                  courante
                    ? "bg-brand-100 text-brand-800 ring-2 ring-brand-500 dark:bg-brand-500/25 dark:text-white"
                    : marquee
                      ? "bg-sun-400 text-sun-900 hover:bg-sun-500"
                      : repondue
                        ? "bg-brand-600 text-white hover:bg-brand-700"
                        : "bg-ink-100 text-ink-500 hover:bg-ink-200 dark:bg-ink-800 dark:text-ink-400 dark:hover:bg-ink-700"
                )}
              >
                {i + 1}
              </button>
            </li>
          );
        })}
      </ol>

      <dl className="mt-5 space-y-1.5 border-t border-ink-200 pt-4 text-xs dark:border-ink-800">
        <div className="flex justify-between">
          <dt className="text-ink-500 dark:text-ink-400">Répondues</dt>
          <dd className="font-medium text-ink-900 tabular-nums dark:text-white">
            {repondues} / {questions.length}
          </dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-ink-500 dark:text-ink-400">À revoir</dt>
          <dd className="font-medium text-ink-900 tabular-nums dark:text-white">
            {aRevoir}
          </dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-ink-500 dark:text-ink-400">Sans réponse</dt>
          <dd className="font-medium text-ink-900 tabular-nums dark:text-white">
            {restantes}
          </dd>
        </div>
      </dl>

      <button
        type="button"
        onClick={onTerminer}
        className="mt-4 w-full rounded-xl bg-ink-950 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-ink-800 dark:bg-white dark:text-ink-950 dark:hover:bg-ink-200"
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
  return <SessionQcm key={qcmId} qcmId={qcmId} />;
}

function SessionQcm({ qcmId }) {
  const qcm = getQcm(qcmId);

  const total = qcm?.questions.length ?? 0;
  const tempsImparti = useMemo(
    () => (qcm ? dureeEnSecondes(qcm.duree) : 300),
    [qcm]
  );

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
    return qcm.questions.reduce(
      (n, q, i) => n + (reponses[i] === q.bonne ? 1 : 0),
      0
    );
  }, [qcm, reponses]);

  const terminer = useCallback(() => {
    if (!qcm || termine || dejaEnregistre.current) return;
    dejaEnregistre.current = true;
    const ecoule = tempsImparti - restant;
    setTempsFinal(ecoule);
    // Le détail alimente l'analyse des compétences de la page progression.
    const detail = qcm.questions.map((q, i) => ({
      competence: q.competence ?? null,
      correct: reponses[i] === q.bonne,
    }));
    enregistrerScore(qcm.id, score, total, ecoule, detail);
    // Les réponses, anonymes, pour les statistiques de l'admin (sauf refus).
    envoyerStats(qcm, qcm.questions.map((_, i) => reponses[i]));
    setRevision(noterTentative(qcm.id, total > 0 && (score / total) * 100 >= SEUIL_REUSSITE));
    setTermine(true);
    setAlerteFin(false);
  }, [qcm, termine, tempsImparti, restant, score, total, reponses]);

  // Décompte du temps imparti.
  useEffect(() => {
    if (termine || !qcm) return undefined;
    const minuteur = setInterval(
      () => setRestant((r) => (r <= 1 ? 0 : r - 1)),
      1000
    );
    return () => clearInterval(minuteur);
  }, [termine, qcm]);

  // Temps écoulé : le questionnaire se clôture tout seul.
  useEffect(() => {
    if (restant === 0 && !termine && qcm) terminer();
  }, [restant, termine, qcm, terminer]);

  if (!qcm) {
    return (
      <Container className="py-20">
        <EtatVide
          titre="QCM introuvable"
          texte="Ce questionnaire n'existe pas ou a été renommé."
        >
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

  const repondre = (choix) =>
    setReponses((r) => r.map((v, i) => (i === index ? choix : v)));

  const effacer = () =>
    setReponses((r) => r.map((v, i) => (i === index ? null : v)));

  const basculerMarque = () =>
    setMarquees((m) => m.map((v, i) => (i === index ? !v : v)));

  return (
    <div className="px-4 py-6 sm:px-7 sm:py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold tracking-wide text-brand-600 uppercase dark:text-brand-400">
            {nomMatiere(qcm.matiere)}
          </p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-ink-900 dark:text-white">
            {qcm.titre}
          </h1>
        </div>
        <Link
          to="/qcm"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-500 hover:text-brand-600 dark:text-ink-400"
        >
          <Icon name="arrow" className="size-4 rotate-180" />
          Quitter le QCM
        </Link>
      </div>

      <div className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="min-w-0 space-y-5">
          {/* ---- Minuteur et avancement ---- */}
          <section className="card flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:gap-8">
            <div className="flex items-center gap-4">
              <div className="relative size-16 shrink-0">
                <Anneau
                  ratio={restant / tempsImparti}
                  className="size-16"
                  couleur={
                    restant <= 60 ? "stroke-flame-500" : "stroke-brand-600"
                  }
                />
                <span className="absolute inset-0 grid place-items-center font-mono text-[11px] font-semibold text-ink-500">
                  {Math.ceil((restant / tempsImparti) * 100)}%
                </span>
              </div>
              <div>
                <p
                  className={cx(
                    "font-mono text-3xl font-bold tabular-nums",
                    restant <= 60
                      ? "text-flame-600 dark:text-flame-400"
                      : "text-ink-900 dark:text-white"
                  )}
                  role="timer"
                >
                  {chrono(restant)}
                </p>
                <p className="text-[11px] tracking-wide text-ink-500 uppercase">
                  Temps restant
                </p>
              </div>
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-ink-700 dark:text-ink-300">
                  Question {index + 1} sur {total}
                </span>
                <span className="font-mono text-ink-500 tabular-nums">
                  {repondues}/{total}
                </span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-ink-200 dark:bg-ink-800">
                <div
                  className="h-full rounded-full bg-brand-600 transition-[width] duration-300 dark:bg-brand-500"
                  style={{ width: `${(repondues / total) * 100}%` }}
                />
              </div>
            </div>
          </section>

          {/* ---- Question ---- */}
          <section className="card p-5 sm:p-7">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold text-ink-500 dark:text-ink-400">
                Question à choix multiple {index + 1}
              </span>
              {marquees[index] && (
                <Badge ton="sun" icone="bookmark">
                  À revoir
                </Badge>
              )}
            </div>

            <h2 className="mt-2 text-xl leading-snug font-semibold text-balance text-ink-900 dark:text-white">
              {question.enonce}
            </h2>

            <ul className="mt-6 grid gap-3 sm:grid-cols-2">
              {question.options.map((option, i) => {
                const choisi = reponses[index] === i;
                return (
                  <li key={i}>
                    <button
                      type="button"
                      onClick={() => repondre(i)}
                      aria-pressed={choisi}
                      className={cx(
                        "flex h-full w-full items-center gap-3 rounded-xl border px-4 py-3.5 text-left text-sm transition-colors",
                        choisi
                          ? "border-brand-500 bg-brand-50 text-brand-900 dark:bg-brand-500/15 dark:text-brand-100"
                          : "border-ink-200 bg-white text-ink-700 hover:border-ink-300 hover:bg-ink-50 dark:border-ink-800 dark:bg-ink-900 dark:text-ink-300 dark:hover:bg-ink-800"
                      )}
                    >
                      <span
                        className={cx(
                          "grid size-5 shrink-0 place-items-center rounded-full border-2",
                          choisi
                            ? "border-brand-600 dark:border-brand-400"
                            : "border-ink-300 dark:border-ink-600"
                        )}
                      >
                        {choisi && (
                          <span className="size-2.5 rounded-full bg-brand-600 dark:bg-brand-400" />
                        )}
                      </span>
                      <span className="flex-1">
                        <span className="mr-1.5 font-semibold">
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
            <div className="mt-7 flex flex-wrap items-center gap-2.5 border-t border-ink-200 pt-6 dark:border-ink-800">
              <Bouton
                variante="fantome"
                onClick={() => setIndex(index - 1)}
                disabled={index === 0}
              >
                <Icon name="arrow" className="size-4 rotate-180" />
                Précédent
              </Bouton>

              <Bouton
                variante="secondaire"
                onClick={effacer}
                disabled={reponses[index] === null}
              >
                Effacer ma réponse
              </Bouton>

              <Bouton variante="secondaire" onClick={basculerMarque}>
                <Icon
                  name="bookmark"
                  className="size-4"
                  fill={marquees[index] ? "currentColor" : "none"}
                />
                {marquees[index] ? "Ne plus marquer" : "Marquer à revoir"}
              </Bouton>

              <Bouton
                variante="accent"
                className="ml-auto"
                onClick={
                  index + 1 >= total
                    ? () => setAlerteFin(true)
                    : () => setIndex(index + 1)
                }
              >
                {index + 1 >= total
                  ? "Terminer le QCM"
                  : "Enregistrer et suivant"}
                <Icon name="arrow" className="size-4" />
              </Bouton>
            </div>
          </section>
        </div>

        {/* ---- Navigateur ---- */}
        <Navigateur
          questions={qcm.questions}
          reponses={reponses}
          marquees={marquees}
          index={index}
          aller={setIndex}
          onTerminer={() => setAlerteFin(true)}
        />
      </div>

      {/* ---- Confirmation de fin ---- */}
      {alerteFin && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-ink-950/50 p-4 backdrop-blur-sm">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="titre-fin"
            className="w-full max-w-md rounded-3xl bg-white p-6 shadow-xl dark:bg-ink-900"
          >
            <h2
              id="titre-fin"
              className="text-lg font-semibold text-ink-900 dark:text-white"
            >
              Terminer le questionnaire ?
            </h2>
            <p className="mt-2 text-sm/6 text-ink-600 dark:text-ink-400">
              {sansReponse > 0
                ? `Il reste ${sansReponse} question${
                    sansReponse > 1 ? "s" : ""
                  } sans réponse. Elles seront comptées comme fausses.`
                : "Toutes les questions ont une réponse. Tu verras ensuite ton résultat et la correction détaillée."}
            </p>
            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <Bouton variante="secondaire" onClick={() => setAlerteFin(false)}>
                Continuer le QCM
              </Bouton>
              <Bouton onClick={terminer}>Voir mon résultat</Bouton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ================================================================== */
/* Écran de résultat                                                   */
/* ================================================================== */

// Confettis décoratifs. L'animation est neutralisée par la règle
// « prefers-reduced-motion » définie dans index.css.
const confettis = [
  { x: "5%", y: "12%", c: "bg-sun-400", r: "rotate-12", d: "0s" },
  { x: "10%", y: "30%", c: "bg-emerald-400", r: "-rotate-12", d: ".4s" },
  { x: "4%", y: "52%", c: "bg-violet-500", r: "rotate-45", d: ".8s" },
  { x: "13%", y: "70%", c: "bg-flame-400", r: "rotate-45", d: ".9s" },
  { x: "90%", y: "10%", c: "bg-sun-400", r: "-rotate-45", d: ".2s" },
  { x: "95%", y: "28%", c: "bg-emerald-400", r: "rotate-12", d: ".6s" },
  { x: "88%", y: "50%", c: "bg-flame-400", r: "rotate-45", d: "1s" },
  { x: "94%", y: "68%", c: "bg-violet-500", r: "-rotate-12", d: ".3s" },
];

/* Révision espacée : quand refaire ce QCM. */
const formatJourCourt = (jour) => {
  const [a, m, j] = jour.split("-").map(Number);
  return new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long" }).format(new Date(a, m - 1, j));
};

function MessageRevision({ revision }) {
  if (!revision || revision.action === "inchange") return null;
  const textes = {
    programme: "À refaire dans 2 jours, le " + (revision.du ? formatJourCourt(revision.du) : "") + ". Revoir une notion après un petit temps aide à la retenir.",
    avance: "Bien retenu ! Prochaine révision le " + (revision.du ? formatJourCourt(revision.du) : "") + ", un peu plus tard cette fois.",
    acquis: "Réussi après un mois : ce QCM est acquis, il sort de tes révisions.",
  };
  return (
    <div className="mx-auto mt-6 flex max-w-lg items-start gap-3 rounded-2xl bg-brand-50 px-4 py-3 text-left text-sm/6 text-brand-900 dark:bg-brand-500/10 dark:text-brand-100">
      <Icon name="clock" className="mt-0.5 size-4.5 shrink-0 text-brand-600 dark:text-brand-300" />
      <p>
        {textes[revision.action]}{" "}
        <Link to="/planning" className="font-semibold underline">
          Voir mon planning
        </Link>
      </p>
    </div>
  );
}

function EcranResultat({
  qcm,
  score,
  total,
  temps,
  reponses,
  detailsVisibles,
  basculerDetails,
  recommencer,
  revision,
}) {
  const taux = total > 0 ? Math.round((score / total) * 100) : 0;
  const reussi = taux >= SEUIL_REUSSITE;
  const points = score * POINTS_PAR_QUESTION;

  return (
    <div className="px-4 py-6 sm:px-7 sm:py-8">
      <div className="mx-auto max-w-3xl">
        <section className="card relative overflow-hidden px-6 py-12 text-center sm:px-10">
          {reussi &&
            confettis.map((c, i) => (
              <span
                key={i}
                aria-hidden="true"
                style={{ left: c.x, top: c.y, animationDelay: c.d }}
                className={cx(
                  "absolute size-2.5 animate-bounce rounded-[3px]",
                  c.c,
                  c.r
                )}
              />
            ))}

          <div className="relative">
            <span
              className={cx(
                "mx-auto grid size-16 place-items-center rounded-full",
                reussi ? "bg-accent-500 text-white" : "bg-sun-400 text-sun-900"
              )}
            >
              <Icon name={reussi ? "check" : "bulb"} className="size-8" />
            </span>

            <h1 className="mt-5 text-2xl font-bold text-balance text-ink-900 sm:text-3xl dark:text-white">
              {reussi
                ? "Bravo, ce QCM est acquis !"
                : "Ce chapitre mérite une relecture."}
            </h1>

            <p className="mx-auto mt-3 max-w-md text-sm/6 text-ink-600 dark:text-ink-400">
              Tu as terminé «&nbsp;{qcm.titre}&nbsp;». Consulte le détail des
              réponses, ou reviens au cours correspondant.
            </p>

            <p className="mt-8 border-t border-ink-200 pt-8 font-medium text-ink-900 dark:border-ink-800 dark:text-white">
              Tu as répondu correctement à {score} question
              {score > 1 ? "s" : ""} sur {total}.
            </p>

            {/* ---- Trois indicateurs ---- */}
            <dl className="mx-auto mt-5 grid max-w-lg grid-cols-1 divide-y divide-ink-200 rounded-2xl border border-ink-200 sm:grid-cols-3 sm:divide-x sm:divide-y-0 dark:divide-ink-800 dark:border-ink-800">
              <div className="px-4 py-4">
                <dt className="text-xs text-ink-500 dark:text-ink-400">
                  Score total
                </dt>
                <dd className="mt-1 text-xl font-bold text-ink-900 dark:text-white">
                  {points}
                  <span className="ml-1 text-xs font-medium text-ink-400">
                    points
                  </span>
                </dd>
              </div>
              <div className="px-4 py-4">
                <dt className="text-xs text-ink-500 dark:text-ink-400">
                  Temps passé
                </dt>
                <dd className="mt-1 text-xl font-bold text-ink-900 dark:text-white">
                  {dureeLisible(temps) ?? "—"}
                </dd>
              </div>
              <div className="flex items-center justify-center gap-3 px-4 py-4">
                <Anneau
                  ratio={taux / 100}
                  className="size-11 shrink-0"
                  epaisseur={5}
                  couleur={reussi ? "stroke-accent-500" : "stroke-sun-500"}
                />
                <div className="text-left">
                  <dt className="text-xs text-ink-500 dark:text-ink-400">
                    Précision
                  </dt>
                  <dd className="mt-1 text-xl font-bold text-ink-900 dark:text-white">
                    {taux}
                    <span className="ml-0.5 text-xs font-medium text-ink-400">
                      %
                    </span>
                  </dd>
                </div>
              </div>
            </dl>

            <MessageRevision revision={revision} />

            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Bouton variante="secondaire" onClick={basculerDetails}>
                {detailsVisibles ? "Masquer le détail" : "Voir le détail"}
              </Bouton>
              <Bouton onClick={recommencer}>
                <Icon name="target" className="size-4" />
                Refaire ce QCM
              </Bouton>
              <Bouton variante="fantome" to="/qcm">
                Terminer
              </Bouton>
            </div>

            <p className="mt-4 text-xs text-ink-500 dark:text-ink-400">
              Seuil de réussite : {SEUIL_REUSSITE} %. Chaque bonne réponse vaut{" "}
              {POINTS_PAR_QUESTION} points.
            </p>
          </div>
        </section>

        {/* ---- Correction détaillée ---- */}
        {detailsVisibles && (
          <section className="mt-5">
            <h2 className="text-lg font-semibold text-ink-900 dark:text-white">
              Correction question par question
            </h2>
            <ol className="mt-4 space-y-4">
              {qcm.questions.map((q, i) => {
                const choix = reponses[i];
                const juste = choix === q.bonne;
                return (
                  <li key={i} className="card p-5">
                    <div className="flex items-start gap-3">
                      <span
                        className={cx(
                          "mt-0.5 grid size-6 shrink-0 place-items-center rounded-full",
                          juste
                            ? "bg-accent-500/15 text-accent-600 dark:text-accent-400"
                            : "bg-red-500/15 text-red-600 dark:text-red-400"
                        )}
                      >
                        <Icon
                          name={juste ? "check" : "close"}
                          className="size-3.5"
                        />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-ink-900 dark:text-white">
                          {i + 1}. {q.enonce}
                        </p>

                        {!juste && (
                          <p className="mt-2 text-sm text-red-600 dark:text-red-400">
                            {choix === null
                              ? "Tu n'as pas répondu."
                              : `Ta réponse : ${q.options[choix]}`}
                          </p>
                        )}
                        <p className="mt-1 text-sm text-accent-700 dark:text-accent-300">
                          Bonne réponse : {q.options[q.bonne]}
                        </p>

                        <p className="mt-3 rounded-xl bg-ink-100 px-4 py-3 text-sm/6 text-ink-700 dark:bg-ink-800/60 dark:text-ink-300">
                          {q.explication}
                        </p>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ol>

            <div className="mt-6 flex flex-wrap gap-3">
              <Bouton to={`/cours/${qcm.matiere}`} variante="secondaire">
                Revoir le cours
              </Bouton>
              <Bouton to="/qcm" variante="fantome">
                Choisir un autre QCM
              </Bouton>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
