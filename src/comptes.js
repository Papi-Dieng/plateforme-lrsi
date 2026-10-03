import { comptes, comptesActifs } from "./data/comptes";
import { site } from "./data/site";
import { afficherTelephone, emailTelephone, estEmailTelephone, normaliserTelephone } from "./telephone";

/* ==================================================================
   Comptes étudiants (Supabase Auth).

   Trois façons d'entrer, au choix de l'étudiant :
     - email + mot de passe (Supabase envoie un lien de confirmation) ;
     - numéro de téléphone + mot de passe, sans SMS (src/telephone.js) ;
     - son compte Google.

   Supabase garde les mots de passe (hachés) et la session : le site ne
   voit jamais un mot de passe au-delà du formulaire qui le transmet.
   La bibliothèque n'est téléchargée que si les comptes sont activés
   (src/data/comptes.js) : le visiteur invité n'en paie pas le poids.

   Les emails (confirmation d'inscription, mot de passe oublié) ne
   contiennent pas de lien mais un code numérique, que l'étudiant
   tape sur le site : le service d'envoi (Brevo) réécrit les liens pour
   compter les clics, et certaines messageries les « cliquent » avant
   l'étudiant. Seul le retour de Google passe par l'adresse, avec le
   flux « PKCE » : « ?code= », qui ne gêne pas les adresses en « #/ ».
   ================================================================== */

export { comptesActifs };

let promesseClient = null;

export function client() {
  if (!comptesActifs) return Promise.reject(new Error("comptes-non-configures"));
  promesseClient ??= import("@supabase/supabase-js").then(({ createClient }) =>
    createClient(comptes.url, comptes.cleAnon, {
      auth: { flowType: "pkce", persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    })
  );
  return promesseClient;
}

// Là où Supabase renvoie l'étudiant après un lien : la racine du site.
// Cette adresse doit figurer dans Supabase, Authentication → URL
// Configuration → Redirect URLs.
const adresseRetour = () => `${window.location.origin}${window.location.pathname}`;

/* Le code « ?code= » a servi : on le retire de l'adresse, pour qu'un
   rechargement ou un partage du lien ne le rejoue pas. */
export function nettoyerAdresse() {
  const url = new URL(window.location.href);
  if (!url.searchParams.has("code") && !url.searchParams.has("error")) return;
  url.searchParams.delete("code");
  url.searchParams.delete("error");
  url.searchParams.delete("error_code");
  url.searchParams.delete("error_description");
  window.history.replaceState(null, "", url.toString());
}

/* Ce que le site retient d'un compte, pour l'afficher. */
export function sessionDeCompte(utilisateur) {
  const meta = utilisateur.user_metadata ?? {};
  const telephone = meta.telephone || (estEmailTelephone(utilisateur.email) ? utilisateur.email.split("@")[0] : "");
  const email = telephone ? "" : utilisateur.email ?? "";
  const fournisseur = utilisateur.app_metadata?.provider === "google" ? "google" : telephone ? "telephone" : "email";
  return {
    mode: "compte",
    id: utilisateur.id,
    nom: meta.nom || meta.full_name || meta.name || (email ? email.split("@")[0] : "Étudiant"),
    niveau: meta.niveau || "",
    identifiant: telephone ? afficherTelephone(telephone) : email,
    fournisseur,
    depuis: utilisateur.created_at ?? new Date().toISOString(),
  };
}

/* ---------------------------------------------------------------- */
/* Inscription et connexion                                          */
/* Chaque fonction renvoie { ok } ou { erreur } (un code, traduit    */
/* par messageErreurCompte).                                         */
/* ---------------------------------------------------------------- */

const codeDe = (e) => {
  if (!e) return "reseau";
  if (e.code) return e.code;
  if (e.name === "AuthRetryableFetchError" || /fetch|network/i.test(e.message ?? "")) return "reseau";
  return e.message || "reseau";
};

async function tenter(action) {
  try {
    return await action();
  } catch (e) {
    return { erreur: codeDe(e) };
  }
}

export const inscrireEmail = ({ email, motDePasse, nom, niveau }) =>
  tenter(async () => {
    const sb = await client();
    const { data, error } = await sb.auth.signUp({
      email: email.trim(),
      password: motDePasse,
      options: { data: { nom: nom.trim(), niveau }, emailRedirectTo: adresseRetour() },
    });
    if (error) return { erreur: codeDe(error) };
    // Supabase ne dit pas qu'une adresse est déjà prise (pour ne pas
    // révéler qui est inscrit) : il renvoie un compte sans identité.
    if (data.user && data.user.identities?.length === 0) return { erreur: "user_already_exists" };
    // Confirmation par email activée : pas encore de session.
    return data.session ? { ok: true } : { ok: true, confirmer: true };
  });

export const inscrireTelephone = ({ telephone, motDePasse, nom, niveau }) =>
  tenter(async () => {
    const numero = normaliserTelephone(telephone);
    if (!numero) return { erreur: "telephone" };
    if (!site.urlIA) return { erreur: "comptes-non-configures" };
    const r = await fetch(`${site.urlIA}/comptes/telephone`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ telephone: numero, motDePasse, nom: nom.trim(), niveau }),
    });
    if (!r.ok) {
      const { erreur } = await r.json().catch(() => ({}));
      return { erreur: erreur || (r.status === 429 ? "trop-de-requetes" : "reseau") };
    }
    const { codeSecours } = await r.json().catch(() => ({}));
    if (codeSecours) retenirCodeAMontrer(codeSecours);
    return connecterTelephone({ telephone: numero, motDePasse });
  });

