import { Suspense, lazy } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import { Bouton, Container, EtatVide } from "./components/ui";
import { useSession } from "./session";
import Bienvenue from "./pages/Bienvenue";
import { Connexion, Inscription, MotDePasseOublie, NouveauMotDePasse } from "./pages/Authentification";
import TableauDeBord from "./pages/Accueil";
/* Pages chargées à la demande : chacune devient un petit fichier à part,
   téléchargé à sa première ouverture. Le premier affichage est plus
   rapide, surtout sur téléphone, et les pages d'administration ne sont
   jamais téléchargées par les étudiants. L'accueil, la connexion et le
   tableau de bord restent dans le fichier principal : on y arrive en
   premier. Pendant le chargement, Layout.jsx affiche un indicateur ;
   si le fichier n'existe plus (nouvelle version en ligne), le filet de
   components/FiletErreur.jsx propose de recharger. */
const aLaDemande = (charger, nom = "default") => lazy(() => charger().then((m) => ({ default: m[nom] })));

const Cours = aLaDemande(() => import("./pages/Cours"), "Cours");
const CoursDetail = aLaDemande(() => import("./pages/Cours"), "CoursDetail");
const Exercices = aLaDemande(() => import("./pages/Exercices"), "Exercices");
const ExerciceDetail = aLaDemande(() => import("./pages/Exercices"), "ExerciceDetail");
const QcmListe = aLaDemande(() => import("./pages/Qcm"), "QcmListe");
const QcmSession = aLaDemande(() => import("./pages/Qcm"), "QcmSession");
const ExamensListe = aLaDemande(() => import("./pages/Examens"), "ExamensListe");
const ExamenSession = aLaDemande(() => import("./pages/Examens"), "ExamenSession");
const Bibliotheque = aLaDemande(() => import("./pages/Bibliotheque"));
const Projet = aLaDemande(() => import("./pages/Projet"));
const Profil = aLaDemande(() => import("./pages/Profil"));
const Progression = aLaDemande(() => import("./pages/Progression"));
const Videos = aLaDemande(() => import("./pages/Videos"));
const Parametres = aLaDemande(() => import("./pages/Parametres"));
const Conditions = aLaDemande(() => import("./pages/Conditions"));
const Confidentialite = aLaDemande(() => import("./pages/Confidentialite"));
const MentionsLegales = aLaDemande(() => import("./pages/MentionsLegales"));
const Favoris = aLaDemande(() => import("./pages/Favoris"));
const Assistant = aLaDemande(() => import("./pages/Assistant"));
const Planning = aLaDemande(() => import("./pages/Planning"));
const LayoutAdmin = lazy(() => import("./components/LayoutAdmin"));
const Admin = aLaDemande(() => import("./pages/Admin"));
const EducationIA = aLaDemande(() => import("./pages/EducationIA"));
const GestionContenu = aLaDemande(() => import("./pages/GestionContenu"));
const StatsAdmin = aLaDemande(() => import("./pages/StatsAdmin"));

/* ------------------------------------------------------------------ */
/* Aiguillage selon la session                                         */
/* ------------------------------------------------------------------ */

// Page d'entrée : une fois entré, on file directement au tableau de bord.
function SiDejaEntre({ children }) {
  const { session } = useSession();
  return session ? <Navigate to="/tableau-de-bord" replace /> : children;
}

// Le tableau de bord suppose d'être entré, en mode invité ou avec un compte.
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

      {/* Sans SiDejaEntre : le code bon connecte l'étudiant, qui doit
          ensuite choisir son mot de passe, pas partir au tableau de bord. */}
      <Route path="/mot-de-passe-oublie" element={<MotDePasseOublie />} />
      {/* Arrivée par le lien reçu par email : la session est déjà là. */}
      <Route path="/nouveau-mot-de-passe" element={<NouveauMotDePasse />} />

      {/* Application */}
      {/* L'espace d'administration, avec sa propre coque */}
      <Route
        element={
          <Protege>
            <Suspense fallback={null}>
              <LayoutAdmin />
            </Suspense>
          </Protege>
        }
      >
        <Route path="admin" element={<Admin />} />
        <Route path="admin/contenu" element={<GestionContenu />} />
        <Route path="admin/ia" element={<EducationIA />} />
        <Route path="admin/stats" element={<StatsAdmin />} />
      </Route>

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
        <Route path="examens" element={<ExamensListe />} />
        <Route path="examens/:id" element={<ExamenSession />} />
        <Route path="videos" element={<Videos />} />
        <Route path="bibliotheque" element={<Bibliotheque />} />
        <Route path="conditions" element={<Conditions />} />
        <Route path="confidentialite" element={<Confidentialite />} />
        <Route path="mentions-legales" element={<MentionsLegales />} />
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
          path="planning"
          element={
            <Protege>
              <Planning />
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
        <Route path="*" element={<PageIntrouvable />} />
      </Route>
    </Routes>
  );
}
