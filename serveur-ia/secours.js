import { emailTelephone, estEmailTelephone, normaliserTelephone } from "../src/telephone.js";
import { site } from "../src/data/site.js";

/* ==================================================================
   Récupération des comptes téléphone, sans SMS et sans frais.

   Un compte téléphone n'a pas de boîte mail (src/telephone.js) : le
   « Mot de passe oublié » habituel ne peut rien lui envoyer. Deux
   moyens de s'en sortir seul, sans passer par l'équipe :

   1. Le code de secours. Donné à l'inscription (et à chaque usage),
      à noter ou à photographier. Avec le numéro, il permet de choisir
      un nouveau mot de passe ; il ne sert qu'une fois, un nouveau est
      donné aussitôt. Seule son empreinte (SHA-256) est gardée : même
      l'équipe ne peut pas le relire. 12 caractères tirés parmi 31, soit
      environ 59 bits : impossible à deviner, et 5 erreurs de suite
      bloquent le numéro une heure.

   2. L'email de secours, facultatif. L'étudiant l'ajoute depuis ses
      paramètres et le confirme par un code. S'il oublie son mot de
      passe, Supabase fabrique un code de réinitialisation (sans rien
      envoyer lui-même, la fausse adresse du compte n'existe pas) et ce
      relais l'envoie par Brevo à l'email de secours. Le site le vérifie
      ensuite comme n'importe quel code reçu par email.

   Tout est rangé dans la table `secours_comptes` (supabase/schema.sql),
   que seule la clé « service_role » de ce relais peut lire.

   Réglages : SUPABASE_URL et EMAIL_EXPEDITEUR (wrangler.toml), secrets
   SUPABASE_SERVICE_ROLE_KEY et BREVO_API_KEY. Sans BREVO_API_KEY,
   l'email de secours est éteint ; le code de secours marche quand même.

   Les réponses aux demandes publiques (sans être connecté) ne disent
   jamais si un numéro est inscrit.
   ================================================================== */

const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // ni I, L, O, 0, 1 : illisibles
const LONGUEUR_CODE = 12;
const MAX_ECHECS = 5;
const DUREE_BLOCAGE = 60 * 60 * 1000;
const DUREE_CODE_EMAIL = 30 * 60 * 1000;
const MAX_ESSAIS_EMAIL = 5;
const DELAI_ENTRE_EMAILS = 60 * 1000;
const MIN_MOT_DE_PASSE = 8;
const MAX_MOT_DE_PASSE = 72;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/* ---------------------------------------------------------------- */
/* Tirages et empreintes                                             */
/* ---------------------------------------------------------------- */

function tirer(alphabet, longueur) {
  const plafond = 256 - (256 % alphabet.length); // sans biais
  let sortie = "";
  while (sortie.length < longueur) {
    for (const octet of crypto.getRandomValues(new Uint8Array(longueur * 2))) {
      if (octet < plafond && sortie.length < longueur) sortie += alphabet[octet % alphabet.length];
    }
  }
  return sortie;
}

export const nouveauCode = () => tirer(ALPHABET, LONGUEUR_CODE);

/* « k7qm 4xpa-9trb » → « K7QM4XPA9TRB » : tirets, espaces et casse ignorés. */
export const nettoyerCode = (texte) => String(texte ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");

export const afficherCode = (code) => code.match(/.{1,4}/g).join("-");

async function empreinte(...parties) {
  const octets = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(parties.join(":")));
  return [...new Uint8Array(octets)].map((o) => o.toString(16).padStart(2, "0")).join("");
}

/* ---------------------------------------------------------------- */
/* Supabase (clé service_role) et Brevo                              */
/* ---------------------------------------------------------------- */

const configure = (env) => Boolean(env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY);
const emailConfigure = (env) => Boolean(env.BREVO_API_KEY && env.EMAIL_EXPEDITEUR);

