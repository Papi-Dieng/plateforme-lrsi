/* ==================================================================
   L'éducation de l'IA saisie dans l'espace admin du site.

   Une fiche par matière, stockée dans Cloudflare KV sous la clé
   `matiere:<id>` :
   - consignes : ce que l'enseignant veut que l'IA fasse pour cette
     matière (vocabulaire, exemples à privilégier, pièges à signaler) ;
   - cours     : le texte des chapitres, par titre de chapitre ;
   - exemples  : des questions avec la réponse idéale, que l'IA imite ;
   - tests     : des questions avec ce que la réponse doit contenir,
                 lancées depuis l'espace admin pour vérifier.

   À chaque question d'un étudiant, les fiches des matières trouvées
   par le guide sont ajoutées aux consignes générales de
   `consignes.js`. Les tests, eux, ne partent jamais au modèle.
   ================================================================== */

export const ID_MATIERE = /^[a-z0-9-]{1,40}$/;
const cle = (id) => `matiere:${id}`;

const BORNES = {
  consignes: 4000,
  cours: 15000,
  chapitres: 40,
  exemples: 15,
  question: 600,
  reponse: 2500,
  tests: 40,
  mot: 120,
  mots: 20,
};
// Ce qui est ajouté au modèle pour une question : de quoi s'appuyer
// sur le cours sans épuiser le quota gratuit.
const MAX_MATIERES_PAR_QUESTION = 2;
const MAX_CARACTERES_COURS_ENVOYES = 12000;

const texte = (v, max) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const liste = (v, max) => (Array.isArray(v) ? v.slice(0, max) : []);

/* Tout ce qui vient du site est revalidé : l'espace admin peut être
   contourné, seul ce qui passe ici est enregistré. */
export function nettoyerFiche(brut) {
  const cours = {};
  for (const [titre, contenu] of Object.entries(brut?.cours ?? {}).slice(0, BORNES.chapitres)) {
    const t = texte(titre, 200);
    const c = texte(contenu, BORNES.cours);
    if (t && c) cours[t] = c;
  }
  const mots = (v) =>
    liste(v, BORNES.mots)
      .map((m) => texte(m, BORNES.mot))
      .filter(Boolean);

  return {
    nom: texte(brut?.nom, 120),
    consignes: texte(brut?.consignes, BORNES.consignes),
    cours,
    exemples: liste(brut?.exemples, BORNES.exemples)
      .map((e) => ({
        question: texte(e?.question, BORNES.question),
        reponse: texte(e?.reponse, BORNES.reponse),
      }))
      .filter((e) => e.question && e.reponse),
    tests: liste(brut?.tests, BORNES.tests)
      .map((t) => ({
        question: texte(t?.question, BORNES.question),
        // Chaque entrée de `contient` est un groupe d'alternatives.
        contient: liste(t?.contient, BORNES.mots).map(mots).filter((g) => g.length),
        exclut: mots(t?.exclut),
      }))
      .filter((t) => t.question),
  };
}

const ficheVide = () => ({ nom: "", consignes: "", cours: {}, exemples: [], tests: [] });

export async function lireFiche(env, id) {
  const brut = await env.EDUCATION?.get(cle(id), "json");
  return brut ?? ficheVide();
}

export async function ecrireFiche(env, id, brut) {
  const fiche = { ...nettoyerFiche(brut), majLe: new Date().toISOString() };
  await env.EDUCATION.put(cle(id), JSON.stringify(fiche));
  return fiche;
}

/* Le texte ajouté aux consignes pour une question : la fiche des
   matières concernées, et le cours des chapitres trouvés par le guide. */
export async function educationPour(env, extraits) {
  if (!env.EDUCATION) return "";

  const ids = [...new Set(extraits.map((e) => e.matiere).filter((m) => ID_MATIERE.test(m)))]
    .slice(0, MAX_MATIERES_PAR_QUESTION);
  if (ids.length === 0) return "";

  const fiches = await Promise.all(ids.map((id) => lireFiche(env, id)));
  let budget = MAX_CARACTERES_COURS_ENVOYES;
  const parties = [];

  fiches.forEach((fiche, i) => {
    const nom = fiche.nom || ids[i];
    const bloc = [];

    if (fiche.consignes) bloc.push(`Consignes de l'enseignant pour cette matière :\n${fiche.consignes}`);

    const chapitres = extraits
      .filter((e) => e.matiere === ids[i] && e.type === "chapitre" && fiche.cours[e.titre])
      .map((e) => e.titre);
    for (const titre of chapitres) {
      const cours = fiche.cours[titre].slice(0, budget);
      if (!cours) break;
      budget -= cours.length;
      bloc.push(`Cours du chapitre « ${titre} » (il fait foi) :\n${cours}`);
    }

    if (fiche.exemples.length) {
      bloc.push(
        "Exemples de réponses attendues pour cette matière (imite-les) :\n" +
          fiche.exemples
            .map((e) => `Étudiant : ${e.question}\nAssistant : ${e.reponse}`)
            .join("\n\n")
      );
    }

    if (bloc.length) parties.push(`=== Matière : ${nom} ===\n${bloc.join("\n\n")}`);
  });

  return parties.join("\n\n");
}

/* Mot de passe de l'espace admin, comparé en temps constant : la durée
   de la comparaison ne dit rien du nombre de caractères justes. */
export async function motDePasseValide(propose, env) {
  const attendu = env.ADMIN_MOT_DE_PASSE;
  if (!attendu || typeof propose !== "string" || !propose) return false;
  const empreinte = async (s) =>
    new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s)));
  const [a, b] = await Promise.all([empreinte(propose), empreinte(attendu)]);
  let difference = 0;
  for (let i = 0; i < a.length; i++) difference |= a[i] ^ b[i];
  return difference === 0;
}
