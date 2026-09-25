import { useMemo, useState } from "react";
import Icon from "./Icon";
import { cx } from "./classes";
import { champAdmin } from "./ConnexionAdmin";
import { EXEMPLE_QUIZ, ecrireQuizTexte, lireQuizTexte } from "../quizTexte";

/* ==================================================================
   Écrire un QCM en texte, comme sur papier, dans l'espace admin.

   Deux usages :
   - « Écrire le quiz en texte » : de nouvelles questions, ajoutées à la
     suite de celles du QCM ;
   - « Modifier en texte » : tout le QCM affiché en texte, corrigé comme
     un document, puis remplacé.

   L'aperçu se met à jour pendant la saisie : chaque question reconnue,
   sa bonne réponse en vert, et ses erreurs en orange. Le format est
   décrit dans `src/quizTexte.js`.
   ================================================================== */

const cle = (t) => String(t ?? "").trim().toLowerCase();

export default function QuizEnTexte({ qcm, onAjouter, onRemplacer }) {
  const [mode, setMode] = useState(null); // null, "ajouter" ou "modifier"
  const [texte, setTexte] = useState("");
  const [message, setMessage] = useState("");

  const lues = useMemo(() => lireQuizTexte(texte), [texte]);
  const valides = lues.filter((q) => q.erreurs.length === 0);
  const enErreur = lues.length - valides.length;

  // En modifiant, une question garde sa compétence : retrouvée par son
  // énoncé, ou par sa place quand le nombre de questions n'a pas changé
  // (corriger une faute dans l'énoncé ne doit pas la faire perdre).
  const versQuestions = (liste) => {
    const memePlace = mode === "modifier" && liste.length === qcm.questions.length;
    return liste.map((q, i) => ({
      enonce: q.enonce,
      options: q.options,
      bonne: q.bonne,
      explication: q.explication,
      competence:
        qcm.questions.find((x) => cle(x.enonce) === cle(q.enonce))?.competence ??
        (memePlace ? qcm.questions[i].competence : "") ??
        "",
    }));
  };

  const ouvrir = (m) => {
    setMode(m);
    setMessage("");
    setTexte(m === "modifier" ? ecrireQuizTexte(qcm.questions) : "");
  };

  const valider = () => {
    if (mode === "ajouter") {
      onAjouter(versQuestions(valides));
      setMessage(`${valides.length} question(s) ajoutée(s) à la fin du QCM.`);
    } else {
      if (
        !window.confirm(
          `Remplacer les ${qcm.questions.length} questions du QCM par les ${valides.length} de ce texte ?`
        )
      ) {
        return;
      }
      onRemplacer(versQuestions(valides));
      setMessage("Le QCM a été remplacé par le texte.");
    }
    setMode(null);
    setTexte("");
  };

  if (!mode) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => ouvrir("ajouter")}
          className="inline-flex items-center gap-2 rounded-xl border border-ink-200 px-3.5 py-2 text-sm font-semibold text-ink-700 hover:bg-ink-50 dark:border-ink-700 dark:text-ink-200 dark:hover:bg-ink-800"
        >
          <Icon name="pencil" className="size-4" />
          Écrire le quiz en texte
        </button>
        {qcm.questions.length > 0 && (
          <button
            type="button"
            onClick={() => ouvrir("modifier")}
            className="inline-flex items-center gap-2 rounded-xl border border-ink-200 px-3.5 py-2 text-sm font-semibold text-ink-700 hover:bg-ink-50 dark:border-ink-700 dark:text-ink-200 dark:hover:bg-ink-800"
          >
            <Icon name="file" className="size-4" />
            Modifier en texte
          </button>
        )}
        {message && <p role="status" className="text-xs text-accent-700 dark:text-accent-400">{message}</p>}
      </div>
    );
  }

  return (
    <section className="space-y-3 rounded-xl border border-ink-300 p-4 dark:border-ink-700">
      <div className="flex items-center justify-between gap-3">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-ink-900 dark:text-white">
          <Icon name="pencil" className="size-4 text-brand-500" />
          {mode === "ajouter" ? "Écrire le quiz en texte" : "Modifier le QCM en texte"}
        </h3>
        <button type="button" onClick={() => setMode(null)} className="text-xs text-ink-500 hover:underline">
          Fermer sans rien changer
        </button>
      </div>

      <details className="rounded-lg bg-ink-50 px-3 py-2 text-xs/5 text-ink-600 dark:bg-ink-950 dark:text-ink-400">
        <summary className="cursor-pointer font-semibold">Comment écrire ?</summary>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>Une question par bloc, numérotée : <code>1.</code>, <code>2)</code> ou <code>Q3 :</code>.</li>
          <li>Les réponses dessous : <code>a)</code>, <code>B.</code>, <code>-</code> ou <code>•</code>, de 2 à 6 réponses.</li>
          <li>
            La bonne réponse marquée d'une étoile <code>*</code> (au début ou à la fin), ou de <code>✓</code>,{" "}
            <code>(x)</code>, <code>[x]</code>, ou par une ligne <code>Réponse : c</code>.
          </li>
          <li>L'explication, facultative, sur une ligne qui commence par <code>&gt;</code> ou <code>Explication :</code>.</li>
        </ul>
        {mode === "ajouter" && !texte && (
          <button type="button" onClick={() => setTexte(EXEMPLE_QUIZ)} className="mt-2 font-semibold text-brand-600 hover:underline dark:text-brand-300">
            Insérer un exemple
          </button>
        )}
      </details>

      <div className="grid gap-4 lg:grid-cols-2">
        <textarea
          value={texte}
          onChange={(e) => setTexte(e.target.value)}
          rows={20}
          spellCheck
          aria-label="Quiz en texte"
          placeholder={EXEMPLE_QUIZ}
          className={cx(champAdmin, "font-mono text-[13px]/6")}
        />

        {/* ---- Aperçu ---- */}
        <div className="max-h-[32rem] space-y-2 overflow-y-auto" aria-live="polite">
          <p className="text-xs font-semibold text-ink-600 dark:text-ink-300">
            Aperçu : {valides.length} question(s) reconnue(s)
            {enErreur > 0 && <span className="text-sun-700 dark:text-sun-400"> · {enErreur} à corriger</span>}
          </p>
          {lues.length === 0 && <p className="text-sm text-ink-400">Les questions apparaîtront ici pendant que tu écris.</p>}
          {lues.map((q) => (
            <div
              key={q.numero}
              className={cx(
                "rounded-lg border p-3 text-sm",
                q.erreurs.length ? "border-sun-400/60 bg-sun-100/40 dark:bg-sun-500/10" : "border-ink-200 dark:border-ink-800"
              )}
            >
              <p className="whitespace-pre-line font-medium text-ink-900 dark:text-white">
                <span className="mr-1 font-mono text-xs text-ink-400">{q.numero}.</span>
                {q.enonce || "(énoncé vide)"}
              </p>
              <ol className="mt-1.5 space-y-0.5">
                {q.options.map((o, k) => (
                  <li
                    key={k}
                    className={cx(
                      "rounded px-2 py-0.5 text-[13px]",
                      k === q.bonne ? "bg-accent-50 font-semibold text-accent-800 dark:bg-accent-500/10 dark:text-accent-300" : "text-ink-600 dark:text-ink-400"
                    )}
                  >
                    {k === q.bonne ? "✓ " : ""}
                    {o}
                  </li>
                ))}
              </ol>
              {q.explication && <p className="mt-1.5 text-xs text-ink-500">{q.explication}</p>}
              {q.erreurs.map((e) => (
                <p key={e} className="mt-1.5 text-xs font-medium text-sun-800 dark:text-sun-400">
                  ⚠ {e}
                </p>
              ))}
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={valider}
          disabled={valides.length === 0 || (mode === "modifier" && enErreur > 0)}
          className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
        >
          {mode === "ajouter"
            ? `Ajouter ${valides.length} question(s) au QCM`
            : `Remplacer le QCM (${valides.length} question(s))`}
        </button>
        {enErreur > 0 && (
          <p className="text-xs text-sun-700 dark:text-sun-400">
            {mode === "ajouter"
              ? `${enErreur} question(s) avec une erreur ne seront pas ajoutées tant qu'elles ne sont pas corrigées.`
              : "Corrige les erreurs avant de remplacer : sinon des questions seraient perdues."}
          </p>
        )}
      </div>
    </section>
  );
}