function supabase(env, chemin, { methode = "GET", corps, entetes = {} } = {}) {
  return fetch(`${env.SUPABASE_URL.replace(/\/$/, "")}${chemin}`, {
    method: methode,
    headers: {
      apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
      ...entetes,
    },
    body: corps === undefined ? undefined : JSON.stringify(corps),
  });
}

async function ligneOu(env, filtre) {
  const r = await supabase(env, `/rest/v1/secours_comptes?${filtre}&select=*&limit=1`);
  if (!r.ok) throw new Error(`lecture secours ${r.status}`);
  const [ligne] = await r.json();
  return ligne ?? null;
}

const ligneParTelephone = (env, numero) => ligneOu(env, `telephone=eq.${encodeURIComponent(numero)}`);
const ligneParUtilisateur = (env, id) => ligneOu(env, `utilisateur=eq.${encodeURIComponent(id)}`);

/* Crée la ligne ou met à jour les seules colonnes données. */
async function ecrire(env, utilisateur, telephone, champs) {
  const r = await supabase(env, "/rest/v1/secours_comptes", {
    methode: "POST",
    corps: { utilisateur, telephone, ...champs },
    entetes: { Prefer: "resolution=merge-duplicates,return=minimal" },
  });
  if (!r.ok) throw new Error(`écriture secours ${r.status}`);
}

/* Donne un nouveau code de secours à un compte, et renvoie le code en
   clair : c'est la seule fois qu'il existe en clair. */
export async function creerCodeSecours(env, utilisateur, telephone) {
  const code = nouveauCode();
  await ecrire(env, utilisateur, telephone, {
    code_empreinte: await empreinte(utilisateur, code),
    echecs: 0,
    bloque_jusqua: null,
  });
  return afficherCode(code);
}

async function envoyerEmail(env, { a, sujet, lignes }) {
  const r = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: { "api-key": env.BREVO_API_KEY, "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      sender: { name: site.nom, email: env.EMAIL_EXPEDITEUR },
      to: [{ email: a }],
      subject: sujet,
      textContent: lignes.join("\n\n"),
      // Aucun lien dans le message : Brevo réécrit les liens pour compter
      // les clics, et son serveur de suivi ne répond pas toujours.
      htmlContent: lignes.map((l) => `<p>${l.replace(/[<>&]/g, "")}</p>`).join(""),
    }),
  });
  // Le message de Brevo dit la cause (clé, expéditeur, adresse IP…).
  if (!r.ok) throw new Error(`Brevo ${r.status} ${(await r.text().catch(() => "")).slice(0, 300)}`);
}

