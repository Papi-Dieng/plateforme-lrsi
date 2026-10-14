/* ==================================================================
   L'apparence du site : le thème et la taille du texte en plein écran.

   Trois choix de thème depuis le 14 octobre 2026 (maquette des
   paramètres) : « clair », « sombre », ou « comme mon appareil », qui
   suit le réglage du système. Le choix est rangé dans le navigateur, et
   non dans le compte : c'est un réglage de l'appareil, et l'écran d'un
   téléphone la nuit n'a rien à voir avec celui d'un ordinateur le jour.

   `index.html` applique déjà la classe `dark` avant le premier
   affichage (voir src/main.jsx) : ce module tient la même règle, pour
   que les deux ne divergent pas.
   ================================================================== */

export const CLE_THEME = "lrsi-theme";
export const CLE_TAILLE = "lrsi-taille-lecture";

// Les tailles proposées dans les paramètres et par les boutons A− / A+
// du plein écran (src/components/PleinEcran.jsx).
export const TAILLES = [1, 1.15, 1.3, 1.5];

const sombreSysteme = () =>
  typeof window !== "undefined" && typeof window.matchMedia === "function"
    ? window.matchMedia("(prefers-color-scheme: dark)").matches
    : false;

/* « light », « dark » ou « auto ». Une valeur inconnue (ou rien) vaut
   « light » : le site s'affiche en clair par défaut. */
export function lireChoixTheme() {
  try {
    const choix = localStorage.getItem(CLE_THEME);
    return choix === "dark" || choix === "auto" ? choix : "light";
  } catch {
    return "light";
  }
}

export const themeSombre = (choix = lireChoixTheme()) =>
  choix === "dark" || (choix === "auto" && sombreSysteme());

/* Applique le choix tout de suite, et le garde. */
export function appliquerTheme(choix) {
  document.documentElement.classList.toggle("dark", themeSombre(choix));
  try {
    localStorage.setItem(CLE_THEME, choix);
  } catch {
    /* stockage indisponible : le thème ne sera pas conservé */
  }
}
