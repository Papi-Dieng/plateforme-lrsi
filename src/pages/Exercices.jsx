import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import Icon from "../components/Icon";
import { CorrectionExercice, EnonceExercice } from "../components/AffichageExercice";
import RepondreExercice, { ChoixReponse } from "../components/RepondreExercice";
import TexteLibre, { EnLigne } from "../components/TexteLibre";
import PleinEcran from "../components/PleinEcran";
import { textesExercice } from "../ia";
import { questionsDe } from "../questionsExercice";
import { Bouton, Container, EtatVide } from "../components/ui";
import { QUADRILLAGE, mono } from "../components/styleAdmin";
import { cx } from "../components/classes";
import { difficultes, exercices, getExercice } from "../data/exercices";
import { getMatiere, matieres, nomMatiere } from "../data/matieres";
import { themeMatiere } from "../data/couleurs";
import { urlPdf } from "../contenu";
import { marquerExerciceTravaille } from "../progression";
import BoutonFavori from "../components/BoutonFavori";

/* ==================================================================
   Les exercices corrigés : la liste, puis la page d'un exercice.

   D'après la maquette « Exercices corrigés » (7 octobre 2026) : un
   en-tête sombre quadrillé au très grand titre, une carte de filtres
   qui déborde dessus, des cartes au grand numéro évidé ; dans un
   exercice, des blocs numérotés (énoncé, indice, ma réponse, correction
   sur fond sombre) et, à droite, un sommaire collant, la fiche de
   l'exercice et la suite dans la matière.
   ================================================================== */

const STYLE_DIFFICULTE = {
  Facile: "bg-lime-100 text-lime-900 dark:bg-lime-400/15 dark:text-lime-200",
  Moyen: "bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300",
  Difficile: "bg-flame-100 text-flame-800 dark:bg-flame-500/15 dark:text-flame-300",
};

const PLURIELS = { Facile: "faciles", Moyen: "moyens", Difficile: "difficiles" };

const numero = (n) => String(n).padStart(2, "0");
const rang = (e) => exercices.findIndex((x) => x.id === e.id) + 1;

const normalise = (s) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");

/* Le début d'un énoncé pour la carte : son premier paragraphe, débarrassé
   de la mise en forme, et le bloc de code qui suit, s'il y en a un : entre
   ``` , ou à défaut un deuxième paragraphe de plusieurs lignes (un
   algorithme, des tables SQL…). */
