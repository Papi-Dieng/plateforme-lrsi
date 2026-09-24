import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Icon from "../components/Icon";
import { Badge, Bouton, Container, EnTetePage, cx } from "../components/ui";
import { useSession } from "../session";
import { CLES } from "../progression";
import { CLE_PROFIL } from "../profil";
import { choisirStats, statsRefusees } from "../stats";
import Installation from "../components/Installation";
import { CLE_REVISIONS } from "../revisions";
import { site } from "../data/site";
import {
  CLE_PLANNING,
  CLE_THEME,
  lireSauvegarde,
  restaurerSauvegarde,
  telechargerSauvegarde,
} from "../sauvegarde";

/* ==================================================================
   Paramètres.

   Tout ce que la plateforme enregistre tient dans le navigateur. Cette
   page le montre noir sur blanc, permet de le sauvegarder dans un
   fichier pour changer d'appareil, et de tout effacer.
   ================================================================== */

const entreesStockage = [
  { cle: CLE_PROFIL, libelle: "Fiche profil", detail: "Avatar, nom d'utilisateur, coordonnées" },
  { cle: CLES.scores, libelle: "Scores des QCM", detail: "Meilleur score et tentatives" },
  { cle: CLES.exercices, libelle: "Exercices travaillés", detail: "Corrections déjà ouvertes" },
  { cle: CLES.chapitresLus, libelle: "Chapitres lus", detail: "Cours lus jusqu'au bout, détectés tout seuls" },
  { cle: CLES.favoris, libelle: "Matières en favori", detail: "Marque-pages du tableau de bord" },
  { cle: CLES.videos, libelle: "Vidéos ajoutées", detail: "Identifiants YouTube collés" },
  { cle: CLES.videosVues, libelle: "Vidéos ouvertes", detail: "Pour la barre de lecture" },
  { cle: CLE_PLANNING, libelle: "Planning de révision", detail: "Évaluations à préparer" },
  { cle: CLE_REVISIONS, libelle: "Révisions espacées", detail: "QCM à refaire, et quand" },
  { cle: CLE_THEME, libelle: "Thème", detail: "Clair ou sombre" },
];

const mesurer = () => Object.fromEntries(entreesStockage.map((e) => [e.cle, poids(e.cle)]));

function poids(cle) {
  try {
    const valeur = localStorage.getItem(cle);
    if (valeur === null) return null;
    return `${new Blob([valeur]).size} o`;
  } catch {
    return null;
  }
}

/* Télécharger sa sauvegarde, ou en recharger une : pour changer
   d'appareil, ou ne rien perdre en vidant son navigateur. */
