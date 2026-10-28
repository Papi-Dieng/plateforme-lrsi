import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Icon from "../components/Icon";
import { Badge, Bouton, Container } from "../components/ui";
import { cx } from "../components/classes";
import { mono } from "../components/styleAdmin";
import { useSession } from "../session";
import { comptesActifs, messageErreurCompte } from "../comptes";
import { CLES } from "../progression";
import { CLE_PROFIL, lireProfil, enregistrerProfil, nomAffiche } from "../profil";
import { choisirStats, statsRefusees } from "../stats";
import Installation from "../components/Installation";
import { SecoursCompte } from "../components/CodeSecours";
import { CLE_REVISIONS } from "../revisions";
import { CLE_CONVERSATIONS } from "../conversations";
import { CLE_DISPONIBILITES } from "../programmeIA";
import { site } from "../data/site";
import { CLE_PLANNING, CLE_THEME } from "../sauvegarde";
import { stockage } from "../stockage";
import { CLE_TAILLE, TAILLES, appliquerTheme, lireChoixTheme } from "../apparence";
import { activerRappels, desactiverRappels, notificationsPossibles, rappelsActifs } from "../rappels";

/* ==================================================================
   Paramètres, d'après la maquette « 02 · Paramètres » (14 octobre
   2026) : un réglage par section, et chaque section montre ce qu'elle
   change plutôt que de le décrire.

   Cinq sections, choisies par les pastilles du haut : l'apparence (le
   thème, la taille du texte en plein écran, le nom affiché), les
   rappels de révision, la confidentialité, les données de l'étudiant et
   son compte.

   Rien ne se valide : chaque réglage s'applique en le touchant. C'est
   ce que dit le bandeau « Tout s'enregistre tout seul ».
   ================================================================== */

/* Ce que la plateforme garde, rangé comme des fichiers (maquette). Les
   clés sont celles de src/sauvegarde.js : y ajouter une donnée demande
   de l'ajouter là aussi. */
const DOSSIERS = [
  {
    nom: "profil.json",
    detail: "Avatar, nom d'utilisateur, âge, téléphone, e-mail, niveau et matricule",
    cles: [CLE_PROFIL],
  },
  {
    nom: "progression.json",
    detail: "Scores des QCM, exercices travaillés, chapitres lus, devoirs notés, favoris, vidéos vues, QCM à revoir",
    cles: [CLES.scores, CLES.exercices, CLES.chapitresLus, CLES.devoirs, CLES.favoris, CLES.videosVues, CLE_REVISIONS],
  },
  {
    nom: "organisation.json",
    detail: "Emploi du temps, examens, programme de révision et disponibilités",
    cles: [CLE_PLANNING, CLE_DISPONIBILITES],
  },
  {
    nom: "assistant.json",
    detail: "Les 20 discussions les plus récentes avec l'assistant, sans les images",
    cles: [CLE_CONVERSATIONS],
  },
];

const SECTIONS = [
  { cle: "apparence", label: "Apparence", icone: "sun" },
  { cle: "rappels", label: "Rappels de révision", icone: "bell" },
  { cle: "confidentialite", label: "Confidentialité", icone: "shield" },
  { cle: "donnees", label: "Mes données", icone: "database" },
  { cle: "compte", label: "Compte et sécurité", icone: "lock" },
];

const octets = (n) =>
  n >= 1024 ? `${(n / 1024).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} Ko` : `${n} o`;

function poids(cles) {
  let total = 0;
  for (const cle of cles) {
    try {
      total += (cle === CLE_THEME ? localStorage.getItem(cle) : stockage.getItem(cle))?.length ?? 0;
    } catch {
      /* stockage indisponible : rien à mesurer */
    }
  }
  return total;
}

const mesurer = () => Object.fromEntries(DOSSIERS.map((d) => [d.nom, poids(d.cles)]));