function extrait(enonce = "") {
  const nettoyer = (t) => t.replace(/^#+\s*/gm, "").replace(/\*\*|__|`/g, "").trim();
  if (enonce.includes("```")) {
    const [avant, code = ""] = enonce.split("```");
    return { texte: nettoyer(avant), code: code.replace(/^[a-z]*\n/, "").trim() };
  }
  const [premier = "", second = ""] = enonce.replace(/\r\n?/g, "\n").split(/\n\s*\n/);
  const code = second.split("\n").length >= 2 ? second.trim() : "";
  return { texte: nettoyer(code ? premier : enonce), code };
}

function Difficulte({ valeur, className }) {
  return (
    <span className={cx("inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold", STYLE_DIFFICULTE[valeur], className)}>
      {valeur}
    </span>
  );
}

function Point({ matiere, className }) {
  const m = getMatiere(matiere);
  return m ? <i aria-hidden="true" className={cx("size-2 shrink-0 rounded-full", themeMatiere(m).point, className)} /> : null;
}

/* L'en-tête sombre des deux pages, sur toute la largeur. */
function EnTeteSombre({ children, className }) {
  return (
    <header className={cx("bg-[#1b1d26] text-white dark:bg-[#0b0e17]", className)} style={QUADRILLAGE}>
      <Container className="pt-10 pb-12 sm:pt-14">{children}</Container>
    </header>
  );
}

function FilDAriane({ elements }) {
  return (
    <nav aria-label="Fil d'Ariane" className={cx("flex flex-wrap gap-2 text-xs text-ink-300", mono)}>
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

function Pastille({ actif, onClick, desactive, children, nombre, point }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={actif}
      disabled={desactive}
      className={cx(
        "inline-flex min-h-10 items-center gap-2 rounded-full border px-3.5 text-sm font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-45",
        actif
          ? "border-ink-950 bg-ink-950 text-white dark:border-white dark:bg-white dark:text-ink-950"
          : "border-ink-200 bg-white text-ink-950 hover:border-ink-400 dark:border-ink-700 dark:bg-ink-900 dark:text-white"
      )}
    >
      {point}
      {children}
      <span
        className={cx(
          "font-mono text-[10.5px] font-medium",
          actif ? "rounded bg-lime-400 px-1 text-ink-950" : "text-ink-500 dark:text-ink-400"
        )}
      >
        {nombre}
      </span>
    </button>
  );
}

/* ================================================================== */
/* Liste des exercices                                                 */
/* ================================================================== */

const ETAPES = [
  ["Cherche d'abord", "Sur ta copie, sans regarder la solution."],
  ["L'indice si tu bloques", "Un coup de pouce, avant la correction."],
  ["Compare ta méthode", "À la correction détaillée, étape par étape."],
];

export function Exercices() {
  const [recherche, setRecherche] = useState("");
  const [matiere, setMatiere] = useState("toutes");
  const [difficulte, setDifficulte] = useState("toutes");
  const champRecherche = useRef(null);

  // « / » place le curseur dans la recherche, comme sur beaucoup de sites.
  useEffect(() => {
    const surTouche = (e) => {
      if (e.key !== "/" || e.ctrlKey || e.metaKey || e.altKey) return;
      const cible = e.target;
      if (cible.closest?.("input, textarea, select, [contenteditable='true']")) return;
      e.preventDefault();
      champRecherche.current?.focus();
    };
    window.addEventListener("keydown", surTouche);
    return () => window.removeEventListener("keydown", surTouche);
  }, []);

  const matieresAvecExercices = matieres.filter((m) => exercices.some((e) => e.matiere === m.id));
  const parDifficulte = Object.fromEntries(difficultes.map((d) => [d, exercices.filter((e) => e.difficulte === d).length]));

  const q = normalise(recherche.trim());
  const resultats = exercices.filter((e) => {
      if (matiere !== "toutes" && e.matiere !== matiere) return false;
      if (difficulte !== "toutes" && e.difficulte !== difficulte) return false;
      if (!q) return true;
      const corpus = normalise([e.titre, e.enonce, ...e.tags, nomMatiere(e.matiere)].join(" "));
      return corpus.includes(q);
  });

  const chiffres = [
    [exercices.length, `exercice${exercices.length > 1 ? "s" : ""}`],
    [matieresAvecExercices.length, `matière${matieresAvecExercices.length > 1 ? "s" : ""}`],
    ...difficultes.filter((d) => parDifficulte[d] > 0).map((d) => [parDifficulte[d], parDifficulte[d] > 1 ? PLURIELS[d] : d.toLowerCase()]),
  ];

  return (
    <>
      <EnTeteSombre className="pb-16 sm:pb-20">
        <FilDAriane elements={[{ label: "Accueil", to: "/tableau-de-bord" }, { label: "S'entraîner" }, { label: "Exercices corrigés" }]} />
        <div className="mt-6 flex flex-wrap items-end justify-between gap-10">
          <div className="min-w-0 flex-[1_1_min(540px,100%)]">
            <h1 className="text-[clamp(3rem,9vw,7rem)] leading-[0.9] font-extrabold tracking-[-0.055em]">
              Exercices <span className="block text-lime-400">corrigés.</span>
            </h1>
            <p className="mt-6 max-w-[560px] text-lg/8 text-ink-200 sm:text-xl/8">
              Cherche d&apos;abord, utilise l&apos;indice si tu bloques, puis compare ta méthode à la correction détaillée.
              Chaque corrigé explique le raisonnement, pas seulement le résultat.
            </p>
            <dl className="mt-7 flex flex-wrap gap-x-8 gap-y-3">
              {chiffres.map(([n, libelle]) => (
                <div key={libelle} className="flex flex-col-reverse">
                  <dt className="text-sm text-ink-300">{libelle}</dt>
                  <dd className="m-0 text-[44px] leading-none font-extrabold tracking-[-0.04em]">{n}</dd>
                </div>
              ))}
            </dl>
          </div>
          <ol className="w-full max-w-[420px] overflow-hidden rounded-[24px] border border-white/10 bg-white/4">
            {ETAPES.map(([titre, texte], i) => (
              <li key={titre} className="flex gap-4 border-b border-white/10 px-6 py-5 last:border-b-0">
                <span className={cx("pt-0.5 text-[11px] text-lime-400", mono)}>{numero(i + 1)}</span>
                <span>
                  <span className="block font-extrabold">{titre}</span>
                  <span className="mt-0.5 block text-sm text-ink-300">{texte}</span>
                </span>
              </li>
            ))}
          </ol>
        </div>
      </EnTeteSombre>

      <Container className="pb-14">
        {/* ---- Recherche et filtres, à cheval sur l'en-tête ---- */}
        <div className="relative -mt-10 space-y-4 rounded-[28px] border border-ink-200 bg-white p-4 shadow-[0_30px_60px_-34px_rgb(13_16_26/0.35)] sm:p-5 dark:border-ink-800 dark:bg-ink-900">
          <div className="relative">
            <label htmlFor="recherche-exercices" className="sr-only">
              Rechercher un exercice
            </label>
            <Icon name="search" className="pointer-events-none absolute top-1/2 left-4.5 size-5 -translate-y-1/2 text-ink-500 dark:text-ink-400" />
            <input
              ref={champRecherche}
              id="recherche-exercices"
              type="search"
              value={recherche}
              onChange={(e) => setRecherche(e.target.value)}
              placeholder="Rechercher un exercice, un mot-clé…"
              className="w-full rounded-[18px] border border-ink-200 bg-white py-3.5 pr-12 pl-12 text-base text-ink-900 placeholder:text-ink-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 focus:outline-none dark:border-ink-700 dark:bg-ink-950 dark:text-white"
            />
            <kbd
              aria-hidden="true"
              className="absolute top-1/2 right-3.5 hidden -translate-y-1/2 rounded-md border border-ink-200 px-1.5 font-mono text-xs text-ink-500 sm:block dark:border-ink-700 dark:text-ink-400"
            >
              /
            </kbd>
          </div>
          <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filtrer par matière">
            <span className={cx("mr-2 text-[11px] font-bold text-ink-500 dark:text-ink-400", mono)} aria-hidden="true">
              MATIÈRE
            </span>
            <Pastille actif={matiere === "toutes"} onClick={() => setMatiere("toutes")} nombre={exercices.length}>
              Toutes les matières
            </Pastille>
            {matieresAvecExercices.map((m) => (
              <Pastille
                key={m.id}
                actif={matiere === m.id}
                onClick={() => setMatiere(m.id)}
                nombre={exercices.filter((e) => e.matiere === m.id).length}
                point={<Point matiere={m.id} />}
              >
                {m.nom}
              </Pastille>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filtrer par difficulté">
            <span className={cx("mr-2 text-[11px] font-bold text-ink-500 dark:text-ink-400", mono)} aria-hidden="true">
              NIVEAU
            </span>
            <Pastille actif={difficulte === "toutes"} onClick={() => setDifficulte("toutes")} nombre={exercices.length}>
              Tous niveaux
            </Pastille>
            {difficultes.map((d) => (
              <Pastille
                key={d}
                actif={difficulte === d}
                onClick={() => setDifficulte(d)}
                nombre={parDifficulte[d]}
                desactive={parDifficulte[d] === 0}
              >
                {d}
              </Pastille>
            ))}
          </div>
        </div>

        <p className="mt-8 text-[15px] text-ink-600 dark:text-ink-300" role="status">
          <b className="text-ink-950 dark:text-white">
            {resultats.length} exercice{resultats.length > 1 ? "s" : ""}
          </b>{" "}
          affiché{resultats.length > 1 ? "s" : ""} sur {exercices.length}.
        </p>

        <div className="mt-5">
          {resultats.length === 0 ? (
            <EtatVide titre="Aucun exercice ne correspond" texte="Élargis la recherche ou retire un filtre.">
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
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {resultats.map((e) => {
                const { texte, code } = extrait(e.enonce);
                return (
                  <li key={e.id}>
                    <Link
                      to={`/exercices/${e.id}`}
                      className="group flex h-full flex-col rounded-[28px] border border-ink-200 bg-white p-6 transition-[border-color,transform] hover:-translate-y-0.5 hover:border-brand-300 dark:border-ink-800 dark:bg-ink-900 dark:hover:border-brand-500/50"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <span
                          aria-hidden="true"
                          className="text-[52px] leading-[0.85] font-extrabold tracking-[-0.06em] text-transparent [-webkit-text-stroke:1.5px_var(--color-brand-600)] dark:[-webkit-text-stroke-color:var(--color-brand-400)]"
                        >
                          {numero(rang(e))}
                        </span>
                        <BoutonFavori type="exercice" reference={e.id} libelle={e.titre} variante="encadre" taille="lg" />
                      </div>
                      <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[13px] text-ink-600 dark:text-ink-300">
                        <Difficulte valeur={e.difficulte} />
                        <span className="inline-flex items-center gap-1.5 font-semibold text-ink-800 dark:text-ink-200">
                          <Point matiere={e.matiere} />
                          {getMatiere(e.matiere)?.nomCourt ?? nomMatiere(e.matiere)}
                        </span>
                        {e.duree && (
                          <span className="inline-flex items-center gap-1 font-semibold">
                            <Icon name="clock" className="size-3.5" />
                            {e.duree}
                          </span>
                        )}
                      </div>
                      <h2 className="mt-3 text-[22px] leading-[1.15] font-extrabold tracking-[-0.025em] text-ink-950 group-hover:text-brand-600 dark:text-white dark:group-hover:text-brand-300">
                        {e.titre}
                      </h2>
                      <div className="mt-2.5 flex-1">
                        {!e.enonce && e.pdfEnonce ? (
                          <p className="inline-flex items-center gap-1.5 text-[15px] text-ink-600 dark:text-ink-300">
                            <Icon name="file" className="size-4 text-flame-500" />
                            Énoncé en PDF{e.pdfCorrige ? ", avec sa correction" : ""}
                          </p>
                        ) : (
                          <>
                            {texte && <p className="line-clamp-3 text-[15px]/6 text-ink-600 dark:text-ink-300">{texte}</p>}
                            {code && (
                              <pre
                                aria-hidden="true"
                                className="mt-3 max-h-28 overflow-hidden rounded-[14px] bg-[#0b0e17] px-3.5 py-3 font-mono text-[12px]/5 text-ink-100 [mask-image:linear-gradient(to_bottom,black_70%,transparent)] dark:ring-1 dark:ring-white/10"
                              >
                                {code}
                              </pre>
                            )}
                          </>
                        )}
                      </div>
                      {e.tags.length > 0 && (
                        <div className="mt-5 flex flex-wrap gap-1.5">
                          {e.tags.map((t) => (
                            <span key={t} className="rounded-lg bg-ink-100 px-2 py-1 text-xs font-bold text-ink-700 dark:bg-ink-800 dark:text-ink-300">
                              {t}
                            </span>
                          ))}
                        </div>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
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

/* Un bloc numéroté de la page : « 01 Énoncé », « 02 Besoin d'un coup
   de pouce ? »… */
function Bloc({ id, n, titre, action, ton = "clair", children }) {
  const tons = {
    clair: "border border-ink-200 bg-white dark:border-ink-800 dark:bg-ink-900",
    ambre: "border border-sun-400/50 bg-[#fffbeb] dark:border-sun-400/25 dark:bg-sun-500/8",
    // `dark` : à l'intérieur, tout prend les couleurs du thème sombre.
    sombre: "dark bg-[#0b0e17] text-white ring-1 ring-white/5",
  };
  return (
    <section id={id} aria-labelledby={`${id}-titre`} className={cx("scroll-mt-24 rounded-[28px] p-6 sm:p-8", tons[ton])}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h2 id={`${id}-titre`} className="flex items-baseline gap-3 text-[26px] leading-tight font-extrabold tracking-[-0.03em] text-ink-950 sm:text-[30px] dark:text-white">
          <span className={cx("text-xs font-bold", mono, ton === "sombre" ? "text-lime-400" : "text-brand-600 dark:text-brand-400")}>{numero(n)}</span>
          {titre}
        </h2>
        {action}
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

const boutonSecondaire =
  "inline-flex min-h-11 items-center gap-2 rounded-[14px] border border-ink-200 bg-white px-4 text-sm font-bold text-ink-950 transition-colors hover:bg-ink-50 dark:border-ink-700 dark:bg-ink-900 dark:text-white dark:hover:bg-ink-800";

/* La correction écrite, sur fond sombre : étapes au grand numéro vert,
   réponse dans un encadré, « À retenir » sur fond vert. */
function CorrectionSombre({ exercice }) {
  const etapes = (exercice.etapes ?? []).filter((s) => s.trim());
  if (!etapes.length && !exercice.reponse && !exercice.explication) return <CorrectionExercice exercice={exercice} />;
  const rubrique = cx("mb-4 text-[11px] font-bold text-[#8eaaff]", mono);
  return (
    <PleinEcran titre={`Correction : ${exercice.titre}`}>
      <div className="space-y-8">
        {etapes.length > 0 && (
          <div>
            <h3 className={rubrique}>MÉTHODE, ÉTAPE PAR ÉTAPE</h3>
            <ol>
              {etapes.map((etape, i) => (
                <li key={i} className="flex gap-5 border-b border-white/10 py-4 first:pt-0 last:border-b-0">
                  <span
                    aria-hidden="true"
                    className="w-11 shrink-0 text-[34px] leading-none font-extrabold tracking-[-0.05em] text-transparent [-webkit-text-stroke:1.4px_var(--color-lime-400)]"
                  >
                    {numero(i + 1)}
                  </span>
                  <span className="min-w-0 pt-1 text-base/7 whitespace-pre-line text-ink-100">
                    <EnLigne texte={etape} />
                  </span>
                </li>
              ))}
            </ol>
          </div>
        )}
        {exercice.reponse && (
          <div>
            <h3 className={rubrique}>RÉPONSE</h3>
            <div className="overflow-x-auto rounded-[18px] border border-white/10 bg-white/4 px-5 py-4">
              <TexteLibre texte={exercice.reponse} grand />
            </div>
          </div>
        )}
        {exercice.explication && (
          <div>
            <h3 className={rubrique}>À RETENIR</h3>
            <div className="flex gap-3 rounded-[18px] bg-lime-400 px-5 py-4 text-ink-950">
              <Icon name="bulb" className="mt-1 size-5 shrink-0" />
              <TexteLibre texte={exercice.explication} className="text-[15.5px]/7 font-semibold text-ink-950!" />
            </div>
          </div>
        )}
        {exercice.pdfCorrige && (
          <a
            href={urlPdf(exercice.pdfCorrige.id)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm font-bold text-[#8eaaff] hover:underline"
          >
            <Icon name="file" className="size-4" />
            Télécharger la correction en PDF ↗
          </a>
        )}
      </div>
    </PleinEcran>
  );
}

/* Le sommaire suit la lecture : le bloc le plus haut à l'écran est
   surligné. */
function useBlocVisible(ids) {
  const [actif, setActif] = useState(ids[0]);
  const cle = ids.join(",");
  useEffect(() => {
    const blocs = cle
      .split(",")
      .map((id) => document.getElementById(id))
      .filter(Boolean);
    if (!blocs.length || typeof IntersectionObserver === "undefined") return undefined;
    const io = new IntersectionObserver(
      (entrees) => {
        const visibles = entrees.filter((e) => e.isIntersecting).map((e) => blocs.indexOf(e.target));
        if (visibles.length) setActif(blocs[Math.min(...visibles)].id);
      },
      { rootMargin: "-20% 0px -55% 0px" }
    );
    blocs.forEach((b) => io.observe(b));
    return () => io.disconnect();
  }, [cle]);
  return actif;
}

function DetailExercice({ exerciceId }) {
  const exercice = getExercice(exerciceId);

  const [indiceVisible, setIndiceVisible] = useState(false);
  const [correctionVisible, setCorrectionVisible] = useState(false);
  const [modeReponse, setModeReponse] = useState("questions");

  const textes = exercice ? textesExercice(exercice) : {};
  const aReponse = Boolean(exercice && textes.enonce && textes.corrige);
  const blocs = exercice
    ? [
        { id: "enonce", titre: "Énoncé" },
        ...(exercice.indice ? [{ id: "indice", titre: "Indice" }] : []),
        ...(aReponse ? [{ id: "ma-reponse", titre: "Ma réponse" }] : []),
        { id: "correction", titre: "Correction détaillée" },
      ]
    : [];
  const actif = useBlocVisible(blocs.map((b) => b.id));

  // Ouvrir la correction compte comme « exercice travaillé » dans le profil.
  const basculerCorrection = () => {
    if (!correctionVisible && exercice) marquerExerciceTravaille(exercice.id);
    setCorrectionVisible((v) => !v);
  };

  if (!exercice) {
    return (
      <Container className="py-20">
        <EtatVide titre="Exercice introuvable" texte="Cet exercice n'existe pas ou a été renommé.">
          <Bouton to="/exercices">Retour aux exercices</Bouton>
        </EtatVide>
      </Container>
    );
  }

  const matiere = getMatiere(exercice.matiere);
  const choixPossible = textes.corrige && questionsDe(textes.enonce).length > 0;
  const numeroDe = (id) => blocs.findIndex((b) => b.id === id) + 1;
  const suivants = exercices.filter((e) => e.id !== exercice.id && e.matiere === exercice.matiere).slice(0, 3);

  const aller = (id) => (e) => {
    // Les adresses du site sont à dièse : on fait défiler au lieu de changer d'adresse.
    e.preventDefault();
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <>
      <EnTeteSombre>
        <FilDAriane
          elements={[{ label: "Exercices", to: "/exercices" }, { label: nomMatiere(exercice.matiere) }, { label: numero(rang(exercice)) }]}
        />
        <Link to="/exercices" className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-ink-200 hover:text-white">
          <Icon name="arrow" className="size-4 rotate-180" />
          Tous les exercices
        </Link>
        <h1 className="mt-6 max-w-[1000px] text-[clamp(2.4rem,6vw,4.6rem)] leading-[0.98] font-extrabold tracking-[-0.045em] text-balance">
          {exercice.titre}
        </h1>
        <div className="mt-7 flex flex-wrap items-center gap-2.5">
          <span className="inline-flex min-h-11 items-center gap-2 rounded-full border border-white/15 px-4 text-sm font-bold">
            <i aria-hidden="true" className="size-2 rounded-full bg-lime-400" />
            {nomMatiere(exercice.matiere)}
          </span>
          <span className="inline-flex min-h-11 items-center gap-2 rounded-full border border-white/15 px-4 text-sm font-bold">
            <Icon name="target" className="size-4 text-lime-400" />
            {exercice.difficulte}
          </span>
          {exercice.duree && (
            <span className="inline-flex min-h-11 items-center gap-2 rounded-full border border-white/15 px-4 text-sm font-bold">
              <Icon name="clock" className="size-4 text-lime-400" />
              {exercice.duree}
            </span>
          )}
          <BoutonFavori type="exercice" reference={exercice.id} libelle={exercice.titre} variante="sombre" avecTexte />
        </div>
      </EnTeteSombre>

      <Container className="py-10">
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
          <div className="min-w-0 space-y-5">
            {/* La façon de répondre, choisie une fois, avant de commencer :
                seulement si l'énoncé a des questions numérotées. */}
            {choixPossible && (
              <section className="rounded-[24px] border border-ink-200 bg-white p-5 dark:border-ink-800 dark:bg-ink-900">
                <ChoixReponse valeur={modeReponse} onChange={setModeReponse} />
              </section>
            )}

            <Bloc id="enonce" n={numeroDe("enonce")} titre="Énoncé">
              {exercice.enonce ? (
                <PleinEcran titre={`Énoncé : ${exercice.titre}`}>
                  <TexteLibre texte={exercice.enonce} grand className="text-[18px]/8!" />
                </PleinEcran>
              ) : (
                <EnonceExercice exercice={exercice} className="" />
              )}
              {exercice.enonce && exercice.pdfEnonce && (
                <a
                  href={urlPdf(exercice.pdfEnonce.id)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-brand-600 hover:underline dark:text-brand-300"
                >
                  <Icon name="file" className="size-4" />
                  Télécharger l&apos;énoncé en PDF ↗
                </a>
              )}
              {exercice.tags.length > 0 && (
                <div className="mt-5 flex flex-wrap gap-1.5">
                  {exercice.tags.map((t) => (
                    <span key={t} className="rounded-lg bg-brand-50 px-2.5 py-1 text-xs font-bold text-brand-700 dark:bg-brand-500/15 dark:text-brand-300">
                      {t}
                    </span>
                  ))}
                </div>
              )}
            </Bloc>

            {exercice.indice && (
              <Bloc
                id="indice"
                n={numeroDe("indice")}
                titre="Besoin d'un coup de pouce ?"
                ton="ambre"
                action={
                  <button type="button" onClick={() => setIndiceVisible((v) => !v)} aria-expanded={indiceVisible} className={boutonSecondaire}>
                    <Icon name="bulb" className="size-4" />
                    {indiceVisible ? "Masquer l'indice" : "Afficher l'indice"}
                  </button>
                }
              >
                {indiceVisible ? (
                  <p className="text-base/7 text-ink-800 dark:text-ink-100">{exercice.indice}</p>
                ) : (
                  <p className="text-[15px] text-ink-600 dark:text-ink-300">Un coup de pouce, à ouvrir seulement si tu bloques.</p>
                )}
              </Bloc>
            )}

            {/* Écrire sa réponse et la faire corriger par l'IA, avant la correction */}
            {aReponse && (
              <RepondreExercice
                key={exercice.id}
                exercice={exercice}
                mode={modeReponse}
                numero={numeroDe("ma-reponse")}
                ancre="ma-reponse"
                indiceDisponible={Boolean(exercice.indice)}
                onBesoinIndice={() => setIndiceVisible(true)}
                onReussi={() => marquerExerciceTravaille(exercice.id)}
              />
            )}

            <Bloc
              id="correction"
              n={numeroDe("correction")}
              titre="Correction détaillée"
              ton="sombre"
              action={
                <button
                  type="button"
                  onClick={basculerCorrection}
                  aria-expanded={correctionVisible}
                  className={cx(
                    "inline-flex min-h-11 items-center gap-2 rounded-[14px] px-4 text-sm font-extrabold transition-colors",
                    correctionVisible ? "border border-white/20 text-white hover:bg-white/10" : "bg-lime-400 text-ink-950 hover:bg-lime-300"
                  )}
                >
                  {correctionVisible ? "Masquer" : "J'ai cherché, voir la correction"}
                </button>
              }
            >
              {correctionVisible ? (
                <CorrectionSombre exercice={exercice} />
              ) : (
                <p className="text-[15px] text-ink-300">
                  Prends le temps de chercher avant d&apos;ouvrir la correction. C&apos;est là que l&apos;apprentissage se joue.
                </p>
              )}
            </Bloc>
          </div>

          {/* ---- Colonne de droite ---- */}
          <aside className="space-y-4 lg:sticky lg:top-24">
            {/* Sur téléphone, cette liste de raccourcis n'est pas montrée :
                on descend directement dans l'énoncé, la réponse puis la
                correction. Elle reste sur ordinateur. */}
            <nav aria-label="Dans cet exercice" className="hidden rounded-[24px] border border-ink-200 bg-white p-4 lg:block dark:border-ink-800 dark:bg-ink-900">
              <p className={cx("px-2 pt-1 pb-3 text-[11px] font-bold text-ink-500 dark:text-ink-400", mono)}>DANS CET EXERCICE</p>
              <ol>
                {blocs.map((b, i) => (
                  <li key={b.id}>
                    <a
                      href={`#${b.id}`}
                      onClick={aller(b.id)}
                      aria-current={actif === b.id ? "true" : undefined}
                      className={cx(
                        "flex items-baseline gap-3 rounded-xl px-3 py-2.5 text-[15px] font-bold transition-colors",
                        actif === b.id
                          ? "bg-ink-950 text-white dark:bg-white dark:text-ink-950"
                          : "text-ink-800 hover:bg-ink-100 dark:text-ink-200 dark:hover:bg-ink-800"
                      )}
                    >
                      <span className={cx("text-[11px] font-medium", mono, actif === b.id ? "text-lime-400 dark:text-brand-600" : "text-ink-500 dark:text-ink-400")}>
                        {numero(i + 1)}
                      </span>
                      {b.titre}
                    </a>
                  </li>
                ))}
              </ol>
            </nav>

            <dl className="rounded-[24px] border border-ink-200 bg-white px-5 py-2 text-sm dark:border-ink-800 dark:bg-ink-900">
              {[
                ["Matière", nomMatiere(exercice.matiere)],
                ["Difficulté", exercice.difficulte],
                ...(exercice.duree ? [["Durée", exercice.duree]] : []),
                ...(exercice.tags.length ? [["Mots-clés", exercice.tags.join(", ")]] : []),
              ].map(([quoi, valeur]) => (
                <div key={quoi} className="flex justify-between gap-4 border-b border-ink-100 py-3 last:border-b-0 dark:border-ink-800">
                  <dt className="text-ink-600 dark:text-ink-400">{quoi}</dt>
                  <dd className="m-0 text-right font-extrabold text-ink-950 dark:text-white">{valeur}</dd>
                </div>
              ))}
            </dl>

            {suivants.length > 0 && (
              <section aria-labelledby="titre-suite" className="rounded-[24px] border border-ink-200 bg-white p-4 dark:border-ink-800 dark:bg-ink-900">
                <h2 id="titre-suite" className={cx("px-1 pt-1 pb-3 text-[11px]/5 font-bold text-ink-500 dark:text-ink-400", mono)}>
                  CONTINUER EN {(matiere?.nomCourt ?? nomMatiere(exercice.matiere)).toUpperCase()}
                </h2>
                <ul className="space-y-2.5">
                  {suivants.map((e) => (
                    <li key={e.id}>
                      <Link
                        to={`/exercices/${e.id}`}
                        className="block rounded-[16px] border border-ink-200 p-3.5 transition-colors hover:border-brand-300 dark:border-ink-700 dark:hover:border-brand-500/50"
                      >
                        <span className="flex items-center gap-2.5 text-xs text-ink-600 dark:text-ink-300">
                          <Difficulte valeur={e.difficulte} />
                          {e.duree && (
                            <span className="inline-flex items-center gap-1 font-semibold">
                              <Icon name="clock" className="size-3.5" />
                              {e.duree}
                            </span>
                          )}
                        </span>
                        <span className="mt-2 block text-sm/5 font-extrabold text-ink-950 dark:text-white">{e.titre}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </aside>
        </div>
      </Container>
    </>
  );
}
