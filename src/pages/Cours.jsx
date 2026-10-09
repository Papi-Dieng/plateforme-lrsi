import { useMemo, useState } from "react";
import { SEMESTRES, chapitresDuSemestre, semestresMatiere } from "../semestres";
import { Link, useParams, useSearchParams } from "react-router-dom";
import Icon from "../components/Icon";
import TexteLibre from "../components/TexteLibre";
import LecteurPdf from "../components/LecteurPdf";
import LectureTexte from "../components/LectureTexte";
import { Bouton, Container, EtatVide } from "../components/ui";
import { cx } from "../components/classes";
import { getMatiere, matieres } from "../data/matieres";
import BoutonFavori from "../components/BoutonFavori";
import FicheRevision from "../components/FicheRevision";
import { lireChapitresLus, marquerChapitreLu, refChapitre } from "../progression";
import { tempsMinimumTexte } from "../components/detectionLecture";
import { exercices } from "../data/exercices";
import { qcms } from "../data/qcm";

/* ==================================================================
   Espace des cours.

   D'après la maquette « Espace des cours » (8 octobre 2026) : un plan
   de métro. Chaque matière est une ligne, numérotée et colorée, et
   chacun de ses chapitres une station — le semestre 1 à gauche, le
   semestre 2 à droite. Une station pleine = chapitre lu, un rond blanc
   = disponible, un rond en pointillés = bientôt. Sous le plan, une
   carte par ligne ; la page d'une matière reprend la ligne en
   « stations » verticales, avec ses correspondances (exercices, QCM).
   ================================================================== */

const normalise = (s) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");

// Couleur de chaque ligne, dans l'ordre des matières.
const LIGNES = ["#e3342f", "#f5a524", "#8b5cf6", "#a8693a", "#ec4899", "#374151"];
// Les mêmes, assez foncées pour un texte sur fond clair.
const LIGNES_TEXTE = ["#b91c1c", "#9a5b00", "#6d28d9", "#7c4a24", "#be185d", "#1f2937"];
const rang = (m) => Math.max(matieres.findIndex((x) => x.id === m.id), 0);
const couleur = (m) => LIGNES[rang(m) % LIGNES.length];
const couleurTexte = (m) => LIGNES_TEXTE[rang(m) % LIGNES_TEXTE.length];
const mono = "font-mono text-[11px] font-bold tracking-[0.14em] uppercase";
const deux = (n) => String(n).padStart(2, "0");

