import { useState } from "react";
import Icon from "./Icon";
import { cx } from "./classes";
import { champAdmin } from "./ConnexionAdmin";
import { messageErreurAdmin } from "../sessionAdmin";
import { demanderAgentAdmin } from "../ia";
import { couper } from "../textesAgent";

/* ==================================================================
   Les propositions de l'agent admin, dans « Gérer le contenu ».

   L'agent PROPOSE, l'auteur DÉCIDE : chaque proposition s'affiche avec
   sa raison, et rien n'entre dans le brouillon sans un clic.

   - `SuggestionARetenir` : le « À retenir » d'un exercice ;
   - `GenerateurQcm` : des questions de QCM écrites à partir du cours ;
   - `RemplirDepuisPdf`, `PanneauImportTD` : remplir un exercice, ou
     découper un TD entier, à partir d'un PDF.
   ================================================================== */


function Message({ etat }) {
  if (!etat.texte) return null;
  return (
    <p
      role="status"
      className={cx(
        "text-xs/5",
        etat.type === "erreur" ? "text-flame-600 dark:text-flame-400" : "text-ink-500 dark:text-ink-400"
      )}
    >
      {etat.texte}
    </p>
  );
}

/* ------------------------------------------------------------------ */
/* Suggestion pour un seul élément                                     */
/* ------------------------------------------------------------------ */

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
            <button type="button" onClick={() => setProposition(null)} className="text-ink-500 dark:text-ink-400 underline">
              Ignorer
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Générer des questions de QCM à partir du cours                      */
/* ------------------------------------------------------------------ */

const NIVEAUX = ["Débutant", "Intermédiaire", "Avancé"];

export function GenerateurQcm({ qcm, matiere, motDePasse, onAjouter }) {
  const [ouvert, setOuvert] = useState(false);
  const [choisis, setChoisis] = useState([]);
  const [nombre, setNombre] = useState(5);
  const [niveau, setNiveau] = useState(NIVEAUX.includes(qcm.niveau) ? qcm.niveau : "Intermédiaire");
  const [etat, setEtat] = useState({ type: "", texte: "" });
  const [propositions, setPropositions] = useState(null);
  const [occupe, setOccupe] = useState(false);

  const chapitres = matiere?.chapitres ?? [];
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
      }));
    onAjouter(gardees);
    setEtat({ type: "", texte: `${gardees.length} question(s) ajoutée(s) à la fin du QCM.` });
    setPropositions(null);
  };

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
        <button type="button" onClick={() => setOuvert(false)} className="text-xs text-ink-500 dark:text-ink-400 hover:underline">
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
                <p className="mt-2 pl-7 text-xs/5 text-ink-500 dark:text-ink-400">{x.explication}</p>
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

/* ------------------------------------------------------------------ */
/* Remplir un exercice à partir de ses PDF                             */
/* ------------------------------------------------------------------ */

/* L'exercice a un énoncé (et peut-être une correction) en PDF : l'agent
   en lit le texte et propose tous les champs écrits. L'auteur relit la
   proposition, puis remplit l'exercice d'un clic. */