async function connecterAvec(email, motDePasse) {
  const sb = await client();
  const { error } = await sb.auth.signInWithPassword({ email, password: motDePasse });
  return error ? { erreur: codeDe(error) } : { ok: true };
}

export const connecterEmail = ({ email, motDePasse }) => tenter(() => connecterAvec(email.trim(), motDePasse));

export const connecterTelephone = ({ telephone, motDePasse }) =>
  tenter(() => {
    const numero = normaliserTelephone(telephone);
    return numero ? connecterAvec(emailTelephone(numero), motDePasse) : { erreur: "telephone" };
  });

/* L'identifiant de connexion est une adresse email OU un numéro. */
export const connecter = ({ identifiant, motDePasse }) =>
  String(identifiant).includes("@")
    ? connecterEmail({ email: identifiant, motDePasse })
    : connecterTelephone({ telephone: identifiant, motDePasse });

/* Part vers Google, qui renvoie sur le site une fois l'étudiant connecté. */
export const connecterGoogle = () =>
  tenter(async () => {
    const sb = await client();
    const { error } = await sb.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: adresseRetour() },
    });
    return error ? { erreur: codeDe(error) } : { ok: true };
  });

/* Envoie le code pour choisir un nouveau mot de passe. Seulement pour
   les comptes email : un compte téléphone n'a pas de boîte mail. */
export const motDePasseOublie = (email) =>
  tenter(async () => {
    const sb = await client();
    const { error } = await sb.auth.resetPasswordForEmail(email.trim(), { redirectTo: adresseRetour() });
    return error ? { erreur: codeDe(error) } : { ok: true };
  });

/* Vérifie le code reçu par email. `type` : "signup" (inscription) ou
   "recovery" (mot de passe oublié). S'il est bon, l'étudiant est
   connecté ; pour "recovery", il choisit ensuite son mot de passe. */
export const verifierCode = ({ email, code, type }) =>
  tenter(async () => {
    const sb = await client();
    const { error } = await sb.auth.verifyOtp({ email: email.trim(), token: code.replace(/\s/g, ""), type });
    return error ? { erreur: codeDe(error) } : { ok: true };
  });

/* Renvoie le code d'inscription (le premier n'est pas arrivé, ou a expiré). */
export const renvoyerCodeInscription = (email) =>
  tenter(async () => {
    const sb = await client();
    const { error } = await sb.auth.resend({ type: "signup", email: email.trim() });
    return error ? { erreur: codeDe(error) } : { ok: true };
  });

export const changerMotDePasse = (motDePasse) =>
  tenter(async () => {
    const sb = await client();
    const { error } = await sb.auth.updateUser({ password: motDePasse });
    return error ? { erreur: codeDe(error) } : { ok: true };
  });

export const deconnecter = () =>
  tenter(async () => {
    const sb = await client();
    await sb.auth.signOut();
    return { ok: true };
  });

/* Supprime le compte et ses données (fonction de supabase/schema.sql). */
export const supprimerCompte = () =>
  tenter(async () => {
    const sb = await client();
    const { error } = await sb.rpc("supprimer_mon_compte");
    if (error) return { erreur: codeDe(error) };
    await sb.auth.signOut({ scope: "local" });
    return { ok: true };
  });

/* ---------------------------------------------------------------- */
/* Secours des comptes téléphone (serveur-ia/secours.js)             */
/*                                                                   */
/* Un compte téléphone n'a pas de boîte mail. Pour retrouver l'accès */
/* sans l'équipe : un code de secours, donné à l'inscription, et un  */
/* email de secours facultatif, confirmé depuis les paramètres.      */
/* ---------------------------------------------------------------- */

/* Le code à montrer une fois, juste après l'inscription ou après
   avoir servi. Gardé le temps de l'onglet : la page d'inscription
   part d'elle-même au tableau de bord, où AvisCodeSecours l'affiche,
   puis l'efface dès que l'étudiant dit l'avoir noté. */
export const CLE_CODE_A_MONTRER = "lrsi-code-secours";

export function retenirCodeAMontrer(code) {
  try {
    sessionStorage.setItem(CLE_CODE_A_MONTRER, code);
  } catch {
    /* stockage indisponible : le code se redemande dans les paramètres */
  }
}

export function codeAMontrer() {
  try {
    return sessionStorage.getItem(CLE_CODE_A_MONTRER);
  } catch {
    return null;
  }
}

export function oublierCodeAMontrer() {
  try {
    sessionStorage.removeItem(CLE_CODE_A_MONTRER);
  } catch {
    /* rien à faire */
  }
}