function Numero({ m, taille = "size-7 text-xs" }) {
  return (
    <span className={cx("grid shrink-0 place-items-center rounded-full font-extrabold text-white ring-2 ring-white/80", taille)} style={{ background: couleurTexte(m) }}>
      {rang(m) + 1}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Le plan                                                             */
/* ------------------------------------------------------------------ */

const LARGEUR = 1000;
const MARGE = 70;
const MILIEU = LARGEUR / 2;

// Les lignes quittent leur voie avant le passage au semestre 2 pour
// rouler ensemble au milieu du plan, en faisceau, puis rejoignent leur
// voie de l'autre côté (comme sur la maquette).
const A = 330; // fin des stations du semestre 1, début de la courbe
const B = 440; // début du faisceau
const C = 560; // fin du faisceau
const D = 670; // fin de la courbe, début des stations du semestre 2

function Plan({ liste, lus, active, setActive, semestre, onOuvrir }) {
  const ecart = 56;
  const hauteur = 80 + liste.length * ecart;
  const yDe = (i) => 62 + i * ecart;
  const centre = yDe((liste.length - 1) / 2);
  const yFaisceau = (i) => centre + (i - (liste.length - 1) / 2) * 9;
  const xStations = (n, cote) => {
    const debut = cote === 1 ? MARGE + 55 : D + 30;
    const fin = cote === 1 ? A - 30 : LARGEUR - MARGE - 55;
    return Array.from({ length: n }, (_, k) => (n === 1 ? (debut + fin) / 2 : debut + ((fin - debut) * k) / (n - 1)));
  };

  return (
    <div className="overflow-x-auto rounded-[28px] border border-ink-200 bg-[radial-gradient(#d4d4dc_1px,transparent_1px)] [background-size:16px_16px] dark:border-ink-800 dark:bg-ink-900 dark:bg-[radial-gradient(#3a3a46_1px,transparent_1px)]" tabIndex={0} role="region" aria-label="Plan des cours">
      <svg viewBox={`0 0 ${LARGEUR} ${hauteur}`} className="min-w-[760px]" role="group" aria-label="Plan des lignes : une ligne par matière, une station par chapitre">
        {semestre !== "2" && <text x={MARGE - 30} y="26" className="fill-ink-600 font-mono text-[11px] font-bold tracking-widest dark:fill-ink-300">ZONE 1 · SEMESTRE 1</text>}
        {semestre !== "1" && <text x={LARGEUR - MARGE + 30} y="26" textAnchor="end" className="fill-ink-600 font-mono text-[11px] font-bold tracking-widest dark:fill-ink-300">ZONE 2 · SEMESTRE 2</text>}
        <rect x={MILIEU} y="0" width={LARGEUR - MILIEU} height={hauteur} className="fill-ink-950/[0.035] dark:fill-white/[0.04]" />
        <line x1={MILIEU} y1="38" x2={MILIEU} y2={hauteur - 26} className="stroke-ink-400" strokeDasharray="3 5" />
        <text x={MILIEU} y={hauteur - 8} textAnchor="middle" className="fill-ink-600 font-mono text-[10px] tracking-widest dark:fill-ink-300">PASSAGE AU SEMESTRE 2</text>

        {liste.map((m, i) => {
          const y = yDe(i);
          const yf = yFaisceau(i);
          const c = couleur(m);
          const allumee = active === m.id;
          const estompee = active && !allumee;
          // Avec un filtre de semestre, seules ses stations restent.
          const cotes = semestre === "1" ? [1] : semestre === "2" ? [2] : [1, 2];
          const stations = cotes.flatMap((n) => {
            const ch = chapitresDuSemestre(m, n);
            return xStations(ch.length, n).map((x, k) => ({ x, c: ch[k], n, k }));
          }).map((st, j) => ({ ...st, j }));
          return (
            <g key={m.id} className="transition-opacity duration-300" opacity={estompee ? 0.35 : 1} onMouseEnter={() => setActive(m.id)} onFocus={() => setActive(m.id)}>
              <path
                d={`M${MARGE} ${y} H${A} C${A + 60} ${y} ${B - 60} ${yf} ${B} ${yf} H${C} C${C + 60} ${yf} ${D - 60} ${y} ${D} ${y} H${LARGEUR - MARGE}`}
                stroke={c}
                strokeWidth={allumee ? 9 : 6}
                strokeLinecap="round"
                fill="none"
                pathLength={1}
                className="ligne-trace transition-[stroke-width]"
                style={{ animationDelay: `${i * 120}ms` }}
              />
              {stations.map(({ x, c: ch, n, k, j }) => {
                const pret = ch.statut === "disponible";
                const lu = pret && lus[refChapitre(m.id, ch.titre)];
                return (
                  <a key={`${n}-${k}`} href={`#/cours/${m.id}?semestre=${n}`} aria-label={`${m.nom}, semestre ${n} : ${ch.titre}${lu ? " (lu)" : pret ? "" : " (bientôt)"}`}>
                    <title>{ch.titre}</title>
                    <circle cx={x} cy={y} r={allumee ? 8 : 6.5} fill={lu ? c : "#fff"} stroke={c} strokeWidth="3.5" strokeDasharray={pret ? undefined : "3 3"} />
                    {allumee && (
                      <text x={x} y={y + (j % 2 ? 26 : -16)} textAnchor="middle" className="fill-ink-900 text-[11px] font-bold dark:fill-white">
                        {ch.titre.length > 28 ? `${ch.titre.slice(0, 27)}…` : ch.titre}
                      </text>
                    )}
                  </a>
                );
              })}
              {[MARGE - 26, LARGEUR - MARGE + 26].map((x) => (
                <g
                  key={x}
                  role="button"
                  tabIndex={0}
                  aria-label={`Ouvrir la ligne ${rang(m) + 1} : ${m.nom}`}
                  className="cursor-pointer outline-none [&:focus-visible>circle]:stroke-ink-950"
                  onClick={() => onOuvrir(m.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onOuvrir(m.id);
                    }
                  }}
                >
                  <circle cx={x} cy={y} r="15" fill={couleurTexte(m)} stroke="#fff" strokeWidth="3" />
                  <text x={x} y={y + 5} textAnchor="middle" className="pointer-events-none fill-white text-[14px] font-extrabold">{rang(m) + 1}</text>
                </g>
              ))}
              {!allumee && (
                <text x={MARGE + 14} y={y - 12} className="text-[11px] font-bold" style={{ fill: couleurTexte(m) }}>
                  {m.nomCourt ?? m.nom}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

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
  const [lus, setLus] = useState(lireChapitresLus);
  const [active, setActive] = useState(matieres[0]?.id ?? null);
  // La ligne ouverte sous les cartes (« ligne ouverte ci-dessous »).
  const [ouverte, setOuverte] = useState(matieres[0]?.id ?? null);
  const [partieChoisie, setPartieChoisie] = useState(null);
  const ouvrir = (id) => {
    setOuverte(id);
    setActive(id);
    setPartieChoisie(null);
    requestAnimationFrame(() => {
      const reduit = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
      document.getElementById("ligne-ouverte")?.scrollIntoView({ behavior: reduit ? "auto" : "smooth", block: "start" });
    });
  };

  // Semestre 1 ou 2 : les matières qui ont des chapitres dans ce
  // semestre, et le lien ouvre directement cette partie.
  const semestres = [
    { value: "tous", label: "Tous les semestres" },
    ...SEMESTRES.map((n) => ({ value: String(n), label: `Semestre ${n}` })),
  ];

  const resultats = useMemo(() => {
    const q = normalise(recherche.trim());
    return matieres.filter((m) => {
      if (semestre !== "tous" && !semestresMatiere(m).includes(Number(semestre))) return false;
      if (!q) return true;
      const corpus = normalise([m.nom, m.resume, ...m.chapitres.map((c) => c.titre)].join(" "));
      return corpus.includes(q);
    });
  }, [recherche, semestre]);

  const nbChapitres = matieres.reduce((n, m) => n + m.chapitres.length, 0);
  const nbDispo = matieres.reduce((n, m) => n + m.chapitres.filter((c) => c.statut === "disponible").length, 0);
  const allumee = resultats.find((m) => m.id === active) ?? resultats[0];
  const matiereOuverte = resultats.find((m) => m.id === ouverte) ?? null;
  const partieOuverte =
    partieChoisie ?? (semestre !== "tous" ? Number(semestre) : (matiereOuverte ? semestresMatiere(matiereOuverte)[0] : 1) ?? 1);

  return (
    <div className="bg-white dark:bg-ink-950">
      <Container className="pt-6 pb-16">
        {/* ---- En-tête ---- */}
        <header className="relative overflow-hidden rounded-[30px] bg-[#16141c] px-6 pt-7 pb-6 text-white shadow-[0_30px_60px_-30px_#000a] sm:px-9">
          <span aria-hidden="true" className="absolute -top-20 right-10 size-80 rounded-full bg-[#f5a524]/20 blur-3xl" />
          <div className="relative flex flex-wrap items-center justify-between gap-3">
            <p className={cx(mono, "text-[#f5a524]")}>
              Ressources <span className="text-white/70">· Filière LRSI</span>
            </p>
            <p className={cx(mono, "flex items-center gap-2 text-[10px] text-white/70")}>
              Semestre 1 <span aria-hidden="true" className="h-px w-8 bg-white/50" /> Semestre 2
            </p>
          </div>
          <h1 className="relative mt-4 text-3xl font-extrabold tracking-[-0.05em] sm:text-7xl">Espace des cours</h1>
          <ul className="relative mt-6 flex flex-wrap gap-x-6 gap-y-3 border-t border-white/10 pt-5">
            {matieres.map((m) => (
              <li key={m.id}>
                <Link to={`/cours/${m.id}`} className="flex items-center gap-2 text-sm font-bold hover:underline">
                  <Numero m={m} />
                  {m.nomCourt ?? m.nom}
                </Link>
              </li>
            ))}
          </ul>
        </header>

        <div className="mt-6 flex flex-wrap items-end justify-between gap-6">
          <p className="max-w-xl text-[15px]/7 text-ink-700 dark:text-ink-300">
            Les chapitres sont regroupés par matière et par semestre. Cette organisation est une proposition de structure : elle ne remplace pas le programme officiel de la filière.
          </p>
          <dl className="flex gap-5 text-center sm:gap-8">
            {[
              [matieres.length, "matières"],
              [nbChapitres, "chapitres"],
              [nbDispo, "disponibles"],
            ].map(([n, l]) => (
              <div key={l}>
                <dd className="text-2xl font-extrabold tracking-tight text-ink-950 sm:text-4xl dark:text-white">{n}</dd>
                <dt className="text-xs text-ink-600 dark:text-ink-300">{l}</dt>
              </div>
            ))}
          </dl>
        </div>

        {/* ---- Recherche et filtres ---- */}
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <div className="relative w-full sm:w-72">
            <label htmlFor="recherche-cours" className="sr-only">
              Rechercher une matière ou un chapitre
            </label>
            <Icon name="search" className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-ink-500" />
            <input
              id="recherche-cours"
              type="search"
              value={recherche}
              onChange={(e) => setRecherche(e.target.value)}
              placeholder="Rechercher une matière, un chapitre…"
              className="min-h-11 w-full rounded-[14px] border border-ink-200 bg-white pr-3 pl-10 text-sm placeholder:text-ink-500 focus:border-ink-950 focus:outline-none dark:border-ink-700 dark:bg-ink-900 dark:focus:border-white"
            />
          </div>
          <div role="group" aria-label="Filtrer par semestre" className="flex w-full rounded-[14px] bg-ink-100 p-1 sm:w-auto dark:bg-ink-800">
            {semestres.map((o) => (
              <button
                key={o.value}
                type="button"
                aria-pressed={semestre === o.value}
                onClick={() => setSemestre(o.value)}
                className={cx(
                  "min-h-9 flex-1 rounded-[10px] px-2 text-sm font-bold sm:flex-none sm:px-3",
                  semestre === o.value ? "bg-white text-ink-950 shadow-sm dark:bg-ink-950 dark:text-white" : "text-ink-700 hover:text-ink-950 dark:text-ink-300 dark:hover:text-white"
                )}
              >
                {o.label}
              </button>
            ))}
          </div>
          <ul className="ml-auto flex flex-wrap gap-4 text-xs font-bold text-ink-700 dark:text-ink-300" aria-label="Légende du plan">
            <li className="flex items-center gap-1.5"><span className="size-3 rounded-full border-[3px] border-ink-950 bg-ink-950 ring-2 ring-white ring-inset dark:border-white" />Chapitre lu</li>
            <li className="flex items-center gap-1.5"><span className="size-3 rounded-full border-[3px] border-ink-950 bg-white dark:border-white" />Disponible</li>
            <li className="flex items-center gap-1.5"><span className="size-3 rounded-full border-[3px] border-dashed border-ink-500" />Bientôt</li>
          </ul>
        </div>

        {/* ---- Le plan ---- */}
        {resultats.length > 0 && (
          <div className="mt-6">
            <Plan liste={resultats} lus={lus} active={allumee?.id} setActive={setActive} semestre={semestre} onOuvrir={ouvrir} />
            <p className="mt-2 flex flex-wrap justify-between gap-2 text-xs text-ink-600 dark:text-ink-300">
              <span>
                Ligne {allumee ? rang(allumee) + 1 : ""}, {allumee?.nom} : ses stations sont nommées sur le plan.
              </span>
              <span>Survole une ligne pour la voir ; touche un numéro de ligne pour l'ouvrir ci-dessous.</span>
            </p>
          </div>
        )}

        {/* ---- Toutes les matières ---- */}
        <div className="mt-12 flex items-baseline justify-between">
          <h2 className="text-2xl font-extrabold tracking-[-0.04em] text-ink-950 sm:text-3xl dark:text-white">Toutes les matières</h2>
          <p className="text-sm text-ink-600 dark:text-ink-300">
            {resultats.length} matière{resultats.length > 1 ? "s" : ""}
          </p>
        </div>

        {resultats.length === 0 ? (
          <div className="mt-6">
            <EtatVide titre="Aucune matière ne correspond" texte="Essaie un autre mot-clé ou retire le filtre de semestre.">
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
          </div>
        ) : (
          <ul className="mt-6 grid gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">
            {resultats.map((m) => {
              const filtre = semestre === "tous" ? null : Number(semestre);
              const liste = filtre ? chapitresDuSemestre(m, filtre) : m.chapitres;
              const dispo = liste.filter((c) => c.statut === "disponible").length;
              return (
                <li key={m.id}>
                  <button
                    type="button"
                    onClick={() => ouvrir(m.id)}
                    onMouseEnter={() => setActive(m.id)}
                    aria-expanded={ouverte === m.id}
                    aria-controls="ligne-ouverte"
                    className={cx(
                      "group flex h-full w-full overflow-hidden rounded-[22px] border-2 bg-white text-left transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-lg dark:bg-ink-900",
                      ouverte === m.id ? "" : "border-transparent shadow-[0_6px_24px_-14px_#0004] dark:border-ink-800"
                    )}
                    style={ouverte === m.id ? { borderColor: couleur(m) } : undefined}
                  >
                    <span className="flex w-14 shrink-0 flex-col items-center justify-between py-3 text-white sm:w-16" style={{ background: couleurTexte(m) }}>
                      <span className={cx(mono, "text-[9px]")}>Ligne</span>
                      <span className="text-3xl font-extrabold sm:text-4xl">{rang(m) + 1}</span>
                      <span className={cx(mono, "text-[9px]")}>
                        {semestresMatiere(m)
                          .filter((n) => !filtre || n === filtre)
                          .map((n) => `S${n}`)
                          .join(" · ")}
                      </span>
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col p-3 sm:p-4">
                      {ouverte === m.id && (
                        <span className={cx(mono, "mb-1 text-[9px] text-(--t) dark:text-(--c)")} style={{ "--t": couleurTexte(m), "--c": `color-mix(in srgb, ${couleur(m)} 50%, white)` }}>
                          Ligne ouverte ci-dessous
                        </span>
                      )}
                      <span className="text-lg/6 font-extrabold tracking-tight text-ink-950 dark:text-white">{m.nom}</span>
                      <span className="mt-2 flex-1 text-sm/6 text-ink-600 dark:text-ink-300">{m.resume}</span>
                      <span className="mt-3 flex items-center justify-between text-xs text-ink-600 dark:text-ink-300">
                        {liste.length} chapitres{filtre ? ` au semestre ${filtre}` : ""}, {dispo} disponible{dispo > 1 ? "s" : ""}
                        <span
                          className={cx("grid size-7 place-items-center rounded-full border transition-colors", ouverte === m.id ? "border-transparent text-white" : "border-ink-200 dark:border-ink-700")}
                          style={ouverte === m.id ? { background: couleurTexte(m) } : undefined}
                        >
                          <Icon name="arrow" className={cx("size-3.5 transition-transform", ouverte === m.id && "rotate-90")} />
                        </span>
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        {/* ---- La ligne ouverte ---- */}
        {matiereOuverte && (
          <PanneauLigne
            key={matiereOuverte.id}
            id="ligne-ouverte"
            matiere={matiereOuverte}
            partie={partieOuverte}
            choisirPartie={setPartieChoisie}
            lus={lus}
            setLus={setLus}
            className="mt-12"
          />
        )}
      </Container>
    </div>
  );
}

/* ================================================================== */
/* Détail d'une matière                                                */
/* ================================================================== */

export function CoursDetail() {
  const { matiereId } = useParams();
  const matiere = getMatiere(matiereId);
  const [lus, setLus] = useState(lireChapitresLus);
  // Le semestre 1 et le semestre 2 sont deux parties à part. Celle
  // demandée par l'adresse (?semestre=2), sinon la première qui existe.
  const [params, setParams] = useSearchParams();
  const demande = Number(params.get("semestre"));
  const presents = matiere ? semestresMatiere(matiere) : [];
  const partie = SEMESTRES.includes(demande) ? demande : (presents[0] ?? 1);
  const choisirPartie = (n) => setParams({ semestre: String(n) }, { replace: true });

  if (!matiere) {
    return (
      <Container className="py-20">
        <EtatVide titre="Matière introuvable" texte="Cette matière n'existe pas ou a été renommée.">
          <Bouton to="/cours">Retour aux cours</Bouton>
        </EtatVide>
      </Container>
    );
  }

  return (
    <div className="bg-white dark:bg-ink-950">
      <Container className="py-6">
        <Link to="/cours" className="inline-flex items-center gap-1.5 text-sm font-bold text-ink-700 hover:text-ink-950 dark:text-ink-300 dark:hover:text-white">
          <Icon name="arrow" className="size-4 rotate-180" />
          Toutes les matières
        </Link>

        <PanneauLigne matiere={matiere} Titre="h1" partie={partie} choisirPartie={choisirPartie} lus={lus} setLus={setLus} className="mt-4" />
      </Container>
    </div>
  );
}

/* ================================================================== */
/* Une ligne ouverte : la matière, ses stations, ses correspondances   */
/* ================================================================== */

function PanneauLigne({ matiere, Titre = "h2", partie, choisirPartie, lus, setLus, id, className }) {
  const presents = semestresMatiere(matiere);
  const c0 = couleur(matiere);
  const exercicesLies = exercices.filter((e) => e.matiere === matiere.id);
  const qcmsLies = qcms.filter((q) => q.matiere === matiere.id);
  const disponibles = matiere.chapitres.filter((c) => c.statut === "disponible").length;
  const estLu = (c) => c.statut === "disponible" && lus[refChapitre(matiere.id, c.titre)];
  const nbLus = matiere.chapitres.filter(estLu).length;
  // Prochain arrêt : le premier chapitre disponible pas encore lu.
  const prochain = SEMESTRES.flatMap((n) => chapitresDuSemestre(matiere, n).map((c, i) => ({ c, n, i }))).find(
    ({ c }) => c.statut === "disponible" && !estLu(c)
  );
  const chapitres = chapitresDuSemestre(matiere, partie);

  return (
        <div id={id} className={cx("scroll-mt-6 rounded-[32px] p-5 sm:p-8", className)} style={{ background: `color-mix(in srgb, ${c0} 12%, transparent)` }}>
          {/* ---- En-tête ---- */}
          <header className="flex flex-wrap items-start gap-5">
            <span className="grid size-20 shrink-0 place-items-center rounded-full border-[6px] border-white text-4xl font-extrabold text-white shadow-lg dark:border-ink-900" style={{ background: couleurTexte(matiere) }}>
              {rang(matiere) + 1}
            </span>
            <div className="min-w-0 flex-1">
              <p className={cx(mono, "text-ink-700 dark:text-ink-300")}>
                Ligne {rang(matiere) + 1} · {presents.map((n) => `Semestre ${n}`).join(" · ")}
              </p>
              <Titre className="mt-1 text-4xl font-extrabold tracking-[-0.04em] text-ink-950 sm:text-5xl dark:text-white">{matiere.nom}</Titre>
              <p className="mt-3 max-w-2xl text-[15px]/7 text-ink-700 dark:text-ink-300">{matiere.resume}</p>
              <div className="mt-4 flex flex-wrap items-center gap-2 text-xs font-bold">
                <span className="rounded-full px-2.5 py-1 text-white" style={{ background: couleurTexte(matiere) }}>
                  {disponibles} chapitres disponibles
                </span>
                <span className="rounded-full bg-white px-2.5 py-1 text-ink-800 dark:bg-ink-900 dark:text-ink-100">{matiere.chapitres.length} au total</span>
                {disponibles > 0 && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-ink-800 dark:bg-ink-900 dark:text-ink-100">
                    <Icon name="check" className="size-3.5" />
                    {nbLus} / {disponibles} lu{disponibles > 1 ? "s" : ""}
                  </span>
                )}
              </div>
            </div>
            <BoutonFavori type="matiere" reference={matiere.id} libelle={matiere.nom} variante="encadre" avecTexte />
          </header>

          <div className="mt-8 grid items-start gap-6 lg:grid-cols-[1fr_20rem]">
            <div className="space-y-5">
              {/* ---- Prochain arrêt ---- */}
              {prochain && (
                <button
                  type="button"
                  onClick={() => choisirPartie(prochain.n)}
                  className="flex w-full items-center gap-4 rounded-[22px] bg-white p-4 text-left shadow-sm transition-shadow hover:shadow-md dark:bg-ink-900"
                >
                  <span className="grid size-11 shrink-0 place-items-center rounded-full text-white" style={{ background: c0 }}>
                    <Icon name="arrow" className="size-4" />
                  </span>
                  <span>
                    <span className={cx(mono, "block text-[10px] text-ink-600 dark:text-ink-300")}>Prochain arrêt</span>
                    <span className="block font-extrabold text-ink-950 dark:text-white">{prochain.c.titre}</span>
                    <span className="block text-xs text-ink-600 dark:text-ink-300">
                      Semestre {prochain.n}, chapitre {deux(prochain.i + 1)} : il t&apos;attend.
                    </span>
                  </span>
                </button>
              )}

              {/* ---- Les stations ---- */}
              <section className="rounded-[24px] bg-white p-5 shadow-sm sm:p-6 dark:bg-ink-900">
                <h2 className="sr-only">Programme des chapitres</h2>
                <div role="group" aria-label="Choisir le semestre" className="inline-flex rounded-[14px] bg-ink-100 p-1 dark:bg-ink-800">
                  {SEMESTRES.map((n) => (
                    <button
                      key={n}
                      type="button"
                      aria-pressed={partie === n}
                      onClick={() => choisirPartie(n)}
                      className={cx(
                        "min-h-9 rounded-[10px] px-3 text-sm font-bold",
                        partie === n ? "bg-white text-ink-950 shadow-sm dark:bg-ink-950 dark:text-white" : "text-ink-700 hover:text-ink-950 dark:text-ink-300 dark:hover:text-white"
                      )}
                    >
                      Semestre {n} ({chapitresDuSemestre(matiere, n).length})
                    </button>
                  ))}
                </div>

                {chapitres.length === 0 && (
                  <p className="mt-4 text-sm text-ink-600 dark:text-ink-300">Pas encore de chapitre pour le semestre {partie} dans cette matière.</p>
                )}
                <ol className="mt-5">
                  {chapitres.map((c, i) => {
                    const pret = c.statut === "disponible";
                    const ref = refChapitre(matiere.id, c.titre);
                    const lu = Boolean(lus[ref]);
                    const marquerLu = () => setLus(marquerChapitreLu(ref));
                    const dernier = i === chapitres.length - 1;
                    return (
                      <li key={c.titre} className="relative flex gap-4 pb-6 last:pb-0">
                        {!dernier && (
                          <span aria-hidden="true" className={cx("absolute top-7 bottom-0 left-[13px] w-1.5", !pret && "opacity-40")} style={{ background: pret ? c0 : `repeating-linear-gradient(${c0} 0 6px, transparent 6px 12px)` }} />
                        )}
                        <span
                          aria-hidden="true"
                          className={cx("relative mt-0.5 grid size-8 shrink-0 place-items-center rounded-full border-[4px] bg-white dark:bg-ink-900", !pret && "border-dashed")}
                          style={{ borderColor: c0, background: pret && lu ? c0 : undefined }}
                        >
                          {pret && lu && <Icon name="check" className="size-4 text-white" />}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-mono text-xs text-ink-600 dark:text-ink-300">{deux(i + 1)}</span>
                            <h3 className="font-extrabold text-ink-950 dark:text-white">{c.titre}</h3>
                            {pret && lu ? (
                              <span className="rounded-full px-2 py-0.5 text-[11px] font-bold text-white" style={{ background: couleurTexte(matiere) }}>Lu</span>
                            ) : pret ? (
                              <span className="rounded-full bg-ink-950 px-2 py-0.5 text-[11px] font-bold text-white dark:bg-white dark:text-ink-950">Disponible</span>
                            ) : (
                              <span className="rounded-full bg-ink-100 px-2 py-0.5 text-[11px] font-bold text-ink-700 dark:bg-ink-800 dark:text-ink-200">Bientôt</span>
                            )}
                            <span className="ml-auto">
                              <BoutonFavori type="chapitre" reference={ref} libelle={`le chapitre ${c.titre}`} taille="sm" />
                            </span>
                          </div>
                          <p className="mt-1 text-sm/6 text-ink-600 dark:text-ink-300">{c.resume}</p>
                          {/* Le texte écrit dans l'admin passe avant le PDF :
                              « Lire ici » l'affiche, le PDF reste à télécharger.
                              La lecture est détectée toute seule (`onLu`). */}
                          {pret && !c.contenu && c.pdf && (
                            <LecteurPdf pdf={c.pdf} libelle="Cours en PDF" titre={`Cours : ${c.titre}`} onLu={lu ? undefined : marquerLu} lu={lu} className="mt-4" />
                          )}
                          {pret && c.contenu && (
                            <LectureTexte
                              libelle="Cours"
                              titre={`Cours : ${c.titre}`}
                              pdf={c.pdf}
                              onLu={lu ? undefined : marquerLu}
                              lu={lu}
                              tempsMin={tempsMinimumTexte(c.contenu)}
                              className="mt-4"
                            >
                              <TexteLibre texte={c.contenu} />
                            </LectureTexte>
                          )}
                          {pret && (
                            <FicheRevision
                              reference={ref}
                              titre={c.titre}
                              texte={c.contenu || c.texteIA}
                              couleur={couleurTexte(matiere)}
                              className="mt-4"
                            />
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ol>
              </section>
            </div>

            {/* ---- Correspondances ---- */}
            <aside className="rounded-[24px] bg-white p-5 shadow-sm dark:bg-ink-900">
              <p className={cx(mono, "text-[10px] text-ink-600 dark:text-ink-300")}>Correspondances</p>
              <h2 className="mt-3 flex items-center gap-2 font-extrabold text-ink-950 dark:text-white">
                <span className="grid size-7 place-items-center rounded-lg bg-ink-100 dark:bg-ink-800">
                  <Icon name="code" className="size-3.5" />
                </span>
                Exercices liés
              </h2>
              {exercicesLies.length === 0 ? (
                <p className="mt-3 text-sm text-ink-600 dark:text-ink-300">Aucun exercice publié pour cette matière pour le moment.</p>
              ) : (
                <ul className="mt-3 space-y-1">
                  {exercicesLies.map((e) => (
                    <li key={e.id}>
                      <Link to={`/exercices/${e.id}`} className="group -mx-2 flex items-start gap-2.5 rounded-xl px-2 py-2 hover:bg-ink-50 dark:hover:bg-ink-800">
                        <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full text-white" style={{ background: c0 }}>
                          <Icon name="arrow" className="size-3" />
                        </span>
                        <span className="text-sm font-bold text-ink-900 dark:text-ink-100">
                          {e.titre}
                          {e.difficulte && <span className="block text-xs font-normal text-ink-600 dark:text-ink-300">{e.difficulte}</span>}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}

              <h2 className="mt-6 flex items-center gap-2 border-t border-ink-100 pt-5 font-extrabold text-ink-950 dark:border-ink-800 dark:text-white">
                <span className="grid size-7 place-items-center rounded-lg bg-ink-100 dark:bg-ink-800">
                  <Icon name="target" className="size-3.5" />
                </span>
                QCM disponibles
              </h2>
              {qcmsLies.length === 0 ? (
                <p className="mt-3 text-sm text-ink-600 dark:text-ink-300">Aucun QCM pour cette matière pour le moment.</p>
              ) : (
                <ul className="mt-3 space-y-1">
                  {qcmsLies.map((q) => (
                    <li key={q.id}>
                      <Link to={`/qcm/${q.id}`} className="group -mx-2 flex items-start gap-2.5 rounded-xl px-2 py-2 hover:bg-ink-50 dark:hover:bg-ink-800">
                        <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full text-white" style={{ background: c0 }}>
                          <Icon name="arrow" className="size-3" />
                        </span>
                        <span className="text-sm font-bold text-ink-900 dark:text-ink-100">
                          {q.titre}
                          <span className="block text-xs font-normal text-ink-600 dark:text-ink-300">
                            {q.questions.length} questions · {q.duree}
                          </span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </aside>
          </div>
        </div>
  );
}
