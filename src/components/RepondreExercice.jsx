import { useEffect, useRef, useState } from "react";
import Icon from "./Icon";
import ChargementIA from "./ChargementIA";
import { ETAPES_CORRECTION } from "../chargementIA";
import { cx } from "./classes";
import TexteLibre, { EnLigne } from "./TexteLibre";
import { corrigerExercice, iaActive, raisonEchec, textesExercice } from "../ia";
import { assemblerReponses, questionsDe } from "../questionsExercice";

/* ==================================================================
   « Ma réponse », dans un exercice, avant la correction.

   L'étudiant écrit sa réponse comme sur sa copie ; l'IA la compare au
   corrigé de l'auteur et dit si elle est juste, presque juste ou
   fausse, et ce qui correspond ou non. Elle ne rédige rien de son cru
   (consignes du relais, serveur-ia/avis.js) : la réponse attendue
   montrée ensuite est celle que l'auteur a saisie dans l'admin,
   affichée telle quelle par le site, sans passer par l'IA.

   Deux façons de répondre (demande du 6 octobre 2026) : « question par
   question », une case sous chaque question numérotée de l'énoncé
   (src/questionsExercice.js), ou « écrire ou coller ma réponse », une
   seule grande case. Le premier n'est proposé que si l'énoncé a au
   moins deux questions numérotées.

   Après deux essais qui ne sont pas justes, l'indice est proposé ; une
   réponse juste compte l'exercice comme travaillé. Rien n'est gardé :
   la réponse part au relais, puis à Google Gemini, le temps de corriger.

   Absent si l'exercice n'a pas de corrigé lisible (PDF scanné, sans
   texte). Sans IA (version hors ligne) ou si elle échoue (saturation,
   quota, réseau), l'étudiant n'est pas laissé sans rien : « Voir la
   réponse attendue » lui montre la réponse de l'auteur, pour qu'il se
   corrige lui-même.

   `RepondreAvecIA` est le bloc lui-même, partagé avec les devoirs
   (pages/Examens.jsx, une partie à la fois) : pendant l'épreuve il est
   « verrouillé », l'étudiant écrit mais ne peut pas encore faire
   corriger ; la correction s'ouvre quand il termine le devoir.
   ================================================================== */

const VERDICTS = {
  juste: {
    titre: "C'est juste !",
    texte: "Bravo, ta réponse correspond au corrigé.",
    icone: "check",
    classe: "border-lime-500/50 bg-lime-50 dark:border-lime-400/30 dark:bg-lime-400/8",
    pastille: "bg-lime-400 text-ink-950",
  },
  partiel: {
    titre: "Presque",
    texte: "Une partie correspond au corrigé, pas tout.",
    icone: "info",
    classe: "border-sun-400/50 bg-[#fffbeb] dark:border-sun-400/30 dark:bg-sun-500/10",
    pastille: "bg-[#ffc94d] text-ink-950",
  },
  faux: {
    titre: "Pas encore",
    texte: "Ta réponse ne correspond pas au corrigé.",
    icone: "close",
    classe: "border-flame-300 bg-flame-50 dark:border-flame-500/30 dark:bg-flame-500/10",
    pastille: "bg-flame-500 text-white",
  },
};

/* La réponse saisie par l'auteur dans l'admin, sans IA : le champ
   « Réponse », sinon la méthode ; à défaut, la correction en PDF, plus
   bas dans la page. */
