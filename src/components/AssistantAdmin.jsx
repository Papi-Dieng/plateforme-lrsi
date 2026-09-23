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
  couper(`Exercice : ${e.titre}\n${e.format === "pdf" ? e.texteEnonce : e.enonce}`, 1100);

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