/* Un bloc de réglage : un titre, une phrase, et ce qu'il y a à régler. */
function Reglage({ titre, texte, children, action }) {
  return (
    <section className="card p-6 sm:p-7">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold text-ink-900 dark:text-white">{titre}</h2>
          {texte && <p className="mt-1 max-w-2xl text-sm/6 text-ink-600 dark:text-ink-400">{texte}</p>}
        </div>
        {action}
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

/* Une carte à choisir (thème, taille) : l'aperçu puis le nom. */
function Carte({ actif, onClick, titre, detail, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={actif}
      className={cx(
        "flex-1 rounded-2xl border p-3 text-left transition-colors",
        actif
          ? "border-brand-500 bg-brand-50 dark:border-brand-400 dark:bg-brand-500/15"
          : "border-ink-200 hover:bg-ink-50 dark:border-ink-700 dark:hover:bg-ink-800"
      )}
    >
      {children}
      <span className="mt-3 flex items-center gap-1.5 text-sm font-semibold text-ink-900 dark:text-white">
        {titre}
        {actif && <Icon name="check" className="size-4 text-brand-600 dark:text-brand-300" />}
      </span>
      <span className="mt-0.5 block text-xs text-ink-500 dark:text-ink-400">{detail}</span>
    </button>
  );
}

/* L'aperçu d'une page, en petit, dans la carte d'un thème. */
function MiniPage({ sombre }) {
  return (
    <span className={cx("block rounded-xl border p-2.5", sombre ? "border-ink-700 bg-ink-950" : "border-ink-200 bg-white")}>
      <span className="flex items-center gap-1.5">
        <span className="size-2.5 rounded-[4px] bg-brand-600" />
        <span className={cx("h-1.5 w-8 rounded-full", sombre ? "bg-ink-700" : "bg-ink-200")} />
        <span className="ml-auto size-2.5 rounded-full bg-flame-500" />
      </span>
      <span className={cx("mt-2 block h-1.5 w-full rounded-full", sombre ? "bg-ink-700" : "bg-ink-200")} />
      <span className={cx("mt-1.5 block h-1.5 w-2/3 rounded-full", sombre ? "bg-ink-800" : "bg-ink-100")} />
      <span className="mt-2 block h-4 w-12 rounded-md bg-brand-600" />
    </span>
  );
}

export default function Parametres() {
  const { session, sortir, supprimer } = useSession();
  const navigate = useNavigate();
  const [section, setSection] = useState("apparence");
  const [suppression, setSuppression] = useState(null);
  const [confirmation, setConfirmation] = useState(false);

  const [theme, setTheme] = useState(lireChoixTheme);
  const [taille, setTaille] = useState(() => {
    try {
      const t = Number(localStorage.getItem(CLE_TAILLE));
      return TAILLES.includes(t) ? t : 1;
    } catch {
      return 1;
    }
  });
  const [profil, setProfil] = useState(lireProfil);
  const [partage, setPartage] = useState(() => !statsRefusees());
  const [rappels, setRappels] = useState(() => rappelsActifs());
  const [erreurRappels, setErreurRappels] = useState("");
  const [tailles, setTailles] = useState(mesurer);

  const invite = session?.mode === "invite";
  const relever = () => setTailles(mesurer());

  // Le thème « comme mon appareil » suit l'appareil tant qu'il est choisi.
  useEffect(() => {
    if (theme !== "auto" || typeof window.matchMedia !== "function") return undefined;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const suivre = () => appliquerTheme("auto");
    media.addEventListener("change", suivre);
    return () => media.removeEventListener("change", suivre);
  }, [theme]);

  const changerTheme = (suivant) => {
    setTheme(suivant);
    appliquerTheme(suivant);
    relever();
  };

  const changerTaille = (valeur) => {
    setTaille(valeur);
    try {
      localStorage.setItem(CLE_TAILLE, String(valeur));
    } catch {
      /* stockage indisponible : la taille vaut pour cette lecture */
    }
  };

  const changerPseudo = (pseudo) => {
    setProfil((p) => enregistrerProfil({ ...p, pseudo }));
    relever();
  };

  const basculerRappels = async () => {
    setErreurRappels("");
    if (rappels) {
      await desactiverRappels();
      setRappels(false);
      return;
    }
    const ok = await activerRappels();
    setRappels(ok);
    if (!ok) setErreurRappels("Ton navigateur a refusé les notifications. Autorise-les pour ce site, puis réessaie.");
  };

  const effacerDossier = (dossier) => {
    for (const cle of dossier.cles) {
      try {
        stockage.removeItem(cle);
      } catch {
        /* rien à faire */
      }
    }
    relever();
  };

  const toutEffacer = () => {
    DOSSIERS.forEach(effacerDossier);
    setConfirmation(false);
    relever();
  };

  const totalGarde = Object.values(tailles).reduce((n, v) => n + v, 0);

  return (
    <>
      <header className="border-b border-ink-200 bg-white dark:border-ink-800 dark:bg-ink-900">
        <Container className="py-8 sm:py-10">
          <p className={cx("text-xs text-ink-500 dark:text-ink-400", mono)}>
            <Link to="/profil" className="hover:underline">
              Mon profil
            </Link>{" "}
            / Paramètres
          </p>
          <h1 className="mt-2 text-[clamp(2.2rem,5vw,3.2rem)] leading-tight font-extrabold tracking-[-0.04em] text-ink-950 dark:text-white">
            Paramètres
          </h1>
          <p className="mt-2 max-w-2xl text-[15px] text-ink-600 dark:text-ink-300">
            {invite
              ? "Tes réglages s'appliquent tout de suite, sur cet appareil. Sans compte, ils ne te suivent pas ailleurs."
              : "Tes réglages s'appliquent tout de suite, sur cet appareil et dans ton compte."}
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Badge ton="neutre" icone="check">
              Tout s&apos;enregistre tout seul
            </Badge>
            <Link
              to="/profil"
              className="inline-flex items-center gap-2 rounded-full border border-ink-200 py-1.5 pr-4 pl-1.5 text-sm font-semibold text-ink-900 hover:bg-ink-50 dark:border-ink-700 dark:text-white dark:hover:bg-ink-800"
            >
              <span className="grid size-7 place-items-center rounded-full bg-brand-600 text-xs font-bold text-white">
                {nomAffiche(profil, session).slice(0, 2).toUpperCase()}
              </span>
              Voir mon profil
            </Link>
          </div>

          {/* Les sections : une seule à la fois, comme sur la maquette. */}
          <div
            className="-mx-4 mt-6 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0"
            role="tablist"
            aria-label="Sections des paramètres"
          >
            {SECTIONS.map((s) => (
              <button
                key={s.cle}
                type="button"
                role="tab"
                aria-selected={section === s.cle}
                onClick={() => setSection(s.cle)}
                className={cx(
                  "inline-flex min-h-10 shrink-0 items-center gap-2 rounded-full px-4 text-sm font-bold transition-colors",
                  section === s.cle
                    ? "bg-brand-600 text-white"
                    : "border border-ink-200 text-ink-700 hover:bg-ink-50 dark:border-ink-700 dark:text-ink-200 dark:hover:bg-ink-800"
                )}
              >
                <Icon name={s.icone} className="size-4" />
                {s.label}
              </button>
            ))}
          </div>
        </Container>
      </header>

      <Container className="py-8">
        <div className="max-w-3xl space-y-5">
          {/* ---------------------------------------------- */}
          {/* Apparence                                       */}
          {/* ---------------------------------------------- */}
          {section === "apparence" && (
            <>
              <Reglage titre="Thème" texte="Essaie : toute la page change tout de suite.">
                <div className="flex flex-col gap-3 sm:flex-row">
                  <Carte actif={theme === "light"} onClick={() => changerTheme("light")} titre="Clair" detail="Fond blanc, comme sur papier">
                    <MiniPage />
                  </Carte>
                  <Carte actif={theme === "dark"} onClick={() => changerTheme("dark")} titre="Sombre" detail="Repose les yeux le soir">
                    <MiniPage sombre />
                  </Carte>
                  <Carte
                    actif={theme === "auto"}
                    onClick={() => changerTheme("auto")}
                    titre="Comme mon appareil"
                    detail="Suit le réglage de ton téléphone ou de ton ordinateur"
                  >
                    <span className="grid grid-cols-2 gap-1">
                      <MiniPage />
                      <MiniPage sombre />
                    </span>
                  </Carte>
                </div>
              </Reglage>

              <Reglage
                titre="Taille du texte en plein écran"
                texte="Pour lire un cours en plein écran sans plisser les yeux. Les boutons A− et A+ du plein écran changent la même chose."
              >
                <div className="flex flex-wrap gap-2">
                  {TAILLES.map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => changerTaille(t)}
                      aria-pressed={taille === t}
                      className={cx(
                        "min-h-11 rounded-xl border px-4 text-sm font-bold transition-colors",
                        taille === t
                          ? "border-brand-500 bg-brand-50 text-brand-700 dark:border-brand-400 dark:bg-brand-500/15 dark:text-brand-200"
                          : "border-ink-200 text-ink-700 hover:bg-ink-50 dark:border-ink-700 dark:text-ink-200 dark:hover:bg-ink-800"
                      )}
                    >
                      {Math.round(t * 100)} %
                    </button>
                  ))}
                </div>
                <div className="mt-4 rounded-2xl border border-ink-200 p-4 dark:border-ink-800">
                  <p className={cx("text-[11px] text-ink-500 dark:text-ink-400", mono)}>APERÇU · PLEIN ÉCRAN</p>
                  <div style={{ zoom: taille }}>
                    <p className="mt-2 text-base font-extrabold text-ink-950 dark:text-white">Modèles OSI et TCP/IP</p>
                    <p className="mt-1 text-[15px]/7 text-ink-700 dark:text-ink-200">
                      Chaque couche ajoute son propre en-tête aux données qu&apos;elle reçoit de la couche du dessus :
                      c&apos;est l&apos;encapsulation.
                    </p>
                  </div>
                </div>
              </Reglage>

              <Reglage titre="Nom affiché dans la barre du haut" texte="Laisse vide pour afficher ton nom d'utilisateur ou celui de ta session.">
                <label className="block text-sm font-semibold text-ink-900 dark:text-white" htmlFor="pseudo-affiche">
                  Nom affiché
                </label>
                <input
                  id="pseudo-affiche"
                  value={profil.pseudo}
                  maxLength={40}
                  onChange={(e) => changerPseudo(e.target.value)}
                  placeholder={session?.nom ?? "Étudiant"}
                  className="mt-1.5 w-full max-w-sm rounded-xl border border-ink-200 bg-white px-4 py-3 text-[15px] text-ink-900 focus:border-brand-400 focus:ring-2 focus:ring-brand-500/20 focus:outline-none dark:border-ink-700 dark:bg-ink-950 dark:text-white"
                />
                <p className="mt-3 flex items-center gap-2 text-sm text-ink-600 dark:text-ink-300">
                  <span className="grid size-9 place-items-center rounded-full bg-brand-600 text-xs font-bold text-white">
                    {nomAffiche(profil, session).slice(0, 2).toUpperCase()}
                  </span>
                  {nomAffiche(profil, session)}
                </p>
              </Reglage>

              <section className="card p-6 sm:p-7">
                <Installation />
              </section>
            </>
          )}

          {/* ---------------------------------------------- */}
          {/* Rappels de révision                             */}
          {/* ---------------------------------------------- */}
          {section === "rappels" && (
            <Reglage
              titre="Rappels de révision"
              texte="Un petit signal quand tu ouvres le site et qu'il y a quelque chose à faire : une évaluation proche, une tâche du planning, un QCM à refaire."
            >
              {notificationsPossibles() ? (
                <>
                  <label className="flex items-center gap-3 text-sm font-medium text-ink-800 dark:text-ink-200">
                    <input type="checkbox" checked={rappels} onChange={basculerRappels} className="size-4 accent-brand-600" />
                    Me rappeler de réviser
                  </label>
                  {erreurRappels && (
                    <p role="alert" className="mt-2 text-sm text-flame-700 dark:text-flame-400">
                      {erreurRappels}
                    </p>
                  )}
                  {/* À quoi ressemble le rappel. */}
                  <div className="mt-5 max-w-sm rounded-2xl border border-ink-200 bg-ink-50 p-4 dark:border-ink-700 dark:bg-ink-800/60">
                    <p className={cx("text-[11px] text-ink-500 dark:text-ink-400", mono)}>CE QUE TU VERRAS</p>
                    <div className="mt-2 flex gap-3">
                      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-brand-600 text-white">
                        <Icon name="bell" className="size-4" />
                      </span>
                      <span>
                        <span className="block text-sm font-bold text-ink-950 dark:text-white">C&apos;est l&apos;heure de réviser</span>
                        <span className="block text-sm text-ink-600 dark:text-ink-300">2 QCM à refaire aujourd&apos;hui.</span>
                      </span>
                    </div>
                  </div>
                  <p className="mt-4 text-sm/6 text-ink-600 dark:text-ink-400">
                    Les rappels passent par les notifications de ton navigateur. Jamais de SMS, jamais d&apos;e-mail. La
                    plateforme n&apos;a pas de serveur qui t&apos;écrit : le rappel paraît quand tu ouvres le site, et,
                    sur Android avec l&apos;application installée, quand ton téléphone réveille le site.
                  </p>
                </>
              ) : (
                <p className="text-sm/6 text-ink-600 dark:text-ink-400">
                  Ce navigateur ne sait pas afficher de notification. Sur iPhone, installe d&apos;abord l&apos;application
                  depuis Safari (Partager → Sur l&apos;écran d&apos;accueil).
                </p>
              )}
            </Reglage>
          )}

          {/* ---------------------------------------------- */}
          {/* Confidentialité                                 */}
          {/* ---------------------------------------------- */}
          {section === "confidentialite" && (
            <>
              <Reglage
                titre="Statistiques anonymes des QCM"
                texte="À la fin d'un QCM, la réponse choisie à chaque question part sans ton nom ni aucun identifiant, pour que l'équipe voie quelles questions sont le plus ratées."
              >
                <label className="flex items-center gap-3 text-sm font-medium text-ink-800 dark:text-ink-200">
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

                {/* Ce qui part vraiment, montré plutôt que décrit. */}
                <div className="mt-5 rounded-2xl border border-ink-200 p-4 dark:border-ink-800">
                  <p className={cx("text-[11px] text-ink-500 dark:text-ink-400", mono)}>LE PAQUET QUI PART À LA FIN D&apos;UN QCM</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Badge ton="brand">qcm : reseaux-bases</Badge>
                    {["Q1 B", "Q2 A", "Q3 D", "Q4 C"].map((q) => (
                      <Badge key={q} ton="neutre">
                        {q}
                      </Badge>
                    ))}
                  </div>
                  <p className="mt-3 text-sm text-ink-600 dark:text-ink-300">
                    Jamais dans le paquet : ton nom, ton score, ni aucun identifiant.
                  </p>
                </div>
              </Reglage>
              <section className="card p-6 sm:p-7">
                <p className="text-sm/6 text-ink-600 dark:text-ink-400">
                  Pas de publicité, pas de mesure d&apos;audience, pas de cookie publicitaire.{" "}
                  <Link to="/confidentialite" className="font-semibold text-brand-600 hover:underline dark:text-brand-400">
                    Lire la politique de confidentialité
                  </Link>
                </p>
              </section>
            </>
          )}

          {/* ---------------------------------------------- */}
          {/* Mes données                                     */}
          {/* ---------------------------------------------- */}
          {section === "donnees" && (
            <Reglage
              titre="Mes données"
              texte={
                invite
                  ? "Sans compte, rien n'est enregistré : tout cela vit le temps de ta visite et disparaît dès que tu recharges la page. Crée un compte avec une adresse email et un mot de passe pour que ta progression soit gardée sur le serveur."
                  : "Ton compte les garde sur le serveur : elles te suivent sur tous tes appareils. Se déconnecter les efface de cet appareil, pas de ton compte."
              }
              action={
                <span className={cx("shrink-0 rounded-full bg-ink-100 px-3 py-1.5 text-xs font-bold text-ink-700 dark:bg-ink-800 dark:text-ink-200", mono)}>
                  {octets(totalGarde)}
                </span>
              }
            >
              <ul className="divide-y divide-ink-200 overflow-hidden rounded-2xl border border-ink-200 dark:divide-ink-800 dark:border-ink-800">
                {DOSSIERS.map((d) => (
                  <li key={d.nom} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
                    <Icon name="file" className="size-4 shrink-0 text-ink-400" />
                    <span className="min-w-0 flex-1">
                      <span className={cx("block text-sm font-bold text-ink-950 dark:text-white", mono)}>{d.nom}</span>
                      <span className="block text-xs text-ink-500 dark:text-ink-400">{d.detail}</span>
                    </span>
                    <span className="text-xs whitespace-nowrap text-ink-500 dark:text-ink-400">
                      {tailles[d.nom] ? octets(tailles[d.nom]) : "vide"}
                    </span>
                    <button
                      type="button"
                      disabled={!tailles[d.nom]}
                      onClick={() => effacerDossier(d)}
                      className="text-xs font-bold text-flame-700 hover:underline disabled:opacity-40 dark:text-flame-400"
                    >
                      Effacer
                    </button>
                  </li>
                ))}
              </ul>

              <div className="mt-5">
                {confirmation ? (
                  <div className="flex flex-wrap items-center gap-3">
                    <p className="text-sm font-medium text-ink-900 dark:text-white">Effacer profil, progression et discussions ? C&apos;est définitif.</p>
                    <Bouton taille="sm" variante="danger" onClick={toutEffacer}>
                      Oui, tout effacer
                    </Bouton>
                    <Bouton variante="secondaire" taille="sm" onClick={() => setConfirmation(false)}>
                      Annuler
                    </Bouton>
                  </div>
                ) : (
                  <Bouton variante="secondaire" taille="sm" disabled={totalGarde === 0} onClick={() => setConfirmation(true)}>
                    <Icon name="trash" className="size-4" />
                    Tout effacer
                  </Bouton>
                )}
              </div>
            </Reglage>
          )}

          {/* ---------------------------------------------- */}
          {/* Compte et sécurité                              */}
          {/* ---------------------------------------------- */}
          {section === "compte" && (
            <>
              <Reglage
                titre="Mon compte"
                texte={
                  invite
                    ? "Tu visites le site sans compte. Un compte garde ta progression sur le serveur et la retrouve sur tous tes appareils."
                    : "Ton compte garde ta progression sur tous tes appareils."
                }
                action={<Badge ton={invite ? "neutre" : "brand"}>{invite ? "Mode invité" : "Compte"}</Badge>}
              >
                {!invite && session?.identifiant && (
                  <dl className="mb-5 space-y-3 text-sm">
                    <div className="flex flex-wrap justify-between gap-2">
                      <dt className="text-ink-500 dark:text-ink-400">
                        {session.fournisseur === "telephone" ? "Numéro de connexion" : "E-mail de connexion"}
                      </dt>
                      <dd className="font-semibold text-ink-900 dark:text-white">{session.identifiant}</dd>
                    </div>
                    <div className="flex flex-wrap justify-between gap-2">
                      <dt className="text-ink-500 dark:text-ink-400">Mot de passe</dt>
                      <dd className="text-right text-ink-600 dark:text-ink-300">
                        Gardé chiffré : personne dans l&apos;équipe ne peut le lire.
                      </dd>
                    </div>
                  </dl>
                )}
                <div className="flex flex-wrap gap-3">
                  {invite && comptesActifs && <Bouton to="/inscription">Créer un compte</Bouton>}
                  <Bouton
                    variante="secondaire"
                    onClick={async () => {
                      await sortir();
                      navigate("/");
                    }}
                  >
                    <Icon name="sortie" className="size-4" />
                    {invite ? "Quitter la session" : "Se déconnecter"}
                  </Bouton>
                  <Bouton to="/profil" variante="fantome">
                    Modifier mon profil
                  </Bouton>
                </div>
              </Reglage>

              {/* Comptes téléphone seulement : code et email de secours. */}
              <SecoursCompte />

              {!invite && (
                <Reglage
                  titre="Supprimer mon compte"
                  texte="Ta fiche, ta progression, ton organisation et tes discussions avec l'assistant sont effacées du compte, sur tous les appareils. Ce n'est pas réversible."
                >
                  {suppression === "confirmer" ? (
                    <div className="flex flex-wrap gap-3">
                      <Bouton
                        variante="danger"
                        onClick={async () => {
                          setSuppression("en-cours");
                          const r = await supprimer();
                          if (r.erreur) setSuppression(r.erreur);
                          else navigate("/");
                        }}
                      >
                        Oui, supprimer définitivement
                      </Bouton>
                      <Bouton variante="fantome" onClick={() => setSuppression(null)}>
                        Annuler
                      </Bouton>
                    </div>
                  ) : (
                    <>
                      <Bouton variante="secondaire" disabled={suppression === "en-cours"} onClick={() => setSuppression("confirmer")}>
                        <Icon name="trash" className="size-4" />
                        {suppression === "en-cours" ? "Suppression…" : "Supprimer mon compte"}
                      </Bouton>
                      {suppression && suppression !== "en-cours" && suppression !== "confirmer" && (
                        <p role="alert" className="mt-2 text-sm text-flame-600 dark:text-flame-400">
                          {messageErreurCompte(suppression)}
                        </p>
                      )}
                    </>
                  )}
                </Reglage>
              )}

              <section className="card p-6 sm:p-7">
                <h2 className="flex items-center gap-2 text-lg font-semibold text-ink-900 dark:text-white">
                  <Icon name="info" className="size-5" />À propos
                </h2>
                <dl className="mt-4 space-y-2 text-sm">
                  <div className="flex justify-between gap-4">
                    <dt className="text-ink-500 dark:text-ink-400">Plateforme</dt>
                    <dd className="font-medium text-ink-900 dark:text-white">{site.nom}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-ink-500 dark:text-ink-400">Version</dt>
                    <dd className="font-medium text-ink-900 dark:text-white">{site.version}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-ink-500 dark:text-ink-400">Filière</dt>
                    <dd className="text-right font-medium text-ink-900 dark:text-white">{site.filiere}</dd>
                  </div>
                </dl>
                <div className="mt-5 flex flex-wrap gap-3">
                  {[
                    ["/conditions", "Conditions d'utilisation"],
                    ["/confidentialite", "Politique de confidentialité"],
                  ].map(([to, label]) => (
                    <Link key={to} to={to} className="text-sm font-medium text-brand-600 hover:underline dark:text-brand-400">
                      {label}
                    </Link>
                  ))}
                </div>
              </section>
            </>
          )}
        </div>
      </Container>
    </>
  );
}
