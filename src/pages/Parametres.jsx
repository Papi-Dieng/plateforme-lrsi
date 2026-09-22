import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Icon from "../components/Icon";
import { Badge, Bouton, Container, EnTetePage, cx } from "../components/ui";
import { useSession } from "../session";
import { CLES } from "../progression";
import { CLE_PROFIL } from "../profil";
import { site } from "../data/site";

/* ==================================================================
   Paramètres.

   Tout ce que la plateforme enregistre tient dans le navigateur. Cette
   page le montre noir sur blanc et permet de tout effacer.
   ================================================================== */

const CLE_THEME = "lrsi-theme";

const entreesStockage = [
  { cle: CLE_PROFIL, libelle: "Fiche profil", detail: "Avatar, nom d'utilisateur, coordonnées" },
  { cle: CLES.scores, libelle: "Scores des QCM", detail: "Meilleur score et tentatives" },
  { cle: CLES.exercices, libelle: "Exercices travaillés", detail: "Corrections déjà ouvertes" },
  { cle: CLES.favoris, libelle: "Matières en favori", detail: "Marque-pages du tableau de bord" },
  { cle: CLES.videos, libelle: "Vidéos ajoutées", detail: "Identifiants YouTube collés" },
  { cle: CLES.videosVues, libelle: "Vidéos ouvertes", detail: "Pour la barre de lecture" },
  { cle: CLE_THEME, libelle: "Thème", detail: "Clair ou sombre" },
];

function poids(cle) {
  try {
    const valeur = localStorage.getItem(cle);
    if (valeur === null) return null;
    return `${new Blob([valeur]).size} o`;
  } catch {
    return null;
  }
}

