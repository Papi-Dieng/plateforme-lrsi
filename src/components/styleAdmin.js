/* Repères partagés par la coque de l'admin (LayoutAdmin.jsx), son
   écran de connexion et ses pages : un petit fichier à part, pour que
   les champs de l'admin n'emportent pas toute la coque avec eux. */

export const PAGES_ADMIN = [
  { to: "/admin", label: "Tableau de bord" },
  { to: "/admin/contenu", label: "Gérer le contenu" },
  { to: "/admin/ia", label: "Éduquer l'IA" },
  { to: "/admin/stats", label: "Questions les plus ratées" },
];

export const numeroPage = (i) => String(i + 1).padStart(2, "0");
export const mono = "font-mono tracking-[0.06em]";

// Le quadrillage discret des fonds sombres de la maquette.
export const QUADRILLAGE = {
  backgroundImage:
    "linear-gradient(rgb(255 255 255/0.03) 1px,transparent 1px),linear-gradient(90deg,rgb(255 255 255/0.03) 1px,transparent 1px)",
  backgroundSize: "56px 56px",
};

