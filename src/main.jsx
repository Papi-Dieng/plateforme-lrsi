import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { HashRouter } from "react-router-dom";
import App from "./App.jsx";
import { FournisseurSession } from "./FournisseurSession";
import { site } from "./data/site";
import "./index.css";

// Routeur à dièse : les adresses contiennent un « # », par exemple
// /#/cours. Cela évite les erreurs 404 au rechargement d'une page sur
// un hébergeur statique comme GitHub Pages, qui ne sait pas renvoyer
// index.html pour une adresse inconnue.

// Le titre de l'onglet suit le nom défini dans src/data/site.js,
// pour qu'il n'y ait qu'un seul endroit à modifier quand le nom
// définitif sera choisi.
document.title = `${site.nom} — Plateforme d'apprentissage LRSI`;

// Applique le thème enregistré avant le premier rendu, pour éviter
// un flash de thème clair chez les étudiants qui utilisent le mode sombre.
try {
  const enregistre = localStorage.getItem("lrsi-theme");
  const sombre =
    enregistre === "dark" ||
    (!enregistre &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", sombre);
} catch {
  /* stockage indisponible : on garde le thème clair par défaut */
}

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <HashRouter>
      <FournisseurSession>
        <App />
      </FournisseurSession>
    </HashRouter>
  </StrictMode>
);
