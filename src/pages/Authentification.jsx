import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Icon from "../components/Icon";
import { Logo, Signature } from "../components/Layout";
import { cx } from "../components/classes";
import { useSession } from "../session";
import { site } from "../data/site";
import { niveaux } from "../profil";
import { normaliserTelephone } from "../telephone";
import {
  changerMotDePasse,
  comptesActifs,
  connecter,
  connecterGoogle,
  inscrireEmail,
  inscrireTelephone,
  messageErreurCompte,
  motDePasseOublie,
  renvoyerCodeInscription,
  verifierCode,
} from "../comptes";

/* ==================================================================
   Écrans d'entrée : connexion, inscription, mot de passe oublié et
   nouveau mot de passe. Les comptes sont gérés par Supabase
   (src/comptes.js) ; tant qu'ils ne sont pas activés
   (src/data/comptes.js), les écrans le disent et le mode invité reste
   ouvert.

   Une fois l'étudiant connecté, rien à faire ici : la session arrive
   par FournisseurSession.jsx, et la route (SiDejaEntre, App.jsx)
   l'envoie d'elle-même au tableau de bord.
   ================================================================== */

const MIN_MOT_DE_PASSE = 8;
// La longueur du code se règle dans Supabase (6 à 10 chiffres ; 6 ici).
const CODE = /^\d{6,10}$/;
const ATTENTE_RENVOI = 60;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/* ------------------------------------------------------------------ */
/* Cadre commun                                                        */
/* ------------------------------------------------------------------ */

