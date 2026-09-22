import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Icon from "../components/Icon";
import { Logo, Signature } from "../components/Layout";
import { cx } from "../components/ui";
import { useSession } from "../session";
import { site } from "../data/site";

/* ==================================================================
   Écrans d'entrée — VERSION 1

   Les formulaires ci-dessous dessinent l'interface prévue, mais il n'y
   a pas encore de serveur : rien n'est vérifié, rien n'est envoyé, et
   le mot de passe saisi n'est jamais enregistré. Seul le nom affiché
   est retenu dans le navigateur, pour personnaliser l'en-tête.
   La véritable authentification arrive en version 3.
   ================================================================== */

/* ------------------------------------------------------------------ */
/* Cadre commun aux deux écrans                                        */
/* ------------------------------------------------------------------ */

function CadreAuth({ titre, texte, children, pied }) {
  const navigate = useNavigate();
  const { entrer } = useSession();

  const entrerEnInvite = () => {
    entrer("invite");
    navigate("/tableau-de-bord");
  };

  return (
    <div className="min-h-screen bg-ink-200 lg:p-5 dark:bg-ink-950">
      <div className="mx-auto grid w-full max-w-[1440px] overflow-hidden bg-white lg:min-h-[calc(100vh-2.5rem)] lg:grid-cols-2 lg:rounded-3xl lg:shadow-xl lg:ring-1 lg:ring-ink-300/50 dark:bg-ink-900 dark:lg:ring-ink-800">
        {/* ---- Panneau de présentation ---- */}
        <aside className="relative hidden flex-col justify-between overflow-hidden bg-ink-950 p-10 lg:flex">
          <div
            className="pointer-events-none absolute -top-24 -right-20 size-96 rounded-full bg-brand-600/35 blur-3xl"
            aria-hidden="true"
          />
          <div
            className="pointer-events-none absolute -bottom-28 -left-16 size-80 rounded-full bg-lime-400/20 blur-3xl"
            aria-hidden="true"
          />

          <Link to="/" className="relative flex items-center gap-2.5">
            <Logo className="size-9" />
            <span className="text-lg font-bold tracking-tight text-white">
              {site.nom}
            </span>
          </Link>

          <div className="relative">
            <p className="text-sm font-semibold tracking-wide text-lime-400 uppercase">
              {site.filiere}
            </p>
            <p className="mt-4 text-3xl leading-snug font-bold text-balance text-white">
              Les cours, les exercices et les QCM de la filière, réunis au même
              endroit.
            </p>
            <p className="mt-5 max-w-sm text-sm/7 text-white/70">
              Projet étudiant, gratuit et sans objectif commercial. Aucun
              document universitaire n'est publié sans autorisation.
            </p>
          </div>

          <div className="relative flex items-center gap-3 rounded-2xl bg-white/10 p-4">
            <Icon name="lock" className="size-5 shrink-0 text-lime-400" />
            <p className="text-xs/5 text-white/80">
              La connexion réelle arrivera en version 3, avec un contrôle des
              accès côté serveur. Cet écran en dessine déjà l'interface.
            </p>
          </div>
        </aside>

        {/* ---- Colonne formulaire ---- */}
        <div className="flex flex-col px-5 py-8 sm:px-10 lg:justify-center lg:py-12">
          <Link to="/" className="mb-8 flex items-center gap-2.5 lg:hidden">
            <Logo className="size-9" />
            <Signature />
          </Link>

          <div className="mx-auto w-full max-w-md">
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-500 hover:text-brand-600 dark:text-ink-400"
            >
              <Icon name="arrow" className="size-4 rotate-180" />
              Retour à l'accueil
            </Link>

            <h1 className="mt-5 text-3xl font-bold tracking-tight text-ink-950 dark:text-white">
              {titre}
            </h1>
            <p className="mt-2 text-sm/6 text-ink-600 dark:text-ink-400">
              {texte}
            </p>

            {/* Avertissement, volontairement bien visible */}
            <div className="mt-6 flex gap-3 rounded-xl border border-sun-400/50 bg-sun-100/70 px-4 py-3 dark:border-sun-400/40 dark:bg-sun-400/15">
              <Icon
                name="bulb"
                className="mt-0.5 size-4.5 shrink-0 text-sun-600 dark:text-sun-400"
              />
              <p className="text-xs/5 text-sun-900 dark:text-sun-100">
                <strong className="font-semibold">
                  Formulaire de démonstration.
                </strong>{" "}
                Aucun compte n'existe encore : rien n'est vérifié, rien n'est
                envoyé et le mot de passe n'est pas enregistré. N'utilise pas un
                mot de passe que tu emploies ailleurs.
              </p>
            </div>

            {children}

            {/* Mode invité */}
            <div className="mt-7">
              <div className="flex items-center gap-4">
                <span className="h-px flex-1 bg-ink-200 dark:bg-ink-800" />
                <span className="text-xs font-medium text-ink-400">ou</span>
                <span className="h-px flex-1 bg-ink-200 dark:bg-ink-800" />
              </div>

              <button
                type="button"
                onClick={entrerEnInvite}
                className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-lime-400 px-5 py-3.5 text-sm font-semibold text-ink-950 transition-colors hover:bg-lime-300"
              >
                <Icon name="users" className="size-4.5" />
                Entrer en mode invité
              </button>
              <p className="mt-2.5 text-center text-xs text-ink-500 dark:text-ink-400">
                Accès immédiat à tous les contenus, sans compte et sans aucune
                donnée personnelle.
              </p>
            </div>

            <p className="mt-8 text-center text-sm text-ink-600 dark:text-ink-400">
              {pied}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Champs                                                              */
/* ------------------------------------------------------------------ */

function Champ({ id, label, erreur, aide, ...rest }) {
  return (
    <div>
      <label
        htmlFor={id}
        className="block text-sm font-medium text-ink-800 dark:text-ink-200"
      >
        {label}
      </label>
      <input
        id={id}
        aria-invalid={erreur ? true : undefined}
        aria-describedby={erreur ? `${id}-erreur` : aide ? `${id}-aide` : undefined}
        className={cx(
          "mt-1.5 w-full rounded-xl border bg-white px-4 py-3 text-sm text-ink-900 placeholder:text-ink-400 focus:ring-2 focus:ring-brand-500/20 dark:bg-ink-950 dark:text-white",
          erreur
            ? "border-red-400 focus:border-red-500"
            : "border-ink-200 focus:border-brand-500 dark:border-ink-700"
        )}
        {...rest}
      />
      {erreur ? (
        <p
          id={`${id}-erreur`}
          role="alert"
          className="mt-1.5 text-xs text-red-600 dark:text-red-400"
        >
          {erreur}
        </p>
      ) : aide ? (
        <p id={`${id}-aide`} className="mt-1.5 text-xs text-ink-500">
          {aide}
        </p>
      ) : null}
    </div>
  );
}

function ChampMotDePasse({ id, label, erreur, aide, valeur, onChange }) {
  const [visible, setVisible] = useState(false);
  return (
    <div>
      <label
        htmlFor={id}
        className="block text-sm font-medium text-ink-800 dark:text-ink-200"
      >
        {label}
      </label>
      <div className="relative mt-1.5">
        <input
          id={id}
          type={visible ? "text" : "password"}
          value={valeur}
          onChange={(e) => onChange(e.target.value)}
          autoComplete="new-password"
          aria-invalid={erreur ? true : undefined}
          aria-describedby={
            erreur ? `${id}-erreur` : aide ? `${id}-aide` : undefined
          }
          className={cx(
            "w-full rounded-xl border bg-white px-4 py-3 pr-12 text-sm text-ink-900 placeholder:text-ink-400 focus:ring-2 focus:ring-brand-500/20 dark:bg-ink-950 dark:text-white",
            erreur
              ? "border-red-400 focus:border-red-500"
              : "border-ink-200 focus:border-brand-500 dark:border-ink-700"
          )}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={
            visible ? "Masquer le mot de passe" : "Afficher le mot de passe"
          }
          className="absolute top-1/2 right-2 grid size-9 -translate-y-1/2 place-items-center rounded-lg text-ink-400 hover:bg-ink-100 hover:text-ink-700 dark:hover:bg-ink-800"
        >
          <Icon name={visible ? "sun" : "lock"} className="size-4" />
        </button>
      </div>
      {erreur ? (
        <p
          id={`${id}-erreur`}
          role="alert"
          className="mt-1.5 text-xs text-red-600 dark:text-red-400"
        >
          {erreur}
        </p>
      ) : aide ? (
        <p id={`${id}-aide`} className="mt-1.5 text-xs text-ink-500">
          {aide}
        </p>
      ) : null}
    </div>
  );
}

const boutonPrincipal =
  "mt-6 w-full rounded-xl bg-ink-950 px-5 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-ink-800 dark:bg-white dark:text-ink-950 dark:hover:bg-ink-200";

/* ================================================================== */
/* Connexion                                                           */
/* ================================================================== */

export function Connexion() {
  const navigate = useNavigate();
  const { entrer } = useSession();

  const [identifiant, setIdentifiant] = useState("");
  const [motDePasse, setMotDePasse] = useState("");
  const [erreurs, setErreurs] = useState({});

  const soumettre = (e) => {
    e.preventDefault();
    const suite = {};
    if (!identifiant.trim()) {
      suite.identifiant = "Indique ton matricule ou ton adresse e-mail.";
    }
    if (motDePasse.length < 8) {
      suite.motDePasse = "Le mot de passe doit faire au moins 8 caractères.";
    }
    setErreurs(suite);
    if (Object.keys(suite).length > 0) return;

    // Le mot de passe n'est pas conservé : il reste dans l'état du composant.
    entrer("demo", identifiant.trim());
    navigate("/tableau-de-bord");
  };

  return (
    <CadreAuth
      titre="Se connecter"
      texte="Retrouve tes matières, tes exercices et ta progression."
      pied={
        <>
          Pas encore de compte ?{" "}
          <Link
            to="/inscription"
            className="font-semibold text-brand-600 hover:underline dark:text-brand-400"
          >
            Créer un compte
          </Link>
        </>
      }
    >
      <form onSubmit={soumettre} noValidate className="mt-6 space-y-4">
        <Champ
          id="identifiant"
          label="Matricule ou adresse e-mail"
          type="text"
          autoComplete="username"
          placeholder="Ex. 21RSI0456"
          value={identifiant}
          onChange={(e) => setIdentifiant(e.target.value)}
          erreur={erreurs.identifiant}
        />

        <ChampMotDePasse
          id="mot-de-passe"
          label="Mot de passe"
          valeur={motDePasse}
          onChange={setMotDePasse}
          erreur={erreurs.motDePasse}
          aide="Au moins 8 caractères. Ce champ n'est ni vérifié ni enregistré."
        />

        <button type="submit" className={boutonPrincipal}>
          Se connecter
        </button>
      </form>
    </CadreAuth>
  );
}

/* ================================================================== */
/* Inscription                                                         */
/* ================================================================== */

const niveaux = ["Licence 1", "Licence 2", "Licence 3"];

export function Inscription() {
  const navigate = useNavigate();
  const { entrer } = useSession();

  const [nom, setNom] = useState("");
  const [matricule, setMatricule] = useState("");
  const [niveau, setNiveau] = useState(niveaux[0]);
  const [motDePasse, setMotDePasse] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [accepte, setAccepte] = useState(false);
  const [erreurs, setErreurs] = useState({});

  const soumettre = (e) => {
    e.preventDefault();
    const suite = {};
    if (nom.trim().length < 2) suite.nom = "Indique ton nom complet.";
    if (!matricule.trim()) suite.matricule = "Indique ton matricule étudiant.";
    if (motDePasse.length < 8) {
      suite.motDePasse = "Le mot de passe doit faire au moins 8 caractères.";
    }
    if (confirmation !== motDePasse) {
      suite.confirmation = "Les deux mots de passe ne correspondent pas.";
    }
    if (!accepte) suite.accepte = "Il faut accepter le cadre du projet.";
    setErreurs(suite);
    if (Object.keys(suite).length > 0) return;

    // Seul le nom affiché est retenu. Ni le matricule ni le mot de passe
    // ne sont enregistrés tant qu'il n'y a pas de serveur.
    entrer("demo", nom.trim());
    navigate("/tableau-de-bord");
  };

  return (
    <CadreAuth
      titre="Créer un compte"
      texte="Quelques informations suffisent pour suivre ta progression."
      pied={
        <>
          Tu as déjà un compte ?{" "}
          <Link
            to="/connexion"
            className="font-semibold text-brand-600 hover:underline dark:text-brand-400"
          >
            Se connecter
          </Link>
        </>
      }
    >
      <form onSubmit={soumettre} noValidate className="mt-6 space-y-4">
        <Champ
          id="nom"
          label="Nom complet"
          type="text"
          autoComplete="name"
          placeholder="Ex. Aïssatou Diallo"
          value={nom}
          onChange={(e) => setNom(e.target.value)}
          erreur={erreurs.nom}
        />

        <Champ
          id="matricule"
          label="Matricule étudiant"
          type="text"
          placeholder="Ex. 21RSI0456"
          value={matricule}
          onChange={(e) => setMatricule(e.target.value)}
          erreur={erreurs.matricule}
        />

        <div>
          <label
            htmlFor="niveau"
            className="block text-sm font-medium text-ink-800 dark:text-ink-200"
          >
            Niveau
          </label>
          <select
            id="niveau"
            value={niveau}
            onChange={(e) => setNiveau(e.target.value)}
            className="mt-1.5 w-full rounded-xl border border-ink-200 bg-white px-4 py-3 text-sm text-ink-900 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-ink-700 dark:bg-ink-950 dark:text-white"
          >
            {niveaux.map((n) => (
              <option key={n}>{n}</option>
            ))}
          </select>
        </div>

        <ChampMotDePasse
          id="nouveau-mot-de-passe"
          label="Mot de passe"
          valeur={motDePasse}
          onChange={setMotDePasse}
          erreur={erreurs.motDePasse}
          aide="Au moins 8 caractères. Ce champ n'est ni vérifié ni enregistré."
        />

        <ChampMotDePasse
          id="confirmation"
          label="Confirmer le mot de passe"
          valeur={confirmation}
          onChange={setConfirmation}
          erreur={erreurs.confirmation}
        />

        <div>
          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              checked={accepte}
              onChange={(e) => setAccepte(e.target.checked)}
              aria-describedby={erreurs.accepte ? "accepte-erreur" : undefined}
              className="mt-0.5 size-4.5 shrink-0 rounded border-ink-300 text-brand-600 focus:ring-brand-500/30 dark:border-ink-600"
            />
            <span className="text-sm/6 text-ink-600 dark:text-ink-400">
              J'ai lu{" "}
              <Link
                to="/projet"
                className="font-medium text-brand-600 hover:underline dark:text-brand-400"
              >
                le cadre du projet
              </Link>{" "}
              et je comprends qu'aucun document universitaire n'y est publié sans
              autorisation.
            </span>
          </label>
          {erreurs.accepte && (
            <p
              id="accepte-erreur"
              role="alert"
              className="mt-1.5 text-xs text-red-600 dark:text-red-400"
            >
              {erreurs.accepte}
            </p>
          )}
        </div>

        <button type="submit" className={boutonPrincipal}>
          Créer mon compte
        </button>
      </form>
    </CadreAuth>
  );
}
