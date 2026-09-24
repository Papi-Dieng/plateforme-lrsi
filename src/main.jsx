import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { HashRouter } from "react-router-dom";
import { FournisseurSession } from "./FournisseurSession";
import { chargerContenu } from "./contenu";
import { site } from "./data/site";
import { demarrerApplication } from "./installation";
import "./index.css";

// Application installable : service worker et proposition
// d'installation, écoutée dès le lancement (voir src/installation.js).
demarrerApplication();

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

// Le contenu publié depuis l'espace admin est chargé AVANT les pages :
// certaines calculent des chiffres dès leur chargement (nombre de
// chapitres, par exemple), qui doivent porter sur le bon contenu.
// `chargerContenu` ne dure jamais plus de quatre secondes et ne
// bloque jamais : en cas d'échec, le contenu du code s'affiche.
await chargerContenu();
const { default: App } = await import("./App.jsx");

// Rappels de révision : une notification par jour au plus, si
// l'étudiant les a activés dans son planning (src/rappels.js).
import("./rappels.js").then((m) => m.demarrerRappels()).catch(() => {});

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <HashRouter>
      <FournisseurSession>
        <App />
      </FournisseurSession>
    </HashRouter>
  </StrictMode>
);
