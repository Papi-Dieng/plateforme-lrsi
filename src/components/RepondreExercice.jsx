import { useState } from "react";
import Icon from "./Icon";
import ChargementIA from "./ChargementIA";
import { ETAPES_CORRECTION } from "../chargementIA";
import { cx } from "./classes";
import { corrigerExercice, iaActive, raisonEchec, textesExercice } from "../ia";

/* ==================================================================
   « Ma réponse », dans un exercice, avant la correction.

   L'étudiant écrit sa réponse comme sur sa copie ; l'IA la compare au
   corrigé de l'auteur et dit si elle est juste, presque juste ou
   fausse, ce qui va et ce qui ne va pas, avec une piste. Elle ne
   révèle pas le corrigé (consignes du relais, serveur-ia/avis.js) :
   l'étudiant corrige sa réponse et refait corriger autant qu'il veut.

   Après deux essais qui ne sont pas justes, l'indice est proposé ; une
   réponse juste compte l'exercice comme travaillé. Rien n'est gardé :
   la réponse part au relais, puis à Google Gemini, le temps de corriger.

   Absent si l'IA n'est pas branchée ou si l'exercice n'a pas de corrigé
   lisible (PDF scanné, sans texte).
   ================================================================== */

const VERDICTS = {
  juste: {
    titre: "C'est juste !",
    texte: "Bravo. Compare quand même ta méthode avec la correction détaillée.",
    icone: "check",
    classe: "border-accent-300 bg-accent-50 text-accent-900 dark:border-accent-500/30 dark:bg-accent-500/10 dark:text-accent-100",
  },
  partiel: {
    titre: "Presque",
    texte: "Une partie est juste. Reprends ce qui ne va pas, puis refais corriger.",
    icone: "info",
    classe: "border-sun-400/50 bg-sun-100/60 text-sun-900 dark:border-sun-500/30 dark:bg-sun-500/10 dark:text-sun-100",
  },
  faux: {
    titre: "Pas encore",
    texte: "Ce n'est pas la bonne réponse. Lis la piste, corrige, et réessaie.",
    icone: "close",
    classe: "border-flame-300 bg-flame-50 text-flame-900 dark:border-flame-500/30 dark:bg-flame-500/10 dark:text-flame-100",
  },
};

function Liste({ titre, elements, ton, icone }) {
  if (!elements?.length) return null;
  return (
    <div>
      <p className={cx("flex items-center gap-1.5 text-xs font-semibold tracking-wide uppercase", ton)}>
        <Icon name={icone} className="size-3.5" />
        {titre}
      </p>
      <ul className="mt-1 list-disc space-y-0.5 pl-5 text-sm/6 text-ink-700 dark:text-ink-300">
        {elements.map((e) => (
          <li key={e}>{e}</li>
        ))}
      </ul>
    </div>
  );
}

export default function RepondreExercice({ exercice, onReussi, onBesoinIndice, indiceDisponible }) {
  const [reponse, setReponse] = useState("");
  const [resultat, setResultat] = useState(null);
  const [rates, setRates] = useState(0);
  const [etat, setEtat] = useState({ attente: false, erreur: "" });

  const { enonce, corrige } = textesExercice(exercice);
  if (!iaActive || !enonce || !corrige) return null;

  const corriger = async (e) => {
    e.preventDefault();
    setEtat({ attente: true, erreur: "" });
    setResultat(null);
    try {
      const r = await corrigerExercice({ enonce, corrige, reponse });
      setResultat(r);
      setEtat({ attente: false, erreur: "" });
      if (r.verdict === "juste") onReussi?.();
      else setRates((n) => n + 1);
    } catch (err) {
      setEtat({ attente: false, erreur: raisonEchec(err.message) });
    }
  };

  const verdict = resultat && VERDICTS[resultat.verdict];

  return (
    <section className="card p-6">
      <h2 className="flex items-center gap-2 font-semibold text-ink-900 dark:text-white">
        <Icon name="pencil" className="size-4.5 text-brand-600 dark:text-brand-400" />
        Ma réponse
      </h2>
      <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">
        Écris ta réponse comme sur ta copie : l'IA te dit si elle est juste, sans te donner la correction.
      </p>

      <form onSubmit={corriger} className="mt-4 space-y-3">
        <label htmlFor={`reponse-${exercice.id}`} className="sr-only">
          Ta réponse à l'exercice
        </label>
        <textarea
          id={`reponse-${exercice.id}`}
          value={reponse}
          onChange={(e) => setReponse(e.target.value)}
          rows={6}
          maxLength={4000}
          placeholder="Écris ici tes résultats et ta démarche…"
          className="w-full rounded-xl border border-ink-200 bg-white px-3.5 py-2.5 text-sm/6 text-ink-900 focus:border-brand-400 focus:ring-2 focus:ring-brand-500/20 focus:outline-none dark:border-ink-700 dark:bg-ink-950 dark:text-white"
        />
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={reponse.trim().length < 2 || etat.attente}
            className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
          >
            <Icon name="sparkles" className="size-4" />
            {etat.attente ? "Correction en cours…" : resultat ? "Refaire corriger" : "Faire corriger par l'IA"}
          </button>
          <p className="text-xs text-ink-500 dark:text-ink-400">
            Ta réponse est envoyée à Google Gemini pour être corrigée, et n'est pas gardée.
          </p>
        </div>
      </form>

      {etat.attente && <ChargementIA etapes={ETAPES_CORRECTION} className="pt-4" />}
      {etat.erreur && (
        <p role="alert" className="mt-3 text-sm text-flame-700 dark:text-flame-400">
          {etat.erreur}
        </p>
      )}

      {verdict && (
        <div aria-live="polite" className="mt-4 space-y-3">
          <div role="status" className={cx("flex gap-3 rounded-xl border px-4 py-3", verdict.classe)}>
            <Icon name={verdict.icone} className="mt-0.5 size-5 shrink-0" />
            <p className="text-sm/6">
              <strong className="font-semibold">{verdict.titre}</strong> {verdict.texte}
            </p>
          </div>
          <Liste titre="Ce qui est juste" elements={resultat.justes} ton="text-accent-700 dark:text-accent-400" icone="check" />
          <Liste titre="Ce qui ne va pas" elements={resultat.erreurs} ton="text-flame-700 dark:text-flame-400" icone="close" />
          {resultat.piste && resultat.verdict !== "juste" && (
            <p className="rounded-lg bg-brand-50 px-3 py-2 text-sm/6 text-ink-700 dark:bg-brand-500/10 dark:text-ink-200">
              <span className="font-semibold">Piste : </span>
              {resultat.piste}
            </p>
          )}
          {rates >= 2 && indiceDisponible && resultat.verdict !== "juste" && (
            <button
              type="button"
              onClick={onBesoinIndice}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-sun-800 hover:underline dark:text-sun-400"
            >
              <Icon name="bulb" className="size-4" />
              Affiche l'indice
            </button>
          )}
          <p className="text-[11px] text-ink-500 dark:text-ink-400">
            Correction faite par une IA : elle peut se tromper. La correction détaillée et ton enseignant font foi.
          </p>
        </div>
      )}
    </section>
  );
}