function ReponseAttendue({ exercice }) {
  const etapes = (exercice.etapes ?? []).filter((e) => e.trim());
  if (!exercice.reponse && etapes.length === 0) {
    return (
      <p className="text-sm text-ink-600 dark:text-ink-300">
        La réponse attendue est dans la correction détaillée, juste en dessous.
      </p>
    );
  }
  return (
    <div className="rounded-xl border border-accent-300 bg-white px-4 py-3 dark:border-accent-500/30 dark:bg-ink-950">
      <p className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-accent-700 uppercase dark:text-accent-400">
        <Icon name="check" className="size-3.5" />
        Réponse attendue
      </p>
      {exercice.reponse ? (
        <TexteLibre texte={exercice.reponse} className="mt-1.5 text-sm/6 text-ink-800 dark:text-ink-200" />
      ) : (
        <ol className="mt-1.5 list-decimal space-y-1 pl-5 text-sm/6 text-ink-800 dark:text-ink-200">
          {etapes.map((e) => (
            <li key={e}>
              <EnLigne texte={e} />
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function Liste({ titre, elements, ton, icone }) {
  if (!elements?.length) return null;
  return (
    <div className="min-w-0 flex-1 px-5 py-4">
      <p className={cx("flex items-center gap-1.5 font-mono text-[11px] font-bold tracking-[0.06em] uppercase", ton)}>
        <Icon name={icone} className="size-3.5" />
        {titre}
      </p>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-[15px]/6 text-ink-800 dark:text-ink-200">
        {elements.map((e) => (
          <li key={e}>{e}</li>
        ))}
      </ul>
    </div>
  );
}

const MODES = [
  { valeur: "questions", label: "Répondre question par question" },
  { valeur: "libre", label: "Écrire ou coller ma réponse" },
];

/* Le choix de la façon de répondre, fait UNE fois, au début : en haut
   de la page d'un exercice, ou sur l'écran « Avant de commencer » d'un
   devoir, pour toutes ses parties (demande du 6 octobre 2026). */
export function ChoixReponse({ valeur, onChange, className }) {
  return (
    <div className={className}>
      <p className="text-sm font-medium text-ink-800 dark:text-ink-200">Comment veux-tu répondre ?</p>
      <div role="group" aria-label="Façon de répondre" className="mt-2 grid gap-2 rounded-xl bg-ink-100 p-1 sm:grid-cols-2 dark:bg-ink-800">
        {MODES.map((m) => (
          <button
            key={m.valeur}
            type="button"
            onClick={() => onChange(m.valeur)}
            aria-pressed={valeur === m.valeur}
            className={cx(
              "rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              valeur === m.valeur
                ? "bg-white text-ink-950 shadow-sm dark:bg-ink-950 dark:text-white"
                : "text-ink-600 hover:text-ink-900 dark:text-ink-300 dark:hover:text-white"
            )}
          >
            {m.label}
          </button>
        ))}
      </div>
    </div>
  );
}

const champ =
  "w-full rounded-[16px] border border-ink-200 bg-white px-4 py-3 text-[15px]/6 text-ink-900 focus:border-brand-400 focus:ring-2 focus:ring-brand-500/20 focus:outline-none dark:border-ink-700 dark:bg-ink-950 dark:text-white";

export default function RepondreExercice({ exercice, mode, numero, ancre, onReussi, onBesoinIndice, indiceDisponible }) {
  const { enonce, corrige } = textesExercice(exercice);
  return (
    <RepondreAvecIA
      id={exercice.id}
      mode={mode}
      numero={numero}
      ancre={ancre}
      enonce={enonce}
      corrige={corrige}
      reponseAttendue={<ReponseAttendue exercice={exercice} />}
      onReussi={onReussi}
      onBesoinIndice={onBesoinIndice}
      indiceDisponible={indiceDisponible}
    />
  );
}

/* Le bloc « Ma réponse ».
   - `reponseAttendue` : ce qui s'affiche sous le verdict (la réponse de
     l'admin pour un exercice ; rien pour un devoir, dont le corrigé est
     déjà affiché par la page) ;
   - `verrouille` : on peut écrire, pas encore faire corriger ;
   - `encadre` : dans sa propre carte, ou à l'intérieur d'une autre ;
   - `libelle` : le nom de la grande case, pour les lecteurs d'écran ;
   - `mode` : la façon de répondre choisie au début (ChoixReponse) ;
     sans questions numérotées dans l'énoncé, c'est toujours la grande
     case ;
   - `onReponse(texte, vide)` : tient la page au courant de ce qui est
     écrit (un devoir corrige toutes ses parties d'un coup) ;
   - `correction` : { attente, resultat, erreur } d'une correction lancée
     par la page ; le bouton ne réapparaît alors qu'en cas d'échec ;
   - `onCorrige(resultat)` : appelé à chaque correction réussie ;
   - `bareme` : les points de la partie d'un devoir, pour que l'IA note. */
export function RepondreAvecIA({
  id,
  enonce,
  corrige,
  reponseAttendue = null,
  verrouille = false,
  encadre = true,
  libelle = "Ta réponse à l'exercice",
  mode: modeChoisi = "questions",
  numero,
  ancre,
  onReussi,
  onBesoinIndice,
  indiceDisponible,
  onReponse,
  correction,
  onCorrige,
  bareme,
}) {
  const [reponse, setReponse] = useState("");
  const [reponses, setReponses] = useState({});
  const [resultat, setResultat] = useState(null);
  const [rates, setRates] = useState(0);
  const [etat, setEtat] = useState({ attente: false, erreur: "" });
  const [voirAttendue, setVoirAttendue] = useState(false);

  const questions = questionsDe(enonce ?? "");
  const mode = questions.length ? modeChoisi : "libre";
  const aEnvoyer =
    mode === "questions" ? assemblerReponses(questions, questions.map((_, i) => reponses[i] ?? "")) : reponse;
  const vide =
    mode === "questions" ? !Object.values(reponses).some((v) => v.trim()) : reponse.trim().length < 2;

  const prevenir = useRef(onReponse);
  useEffect(() => {
    prevenir.current = onReponse;
  });
  useEffect(() => {
    prevenir.current?.(aEnvoyer, vide);
  }, [aEnvoyer, vide]);

  if (!enonce || !corrige) return null;

  const corriger = async (e) => {
    e.preventDefault();
    setEtat({ attente: true, erreur: "" });
    setResultat(null);
    try {
      const r = await corrigerExercice({ enonce, corrige, reponse: aEnvoyer, bareme });
      setResultat(r);
      setEtat({ attente: false, erreur: "" });
      onCorrige?.(r);
      if (r.verdict === "juste") onReussi?.();
      else setRates((n) => n + 1);
    } catch (err) {
      setEtat({ attente: false, erreur: raisonEchec(err.message) });
    }
  };

  // Ce qu'on montre : sa propre correction si on l'a relancée, sinon
  // celle que la page a faite pour tout le devoir.
  const parSoi = resultat || etat.attente || etat.erreur;
  const vu = parSoi ? { resultat, attente: etat.attente, erreur: etat.erreur } : (correction ?? {});
  const verdict = vu.resultat && VERDICTS[vu.resultat.verdict];
  const avecBouton = !correction || Boolean(vu.erreur);

  const Titre = encadre ? "h2" : "h3";

  return (
    <section
      id={ancre}
      className={
        encadre
          ? "scroll-mt-24 rounded-[28px] border border-ink-200 bg-white p-6 sm:p-8 dark:border-ink-800 dark:bg-ink-900"
          : "mt-5 border-t border-ink-200 pt-5 dark:border-ink-800"
      }
    >
      <Titre
        className={cx(
          "flex items-baseline gap-3 font-extrabold tracking-[-0.03em] text-ink-950 dark:text-white",
          encadre ? "text-[26px] leading-tight sm:text-[30px]" : "text-lg"
        )}
      >
        {numero ? (
          <span className="font-mono text-xs font-bold tracking-[0.06em] text-brand-600 dark:text-brand-400">{String(numero).padStart(2, "0")}</span>
        ) : (
          <Icon name="pencil" className="size-4.5 self-center text-brand-600 dark:text-brand-400" />
        )}
        Ma réponse
      </Titre>
      <p className="mt-2 text-[15px] text-ink-600 dark:text-ink-300">
        {verrouille
          ? "Écris tes réponses ici pendant le devoir. Quand tu le termines, l'IA les compare au corrigé et te propose une note."
          : "Réponds comme sur ta copie : l'IA compare ta réponse au corrigé et te dit si elle est juste."}
      </p>

      <form onSubmit={corriger} className="mt-4 space-y-3">
        {mode === "questions" ? (
          <ol className="space-y-4">
            {questions.map((q, i) => (
              <li key={q.numero}>
                <label htmlFor={`reponse-${id}-${q.numero}`} className="block text-[15px]/6 text-ink-800 dark:text-ink-200">
                  <span className="font-extrabold text-ink-950 dark:text-white">Question {q.numero}.</span> <EnLigne texte={q.texte} />
                </label>
                <textarea
                  id={`reponse-${id}-${q.numero}`}
                  aria-label={`Ta réponse à la question ${q.numero}`}
                  value={reponses[i] ?? ""}
                  onChange={(e) => {
                    const v = e.target.value;
                    setReponses((r) => ({ ...r, [i]: v }));
                  }}
                  rows={2}
                  maxLength={1500}
                  placeholder="Ta réponse…"
                  className={cx("mt-1.5", champ)}
                />
              </li>
            ))}
          </ol>
        ) : (
          <>
            <label htmlFor={`reponse-${id}`} className="block text-sm font-extrabold text-ink-950 dark:text-white">
              {libelle}
            </label>
            <textarea
              id={`reponse-${id}`}
              value={reponse}
              onChange={(e) => setReponse(e.target.value)}
              rows={6}
              maxLength={4000}
              placeholder="Écris ou colle ici toute ta réponse : tes résultats et ta démarche…"
              className={champ}
            />
          </>
        )}
        {!verrouille && !iaActive && (
          <p className="text-sm/6 text-ink-600 dark:text-ink-300">
            La correction par l'IA demande une connexion et la version en ligne du site.
            {reponseAttendue ? " Compare toi-même ta réponse à la réponse attendue." : " Compare toi-même ta réponse au corrigé."}
          </p>
        )}
        {!verrouille && iaActive && avecBouton && (
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={vide || etat.attente}
            className="inline-flex min-h-12 items-center gap-2 rounded-[14px] bg-brand-600 px-5 text-[15px] font-extrabold text-white transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Icon name="sparkles" className="size-4" />
            {etat.attente ? "Correction en cours…" : resultat ? "Refaire corriger" : "Faire corriger par l'IA"}
          </button>
          <p className="text-xs text-ink-500 dark:text-ink-400">
            Ta réponse est envoyée à Google Gemini pour être corrigée, et n'est pas gardée.
          </p>
        </div>
        )}
      </form>

      {vu.attente && <ChargementIA etapes={ETAPES_CORRECTION} className="pt-4" />}
      {vu.erreur && (
        <p role="alert" className="mt-3 text-sm text-flame-700 dark:text-flame-400">
          {vu.erreur}
        </p>
      )}

      {/* Le filet : sans IA ou quand elle échoue, la réponse de l'auteur. */}
      {!verrouille && reponseAttendue && !resultat && (!iaActive || etat.erreur) && (
        <div className="mt-3 space-y-3">
          <button
            type="button"
            onClick={() => setVoirAttendue((v) => !v)}
            aria-expanded={voirAttendue}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-accent-700 hover:underline dark:text-accent-400"
          >
            <Icon name="check" className="size-4" />
            {voirAttendue ? "Masquer la réponse attendue" : "Voir la réponse attendue"}
          </button>
          {voirAttendue && reponseAttendue}
        </div>
      )}

      {verdict && (
        <div aria-live="polite" className="mt-5 space-y-4">
          <div className={cx("overflow-hidden rounded-[22px] border", verdict.classe)}>
            <div role="status" className="flex gap-4 px-5 py-4">
              <span className={cx("grid size-10 shrink-0 place-items-center rounded-xl", verdict.pastille)}>
                <Icon name={verdict.icone} className="size-5" />
              </span>
              <p>
                <strong className="block text-xl font-extrabold tracking-tight text-ink-950 dark:text-white">{verdict.titre}</strong>
                <span className="text-[15px] text-ink-700 dark:text-ink-200">{verdict.texte}</span>
              </p>
            </div>
            {(vu.resultat.justes?.length > 0 || vu.resultat.erreurs?.length > 0) && (
              <div className="flex flex-col divide-y divide-ink-950/10 border-t border-ink-950/10 sm:flex-row sm:divide-x sm:divide-y-0 dark:divide-white/10 dark:border-white/10">
                <Liste titre="Ce qui correspond au corrigé" elements={vu.resultat.justes} ton="text-lime-800 dark:text-lime-300" icone="check" />
                <Liste titre="Ce qui ne correspond pas" elements={vu.resultat.erreurs} ton="text-flame-700 dark:text-flame-300" icone="close" />
              </div>
            )}
            <p className="border-t border-ink-950/10 px-5 py-3 text-xs text-ink-600 dark:border-white/10 dark:text-ink-300">
              Comparaison faite par une IA : elle peut se tromper. Le corrigé et ton enseignant font foi.
            </p>
          </div>
          {reponseAttendue}
          {rates >= 2 && indiceDisponible && vu.resultat.verdict !== "juste" && (
            <button
              type="button"
              onClick={onBesoinIndice}
              className="inline-flex items-center gap-1.5 text-sm font-bold text-sun-900 hover:underline dark:text-sun-400"
            >
              <Icon name="bulb" className="size-4" />
              Affiche l&apos;indice
            </button>
          )}
        </div>
      )}
    </section>
  );
}
