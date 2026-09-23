import { useState } from "react";
import Icon from "./Icon";
import { cx } from "./ui";
import { champAdmin, messageErreurAdmin } from "./ConnexionAdmin";
import { demanderAgentAdmin } from "../ia";

/* ==================================================================
   Les propositions de l'agent admin, dans « Gérer le contenu ».

   L'agent PROPOSE, l'auteur DÉCIDE : chaque proposition s'affiche avec
   sa raison, et rien n'entre dans le brouillon sans un clic. Le relais
   a déjà écarté les compétences et les chapitres inventés.

   - `SuggestionCompetence` : un bouton à côté du choix de compétence
     d'un exercice ou d'une question de QCM ;
   - `PanneauCompetencesIA` : dans l'onglet Compétences, proposer des
     compétences pour une matière, et rattacher d'un coup tout ce qui
     n'a pas encore de compétence.
   ================================================================== */

const TAILLE_LOT = 40;
const couper = (t, max) => String(t ?? "").slice(0, max);

/* Le texte qu'on montre à l'agent pour un exercice ou une question. */
export const texteExercice = (e) =>
  couper(`Exercice : ${e.titre}\n${e.enonce || e.texteEnonce || ""}`, 1100);

export const texteQuestion = (x) =>
  couper(
    `Question de QCM : ${x.enonce}\nRéponses proposées : ${x.options.filter(Boolean).join(" | ")}\nBonne réponse : ${x.options[x.bonne] ?? ""}`,
    1100
  );

const pourAgent = (competences) =>
  competences.map((c) => ({ id: c.id, nom: c.nom, chapitres: c.chapitres }));

function Message({ etat }) {
  if (!etat.texte) return null;
  return (
    <p
      role="status"
      className={cx(
        "text-xs/5",
        etat.type === "erreur" ? "text-flame-600 dark:text-flame-400" : "text-ink-500"
      )}
    >
      {etat.texte}
    </p>
  );
}

/* ------------------------------------------------------------------ */
/* Suggestion pour un seul élément                                     */
/* ------------------------------------------------------------------ */

