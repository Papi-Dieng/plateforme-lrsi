/* Assemble des classes CSS en ignorant les valeurs vides :
   cx("carte", actif && "carte-active") → "carte carte-active" ou "carte".
   Dans un fichier à part, et non dans ui.jsx, pour que ce dernier
   n'exporte que des composants (rechargement à chaud de Vite). */
export const cx = (...c) => c.filter(Boolean).join(" ");