function CadreAuth({ titre, texte, children, pied, sansInvite = false }) {
  const navigate = useNavigate();
  const { entrer, brancher } = useSession();

  // Écoute Supabase dès l'arrivée ici, pour voir la connexion aboutir.
  useEffect(() => brancher(), [brancher]);

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
              Ton compte garde ta progression sur tous tes appareils. Ton mot
              de passe est chiffré : personne dans l'équipe ne peut le lire.
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

            {!comptesActifs && (
              <div className="mt-6 flex gap-3 rounded-xl border border-ink-200 bg-ink-50 px-4 py-3 dark:border-ink-700 dark:bg-ink-800/60">
                <Icon name="info" className="mt-0.5 size-4.5 shrink-0 text-ink-500 dark:text-ink-400" />
                <p className="text-xs/5 text-ink-700 dark:text-ink-200">
                  Les comptes ne sont pas encore ouverts. En attendant, le
                  mode invité donne accès à tout, sans compte.
                </p>
              </div>
            )}

            {children}

            {!sansInvite && (
              <div className="mt-7">
                <Separateur />
                <button
                  type="button"
                  onClick={entrerEnInvite}
                  className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-lime-400 px-5 py-3.5 text-sm font-semibold text-ink-950 transition-colors hover:bg-lime-300"
                >
                  <Icon name="users" className="size-4.5" />
                  Entrer en mode invité
                </button>
                <p className="mt-2.5 text-center text-xs text-ink-500 dark:text-ink-400">
                  Accès immédiat à tous les contenus, sans compte. Ta
                  progression reste alors sur cet appareil seulement.
                </p>
              </div>
            )}

            {pied && (
              <p className="mt-8 text-center text-sm text-ink-600 dark:text-ink-400">
                {pied}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Separateur() {
  return (
    <div className="flex items-center gap-4">
      <span className="h-px flex-1 bg-ink-200 dark:bg-ink-800" />
      <span className="text-xs font-medium text-ink-500 dark:text-ink-400">ou</span>
      <span className="h-px flex-1 bg-ink-200 dark:bg-ink-800" />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Champs                                                              */
/* ------------------------------------------------------------------ */

const classeChamp = (erreur) =>
  cx(
    "w-full rounded-xl border bg-white px-4 py-3 text-sm text-ink-900 placeholder:text-ink-400 focus:ring-2 focus:ring-brand-500/20 dark:bg-ink-950 dark:text-white",
    erreur
      ? "border-red-400 focus:border-red-500"
      : "border-ink-200 focus:border-brand-500 dark:border-ink-700"
  );

function Aide({ id, erreur, aide }) {
  if (erreur) {
    return (
      <p id={`${id}-erreur`} role="alert" className="mt-1.5 text-xs text-red-600 dark:text-red-400">
        {erreur}
      </p>
    );
  }
  return aide ? (
    <p id={`${id}-aide`} className="mt-1.5 text-xs text-ink-500 dark:text-ink-400">
      {aide}
    </p>
  ) : null;
}

const decrit = (id, erreur, aide) => (erreur ? `${id}-erreur` : aide ? `${id}-aide` : undefined);

function Champ({ id, label, erreur, aide, ...rest }) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-ink-800 dark:text-ink-200">
        {label}
      </label>
      <input
        id={id}
        aria-invalid={erreur ? true : undefined}
        aria-describedby={decrit(id, erreur, aide)}
        className={cx("mt-1.5", classeChamp(erreur))}
        {...rest}
      />
      <Aide id={id} erreur={erreur} aide={aide} />
    </div>
  );
}

function ChampMotDePasse({ id, label, erreur, aide, valeur, onChange, autoComplete = "new-password" }) {
  const [visible, setVisible] = useState(false);
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-ink-800 dark:text-ink-200">
        {label}
      </label>
      <div className="relative mt-1.5">
        <input
          id={id}
          type={visible ? "text" : "password"}
          value={valeur}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          aria-invalid={erreur ? true : undefined}
          aria-describedby={decrit(id, erreur, aide)}
          className={cx("pr-12", classeChamp(erreur))}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "Masquer le mot de passe" : "Afficher le mot de passe"}
          className="absolute top-1/2 right-2 grid size-9 -translate-y-1/2 place-items-center rounded-lg text-ink-500 hover:bg-ink-100 hover:text-ink-700 dark:text-ink-400 dark:hover:bg-ink-800"
        >
          <Icon name={visible ? "sun" : "lock"} className="size-4" />
        </button>
      </div>
      <Aide id={id} erreur={erreur} aide={aide} />
    </div>
  );
}

/* Erreur venue du serveur, sous le formulaire. */
function ErreurServeur({ code }) {
  if (!code) return null;
  return (
    <p role="alert" className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300">
      {messageErreurCompte(code)}
    </p>
  );
}

const boutonPrincipal =
  "mt-6 w-full rounded-xl bg-ink-950 px-5 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-ink-800 disabled:cursor-wait disabled:opacity-60 dark:bg-white dark:text-ink-950 dark:hover:bg-ink-200";

/* Le « G » de Google, aux couleurs demandées par ses règles d'usage. */
function LogoGoogle() {
  return (
    <svg viewBox="0 0 48 48" className="size-5" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  );
}

function BoutonGoogle({ surErreur }) {
  const [attente, setAttente] = useState(false);
  const partir = async () => {
    setAttente(true);
    surErreur(null);
    const r = await connecterGoogle();
    // En cas de succès, le navigateur part chez Google : on ne revient ici
    // qu'en cas d'erreur.
    if (r.erreur) {
      setAttente(false);
      surErreur(r.erreur);
    }
  };
  return (
    <button
      type="button"
      onClick={partir}
      disabled={attente}
      className="mt-6 flex w-full items-center justify-center gap-3 rounded-xl border border-ink-200 bg-white px-5 py-3.5 text-sm font-semibold text-ink-900 transition-colors hover:bg-ink-50 disabled:cursor-wait disabled:opacity-60 dark:border-ink-700 dark:bg-ink-950 dark:text-white dark:hover:bg-ink-800"
    >
      <LogoGoogle />
      {attente ? "Ouverture de Google…" : "Continuer avec Google"}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Code reçu par email                                                 */
/* `prudent` : ne dit pas si l'adresse a un compte (mot de passe       */
/* oublié), pour ne pas révéler qui est inscrit.                       */
/* ------------------------------------------------------------------ */

function SaisieCode({ email, type, renvoyer, texteBouton, surValide, prudent = false }) {
  const [code, setCode] = useState("");
  const [erreur, setErreur] = useState(null);
  const [erreurServeur, setErreurServeur] = useState(null);
  const [attente, setAttente] = useState(false);
  const [delai, setDelai] = useState(ATTENTE_RENVOI);
  const [renvoye, setRenvoye] = useState(false);

  // Compte à rebours avant de pouvoir redemander un code.
  useEffect(() => {
    if (delai <= 0) return undefined;
    const t = setTimeout(() => setDelai((d) => d - 1), 1000);
    return () => clearTimeout(t);
  }, [delai]);

  const valider = async (e) => {
    e.preventDefault();
    setErreurServeur(null);
    const propre = code.replace(/\s/g, "");
    if (!CODE.test(propre)) {
      setErreur("Recopie le code reçu par email : seulement des chiffres, sans en oublier.");
      return;
    }
    setErreur(null);
    setAttente(true);
    const r = await verifierCode({ email, code: propre, type });
    setAttente(false);
    if (r.erreur) setErreurServeur(r.erreur === "invalid_credentials" ? "otp_expired" : r.erreur);
    else surValide?.();
    // Inscription : la session arrive et la page part d'elle-même.
  };

  const redemander = async () => {
    setErreurServeur(null);
    setRenvoye(false);
    const r = await renvoyer();
    setDelai(ATTENTE_RENVOI);
    if (r.erreur) setErreurServeur(r.erreur === "over_email_send_rate_limit" ? "over_email_send_rate_limit_resend" : r.erreur);
    else setRenvoye(true);
  };

  return (
    <form onSubmit={valider} noValidate className="mt-6 space-y-4">
      <p role="status" className="rounded-2xl border border-ink-200 p-5 text-sm/6 text-ink-700 dark:border-ink-700 dark:text-ink-200">
        {prudent ? "Si un compte existe avec l'adresse " : "Un code vient de partir vers "}
        <strong className="font-semibold break-all text-ink-950 dark:text-white">{email}</strong>
        {prudent ? ", un code vient d'y partir. " : ". "}
        Tape-le ci-dessous. Pense à regarder dans les courriers indésirables : le premier
        email peut mettre quelques minutes à arriver.
      </p>
      <Champ
        id="code"
        label="Code reçu par email"
        type="text"
        inputMode="numeric"
        autoComplete="one-time-code"
        maxLength={12}
        placeholder="123456"
        value={code}
        onChange={(e) => setCode(e.target.value)}
        erreur={erreur}
      />
      <ErreurServeur code={erreurServeur} />
      {renvoye && (
        <p role="status" className="text-sm text-accent-700 dark:text-accent-400">
          Nouveau code envoyé. Seul le dernier reçu fonctionne.
        </p>
      )}
      <button type="submit" disabled={attente} className={boutonPrincipal}>
        {attente ? "Vérification…" : texteBouton}
      </button>
      <button
        type="button"
        onClick={redemander}
        disabled={delai > 0}
        className="w-full text-center text-sm font-medium text-brand-600 hover:underline disabled:cursor-default disabled:text-ink-400 disabled:no-underline dark:text-brand-400 dark:disabled:text-ink-500"
      >
        {delai > 0 ? `Renvoyer un code (dans ${delai} s)` : "Renvoyer un code"}
      </button>
    </form>
  );
}

/* ================================================================== */
/* Connexion                                                           */
/* ================================================================== */

export function Connexion() {
  const [identifiant, setIdentifiant] = useState("");
  const [motDePasse, setMotDePasse] = useState("");
  const [erreurs, setErreurs] = useState({});
  const [erreurServeur, setErreurServeur] = useState(null);
  const [attente, setAttente] = useState(false);

  const soumettre = async (e) => {
    e.preventDefault();
    const suite = {};
    const id = identifiant.trim();
    if (!id) suite.identifiant = "Indique ton adresse email ou ton numéro de téléphone.";
    else if (id.includes("@") ? !EMAIL.test(id) : !normaliserTelephone(id)) {
      suite.identifiant = id.includes("@") ? "Cette adresse email n'est pas valide." : "Ce numéro n'est pas valide. Exemple : 77 123 45 67.";
    }
    if (!motDePasse) suite.motDePasse = "Indique ton mot de passe.";
    setErreurs(suite);
    setErreurServeur(null);
    if (Object.keys(suite).length > 0) return;

    setAttente(true);
    const r = await connecter({ identifiant: id, motDePasse });
    // Réussite : la session arrive et la page part d'elle-même.
    if (r.erreur) {
      setAttente(false);
      setErreurServeur(r.erreur);
    }
  };

  return (
    <CadreAuth
      titre="Se connecter"
      texte="Retrouve tes matières, tes exercices et ta progression, sur tous tes appareils."
      pied={
        <>
          Pas encore de compte ?{" "}
          <Link to="/inscription" className="font-semibold text-brand-600 hover:underline dark:text-brand-400">
            Créer un compte
          </Link>
        </>
      }
    >
      <BoutonGoogle surErreur={setErreurServeur} />
      <div className="mt-6">
        <Separateur />
      </div>

      <form onSubmit={soumettre} noValidate className="mt-6 space-y-4">
        <Champ
          id="identifiant"
          label="Email ou numéro de téléphone"
          type="text"
          inputMode="email"
          autoComplete="username"
          placeholder="Ex. awa@exemple.com ou 77 123 45 67"
          value={identifiant}
          onChange={(e) => setIdentifiant(e.target.value)}
          erreur={erreurs.identifiant}
        />

        <div>
          <ChampMotDePasse
            id="mot-de-passe"
            label="Mot de passe"
            valeur={motDePasse}
            onChange={setMotDePasse}
            erreur={erreurs.motDePasse}
            autoComplete="current-password"
          />
          <Link
            to="/mot-de-passe-oublie"
            className="mt-2 inline-block text-xs font-medium text-brand-600 hover:underline dark:text-brand-400"
          >
            Mot de passe oublié ?
          </Link>
        </div>

        <ErreurServeur code={erreurServeur} />

        <button type="submit" disabled={attente} className={boutonPrincipal}>
          {attente ? "Connexion…" : "Se connecter"}
        </button>
      </form>
    </CadreAuth>
  );
}

/* ================================================================== */
/* Inscription                                                         */
/* ================================================================== */

const METHODES = [
  { valeur: "email", label: "Email" },
  { valeur: "telephone", label: "Téléphone" },
];

export function Inscription() {
  const [methode, setMethode] = useState("email");
  const [nom, setNom] = useState("");
  const [niveau, setNiveau] = useState(niveaux[0]);
  const [email, setEmail] = useState("");
  const [telephone, setTelephone] = useState("");
  const [motDePasse, setMotDePasse] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [accepte, setAccepte] = useState(false);
  const [erreurs, setErreurs] = useState({});
  const [erreurServeur, setErreurServeur] = useState(null);
  const [attente, setAttente] = useState(false);
  const [emailEnvoye, setEmailEnvoye] = useState(null);

  const soumettre = async (e) => {
    e.preventDefault();
    const suite = {};
    if (nom.trim().length < 2) suite.nom = "Indique ton nom.";
    if (methode === "email" && !EMAIL.test(email.trim())) suite.email = "Indique une adresse email valide.";
    if (methode === "telephone" && !normaliserTelephone(telephone)) {
      suite.telephone = "Indique un numéro valide. Exemple : 77 123 45 67.";
    }
    if (motDePasse.length < MIN_MOT_DE_PASSE) {
      suite.motDePasse = `Le mot de passe doit faire au moins ${MIN_MOT_DE_PASSE} caractères.`;
    }
    if (confirmation !== motDePasse) suite.confirmation = "Les deux mots de passe ne correspondent pas.";
    if (!accepte) suite.accepte = "Il faut accepter les conditions d'utilisation.";
    setErreurs(suite);
    setErreurServeur(null);
    if (Object.keys(suite).length > 0) return;

    setAttente(true);
    const r =
      methode === "email"
        ? await inscrireEmail({ email, motDePasse, nom, niveau })
        : await inscrireTelephone({ telephone, motDePasse, nom, niveau });
    setAttente(false);
    if (r.erreur) setErreurServeur(r.erreur);
    else if (r.confirmer) setEmailEnvoye(email.trim());
    // Sinon, déjà connecté : la page part d'elle-même.
  };

  if (emailEnvoye) {
    return (
      <CadreAuth titre="Vérifie ta boîte mail" texte="Ton compte est presque prêt." sansInvite>
        <SaisieCode
          email={emailEnvoye}
          type="signup"
          renvoyer={() => renvoyerCodeInscription(emailEnvoye)}
          texteBouton="Activer mon compte"
        />
        <button
          type="button"
          onClick={() => setEmailEnvoye(null)}
          className="mt-4 w-full text-center text-sm font-medium text-ink-500 hover:text-brand-600 dark:text-ink-400"
        >
          Modifier l'adresse email
        </button>
      </CadreAuth>
    );
  }

  return (
    <CadreAuth
      titre="Créer un compte"
      texte="Gratuit. Ta progression te suit ensuite sur tous tes appareils."
      pied={
        <>
          Tu as déjà un compte ?{" "}
          <Link to="/connexion" className="font-semibold text-brand-600 hover:underline dark:text-brand-400">
            Se connecter
          </Link>
        </>
      }
    >
      <BoutonGoogle surErreur={setErreurServeur} />
      <div className="mt-6">
        <Separateur />
      </div>

      <form onSubmit={soumettre} noValidate className="mt-6 space-y-4">
        <div role="group" aria-label="S'inscrire avec" className="grid grid-cols-2 gap-2 rounded-xl bg-ink-100 p-1 dark:bg-ink-800">
          {METHODES.map((m) => (
            <button
              key={m.valeur}
              type="button"
              onClick={() => setMethode(m.valeur)}
              aria-pressed={methode === m.valeur}
              className={cx(
                "rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                methode === m.valeur
                  ? "bg-white text-ink-950 shadow-sm dark:bg-ink-950 dark:text-white"
                  : "text-ink-600 hover:text-ink-900 dark:text-ink-300 dark:hover:text-white"
              )}
            >
              {m.label}
            </button>
          ))}
        </div>

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

        {methode === "email" ? (
          <Champ
            id="email"
            label="Adresse email"
            type="email"
            autoComplete="email"
            placeholder="Ex. awa@exemple.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            erreur={erreurs.email}
            aide="Un lien de confirmation y sera envoyé."
          />
        ) : (
          <Champ
            id="telephone"
            label="Numéro de téléphone"
            type="tel"
            autoComplete="tel"
            placeholder="Ex. 77 123 45 67"
            value={telephone}
            onChange={(e) => setTelephone(e.target.value)}
            erreur={erreurs.telephone}
            aide="Aucun SMS n'est envoyé. Pour un numéro hors du Sénégal, commence par l'indicatif (+33…). Garde bien ton mot de passe : sans email, il ne peut pas être réinitialisé par lien."
          />
        )}

        <div>
          <label htmlFor="niveau" className="block text-sm font-medium text-ink-800 dark:text-ink-200">
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
          aide={`Au moins ${MIN_MOT_DE_PASSE} caractères. Évite un mot de passe que tu utilises ailleurs.`}
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
              J'accepte les{" "}
              <Link to="/conditions" className="font-medium text-brand-600 hover:underline dark:text-brand-400">
                conditions d'utilisation
              </Link>{" "}
              et j'ai lu la{" "}
              <Link to="/confidentialite" className="font-medium text-brand-600 hover:underline dark:text-brand-400">
                politique de confidentialité
              </Link>
              .
            </span>
          </label>
          {erreurs.accepte && (
            <p id="accepte-erreur" role="alert" className="mt-1.5 text-xs text-red-600 dark:text-red-400">
              {erreurs.accepte}
            </p>
          )}
        </div>

        <ErreurServeur code={erreurServeur} />

        <button type="submit" disabled={attente} className={boutonPrincipal}>
          {attente ? "Création du compte…" : "Créer mon compte"}
        </button>
      </form>
    </CadreAuth>
  );
}

/* ================================================================== */
/* Mot de passe oublié                                                 */
/* ================================================================== */

export function MotDePasseOublie() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [erreur, setErreur] = useState(null);
  const [erreurServeur, setErreurServeur] = useState(null);
  const [attente, setAttente] = useState(false);
  const [envoye, setEnvoye] = useState(false);

  const soumettre = async (e) => {
    e.preventDefault();
    setErreurServeur(null);
    if (!EMAIL.test(email.trim())) {
      setErreur("Indique l'adresse email de ton compte.");
      return;
    }
    setErreur(null);
    setAttente(true);
    const r = await motDePasseOublie(email);
    setAttente(false);
    if (r.erreur) setErreurServeur(r.erreur);
    else setEnvoye(true);
  };

  return (
    <CadreAuth
      titre="Mot de passe oublié"
      texte="Reçois par email un code pour choisir un nouveau mot de passe."
      sansInvite
      pied={
        <Link to="/connexion" className="font-semibold text-brand-600 hover:underline dark:text-brand-400">
          Revenir à la connexion
        </Link>
      }
    >
      {envoye ? (
        <>
          <SaisieCode
            email={email.trim()}
            type="recovery"
            renvoyer={() => motDePasseOublie(email)}
            texteBouton="Continuer"
            // Le code bon, l'étudiant est connecté : il choisit son mot de passe.
            surValide={() => navigate("/nouveau-mot-de-passe")}
            prudent
          />
          <button
            type="button"
            onClick={() => setEnvoye(false)}
            className="mt-4 w-full text-center text-sm font-medium text-ink-500 hover:text-brand-600 dark:text-ink-400"
          >
            Modifier l'adresse email
          </button>
        </>
      ) : (
        <form onSubmit={soumettre} noValidate className="mt-6 space-y-4">
          <Champ
            id="email-oubli"
            label="Adresse email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            erreur={erreur}
            aide="Inscrit avec ton numéro de téléphone ? Écris à l'équipe du site : elle peut réinitialiser ton mot de passe."
          />
          <ErreurServeur code={erreurServeur} />
          <button type="submit" disabled={attente} className={boutonPrincipal}>
            {attente ? "Envoi…" : "Recevoir un code"}
          </button>
        </form>
      )}
    </CadreAuth>
  );
}

/* ================================================================== */
/* Nouveau mot de passe (après le code reçu par email)                  */
/* ================================================================== */

export function NouveauMotDePasse() {
  const navigate = useNavigate();
  const { session } = useSession();
  const [motDePasse, setMotDePasse] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [erreurs, setErreurs] = useState({});
  const [erreurServeur, setErreurServeur] = useState(null);
  const [attente, setAttente] = useState(false);

  const soumettre = async (e) => {
    e.preventDefault();
    const suite = {};
    if (motDePasse.length < MIN_MOT_DE_PASSE) {
      suite.motDePasse = `Le mot de passe doit faire au moins ${MIN_MOT_DE_PASSE} caractères.`;
    }
    if (confirmation !== motDePasse) suite.confirmation = "Les deux mots de passe ne correspondent pas.";
    setErreurs(suite);
    setErreurServeur(null);
    if (Object.keys(suite).length > 0) return;
    setAttente(true);
    const r = await changerMotDePasse(motDePasse);
    setAttente(false);
    if (r.erreur) setErreurServeur(r.erreur);
    else navigate("/tableau-de-bord");
  };

  return (
    <CadreAuth titre="Nouveau mot de passe" texte="Choisis le mot de passe de ton compte." sansInvite>
      {session?.mode !== "compte" ? (
        <p className="mt-6 text-sm/6 text-ink-600 dark:text-ink-300">
          Pour changer ton mot de passe, demande d'abord un code par email.{" "}
          <Link to="/mot-de-passe-oublie" className="font-semibold text-brand-600 hover:underline dark:text-brand-400">
            Recevoir un code
          </Link>
          .
        </p>
      ) : (
        <form onSubmit={soumettre} noValidate className="mt-6 space-y-4">
          <ChampMotDePasse
            id="nouveau-mot-de-passe"
            label="Nouveau mot de passe"
            valeur={motDePasse}
            onChange={setMotDePasse}
            erreur={erreurs.motDePasse}
            aide={`Au moins ${MIN_MOT_DE_PASSE} caractères.`}
          />
          <ChampMotDePasse
            id="confirmation"
            label="Confirmer le mot de passe"
            valeur={confirmation}
            onChange={setConfirmation}
            erreur={erreurs.confirmation}
          />
          <ErreurServeur code={erreurServeur} />
          <button type="submit" disabled={attente} className={boutonPrincipal}>
            {attente ? "Enregistrement…" : "Enregistrer"}
          </button>
        </form>
      )}
    </CadreAuth>
  );
}
