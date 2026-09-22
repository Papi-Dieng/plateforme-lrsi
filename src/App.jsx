import { Navigate, Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import { Bouton, Container, EtatVide } from "./components/ui";
import { useSession } from "./session";
import Bienvenue from "./pages/Bienvenue";
import { Connexion, Inscription } from "./pages/Authentification";
import TableauDeBord from "./pages/Accueil";
import { Cours, CoursDetail } from "./pages/Cours";
import { Exercices, ExerciceDetail } from "./pages/Exercices";
import { QcmListe, QcmSession } from "./pages/Qcm";
import Bibliotheque from "./pages/Bibliotheque";
import Projet from "./pages/Projet";
import Profil from "./pages/Profil";
import Progression from "./pages/Progression";
import Videos from "./pages/Videos";
import Parametres from "./pages/Parametres";
import Conditions from "./pages/Conditions";
import Admin from "./pages/Admin";
import EducationIA from "./pages/EducationIA";
import Favoris from "./pages/Favoris";
import Assistant from "./pages/Assistant";

/* ------------------------------------------------------------------ */
/* Aiguillage selon la session                                         */
/* ------------------------------------------------------------------ */

// Page d'entrée : une fois entré, on file directement au tableau de bord.
function SiDejaEntre({ children }) {
  const { session } = useSession();
  return session ? <Navigate to="/tableau-de-bord" replace /> : children;
}

// Le tableau de bord suppose d'être entré, en mode invité ou de démonstration.
// Sans session, on renvoie à la page d'accueil, qui propose les trois entrées :
// se connecter, créer un compte ou continuer en invité.
function Protege({ children }) {
  const { session } = useSession();
  return session ? children : <Navigate to="/" replace />;
}

function PageIntrouvable() {
  return (
    <Container className="py-24">
      <h1 className="sr-only">Page introuvable</h1>
      <EtatVide
        titre="Page introuvable"
        texte="Le lien est peut-être incomplet, ou la page n'existe pas encore."
      >
        <Bouton to="/">Revenir à l'accueil</Bouton>
      </EtatVide>
    </Container>
  );
}

export default function App() {
  return (
    <Routes>
      {/* Écrans d'entrée, sans la coque de l'application */}
      <Route
        path="/"
        element={
          <SiDejaEntre>
            <Bienvenue />
          </SiDejaEntre>
        }
      />
      <Route
        path="/connexion"
        element={
          <SiDejaEntre>
            <Connexion />
          </SiDejaEntre>
        }
      />
      <Route
        path="/inscription"
        element={
          <SiDejaEntre>
            <Inscription />
          </SiDejaEntre>
        }
      />

      {/* Application */}
      <Route element={<Layout />}>
        <Route
          path="tableau-de-bord"
          element={
            <Protege>
              <TableauDeBord />
            </Protege>
          }
        />
        <Route path="cours" element={<Cours />} />
        <Route path="cours/:matiereId" element={<CoursDetail />} />
        <Route path="exercices" element={<Exercices />} />
        <Route path="exercices/:exerciceId" element={<ExerciceDetail />} />
        <Route path="qcm" element={<QcmListe />} />
        <Route path="qcm/:qcmId" element={<QcmSession />} />
        <Route path="videos" element={<Videos />} />
        <Route path="bibliotheque" element={<Bibliotheque />} />
        <Route path="conditions" element={<Conditions />} />
        <Route path="projet" element={<Projet />} />
        <Route
          path="profil"
          element={
            <Protege>
              <Profil />
            </Protege>
          }
        />
        <Route
          path="favoris"
          element={
            <Protege>
              <Favoris />
            </Protege>
          }
        />
        <Route
          path="progression"
          element={
            <Protege>
              <Progression />
            </Protege>
          }
        />
        <Route
          path="assistant"
          element={
            <Protege>
              <Assistant />
            </Protege>
          }
        />
        <Route
          path="parametres"
          element={
            <Protege>
              <Parametres />
            </Protege>
          }
        />
        <Route
          path="admin"
          element={
            <Protege>
              <Admin />
            </Protege>
          }
        />
        <Route
          path="admin/ia"
          element={
            <Protege>
              <EducationIA />
            </Protege>
          }
        />
        <Route path="*" element={<PageIntrouvable />} />
      </Route>
    </Routes>
  );
}
