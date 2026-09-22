/* ==================================================================
   Fiche profil de l'étudiant.

   Ces informations sont personnelles. En version 1, elles ne quittent
   jamais l'appareil : elles vivent dans le navigateur, sous la clé
   `lrsi-profil`, et rien n'est envoyé à un serveur. Aucun champ n'est
   obligatoire, et la page le dit clairement.

   En version 3, ce fichier sera le seul à modifier pour passer à un
   profil rattaché à un compte.
   ================================================================== */

export const CLE_PROFIL = "lrsi-profil";

export const profilVide = {
  pseudo: "",
  avatarId: 1,
  nomComplet: "",
  age: "",
  telephone: "",
  email: "",
  niveau: "Licence 1",
  matricule: "",
};

export const niveaux = ["Licence 1", "Licence 2", "Licence 3"];

export function lireProfil() {
  try {
    const brut = JSON.parse(localStorage.getItem(CLE_PROFIL) ?? "null");
    if (!brut || typeof brut !== "object") return { ...profilVide };
    return { ...profilVide, ...brut };
  } catch {
    return { ...profilVide };
  }
}

export function enregistrerProfil(profil) {
  const propre = { ...profilVide, ...profil };
  try {
    localStorage.setItem(CLE_PROFIL, JSON.stringify(propre));
  } catch {
    /* stockage indisponible : la fiche ne sera pas conservée */
  }
  return propre;
}

export function effacerProfil() {
  try {
    localStorage.removeItem(CLE_PROFIL);
  } catch {
    /* rien à faire */
  }
  return { ...profilVide };
}

/* ---------------------------------------------------------------- */
/* Vérifications                                                     */
/* Volontairement souples : on signale ce qui est visiblement faux,  */
/* sans bloquer un étudiant dont le format sort de l'ordinaire.      */
/* ---------------------------------------------------------------- */

export function verifierProfil(profil) {
  const erreurs = {};

  const pseudo = profil.pseudo.trim();
  if (pseudo.length > 0 && pseudo.length < 3) {
    erreurs.pseudo = "Le nom d'utilisateur doit faire au moins 3 caractères.";
  }

  if (profil.age !== "") {
    const age = Number(profil.age);
    if (!Number.isInteger(age) || age < 14 || age > 99) {
      erreurs.age = "Indique un âge entre 14 et 99 ans.";
    }
  }

  if (profil.email !== "" && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(profil.email)) {
    erreurs.email = "Cette adresse e-mail ne semble pas valide.";
  }

  if (profil.telephone !== "") {
    const chiffres = profil.telephone.replace(/[^\d]/g, "");
    if (chiffres.length < 8 || chiffres.length > 15) {
      erreurs.telephone = "Ce numéro ne semble pas complet.";
    }
  }

  return erreurs;
}

// Nom affiché dans l'en-tête : le pseudo s'il existe, sinon le nom
// complet, sinon celui de la session.
export function nomAffiche(profil, session) {
  return (
    profil?.pseudo?.trim() ||
    profil?.nomComplet?.trim() ||
    session?.nom ||
    "Étudiant"
  );
}
