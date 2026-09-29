/* ==================================================================
   Les semestres de la plateforme : seulement le semestre 1 et le
   semestre 2. Toute autre valeur (un « Semestre 3 » publié avant cette
   règle, une faute de frappe) devient « Semestres 1 et 2 ».

   Utilisé par le contenu par défaut (data/matieres.js), le contenu
   publié quand il est chargé (contenu.js), le filtre de la page Cours,
   la liste de l'espace admin et le programme de révision. Le relais
   applique la même règle à la publication (serveur-ia/contenu.js).
   ================================================================== */

export const SEMESTRES = [1, 2];
export const TOUS_LES_SEMESTRES = "Semestres 1 et 2";
export const CHOIX_SEMESTRE = ["Semestre 1", "Semestre 2", TOUS_LES_SEMESTRES];

// « Semestre 2 » → [2] ; « Semestres 1 et 2 » → [1, 2].
export const numerosSemestre = (texte) => (String(texte ?? "").match(/\d+/g) ?? []).map(Number);

export function normaliserSemestre(texte) {
  const numeros = [...new Set(numerosSemestre(texte))];
  if (numeros.length === 1 && SEMESTRES.includes(numeros[0])) return `Semestre ${numeros[0]}`;
  return TOUS_LES_SEMESTRES;
}
