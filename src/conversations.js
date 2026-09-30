/* ==================================================================
   Historique des discussions avec l'assistant.

   Chaque discussion est gardée dans le navigateur (CLE_CONVERSATIONS),
   et, avec un compte, recopiée dans le compte comme le reste
   (src/sauvegarde.js, src/synchro.js) : on la rouvre plus tard, sur
   n'importe quel appareil, et on la continue là où on l'avait laissée.

   Forme : { [id]: { id, titre, date, messages } }. `date` est celle du
   dernier message : c'est elle qui trie la liste, et qui départage deux
   appareils (la version la plus récente d'une discussion l'emporte).

   Pour tenir dans le compte (2 Mo en tout), on borne : les
   DISCUSSIONS_MAX plus récentes, MESSAGES_MAX messages chacune, et
   aucune image (seulement son nom).
   ================================================================== */

export const CLE_CONVERSATIONS = "lrsi-conversations";
export const DISCUSSIONS_MAX = 20;
export const MESSAGES_MAX = 40;
const TEXTE_MAX = 6000;

const estObjet = (v) => v !== null && typeof v === "object" && !Array.isArray(v);

export const nouvelIdentifiant = () => `c-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

/* Le titre : le début de la première question. */
export function titreConversation(messages) {
  const premiere = messages.find((m) => m.role === "etudiant")?.texte ?? "";
  const propre = premiere.replace(/\s+/g, " ").trim();
  if (!propre) return "Discussion";
  return propre.length > 60 ? `${propre.slice(0, 57).trimEnd()}…` : propre;
}

const couper = (texte) => (typeof texte === "string" && texte.length > TEXTE_MAX ? texte.slice(0, TEXTE_MAX) : texte);

/* Ce qui est gardé d'un message : pas l'image elle-même, et une réponse
   restée en attente (onglet fermé pendant que l'IA répondait) devient
   une réponse interrompue, qu'on peut relancer. */
function pourStockage(m) {
  const garde = { ...m };
  if (garde.image) garde.image = { nom: garde.image.nom ?? "image", retiree: true };
  if (garde.etat === "attente") {
    garde.etat = "secours";
    garde.echec = "interrompu";
  }
  garde.texte = couper(garde.texte);
  garde.pourIA = couper(garde.pourIA);
  garde.texteIA = couper(garde.texteIA);
  return garde;
}

/* Les derniers messages seulement, en gardant les paires question-réponse. */
export function messagesAGarder(messages) {
  const recents = messages.length > MESSAGES_MAX ? messages.slice(-MESSAGES_MAX) : messages;
  const debut = recents[0]?.role === "assistant" ? 1 : 0;
  return recents.slice(debut).map(pourStockage);
}

/* Ajoute ou met à jour une discussion, et ne garde que les plus récentes. */
export function enregistrer(toutes, { id, messages, date }) {
  const suite = { ...(estObjet(toutes) ? toutes : {}) };
  if (!messages.some((m) => m.role === "etudiant")) return suite;
  suite[id] = { id, titre: titreConversation(messages), date, messages: messagesAGarder(messages) };
  const gardees = Object.values(suite)
    .sort((a, b) => String(b.date).localeCompare(String(a.date)))
    .slice(0, DISCUSSIONS_MAX);
  return Object.fromEntries(gardees.map((c) => [c.id, c]));
}

/* La liste, la plus récente d'abord, sans les messages. */
export const listeConversations = (toutes) =>
  Object.values(estObjet(toutes) ? toutes : {})
    .filter((c) => c && typeof c.id === "string" && Array.isArray(c.messages))
    .sort((a, b) => String(b.date).localeCompare(String(a.date)))
    .map(({ id, titre, date, messages }) => ({ id, titre, date, nombre: messages.filter((m) => m.role === "etudiant").length }));

/* Forme attendue, pour la synchronisation et la relecture. */
export const conversationsValides = (v) =>
  estObjet(v) && Object.values(v).every((c) => estObjet(c) && typeof c.id === "string" && Array.isArray(c.messages));

/* ---------------------------------------------------------------- */
/* Côté navigateur                                                   */
/* ---------------------------------------------------------------- */

export function lireConversations() {
  try {
    const brut = JSON.parse(localStorage.getItem(CLE_CONVERSATIONS) ?? "null");
    return conversationsValides(brut) ? brut : {};
  } catch {
    return {};
  }
}

export function ecrireConversations(toutes) {
  try {
    if (Object.keys(toutes).length === 0) localStorage.removeItem(CLE_CONVERSATIONS);
    else localStorage.setItem(CLE_CONVERSATIONS, JSON.stringify(toutes));
  } catch {
    /* stockage plein ou refusé : la discussion ne sera pas gardée */
  }
}

export function supprimerConversation(id) {
  const toutes = lireConversations();
  delete toutes[id];
  ecrireConversations(toutes);
  return toutes;
}

// La discussion ouverte, pour la retrouver après un rechargement.
const CLE_ACTIVE = "lrsi-conversation-active";
export function lireActive() {
  try {
    return sessionStorage.getItem(CLE_ACTIVE);
  } catch {
    return null;
  }
}
export function ecrireActive(id) {
  try {
    if (id) sessionStorage.setItem(CLE_ACTIVE, id);
    else sessionStorage.removeItem(CLE_ACTIVE);
  } catch {
    /* rien à faire */
  }
}