export function SuggestionCompetence({ matiere, competences, texte, valeur, onAppliquer, motDePasse }) {
  const [etat, setEtat] = useState({ type: "", texte: "" });
  const [proposition, setProposition] = useState(null);
  const disponibles = competences.filter((c) => c.matiere === matiere?.id);

  const suggerer = async () => {
    setProposition(null);
    setEtat({ type: "", texte: "L'IA réfléchit…" });
    try {
      const { propositions } = await demanderAgentAdmin(
        "rattacher",
        { matiere: matiere?.nom, competences: pourAgent(disponibles), elements: [{ ref: "element", texte }] },
        motDePasse
      );
      setProposition(propositions[0] ?? { competence: "", raison: "Pas de proposition." });
      setEtat({ type: "", texte: "" });
    } catch (e) {
      setEtat({ type: "erreur", texte: messageErreurAdmin(e.message) });
    }
  };

  const nom = (id) => disponibles.find((c) => c.id === id)?.nom;

  return (
    <div className="space-y-1.5">
      <button
        type="button"
        onClick={suggerer}
        disabled={disponibles.length === 0 || !texte.trim() || etat.texte === "L'IA réfléchit…"}
        title={disponibles.length === 0 ? "Aucune compétence dans cette matière" : undefined}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-600 hover:underline disabled:cursor-not-allowed disabled:opacity-40 dark:text-brand-300"
      >
        <Icon name="sparkles" className="size-3.5" />
        Suggérer avec l'IA
      </button>
      <Message etat={etat} />
      {proposition && (
        <div className="rounded-lg bg-brand-50 px-3 py-2 text-xs/5 text-ink-700 dark:bg-brand-500/10 dark:text-ink-200">
          {proposition.competence ? (
            <>
              <span className="font-semibold">{nom(proposition.competence)}</span> — {proposition.raison}{" "}
              {proposition.competence !== valeur ? (
                <button
                  type="button"
                  onClick={() => {
                    onAppliquer(proposition.competence);
                    setProposition(null);
                  }}
                  className="font-semibold text-brand-600 underline dark:text-brand-300"
                >
                  Appliquer
                </button>
              ) : (
                <span className="text-accent-700 dark:text-accent-400">(déjà choisie)</span>
              )}
            </>
          ) : (
            <>Aucune compétence ne convient vraiment : {proposition.raison}</>
          )}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* « À retenir » d'un exercice                                         */
/* ------------------------------------------------------------------ */

/* L'agent lit l'énoncé et la correction (écrits, ou à défaut le texte
   lu dans les PDF) et propose le « À retenir ». L'auteur l'utilise tel
   quel, le retouche, ou l'ignore. */
export function SuggestionARetenir({ exercice: e, matiere, onAppliquer, motDePasse }) {
  const [etat, setEtat] = useState({ type: "", texte: "" });
  const [proposition, setProposition] = useState(null);

  const enonce = e.enonce?.trim() || e.texteEnonce || "";
  const etapes = (e.etapes ?? []).map((s) => s.trim()).filter(Boolean);
  const correctionEcrite = [
    etapes.length ? `Méthode :\n${etapes.map((s, i) => `${i + 1}. ${s}`).join("\n")}` : "",
    e.reponse?.trim() ? `Réponse :\n${e.reponse.trim()}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");
  const correction = correctionEcrite || e.texteCorrige || "";
  const enCours = etat.texte === "L'IA lit l'exercice…";

  const suggerer = async () => {
    setProposition(null);
    setEtat({ type: "", texte: "L'IA lit l'exercice…" });
    try {
      const r = await demanderAgentAdmin(
        "a-retenir",
        { matiere: matiere?.nom, titre: e.titre, enonce: couper(enonce, 8000), correction: couper(correction, 8000) },
        motDePasse
      );
      setProposition(r);
      setEtat({ type: "", texte: "" });
    } catch (err) {
      setEtat({ type: "erreur", texte: messageErreurAdmin(err.message) });
    }
  };

  return (
    <div className="space-y-1.5">
      <button
        type="button"
        onClick={suggerer}
        disabled={(!enonce && !correction) || enCours}
        title={!enonce && !correction ? "Écris d'abord l'énoncé ou la correction" : undefined}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-600 hover:underline disabled:cursor-not-allowed disabled:opacity-40 dark:text-brand-300"
      >
        <Icon name="sparkles" className="size-3.5" />
        {e.explication?.trim() ? "Proposer un autre « À retenir » avec l'IA" : "Suggérer le « À retenir » avec l'IA"}
      </button>
      <Message etat={etat} />
      {proposition && (
        <div className="space-y-2 rounded-lg bg-brand-50 px-3 py-2.5 text-sm/6 text-ink-700 dark:bg-brand-500/10 dark:text-ink-200">
          <p className="whitespace-pre-line">{proposition.aRetenir}</p>
          {proposition.raison && <p className="text-xs text-ink-500 dark:text-ink-400">{proposition.raison}</p>}
          <div className="flex flex-wrap gap-3 text-xs font-semibold">
            <button
              type="button"
              onClick={() => {
                onAppliquer(proposition.aRetenir);
                setProposition(null);
              }}
              className="text-brand-600 underline dark:text-brand-300"
            >
              {e.explication?.trim() ? "Remplacer" : "Utiliser"}
            </button>
            <button type="button" onClick={() => setProposition(null)} className="text-ink-500 underline">
              Ignorer
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Panneau de l'onglet Compétences                                     */
/* ------------------------------------------------------------------ */

/* Tout ce qui, dans une matière, n'a pas encore de compétence. */
function sansCompetence(brouillon, matiereId) {
  const elements = [];
  for (const e of brouillon.exercices) {
    if (e.matiere === matiereId && !e.competence) {
      elements.push({ ref: `ex:${e.id}`, libelle: `Exercice · ${e.titre || e.id}`, texte: texteExercice(e) });
    }
  }
  for (const q of brouillon.qcms) {
    if (q.matiere !== matiereId) continue;
    q.questions.forEach((x, i) => {
      if (!x.competence && x.enonce.trim()) {
        elements.push({ ref: `q:${q.id}:${i}`, libelle: `QCM « ${q.titre} » · question ${i + 1}`, texte: texteQuestion(x) });
      }
    });
  }
  return elements;
}

export function PanneauCompetencesIA({ brouillon, appliquer, motDePasse, identifiant }) {
  const [matiereId, setMatiereId] = useState(brouillon.matieres[0]?.id ?? "");
  const [etat, setEtat] = useState({ type: "", texte: "" });
  const [idees, setIdees] = useState(null); // compétences proposées
  const [rattachements, setRattachements] = useState(null); // lignes à relire
  const [occupe, setOccupe] = useState(false);

  const matiere = brouillon.matieres.find((m) => m.id === matiereId);
  const competences = brouillon.competences.filter((c) => c.matiere === matiereId);
  const aRattacher = sansCompetence(brouillon, matiereId);

  const erreur = (e) => setEtat({ type: "erreur", texte: messageErreurAdmin(e.message) });

  /* ---- Proposer des compétences ---- */
  const proposer = async () => {
    setOccupe(true);
    setIdees(null);
    setRattachements(null);
    setEtat({ type: "", texte: "L'IA lit les chapitres de la matière…" });
    try {
      const { competences: proposees } = await demanderAgentAdmin(
        "proposer-competences",
        {
          matiere: matiere.nom,
          existantes: competences.map((c) => c.nom),
          chapitres: matiere.chapitres.map((c) => ({
            titre: c.titre,
            texte: [c.resume, c.contenu || c.texteIA].filter(Boolean).join("\n").slice(0, 3000),
          })),
        },
        motDePasse
      );
      setIdees(proposees.map((c) => ({ ...c, garder: true })));
      setEtat({ type: "", texte: proposees.length ? "" : "L'IA ne propose pas de nouvelle compétence pour cette matière." });
    } catch (e) {
      erreur(e);
    } finally {
      setOccupe(false);
    }
  };

  const ajouterIdees = () => {
    const gardees = idees.filter((c) => c.garder);
    appliquer((b) => {
      const nouvelles = [];
      for (const c of gardees) {
        nouvelles.push({
          id: identifiant(`${matiereId}-${c.nom}`, [...b.competences, ...nouvelles]),
          nom: c.nom,
          matiere: matiereId,
          chapitres: c.chapitres,
        });
      }
      return { ...b, competences: [...b.competences, ...nouvelles] };
    });
    setEtat({ type: "", texte: `${gardees.length} compétence(s) ajoutée(s) au brouillon.` });
    setIdees(null);
  };

  /* ---- Rattacher tout ce qui n'a pas de compétence ---- */
  const rattacherTout = async () => {
    setOccupe(true);
    setIdees(null);
    setRattachements(null);
    const lignes = [];
    try {
      for (let i = 0; i < aRattacher.length; i += TAILLE_LOT) {
        setEtat({ type: "", texte: `L'IA classe les éléments ${i + 1} à ${Math.min(i + TAILLE_LOT, aRattacher.length)} sur ${aRattacher.length}…` });
        const lot = aRattacher.slice(i, i + TAILLE_LOT);
        const { propositions } = await demanderAgentAdmin(
          "rattacher",
          { matiere: matiere.nom, competences: pourAgent(competences), elements: lot.map(({ ref, texte }) => ({ ref, texte })) },
          motDePasse
        );
        for (const el of lot) {
          const p = propositions.find((x) => x.ref === el.ref);
          lignes.push({ ...el, competence: p?.competence ?? "", raison: p?.raison ?? "Pas de proposition.", garder: Boolean(p?.competence) });
        }
      }
      setRattachements(lignes);
      setEtat({ type: "", texte: "" });
    } catch (e) {
      // Les lots déjà classés restent affichés.
      if (lignes.length) setRattachements(lignes);
      erreur(e);
    } finally {
      setOccupe(false);
    }
  };

  const appliquerRattachements = () => {
    const choix = new Map(rattachements.filter((l) => l.garder && l.competence).map((l) => [l.ref, l.competence]));
    appliquer((b) => ({
      ...b,
      exercices: b.exercices.map((e) => (choix.has(`ex:${e.id}`) ? { ...e, competence: choix.get(`ex:${e.id}`) } : e)),
      qcms: b.qcms.map((q) => ({
        ...q,
        questions: q.questions.map((x, i) => (choix.has(`q:${q.id}:${i}`) ? { ...x, competence: choix.get(`q:${q.id}:${i}`) } : x)),
      })),
    }));
    setEtat({ type: "", texte: `${choix.size} élément(s) rattaché(s) dans le brouillon.` });
    setRattachements(null);
  };

  return (
    <section className="card space-y-4 p-5">
      <div className="flex flex-wrap items-center gap-3">
        <span className="grid size-9 place-items-center rounded-xl bg-brand-600 text-white">
          <Icon name="sparkles" className="size-4.5" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="font-semibold text-ink-900 dark:text-white">Assistant IA de l'admin</h2>
          <p className="text-xs text-ink-500 dark:text-ink-400">
            Il propose, tu choisis : rien n'entre dans le brouillon sans ton clic, et rien n'est
            publié avant « Publier ».
          </p>
        </div>
        <select
          value={matiereId}
          onChange={(e) => {
            setMatiereId(e.target.value);
            setIdees(null);
            setRattachements(null);
            setEtat({ type: "", texte: "" });
          }}
          aria-label="Matière"
          className={cx(champAdmin, "w-auto")}
        >
          {brouillon.matieres.map((m) => (
            <option key={m.id} value={m.id}>
              {m.nom}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={proposer}
          disabled={occupe || !matiere?.chapitres.length}
          className="inline-flex items-center gap-2 rounded-xl border border-ink-200 px-3.5 py-2 text-sm font-semibold text-ink-700 hover:bg-ink-50 disabled:opacity-50 dark:border-ink-700 dark:text-ink-200 dark:hover:bg-ink-800"
        >
          <Icon name="bulb" className="size-4" />
          Proposer des compétences
        </button>
        <button
          type="button"
          onClick={rattacherTout}
          disabled={occupe || aRattacher.length === 0 || competences.length === 0}
          className="inline-flex items-center gap-2 rounded-xl border border-ink-200 px-3.5 py-2 text-sm font-semibold text-ink-700 hover:bg-ink-50 disabled:opacity-50 dark:border-ink-700 dark:text-ink-200 dark:hover:bg-ink-800"
        >
          <Icon name="layers" className="size-4" />
          Rattacher ce qui n'a pas de compétence ({aRattacher.length})
        </button>
      </div>
      <Message etat={etat} />

      {/* ---- Compétences proposées ---- */}
      {idees?.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-semibold text-ink-900 dark:text-white">Compétences proposées</p>
          <ul className="space-y-2">
            {idees.map((c, i) => (
              <li key={c.nom} className="rounded-xl border border-ink-200 p-3 dark:border-ink-800">
                <label className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={c.garder}
                    onChange={(e) => setIdees((l) => l.map((x, j) => (j === i ? { ...x, garder: e.target.checked } : x)))}
                    className="mt-1 size-4 accent-brand-600"
                  />
                  <span className="min-w-0 flex-1 text-sm">
                    <span className="font-semibold text-ink-900 dark:text-white">{c.nom}</span>
                    <span className="block text-xs text-ink-500">{c.raison}</span>
                    <span className="block text-xs text-ink-400">
                      Chapitres : {c.chapitres.length ? c.chapitres.join(", ") : "aucun"}
                    </span>
                  </span>
                </label>
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={ajouterIdees}
            disabled={!idees.some((c) => c.garder)}
            className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
          >
            Ajouter les compétences cochées
          </button>
        </div>
      )}

      {/* ---- Rattachements à relire ---- */}
      {rattachements?.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-semibold text-ink-900 dark:text-white">
            Rattachements proposés <span className="font-normal text-ink-500">· relis, corrige si besoin, puis applique</span>
          </p>
          <ul className="max-h-[50vh] space-y-2 overflow-y-auto">
            {rattachements.map((l, i) => (
              <li key={l.ref} className="rounded-xl border border-ink-200 p-3 dark:border-ink-800">
                <div className="flex flex-wrap items-start gap-3">
                  <input
                    type="checkbox"
                    checked={l.garder}
                    aria-label={`Garder la proposition pour ${l.libelle}`}
                    onChange={(e) => setRattachements((t) => t.map((x, j) => (j === i ? { ...x, garder: e.target.checked } : x)))}
                    className="mt-2 size-4 accent-brand-600"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-ink-900 dark:text-white">{l.libelle}</p>
                    <p className="line-clamp-2 text-xs text-ink-500">{l.texte}</p>
                    <p className="mt-1 text-xs text-ink-400">IA : {l.raison}</p>
                  </div>
                  <select
                    value={l.competence}
                    aria-label={`Compétence pour ${l.libelle}`}
                    onChange={(e) =>
                      setRattachements((t) =>
                        t.map((x, j) => (j === i ? { ...x, competence: e.target.value, garder: Boolean(e.target.value) } : x))
                      )
                    }
                    className={cx(champAdmin, "w-56")}
                  >
                    <option value="">Aucune</option>
                    {competences.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nom}
                      </option>
                    ))}
                  </select>
                </div>
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={appliquerRattachements}
            disabled={!rattachements.some((l) => l.garder && l.competence)}
            className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
          >
            Appliquer les rattachements cochés
          </button>
        </div>
      )}
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Générer des questions de QCM à partir du cours                      */
/* ------------------------------------------------------------------ */

const NIVEAUX = ["Débutant", "Intermédiaire", "Avancé"];

export function GenerateurQcm({ qcm, matiere, competences, motDePasse, onAjouter }) {
  const [ouvert, setOuvert] = useState(false);
  const [choisis, setChoisis] = useState([]);
  const [nombre, setNombre] = useState(5);
  const [niveau, setNiveau] = useState(NIVEAUX.includes(qcm.niveau) ? qcm.niveau : "Intermédiaire");
  const [etat, setEtat] = useState({ type: "", texte: "" });
  const [propositions, setPropositions] = useState(null);
  const [occupe, setOccupe] = useState(false);

  const chapitres = matiere?.chapitres ?? [];
  const disponibles = competences.filter((c) => c.matiere === matiere?.id);
  const aDuCours = (c) => Boolean(c.contenu || c.texteIA);
  const coursDe = (c) => [c.resume, c.contenu || c.texteIA].filter(Boolean).join("\n");
  const sansCours = chapitres.filter((c) => choisis.includes(c.titre) && !aDuCours(c)).length;

  const generer = async () => {
    setOccupe(true);
    setPropositions(null);
    setEtat({ type: "", texte: `L'IA écrit ${nombre} questions… (20 à 40 secondes)` });
    try {
      const { questions } = await demanderAgentAdmin(
        "generer-qcm",
        {
          matiere: matiere.nom,
          niveau,
          nombre,
          chapitres: chapitres
            .filter((c) => choisis.includes(c.titre))
            .map((c) => ({ titre: c.titre, texte: coursDe(c) })),
          competences: disponibles.map((c) => ({ id: c.id, nom: c.nom })),
          existantes: qcm.questions.map((x) => x.enonce).filter(Boolean),
        },
        motDePasse
      );
      setPropositions(questions.map((x) => ({ ...x, garder: true })));
      setEtat({
        type: "",
        texte: questions.length
          ? `${questions.length} question(s) proposée(s). Relis chacune avant de l'ajouter : l'IA peut se tromper.`
          : "L'IA n'a proposé aucune question valable. Réessaie, ou choisis d'autres chapitres.",
      });
    } catch (e) {
      setEtat({ type: "erreur", texte: messageErreurAdmin(e.message) });
    } finally {
      setOccupe(false);
    }
  };

  const ajouter = () => {
    const gardees = propositions
      .filter((x) => x.garder)
      .map((x) => ({
        enonce: x.enonce,
        options: x.options,
        bonne: x.bonne,
        explication: x.explication,
        competence: x.competence,
      }));
    onAjouter(gardees);
    setEtat({ type: "", texte: `${gardees.length} question(s) ajoutée(s) à la fin du QCM.` });
    setPropositions(null);
  };

  const nomCompetence = (id) => disponibles.find((c) => c.id === id)?.nom;

  if (!ouvert) {
    return (
      <button
        type="button"
        onClick={() => setOuvert(true)}
        disabled={!matiere}
        className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-3.5 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
      >
        <Icon name="sparkles" className="size-4" />
        Générer des questions avec l'IA
      </button>
    );
  }

  return (
    <section className="space-y-4 rounded-xl border border-brand-300 bg-brand-50/40 p-4 dark:border-brand-500/30 dark:bg-brand-500/5">
      <div className="flex items-center justify-between gap-3">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-ink-900 dark:text-white">
          <Icon name="sparkles" className="size-4 text-brand-500" />
          Générer des questions avec l'IA
        </h3>
        <button type="button" onClick={() => setOuvert(false)} className="text-xs text-ink-500 hover:underline">
          Fermer
        </button>
      </div>

      <fieldset>
        <legend className="text-xs font-semibold text-ink-600 dark:text-ink-300">
          Chapitres sur lesquels porter les questions
        </legend>
        <div className="mt-2 grid gap-1 sm:grid-cols-2">
          {chapitres.map((c) => (
            <label
              key={c.titre}
              className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-ink-700 hover:bg-white dark:text-ink-300 dark:hover:bg-ink-800"
            >
              <input
                type="checkbox"
                checked={choisis.includes(c.titre)}
                onChange={() =>
                  setChoisis((l) => (l.includes(c.titre) ? l.filter((t) => t !== c.titre) : [...l, c.titre]))
                }
                className="size-4 accent-brand-600"
              />
              <span className="min-w-0 flex-1 truncate">{c.titre}</span>
              {!aDuCours(c) && <span className="text-[11px] text-sun-700 dark:text-sun-400">sans cours</span>}
            </label>
          ))}
        </div>
        {sansCours > 0 && (
          <p className="mt-2 text-xs text-sun-700 dark:text-sun-400">
            {sansCours} chapitre(s) choisi(s) sans cours rédigé : l'IA s'appuiera sur ses connaissances
            générales. Relis encore plus attentivement.
          </p>
        )}
      </fieldset>

      <div className="flex flex-wrap items-end gap-3">
        <label className="text-xs font-semibold text-ink-600 dark:text-ink-300">
          Nombre
          <select
            value={nombre}
            onChange={(e) => setNombre(Number(e.target.value))}
            className={cx(champAdmin, "mt-1.5 w-24 font-normal")}
          >
            {[3, 5, 10, 15].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-semibold text-ink-600 dark:text-ink-300">
          Niveau
          <select
            value={niveau}
            onChange={(e) => setNiveau(e.target.value)}
            className={cx(champAdmin, "mt-1.5 w-40 font-normal")}
          >
            {NIVEAUX.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          onClick={generer}
          disabled={occupe || choisis.length === 0}
          className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
        >
          <Icon name="sparkles" className="size-4" />
          {occupe ? "Génération…" : "Générer"}
        </button>
      </div>
      <Message etat={etat} />

      {propositions?.length > 0 && (
        <div className="space-y-3">
          <ul className="space-y-3">
            {propositions.map((x, i) => (
              <li
                key={i}
                className={cx(
                  "rounded-xl border border-ink-200 bg-white p-4 dark:border-ink-700 dark:bg-ink-900",
                  !x.garder && "opacity-50"
                )}
              >
                <label className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={x.garder}
                    onChange={(e) =>
                      setPropositions((l) => l.map((y, j) => (j === i ? { ...y, garder: e.target.checked } : y)))
                    }
                    className="mt-1 size-4 accent-brand-600"
                    aria-label={`Garder la question ${i + 1}`}
                  />
                  <span className="min-w-0 flex-1 text-sm font-medium text-ink-900 dark:text-white">{x.enonce}</span>
                </label>
                <ol className="mt-2 space-y-1 pl-7">
                  {x.options.map((o, k) => (
                    <li
                      key={k}
                      className={cx(
                        "rounded-md px-2 py-1 text-sm",
                        k === x.bonne
                          ? "bg-accent-50 font-semibold text-accent-800 dark:bg-accent-500/10 dark:text-accent-300"
                          : "text-ink-600 dark:text-ink-400"
                      )}
                    >
                      {k === x.bonne ? "✓ " : ""}
                      {o}
                    </li>
                  ))}
                </ol>
                <p className="mt-2 pl-7 text-xs/5 text-ink-500">{x.explication}</p>
                <p className="mt-1 pl-7 text-[11px] text-ink-400">
                  Compétence : {nomCompetence(x.competence) ?? "aucune"}
                </p>
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={ajouter}
            disabled={!propositions.some((x) => x.garder)}
            className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
          >
            Ajouter les questions cochées ({propositions.filter((x) => x.garder).length})
          </button>
        </div>
      )}
    </section>
  );
}
