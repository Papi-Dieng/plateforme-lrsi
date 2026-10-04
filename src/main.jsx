import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { HashRouter } from "react-router-dom";
import { FournisseurSession } from "./FournisseurSession";
import FiletErreur from "./components/FiletErreur";
import { chargerContenu } from "./contenu";
import { site } from "./data/site";
import { demarrerApplication } from "./installation";
import { oublierAnciennesVideos } from "./progression";
import "./index.css";

// Application installable : service worker et proposition
// d'installation, écoutée dès le lancement (voir src/installation.js).
demarrerApplication();

// Les vidéos qu'un étudiant ajoutait lui-même, avant que ce soit réservé
// à l'admin : effacées de son navigateur.
oublierAnciennesVideos();

// Routeur à dièse : les adresses contiennent un « # », par exemple
// /#/cours. Cela évite les erreurs 404 au rechargement d'une page sur
// un hébergeur statique comme GitHub Pages, qui ne sait pas renvoyer
// index.html pour une adresse inconnue.

// Le titre de l'onglet suit le nom défini dans src/data/site.js,
// pour qu'il n'y ait qu'un seul endroit à modifier quand le nom
// définitif sera choisi.
document.title = `${site.nom} — Plateforme d'apprentissage LRSI`;

// Le thème clair est le thème principal : le sombre ne s'affiche que
// si l'étudiant l'a choisi, jamais d'après la préférence du système.
// Appliqué avant le premier rendu, pour éviter un flash de thème clair
// chez ceux qui ont choisi le sombre.
//
// Avant le 4 octobre 2026, le site suivait le système et enregistrait
// ce thème sans qu'on l'ait choisi : un téléphone en mode sombre
// restait donc en sombre. Ce thème enregistré est oublié une fois
// (repère `lrsi-theme-clair`), pour que tout le monde reparte en clair.
try {
  if (!localStorage.getItem("lrsi-theme-clair")) {
    localStorage.removeItem("lrsi-theme");
    localStorage.setItem("lrsi-theme-clair", "1");
  }
  document.documentElement.classList.toggle("dark", localStorage.getItem("lrsi-theme") === "dark");
} catch {
  /* stockage indisponible : on garde le thème clair par défaut */
}

// Le contenu publié depuis l'espace admin est chargé AVANT les pages :
// certaines calculent des chiffres dès leur chargement (nombre de
// chapitres, par exemple), qui doivent porter sur le bon contenu.
// `chargerContenu` ne dure jamais plus de quatre secondes et ne
// bloque jamais : en cas d'échec, le contenu du code s'affiche.
await chargerContenu();

// Si l'application ne se charge pas (fichier disparu après une mise en
// ligne, réseau coupé), le filet plein écran s'affiche d'emblée avec
// cette erreur, plutôt qu'une page blanche.
let App = null;
let erreurChargement = null;
try {
  ({ default: App } = await import("./App.jsx"));
} catch (erreur) {
  erreurChargement = erreur;
}

// Rappels de révision : une notification par jour au plus, si
// l'étudiant les a activés dans son planning (src/rappels.js).
import("./rappels.js").then((m) => m.demarrerRappels()).catch(() => {});

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <FiletErreur pleinEcran erreurInitiale={erreurChargement}>
      {App && (
        <HashRouter>
          <FournisseurSession>
            <App />
          </FournisseurSession>
        </HashRouter>
      )}
    </FiletErreur>
  </StrictMode>
);
