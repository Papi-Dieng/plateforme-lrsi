import { useState } from "react";
import Icon from "./Icon";
import { cx } from "./ui";
import { verifierAdmin } from "../ia";

/* ==================================================================
   Connexion à l'espace admin, partagée par ses pages.

   Le site ne connaît aucun mot de passe : il le transmet au relais,
   qui seul le vérifie. Il est gardé le temps de l'onglet
   (sessionStorage), jamais au-delà, et partagé entre les pages admin
   pour ne pas le redemander à chaque fois.
   ================================================================== */

const CLE_SESSION = "lrsi-admin-ia";

export const lireSessionAdmin = () => {
  try {
    return sessionStorage.getItem(CLE_SESSION) ?? "";
  } catch {
    return "";
  }
};

export const ecrireSessionAdmin = (valeur) => {
  try {
    if (valeur) sessionStorage.setItem(CLE_SESSION, valeur);
    else sessionStorage.removeItem(CLE_SESSION);
  } catch {
    /* navigation privée : on redemandera le mot de passe */
  }
};

const MESSAGES_ERREUR = {
  "mot-de-passe": "Mot de passe incorrect.",
  "admin-non-configure":
    "Le mot de passe admin n'a pas encore été créé sur le relais. Voir le README, section « Éduquer l'assistant ».",
  "trop-de-requetes": "Trop d'essais d'un coup. Attends une minute.",
  "trop-gros": "Le contenu dépasse la taille maximale acceptée par le relais (3 Mo).",
  "aucune-version-precedente": "Il n'y a pas encore de version précédente à restaurer.",
};

export const messageErreurAdmin = (code) =>
  MESSAGES_ERREUR[code] ?? `Le relais n'a pas pu répondre (${code}).`;

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
