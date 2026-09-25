import { useState } from "react";
import Icon from "./Icon";
import { cx } from "./classes";
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
  "w-full rounded-xl border border-ink-200 bg-white px-3.5 py-2.5 text-sm text-ink-900 placeholder:text-ink-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-ink-700 dark:bg-ink-950 dark:text-white";

export default function ConnexionAdmin({ onConnecte }) {
  const [saisie, setSaisie] = useState("");
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

  return (
    <form onSubmit={valider} className="card max-w-md p-6">
      <h2 className="flex items-center gap-2 font-semibold text-ink-900 dark:text-white">
        <Icon name="lock" className="size-4 text-brand-500" />
        Accès réservé
      </h2>
      <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">
        Le mot de passe admin choisi lors de l'installation du relais IA.
      </p>
      <label htmlFor="mdp-admin" className="sr-only">
        Mot de passe admin
      </label>
      <input
        id="mdp-admin"
        type="password"
        autoComplete="current-password"
        value={saisie}
        onChange={(e) => setSaisie(e.target.value)}
        className={cx(champAdmin, "mt-4")}
      />
      {erreur && <p className="mt-2 text-sm text-flame-600 dark:text-flame-400">{erreur}</p>}
      <div className="mt-4">
        <button
          type="submit"
          disabled={!saisie || enCours}
          className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {enCours ? "Vérification…" : "Se connecter"}
        </button>
      </div>
    </form>
  );
}
