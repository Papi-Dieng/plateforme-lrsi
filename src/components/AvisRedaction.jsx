import { useState } from "react";
import Icon from "./Icon";
import { cx } from "./ui";
import { demanderAvisRedaction, iaActive, raisonEchec } from "../ia";

/* ==================================================================
   « Demander l'avis de l'IA », sous le corrigé d'une partie de devoir.

   L'étudiant tape ce qu'il a écrit sur sa copie ; l'IA le compare au
   corrigé et dit ce qui est juste, ce qui manque et ce qui est faux,
   avec un conseil. Pas de note : l'étudiant continue de se noter
   lui-même, l'avis l'aide seulement à voir ce qu'il a raté.
   ================================================================== */

function Liste({ titre, elements, ton, icone }) {
  if (!elements.length) return null;
  return (
    <div>
      <p className={cx("flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide", ton)}>
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

export default function AvisRedaction({ enonce, corrige }) {
  const [ouvert, setOuvert] = useState(false);
  const [reponse, setReponse] = useState("");
  const [avis, setAvis] = useState(null);
  const [etat, setEtat] = useState({ attente: false, erreur: "" });

  if (!iaActive || !corrige) return null;

  const demander = async () => {
    setEtat({ attente: true, erreur: "" });
    setAvis(null);
    try {
      setAvis(await demanderAvisRedaction({ enonce, corrige, reponse }));
      setEtat({ attente: false, erreur: "" });
    } catch (e) {
      setEtat({ attente: false, erreur: raisonEchec(e.message) });
    }
  };

  if (!ouvert) {
    return (
      <button
        type="button"
        onClick={() => setOuvert(true)}
        className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-600 hover:underline dark:text-brand-300"
      >
        <Icon name="sparkles" className="size-4" />
        Demander l'avis de l'IA sur ma réponse
      </button>
    );
  }

  return (
    <div className="mt-4 space-y-3 rounded-xl border border-brand-300 bg-white p-4 dark:border-brand-500/30 dark:bg-ink-950">
      <label className="block text-sm font-medium text-ink-700 dark:text-ink-300">
        Recopie ce que tu as écrit pour cette partie
        <textarea
          value={reponse}
          onChange={(e) => setReponse(e.target.value)}
          rows={5}
          maxLength={4000}
          className="mt-1.5 w-full rounded-xl border border-ink-200 bg-white px-3.5 py-2.5 text-sm text-ink-900 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-ink-700 dark:bg-ink-900 dark:text-white"
        />
      </label>
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={demander}
          disabled={reponse.trim().length < 3 || etat.attente}
          className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
        >
          <Icon name="sparkles" className="size-4" />
          {etat.attente ? "L'IA compare avec le corrigé…" : "Demander l'avis"}
        </button>
        <p className="text-xs text-ink-500 dark:text-ink-400">
          Ta réponse est envoyée à Google Gemini pour être comparée au corrigé. L'IA ne note pas.
        </p>
      </div>
      {etat.erreur && <p className="text-sm text-flame-600 dark:text-flame-400">{etat.erreur}</p>}

      {avis && (
        <div aria-live="polite" className="space-y-3 border-t border-ink-200 pt-3 dark:border-ink-800">
          <Liste titre="Ce qui est juste" elements={avis.justes} ton="text-accent-700 dark:text-accent-400" icone="check" />
          <Liste titre="Ce qui manque" elements={avis.manques} ton="text-sun-700 dark:text-sun-400" icone="info" />
          <Liste titre="Ce qui est faux" elements={avis.erreurs} ton="text-flame-600 dark:text-flame-400" icone="close" />
          {avis.conseil && (
            <p className="rounded-lg bg-brand-50 px-3 py-2 text-sm/6 text-ink-700 dark:bg-brand-500/10 dark:text-ink-200">
              <span className="font-semibold">Conseil : </span>
              {avis.conseil}
            </p>
          )}
          <p className="text-[11px] text-ink-400">
            Avis rédigé par une IA : elle peut se tromper. Le corrigé et ton enseignant font foi.
          </p>
        </div>
      )}
    </div>
  );
}
