/* ==================================================================
   Petits outils de « Gérer le contenu » : identifiants, liens YouTube,
   tailles de fichier, listes de choix.
   ================================================================== */

export const ICONES_MATIERE = ["network", "terminal", "code", "cpu", "database", "shield", "book", "graduation", "layers"];

/* Un identifiant lisible et unique, fabriqué une fois pour toutes. */
export const identifiant = (titre, existants) => {
  const base =
    String(titre || "nouveau")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "nouveau";
  let id = base;
  while (existants.some((e) => e.id === id)) id = `${base}-${Math.random().toString(36).slice(2, 6)}`;
  return id;
};

export const extraireYoutube = (saisie) => {
  const t = String(saisie ?? "").trim();
  if (/^[A-Za-z0-9_-]{11}$/.test(t)) return t;
  const m = t.match(/(?:v=|youtu\.be\/|embed\/|shorts\/)([A-Za-z0-9_-]{11})/);
  return m ? m[1] : null;
};

export const deplacer = (liste, de, vers) => {
  const copie = [...liste];
  const [element] = copie.splice(de, 1);
  copie.splice(vers, 0, element);
  return copie;
};

export const formatTaille = (octets) =>
  octets >= 1024 * 1024
    ? `${(octets / 1024 / 1024).toFixed(1).replace(".", ",")} Mo`
    : `${Math.max(1, Math.round(octets / 1024))} Ko`;

export const optionsMatieres = (matieres) => [
  { value: "", label: "— Choisir —" },
  ...matieres.map((m) => ({ value: m.id, label: m.nom || m.id })),
];

export const optionsCompetences = (competences, matiere) => [
  { value: "", label: "Aucune" },
  ...competences
    .filter((c) => c.matiere === matiere)
    .map((c) => ({ value: c.id, label: c.nom || c.id })),
];
