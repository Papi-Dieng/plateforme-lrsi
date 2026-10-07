import { useState } from "react";
import { Link } from "react-router-dom";
import Icon from "./Icon";
import { cx } from "./classes";
import { QUADRILLAGE, mono } from "./styleAdmin";
import { site } from "../data/site";
import { verifierAdmin } from "../ia";
import { ecrireSessionAdmin, messageErreurAdmin } from "../sessionAdmin";

/* ==================================================================
   Connexion à l'espace admin, partagée par ses pages.

   Le site ne connaît aucun mot de passe : il le transmet au relais,
   qui seul le vérifie. Il est gardé le temps de l'onglet
   (sessionStorage), jamais au-delà, et partagé entre les pages admin
   pour ne pas le redemander à chaque fois (voir src/sessionAdmin.js).
   ================================================================== */

export const champAdmin =
  "w-full rounded-[14px] border border-ink-200 bg-white px-4 py-3 text-[15px] text-ink-900 placeholder:text-ink-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-ink-700 dark:bg-ink-950 dark:text-white";

const OUTILS = [
  "Gérer le contenu : matières, exercices, QCM, vidéos, devoirs, examens et bibliothèque.",
  "Éduquer l'IA : consignes, questions-réponses modèles et tests de l'assistant.",
  "Questions les plus ratées, d'après les réponses anonymes aux QCM.",
];

/* Plein écran, en deux moitiés (maquette « admin Sunu Cours ») : les
   coulisses à gauche, le formulaire à droite. `message` : une erreur
   venue de la page (session expirée, mot de passe changé…). */
export default function ConnexionAdmin({ onConnecte, message = "" }) {
  const [saisie, setSaisie] = useState("");
  const [visible, setVisible] = useState(false);
  const [erreur, setErreur] = useState("");
  const [enCours, setEnCours] = useState(false);

  const valider = async (e) => {
    e.preventDefault();
    setEnCours(true);
    setErreur("");
    try {
      await verifierAdmin(saisie);
      ecrireSessionAdmin(saisie);
      onConnecte(saisie);
    } catch (err) {
      setErreur(messageErreurAdmin(err.message));
    } finally {
      setEnCours(false);
    }
  };

  const affiche = erreur || message;

  return (
    <div className="fixed inset-0 z-40 grid overflow-y-auto bg-[#eef0f4] lg:grid-cols-2 dark:bg-ink-950">
      <div className="flex flex-col bg-[#0b0e17] px-6 py-8 text-white sm:px-14 sm:py-12" style={QUADRILLAGE}>
        <Link to="/admin" className="inline-flex w-fit items-center gap-2.5 text-[21px] font-extrabold tracking-tight">
          <span>
            <span className="text-[#8eaaff]">{site.nomAccent}</span>
            {site.nom.slice(site.nomAccent.length)}
          </span>
          <span className={cx("rounded-md bg-lime-400 px-1.5 py-0.5 text-[10px] font-bold text-ink-950", mono)}>ADMIN</span>
        </Link>
        <div className="my-auto pt-10 lg:pt-0">
          <p className={cx("text-[11px] font-bold text-lime-400", mono)}>ESPACE D&apos;ADMINISTRATION</p>
          <p className="mt-5 text-[clamp(3rem,7vw,6rem)] leading-[0.88] font-extrabold tracking-[-0.05em]">
            Les <span className="block text-lime-400">coulisses.</span>
          </p>
          <p className="mt-5 max-w-[460px] text-[17px]/7 text-ink-200">
            Cette page ne s&apos;adresse pas aux étudiants. Elle sert à voir ce qui manque dans le contenu pour que la
            plateforme fonctionne pleinement.
          </p>
        </div>
        <ol className="mt-10 hidden max-w-[520px] border-t border-white/10 lg:block">
          {OUTILS.map((o, i) => (
            <li key={o} className="flex gap-4 border-b border-white/10 py-3.5 text-[14.5px]/snug text-ink-200">
              <span className={cx("pt-0.5 text-[11px] text-[#8eaaff]", mono)}>{String(i + 2).padStart(2, "0")}</span>
              {o}
            </li>
          ))}
        </ol>
      </div>

      <div className="flex items-center justify-center px-5 py-10 sm:px-10">
        <div className="w-full max-w-[440px]">
          <Link to="/admin" className="inline-flex items-center gap-2 text-sm font-bold text-ink-600 hover:text-ink-950 dark:text-ink-300 dark:hover:text-white">
            <Icon name="arrow" className="size-4 rotate-180" />
            Retour au tableau de bord
          </Link>
          <form
            onSubmit={valider}
            className="mt-6 rounded-[28px] border border-ink-200 bg-white p-7 shadow-[0_30px_60px_-30px_rgb(13_16_26/0.25)] sm:p-9 dark:border-ink-800 dark:bg-ink-900"
          >
            <span className="grid size-13 place-items-center rounded-2xl bg-ink-950 text-lime-400 dark:bg-ink-800" aria-hidden="true">
              <Icon name="lock" className="size-5.5" />
            </span>
            <h2 className="mt-6 text-[34px] leading-tight font-extrabold tracking-[-0.03em] text-ink-950 dark:text-white">Accès réservé</h2>
            <p className="mt-2 text-[15px]/6 text-ink-500 dark:text-ink-400">
              Le mot de passe admin choisi lors de l&apos;installation du relais IA.
            </p>
            <label htmlFor="mdp-admin" className="mt-7 block text-sm font-extrabold text-ink-950 dark:text-white">
              Mot de passe admin
            </label>
            <div className="relative mt-2">
              <input
                id="mdp-admin"
                type={visible ? "text" : "password"}
                autoComplete="current-password"
                value={saisie}
                onChange={(e) => setSaisie(e.target.value)}
                aria-invalid={affiche ? "true" : undefined}
                aria-describedby={affiche ? "mdp-admin-erreur" : undefined}
                className={cx(champAdmin, "pr-13")}
              />
              <button
                type="button"
                onClick={() => setVisible((v) => !v)}
                aria-label={visible ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                className="absolute inset-y-0 right-1.5 my-auto grid size-10 place-items-center rounded-xl text-ink-500 hover:bg-ink-100 hover:text-ink-900 dark:text-ink-400 dark:hover:bg-ink-800 dark:hover:text-white"
              >
                <Icon name={visible ? "oeilBarre" : "oeil"} className="size-5" />
              </button>
            </div>
            {affiche && (
              <p id="mdp-admin-erreur" role="alert" className="mt-2.5 text-sm font-medium text-flame-600 dark:text-flame-400">
                {affiche}
              </p>
            )}
            <button
              type="submit"
              disabled={!saisie || enCours}
              className="mt-5 inline-flex min-h-13 w-full items-center justify-center gap-2.5 rounded-[14px] bg-brand-600 text-[15.5px] font-extrabold text-white transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {enCours ? "Vérification…" : "Se connecter"}
              {!enCours && <Icon name="arrow" className="size-4" />}
            </button>
            <p className="mt-6 flex gap-2.5 border-t border-ink-100 pt-5 text-[13px]/5 text-ink-500 dark:border-ink-800 dark:text-ink-400">
              <Icon name="shield" className="mt-0.5 size-4 shrink-0" />
              Le mot de passe est vérifié par le relais de la plateforme, jamais par le site lui-même.
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