async function appelSecours(chemin, { corps, connecte = false } = {}) {
  if (!site.urlIA) return { erreur: "comptes-non-configures" };
  const entetes = corps === undefined ? {} : { "Content-Type": "application/json" };
  if (connecte) {
    const sb = await client();
    const { data } = await sb.auth.getSession();
    if (!data.session) return { erreur: "session" };
    entetes.Authorization = `Bearer ${data.session.access_token}`;
  }
  const r = await fetch(`${site.urlIA}/comptes/secours${chemin}`, {
    method: corps === undefined ? "GET" : "POST",
    headers: entetes,
    body: corps === undefined ? undefined : JSON.stringify(corps),
  });
  const reponse = await r.json().catch(() => ({}));
  if (!r.ok) return { erreur: reponse.erreur || (r.status === 429 ? "trop-de-requetes" : "reseau") };
  return reponse;
}

/* Mot de passe oublié, avec le code de secours : le relais change le
   mot de passe, donne un nouveau code, et l'étudiant est connecté. */
export const oublieAvecCodeSecours = ({ telephone, code, motDePasse }) =>
  tenter(async () => {
    const numero = normaliserTelephone(telephone);
    if (!numero) return { erreur: "telephone" };
    const r = await appelSecours("/oublie-code", { corps: { telephone: numero, code, motDePasse } });
    if (r.erreur) return r;
    if (r.codeSecours) retenirCodeAMontrer(r.codeSecours);
    return connecterTelephone({ telephone: numero, motDePasse });
  });

/* Mot de passe oublié, par l'email de secours : le code arrive par
   email, et se vérifie comme les autres, sur l'adresse du compte. */
export const oublieParEmailSecours = (telephone) =>
  tenter(async () => {
    const numero = normaliserTelephone(telephone);
    if (!numero) return { erreur: "telephone" };
    const r = await appelSecours("/oublie-email", { corps: { telephone: numero } });
    return r.erreur ? r : { ok: true, email: emailTelephone(numero) };
  });

export const etatSecours = () => tenter(() => appelSecours("/", { connecte: true }));
export const nouveauCodeSecours = () => tenter(() => appelSecours("/nouveau-code", { corps: {}, connecte: true }));
export const ajouterEmailSecours = (email) =>
  tenter(() => appelSecours("/email", { corps: { email: email.trim() }, connecte: true }));
export const confirmerEmailSecours = (code) =>
  tenter(() => appelSecours("/email/confirmer", { corps: { code: code.replace(/\s/g, "") }, connecte: true }));
export const retirerEmailSecours = () => tenter(() => appelSecours("/email/retirer", { corps: {}, connecte: true }));

/* ---------------------------------------------------------------- */
/* Messages                                                          */
/* ---------------------------------------------------------------- */

const MESSAGES = {
  invalid_credentials: "Identifiant ou mot de passe incorrect.",
  email_not_confirmed: "Confirme d'abord ton adresse : clique sur le lien reçu par email.",
  user_already_exists: "Un compte existe déjà avec cet identifiant. Connecte-toi plutôt.",
  "deja-inscrit": "Un compte existe déjà avec ce numéro. Connecte-toi plutôt.",
  email_exists: "Un compte existe déjà avec cette adresse. Connecte-toi plutôt.",
  weak_password: "Mot de passe trop faible : au moins 8 caractères, pas trop simple.",
  "mot-de-passe-faible": "Mot de passe trop faible : au moins 8 caractères.",
  email_address_invalid: "Cette adresse email n'est pas valide.",
  validation_failed: "Vérifie les champs du formulaire.",
  telephone: "Ce numéro n'est pas valide. Exemple : 77 123 45 67.",
  nom: "Indique ton nom.",
  over_request_rate_limit: "Trop d'essais d'un coup. Attends une minute puis réessaie.",
  over_email_send_rate_limit: "Trop d'emails envoyés. Attends quelques minutes puis réessaie.",
  "trop-de-requetes": "Trop d'essais d'un coup. Attends une minute puis réessaie.",
  same_password: "C'est déjà ton mot de passe actuel.",
  otp_expired: "Code incorrect ou expiré. Vérifie les chiffres, ou demande un nouveau code.",
  over_email_send_rate_limit_resend: "Attends une minute avant de demander un nouveau code.",
  "comptes-non-configures": "Les comptes ne sont pas encore activés sur le site. Tu peux entrer en mode invité.",
  "code-secours": "Numéro ou code de secours incorrect. Vérifie les 12 caractères.",
  "secours-bloque": "Trop de codes faux pour ce numéro. Réessaie dans une heure.",
  "email-non-configure": "L'email de secours n'est pas encore disponible sur le site. Utilise ton code de secours.",
  "attendre-email": "Attends une minute avant de demander un nouveau code.",
  session: "Ta session a expiré. Reconnecte-toi puis réessaie.",
  "pas-telephone": "Ton compte a déjà une adresse email : utilise « Mot de passe oublié » avec elle.",
  reseau: "Impossible de joindre le serveur. Vérifie ta connexion puis réessaie.",
};

export const messageErreurCompte = (code) => MESSAGES[code] ?? "Une erreur est survenue. Réessaie dans un instant.";
