import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";
import { FournisseurSession } from "./FournisseurSession";
import { site } from "./data/site";
import "./index.css";

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
    <BrowserRouter>
      <FournisseurSession>
        <App />
      </FournisseurSession>
    </BrowserRouter>
  </StrictMode>
);