export default function Parametres() {
  const { session, sortir } = useSession();
  const navigate = useNavigate();

  const [theme, setTheme] = useState("light");
  const [tailles, setTailles] = useState({});
  const [confirmation, setConfirmation] = useState(false);

  const relever = () => {
    const suite = {};
    entreesStockage.forEach((e) => {
      suite[e.cle] = poids(e.cle);
    });
    setTailles(suite);
  };

  useEffect(() => {
    setTheme(document.documentElement.classList.contains("dark") ? "dark" : "light");
    relever();
  }, []);

  const changerTheme = (suivant) => {
    setTheme(suivant);
    document.documentElement.classList.toggle("dark", suivant === "dark");
    try {
      localStorage.setItem(CLE_THEME, suivant);
    } catch {
      /* stockage indisponible : le thème ne sera pas conservé */
    }
    relever();
  };

  const toutEffacer = () => {
    entreesStockage.forEach((e) => {
      if (e.cle === CLE_THEME) return; // on garde le confort visuel
      try {
        localStorage.removeItem(e.cle);
      } catch {
        /* rien à faire */
      }
    });
    relever();
    setConfirmation(false);
  };

  const utilisees = entreesStockage.filter((e) => tailles[e.cle]).length;
  const invite = session?.mode === "invite";

  return (
    <>
      <EnTetePage
        surtitre="Réglages"
        titre="Paramètres"
        texte="L'apparence du site et les données qu'il conserve sur cet appareil."
      />

      <Container className="py-10">
        <div className="max-w-3xl space-y-5">
          {/* ------------------------------------------------ */}
          {/* Apparence                                         */}
          {/* ------------------------------------------------ */}
          <section className="card p-6">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-ink-900 dark:text-white">
              <Icon name="sun" className="size-5" />
              Apparence
            </h2>
            <p className="mt-1.5 text-sm text-ink-500 dark:text-ink-400">
              Au premier passage, le site suit la préférence de ton système.
            </p>

            <div className="mt-5 flex flex-wrap gap-3">
              {[
                { valeur: "light", label: "Thème clair", icone: "sun" },
                { valeur: "dark", label: "Thème sombre", icone: "moon" },
              ].map((o) => (
                <button
                  key={o.valeur}
                  type="button"
                  onClick={() => changerTheme(o.valeur)}
                  aria-pressed={theme === o.valeur}
                  className={cx(
                    "inline-flex items-center gap-2.5 rounded-xl border px-4 py-3 text-sm font-medium transition-colors",
                    theme === o.valeur
                      ? "border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-200"
                      : "border-ink-200 text-ink-600 hover:bg-ink-100 dark:border-ink-700 dark:text-ink-300 dark:hover:bg-ink-800"
                  )}
                >
                  <Icon name={o.icone} className="size-4.5" />
                  {o.label}
                  {theme === o.valeur && <Icon name="check" className="size-4" />}
                </button>
              ))}
            </div>
          </section>

          {/* ------------------------------------------------ */}
          {/* Session                                           */}
          {/* ------------------------------------------------ */}
          <section className="card p-6">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-ink-900 dark:text-white">
              <Icon name="users" className="size-5" />
              Session
            </h2>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <Badge ton={invite ? "neutre" : "brand"}>
                {invite ? "Mode invité" : "Compte de démonstration"}
              </Badge>
              <span className="text-sm text-ink-500 dark:text-ink-400">
                {invite
                  ? "Aucune donnée personnelle n'est demandée."
                  : "Aucun mot de passe n'est enregistré."}
              </span>
            </div>
            <div className="mt-5 flex flex-wrap gap-3">
              <Bouton
                variante="secondaire"
                onClick={() => {
                  sortir();
                  navigate("/");
                }}
              >
                <Icon name="external" className="size-4" />
                Quitter la session
              </Bouton>
              <Bouton to="/profil" variante="fantome">
                Modifier mon profil
              </Bouton>
            </div>
          </section>

          {/* ------------------------------------------------ */}
          {/* Données locales                                   */}
          {/* ------------------------------------------------ */}
          <section className="card p-6">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-ink-900 dark:text-white">
              <Icon name="lock" className="size-5" />
              Mes données sur cet appareil
            </h2>
            <p className="mt-1.5 max-w-2xl text-sm/6 text-ink-600 dark:text-ink-400">
              Voici exactement ce que la plateforme conserve dans ce navigateur.
              Rien n'est envoyé sur un serveur, et rien ne te suit d'un appareil
              à l'autre.
            </p>

            <div className="mt-5 overflow-hidden rounded-2xl border border-ink-200 dark:border-ink-800">
              <table className="w-full text-left text-sm">
                <thead className="bg-ink-100 text-xs text-ink-600 dark:bg-ink-800 dark:text-ink-300">
                  <tr>
                    <th scope="col" className="px-4 py-2.5 font-semibold">
                      Donnée
                    </th>
                    <th scope="col" className="hidden px-4 py-2.5 font-semibold sm:table-cell">
                      Clé
                    </th>
                    <th scope="col" className="px-4 py-2.5 text-right font-semibold">
                      Taille
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-200 dark:divide-ink-800">
                  {entreesStockage.map((e) => (
                    <tr key={e.cle}>
                      <td className="px-4 py-3">
                        <span className="font-medium text-ink-900 dark:text-white">
                          {e.libelle}
                        </span>
                        <span className="mt-0.5 block text-xs text-ink-500">
                          {e.detail}
                        </span>
                      </td>
                      <td className="hidden px-4 py-3 font-mono text-xs text-ink-500 sm:table-cell">
                        {e.cle}
                      </td>
                      <td className="px-4 py-3 text-right text-xs whitespace-nowrap text-ink-500">
                        {tailles[e.cle] ?? "vide"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-5">
              {confirmation ? (
                <div className="flex flex-wrap items-center gap-3">
                  <p className="text-sm font-medium text-ink-900 dark:text-white">
                    Effacer profil, progression et vidéos ? C'est définitif.
                  </p>
                  <Bouton
                    taille="sm"
                    className="bg-red-600 hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-500"
                    onClick={toutEffacer}
                  >
                    Oui, tout effacer
                  </Bouton>
                  <Bouton
                    variante="secondaire"
                    taille="sm"
                    onClick={() => setConfirmation(false)}
                  >
                    Annuler
                  </Bouton>
                </div>
              ) : (
                <Bouton
                  variante="secondaire"
                  taille="sm"
                  onClick={() => setConfirmation(true)}
                  disabled={utilisees === 0}
                >
                  Effacer toutes mes données
                </Bouton>
              )}
            </div>
          </section>

          {/* ------------------------------------------------ */}
          {/* À propos                                          */}
          {/* ------------------------------------------------ */}
          <section className="card p-6">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-ink-900 dark:text-white">
              <Icon name="info" className="size-5" />À propos
            </h2>
            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-ink-500 dark:text-ink-400">Plateforme</dt>
                <dd className="font-medium text-ink-900 dark:text-white">
                  {site.nom}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-ink-500 dark:text-ink-400">Version</dt>
                <dd className="font-medium text-ink-900 dark:text-white">
                  {site.version}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-ink-500 dark:text-ink-400">Filière</dt>
                <dd className="text-right font-medium text-ink-900 dark:text-white">
                  {site.filiere}
                </dd>
              </div>
            </dl>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link
                to="/conditions"
                className="text-sm font-medium text-brand-600 hover:underline dark:text-brand-400"
              >
                Conditions d'utilisation
              </Link>
              <Link
                to="/projet"
                className="text-sm font-medium text-brand-600 hover:underline dark:text-brand-400"
              >
                La démarche du projet
              </Link>
            </div>
          </section>
        </div>
      </Container>
    </>
  );
}