/* L'étudiant connecté, d'après le jeton de session envoyé par le site. */
async function utilisateurConnecte(requete, env) {
  const jeton = (requete.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!jeton) return null;
  const r = await fetch(`${env.SUPABASE_URL.replace(/\/$/, "")}/auth/v1/user`, {
    headers: { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${jeton}` },
  });
  if (!r.ok) return null;
  const u = await r.json().catch(() => null);
  return u?.id ? u : null;
}

const motDePasseValide = (m) => typeof m === "string" && m.length >= MIN_MOT_DE_PASSE && m.length <= MAX_MOT_DE_PASSE;

/* ---------------------------------------------------------------- */
/* Mot de passe oublié (sans être connecté)                          */
/* ---------------------------------------------------------------- */

async function oublieAvecCode(corps, env) {
  const numero = normaliserTelephone(corps?.telephone);
  if (!numero) return { erreur: "telephone", statut: 400 };
  const code = nettoyerCode(corps?.code);
  if (code.length !== LONGUEUR_CODE) return { erreur: "code-secours", statut: 400 };
  if (!motDePasseValide(corps?.motDePasse)) return { erreur: "mot-de-passe-faible", statut: 400 };

  const ligne = await ligneParTelephone(env, numero);
  // Numéro inconnu ou sans code : même réponse qu'un code faux.
  if (!ligne?.code_empreinte) return { erreur: "code-secours", statut: 400 };
  if (ligne.bloque_jusqua && Date.parse(ligne.bloque_jusqua) > Date.now()) {
    return { erreur: "secours-bloque", statut: 429 };
  }

  if ((await empreinte(ligne.utilisateur, code)) !== ligne.code_empreinte) {
    const echecs = (ligne.echecs ?? 0) + 1;
    await ecrire(env, ligne.utilisateur, numero,
      echecs >= MAX_ECHECS
        ? { echecs: 0, bloque_jusqua: new Date(Date.now() + DUREE_BLOCAGE).toISOString() }
        : { echecs }
    );
    return echecs >= MAX_ECHECS ? { erreur: "secours-bloque", statut: 429 } : { erreur: "code-secours", statut: 400 };
  }

  const r = await supabase(env, `/auth/v1/admin/users/${ligne.utilisateur}`, {
    methode: "PUT",
    corps: { password: corps.motDePasse },
  });
  if (!r.ok) {
    const detail = await r.json().catch(() => ({}));
    if ((detail?.error_code ?? detail?.code) === "weak_password") return { erreur: "mot-de-passe-faible", statut: 400 };
    console.log("Supabase, nouveau mot de passe", r.status);
    return { erreur: "reseau", statut: 502 };
  }

  // Le code a servi : il est remplacé tout de suite.
  const codeSecours = await creerCodeSecours(env, ligne.utilisateur, numero).catch((e) => {
    console.log("Nouveau code de secours", e);
    return null;
  });
  return { resultat: { ok: true, codeSecours } };
}

async function oublieParEmail(corps, env) {
  if (!emailConfigure(env)) return { erreur: "email-non-configure", statut: 503 };
  const numero = normaliserTelephone(corps?.telephone);
  if (!numero) return { erreur: "telephone", statut: 400 };

  const ligne = await ligneParTelephone(env, numero);
  const recent = ligne?.email_envoye_le && Date.now() - Date.parse(ligne.email_envoye_le) < DELAI_ENTRE_EMAILS;
  // Sans email de secours, ou envoi trop rapproché : on répond pareil,
  // sans rien envoyer, pour ne pas dire qui est inscrit.
  if (!ligne?.email || recent) return { resultat: { ok: true } };

  const r = await supabase(env, "/auth/v1/admin/generate_link", {
    methode: "POST",
    corps: { type: "recovery", email: emailTelephone(numero) },
  });
  if (!r.ok) {
    console.log("Supabase, code de réinitialisation", r.status);
    return { erreur: "reseau", statut: 502 };
  }
  const lien = await r.json();
  const code = lien?.email_otp ?? lien?.properties?.email_otp;
  if (!code) return { erreur: "reseau", statut: 502 };

  await envoyerEmail(env, {
    a: ligne.email,
    sujet: `${site.nom} : ton code pour un nouveau mot de passe`,
    lignes: [
      "Bonjour,",
      `Voici le code pour choisir un nouveau mot de passe sur ${site.nom} : ${code}`,
      "Tape-le sur le site, là où tu as demandé à changer ton mot de passe.",
      "Si tu n'as rien demandé, ignore cet email : ton mot de passe ne change pas.",
    ],
  });
  await ecrire(env, ligne.utilisateur, numero, { email_envoye_le: new Date().toISOString() });
  return { resultat: { ok: true } };
}

/* ---------------------------------------------------------------- */
/* Depuis les paramètres (étudiant connecté)                         */
/* ---------------------------------------------------------------- */

async function etat(u, numero, env) {
  const ligne = await ligneParUtilisateur(env, u.id);
  const attente = ligne?.email_attente && Date.parse(ligne.email_attente_expire) > Date.now() ? ligne.email_attente : null;
  return {
    resultat: {
      code: Boolean(ligne?.code_empreinte),
      email: ligne?.email ?? null,
      emailAttente: attente,
      emailDisponible: emailConfigure(env),
      telephone: numero,
    },
  };
}

async function ajouterEmail(u, numero, corps, env) {
  if (!emailConfigure(env)) return { erreur: "email-non-configure", statut: 503 };
  const email = typeof corps?.email === "string" ? corps.email.trim().toLowerCase() : "";
  if (!EMAIL.test(email) || email.length > 254 || estEmailTelephone(email)) {
    return { erreur: "email_address_invalid", statut: 400 };
  }
  const ligne = await ligneParUtilisateur(env, u.id);
  if (ligne?.email_envoye_le && Date.now() - Date.parse(ligne.email_envoye_le) < DELAI_ENTRE_EMAILS) {
    return { erreur: "attendre-email", statut: 429 };
  }
  const code = tirer("0123456789", 6);
  await envoyerEmail(env, {
    a: email,
    sujet: `${site.nom} : confirme ton email de secours`,
    lignes: [
      "Bonjour,",
      `Voici le code pour confirmer ton email de secours sur ${site.nom} : ${code}`,
      "Il te permettra de choisir un nouveau mot de passe si tu oublies le tien.",
      "Si tu n'as rien demandé, ignore cet email.",
    ],
  });
  await ecrire(env, u.id, numero, {
    email_attente: email,
    email_attente_empreinte: await empreinte(u.id, email, code),
    email_attente_expire: new Date(Date.now() + DUREE_CODE_EMAIL).toISOString(),
    email_attente_essais: 0,
    email_envoye_le: new Date().toISOString(),
  });
  return { resultat: { ok: true } };
}

async function confirmerEmail(u, numero, corps, env) {
  const code = String(corps?.code ?? "").replace(/\s/g, "");
  const ligne = await ligneParUtilisateur(env, u.id);
  const valable = ligne?.email_attente && Date.parse(ligne.email_attente_expire) > Date.now();
  if (!valable || (ligne.email_attente_essais ?? 0) >= MAX_ESSAIS_EMAIL) return { erreur: "otp_expired", statut: 400 };
  if (!/^\d{6}$/.test(code) || (await empreinte(u.id, ligne.email_attente, code)) !== ligne.email_attente_empreinte) {
    await ecrire(env, u.id, numero, { email_attente_essais: (ligne.email_attente_essais ?? 0) + 1 });
    return { erreur: "otp_expired", statut: 400 };
  }
  await ecrire(env, u.id, numero, {
    email: ligne.email_attente,
    email_attente: null,
    email_attente_empreinte: null,
    email_attente_expire: null,
    email_attente_essais: 0,
  });
  return { resultat: { ok: true, email: ligne.email_attente } };
}

/* ---------------------------------------------------------------- */
/* Aiguillage : /comptes/secours/...                                 */
/* ---------------------------------------------------------------- */

export async function routeSecours(chemin, requete, env) {
  if (!configure(env)) return { erreur: "comptes-non-configures", statut: 503 };
  const action = chemin.slice("/comptes/secours".length) || "/";

  let corps = {};
  if (requete.method === "POST") {
    try {
      corps = await requete.json();
    } catch {
      return { erreur: "format", statut: 400 };
    }
  }

  if (requete.method === "POST" && action === "/oublie-code") return oublieAvecCode(corps, env);
  if (requete.method === "POST" && action === "/oublie-email") return oublieParEmail(corps, env);

  const u = await utilisateurConnecte(requete, env);
  if (!u) return { erreur: "session", statut: 401 };
  // Réservé aux comptes téléphone : les autres ont déjà leur email.
  if (!estEmailTelephone(u.email)) return { erreur: "pas-telephone", statut: 403 };
  const numero = u.email.split("@")[0];

  if (requete.method === "GET" && action === "/") return etat(u, numero, env);
  if (requete.method !== "POST") return { erreur: "methode", statut: 405 };
  if (action === "/nouveau-code") return { resultat: { codeSecours: await creerCodeSecours(env, u.id, numero) } };
  if (action === "/email") return ajouterEmail(u, numero, corps, env);
  if (action === "/email/confirmer") return confirmerEmail(u, numero, corps, env);
  if (action === "/email/retirer") {
    await ecrire(env, u.id, numero, { email: null, email_attente: null, email_attente_empreinte: null, email_attente_expire: null });
    return { resultat: { ok: true } };
  }
  return { erreur: "introuvable", statut: 404 };
}