export function RemplirDepuisPdf({ exercice: e, matiere, onAppliquer, motDePasse }) {
  const [etat, setEtat] = useState({ type: "", texte: "" });
  const [proposition, setProposition] = useState(null);
  const [occupe, setOccupe] = useState(false);

  if (!e.pdfEnonce) return null;
  const lisible = Boolean(e.texteEnonce);

  const lancer = async () => {
    setOccupe(true);
    setProposition(null);
    setEtat({ type: "", texte: "L'IA lit les PDF et rédige l'exercice… (jusqu'à une minute)" });
    try {
      const { exercices } = await demanderAgentAdmin(
        "extraire-exercices",
        { un: true, matiere: matiere?.nom, titre: e.titre, enonce: e.texteEnonce, corrige: e.texteCorrige ?? "" },
        motDePasse
      );
      setProposition(exercices[0]);
      setEtat({ type: "", texte: "" });
    } catch (err) {
      setEtat({ type: "erreur", texte: messageErreurAdmin(err.message) });
    } finally {
      setOccupe(false);
    }
  };

  const remplir = () => {
    const dejaEcrit = [e.enonce, e.reponse, e.explication, ...(e.etapes ?? [])].some((t) => t?.trim());
    if (dejaEcrit && !window.confirm("L'énoncé, la correction et « À retenir » déjà écrits seront remplacés. Continuer ?")) return;
    const p = proposition;
    onAppliquer({
      titre: e.titre?.trim() ? e.titre : p.titre,
      enonce: p.enonce,
      indice: e.indice?.trim() ? e.indice : p.indice,
      etapes: p.etapes,
      reponse: p.reponse,
      explication: p.explication,
      difficulte: p.difficulte,
      duree: e.duree?.trim() ? e.duree : p.duree,
    });
    setProposition(null);
    setEtat({ type: "", texte: "Champs remplis dans le brouillon : relis-les, puis « Publier »." });
  };

  return (
    <div className="space-y-2 rounded-xl border border-brand-200 bg-brand-50/50 p-4 dark:border-brand-500/20 dark:bg-brand-500/5">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={lancer}
          disabled={occupe || !lisible}
          className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-3.5 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
        >
          <Icon name="sparkles" className="size-4" />
          Remplir avec l'IA depuis les PDF
        </button>
        <span className="text-xs text-ink-500 dark:text-ink-400">
          {lisible
            ? `L'IA recopie l'énoncé et rédige la correction${e.texteCorrige ? " à partir du corrigé" : ""}. Tu relis avant d'appliquer.`
            : "Le texte de ce PDF n'a pas pu être lu (PDF scanné ?) : renvoie-le, ou écris l'énoncé."}
        </span>
      </div>
      <Message etat={etat} />
      {proposition && (
        <div className="space-y-3 rounded-lg bg-white p-4 text-sm/6 text-ink-700 ring-1 ring-ink-200 dark:bg-ink-900 dark:text-ink-200 dark:ring-ink-800">
          <p className="font-semibold text-ink-900 dark:text-white">
            {proposition.titre} <span className="font-normal text-ink-500 dark:text-ink-400">· {proposition.difficulte} · {proposition.duree}</span>
          </p>
          {proposition.correctionParIA && (
            <p className="rounded-md bg-sun-100 px-2.5 py-1.5 text-xs text-sun-900 dark:bg-sun-500/15 dark:text-sun-200">
              Correction rédigée par l'IA (pas de corrigé fourni) : vérifie-la avant de publier.
            </p>
          )}
          <details>
            <summary className="cursor-pointer font-semibold text-brand-600 dark:text-brand-300">Voir ce qui sera rempli</summary>
            <div className="mt-2 space-y-2 whitespace-pre-wrap">
              <p><span className="font-semibold">Énoncé :</span> {proposition.enonce}</p>
              {proposition.indice && <p><span className="font-semibold">Indice :</span> {proposition.indice}</p>}
              {proposition.etapes.length > 0 && (
                <p><span className="font-semibold">Méthode :</span> {proposition.etapes.map((s, i) => `\n${i + 1}. ${s}`).join("")}</p>
              )}
              {proposition.reponse && <p><span className="font-semibold">Réponse :</span> {proposition.reponse}</p>}
              {proposition.explication && <p><span className="font-semibold">À retenir :</span> {proposition.explication}</p>}
            </div>
          </details>
          <div className="flex flex-wrap gap-3 text-sm font-semibold">
            <button type="button" onClick={remplir} className="rounded-lg bg-brand-600 px-3 py-1.5 text-white hover:bg-brand-700">
              Remplir les champs
            </button>
            <button type="button" onClick={() => setProposition(null)} className="text-ink-500 dark:text-ink-400 underline">
              Ignorer
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Importer un TD entier                                               */
/* ------------------------------------------------------------------ */

/* Un PDF de TD (et son corrigé, si on l'a) : le texte est lu ici, dans
   le navigateur, puis l'agent le découpe en exercices. L'auteur coche
   ceux qu'il garde ; ils entrent dans le brouillon comme des exercices
   écrits, à relire avant « Publier ». */
export function PanneauImportTD({ brouillon, appliquer, motDePasse, identifiant, extraireTexte }) {
  const [matiereId, setMatiereId] = useState(brouillon.matieres[0]?.id ?? "");
  const [fichiers, setFichiers] = useState({ enonce: null, corrige: null });
  const [etat, setEtat] = useState({ type: "", texte: "" });
  const [proposes, setProposes] = useState(null);
  const [occupe, setOccupe] = useState(false);

  const matiere = brouillon.matieres.find((m) => m.id === matiereId);

  // Une erreur de lecture porte déjà son message en français ; une
  // erreur du relais porte un code, traduit par messageErreurAdmin.
  const lire = async (fichier, nom) => {
    let lu = "";
    try {
      lu = await extraireTexte(fichier);
    } catch {
      throw new Error(`La lecture du PDF ${nom} a échoué. Réessaie.`);
    }
    if (!lu.trim()) throw new Error(`Le PDF ${nom} ne contient pas de texte lisible (PDF scanné ?).`);
    return lu;
  };

  const lancer = async () => {
    setOccupe(true);
    setProposes(null);
    try {
      setEtat({ type: "", texte: "Lecture des PDF…" });
      const enonce = await lire(fichiers.enonce, "du TD");
      const corrige = fichiers.corrige ? await lire(fichiers.corrige, "du corrigé") : "";
      setEtat({ type: "", texte: "L'IA découpe le TD en exercices… (jusqu'à une minute)" });
      const { exercices } = await demanderAgentAdmin(
        "extraire-exercices",
        { matiere: matiere?.nom, enonce, corrige },
        motDePasse
      );
      setProposes(exercices.map((x) => ({ ...x, garder: true })));
      setEtat({ type: "", texte: "" });
    } catch (e) {
      setEtat({ type: "erreur", texte: e.message.includes(" ") ? e.message : messageErreurAdmin(e.message) });
    } finally {
      setOccupe(false);
    }
  };

  const ajouter = () => {
    const choisis = proposes.filter((x) => x.garder);
    appliquer((b) => {
      const tous = [...b.exercices];
      for (const x of choisis) {
        tous.push({
          id: identifiant(x.titre, tous),
          titre: x.titre,
          matiere: matiereId,
          difficulte: x.difficulte,
          duree: x.duree,
          tags: [],
          enonce: x.enonce,
          indice: x.indice,
          etapes: x.etapes,
          reponse: x.reponse,
          explication: x.explication,
        });
      }
      return { ...b, exercices: tous };
    });
    setEtat({
      type: "",
      texte: `${choisis.length} exercice(s) ajouté(s) au brouillon de ${matiere?.nom}. Relis-les dans la liste, puis « Publier ».`,
    });
    setProposes(null);
    setFichiers({ enonce: null, corrige: null });
  };

  const choixFichier = (cle, libelle) => (
    <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-ink-200 px-3.5 py-2 text-sm font-semibold text-ink-700 hover:bg-ink-50 dark:border-ink-700 dark:text-ink-200 dark:hover:bg-ink-800">
      <Icon name="file" className="size-4 text-flame-500" />
      <span className="max-w-56 truncate">{fichiers[cle]?.name ?? libelle}</span>
      <input
        type="file"
        accept="application/pdf,.pdf"
        className="sr-only"
        aria-label={libelle}
        onChange={(e) => {
          const f = e.target.files?.[0] ?? null;
          setFichiers((s) => ({ ...s, [cle]: f }));
          e.target.value = "";
        }}
      />
    </label>
  );

  return (
    <section className="card space-y-4 p-5">
      <div className="flex flex-wrap items-center gap-3">
        <span className="grid size-9 place-items-center rounded-xl bg-brand-600 text-white">
          <Icon name="sparkles" className="size-4.5" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="font-semibold text-ink-900 dark:text-white">Importer un TD depuis un PDF</h2>
          <p className="text-xs text-ink-500 dark:text-ink-400">
            L'IA découpe le TD en exercices (Exercice 1, 2…) et rédige chaque correction, à partir du
            corrigé si tu le donnes. Tu choisis ceux qui entrent dans le brouillon.
          </p>
        </div>
        <select
          value={matiereId}
          onChange={(e) => setMatiereId(e.target.value)}
          aria-label="Matière du TD"
          className={cx(champAdmin, "w-auto")}
        >
          {brouillon.matieres.map((m) => (
            <option key={m.id} value={m.id}>
              {m.nom}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {choixFichier("enonce", "PDF du TD (énoncés)")}
        {choixFichier("corrige", "PDF du corrigé (facultatif)")}
        <button
          type="button"
          onClick={lancer}
          disabled={occupe || !fichiers.enonce || !matiere}
          className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-3.5 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
        >
          <Icon name="sparkles" className="size-4" />
          Découper avec l'IA
        </button>
      </div>
      <Message etat={etat} />

      {proposes?.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-semibold text-ink-900 dark:text-white">
            {proposes.length} exercice(s) trouvé(s) <span className="font-normal text-ink-500 dark:text-ink-400">· coche ceux à garder</span>
          </p>
          <ul className="max-h-[50vh] space-y-2 overflow-y-auto">
            {proposes.map((x, i) => (
              <li key={i} className="rounded-xl border border-ink-200 p-3 dark:border-ink-800">
                <label className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={x.garder}
                    onChange={(e) => setProposes((l) => l.map((y, j) => (j === i ? { ...y, garder: e.target.checked } : y)))}
                    className="mt-1 size-4 accent-brand-600"
                  />
                  <span className="min-w-0 flex-1 text-sm">
                    <span className="font-semibold text-ink-900 dark:text-white">{x.titre}</span>
                    <span className="text-xs text-ink-500 dark:text-ink-400"> · {x.difficulte} · {x.duree}</span>
                    <span className="mt-1 line-clamp-3 block text-xs/5 whitespace-pre-line text-ink-600 dark:text-ink-400">{x.enonce}</span>
                    {x.correctionParIA && (
                      <span className="mt-1 block text-xs text-sun-700 dark:text-sun-400">
                        Correction rédigée par l'IA : à vérifier avant de publier.
                      </span>
                    )}
                  </span>
                </label>
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={ajouter}
            disabled={!proposes.some((x) => x.garder)}
            className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
          >
            Ajouter les exercices cochés
          </button>
        </div>
      )}
    </section>
  );
}