function Sauvegarde({ utilisees, apresRestauration }) {
  const [lue, setLue] = useState(null);
  const [message, setMessage] = useState({ type: "", texte: "" });

  const telecharger = () => {
    const n = telechargerSauvegarde();
    setMessage({ type: "ok", texte: `Sauvegarde téléchargée (${n} donnée(s)). Garde-la dans un endroit sûr.` });
  };

  const choisir = async (fichier) => {
    setLue(null);
    if (!fichier) return;
    const r = lireSauvegarde(await fichier.text());
    if (r.erreur) setMessage({ type: "erreur", texte: r.erreur });
    else {
      setLue(r);
      setMessage({ type: "", texte: "" });
    }
  };

  const restaurer = () => {
    restaurerSauvegarde(lue.donnees, (cle, valeur) => {
      try {
        localStorage.setItem(cle, valeur);
      } catch {
        /* stockage plein ou bloqué */
      }
    });
    setLue(null);
    apresRestauration();
    setMessage({ type: "ok", texte: "Sauvegarde restaurée. La page se recharge…" });
    // Les pages relisent tout au chargement : on repart d'un site propre.
    setTimeout(() => window.location.reload(), 900);
  };

  return (
    <section className="card p-6">
      <h2 className="flex items-center gap-2 text-lg font-semibold text-ink-900 dark:text-white">
        <Icon name="bookmark" className="size-5" />
        Sauvegarder et restaurer
      </h2>
      <p className="mt-1.5 max-w-2xl text-sm/6 text-ink-600 dark:text-ink-400">
        Tu changes d'ordinateur, ou tu vas vider ton navigateur ? Télécharge ta
        sauvegarde : un petit fichier avec ton profil, tes scores, tes favoris
        et ton planning. Recharge-la ensuite ici, sur n'importe quel appareil.
      </p>

      <div className="mt-5 flex flex-wrap gap-3">
        <Bouton taille="sm" onClick={telecharger} disabled={utilisees === 0}>
          Télécharger ma sauvegarde
        </Bouton>
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-ink-200 px-3.5 py-2 text-sm font-semibold text-ink-700 hover:bg-ink-50 dark:border-ink-700 dark:text-ink-200 dark:hover:bg-ink-800">
          Restaurer une sauvegarde
          <input
            type="file"
            accept="application/json,.json"
            className="sr-only"
            onChange={(e) => {
              choisir(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
        </label>
      </div>

      {lue && (
        <div className="mt-4 rounded-xl border border-brand-300 bg-brand-50/50 p-4 dark:border-brand-500/30 dark:bg-brand-500/10">
          <p className="text-sm font-semibold text-ink-900 dark:text-white">
            Sauvegarde{lue.creeLe ? ` du ${new Date(lue.creeLe).toLocaleString("fr-FR")}` : ""}
          </p>
          <ul className="mt-2 list-disc space-y-0.5 pl-5 text-sm text-ink-700 dark:text-ink-300">
            {lue.resume.map((ligne) => (
              <li key={ligne}>{ligne}</li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-ink-500 dark:text-ink-400">
            Ces données remplaceront celles de cet appareil. Ce qui n'est pas dans la
            sauvegarde reste tel quel.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Bouton taille="sm" onClick={restaurer}>
              Restaurer
            </Bouton>
            <Bouton taille="sm" variante="secondaire" onClick={() => setLue(null)}>
              Annuler
            </Bouton>
          </div>
        </div>
      )}

      {message.texte && (
        <p
          role="status"
          className={cx(
            "mt-3 text-sm",
            message.type === "erreur" ? "text-flame-600 dark:text-flame-400" : "text-accent-700 dark:text-accent-400"
          )}
        >
          {message.texte}
        </p>
      )}
    </section>
  );
}

export default function Parametres() {
  const { session, sortir } = useSession();
  const navigate = useNavigate();

  const [theme, setTheme] = useState(() =>
    document.documentElement.classList.contains("dark") ? "dark" : "light"
  );
  const [tailles, setTailles] = useState(mesurer);
  const [confirmation, setConfirmation] = useState(false);
  const [partage, setPartage] = useState(() => !statsRefusees());

  const relever = () => setTailles(mesurer());

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
          {/* Application installable                           */}
          {/* ------------------------------------------------ */}
          <section className="card p-6">
            <Installation />
          </section>

          {/* ------------------------------------------------ */}
          {/* Statistiques anonymes                             */}
          {/* ------------------------------------------------ */}
          <section className="card p-6">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-ink-900 dark:text-white">
              <Icon name="target" className="size-5" />
              Statistiques anonymes des QCM
            </h2>
            <p className="mt-1.5 max-w-2xl text-sm/6 text-ink-600 dark:text-ink-400">
              Quand tu termines un QCM, la réponse choisie à chaque question est envoyée,
              sans ton nom ni aucun identifiant. L&apos;équipe voit ainsi quelles questions
              sont le plus ratées, pour mieux les réexpliquer. Ton score et ta progression
              restent sur cet appareil.
            </p>
            <label className="mt-4 flex items-center gap-3 text-sm font-medium text-ink-800 dark:text-ink-200">
              <input
                type="checkbox"
                checked={partage}
                onChange={(e) => {
                  choisirStats(e.target.checked);
                  setPartage(e.target.checked);
                }}
                className="size-4 accent-brand-600"
              />
              Partager mes réponses anonymes aux QCM
            </label>
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
              Ces données ne sont pas envoyées sur un serveur, et rien ne te suit
              d'un appareil à l'autre, sauf si tu emportes ta sauvegarde (juste en
              dessous). Seules tes réponses aux QCM partent, anonymes : voir
              « Statistiques anonymes » plus bas.
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
          {/* Sauvegarde                                        */}
          {/* ------------------------------------------------ */}
          <Sauvegarde utilisees={utilisees} apresRestauration={relever} />

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
