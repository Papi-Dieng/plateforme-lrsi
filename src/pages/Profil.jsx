import { useState } from "react";
import { Link } from "react-router-dom";
import Icon from "../components/Icon";
import { Bouton } from "../components/ui";
import { cx } from "../components/classes";
import { useSession } from "../session";
import { avatars, getAvatar } from "../data/avatars";
import {
  effacerProfil,
  enregistrerProfil,
  lireProfil,
  niveaux,
  nomAffiche,
  verifierProfil,
} from "../profil";
import { initiales } from "../session";
import { lireChapitresLus, lireExercicesTravailles, lireScores } from "../progression";
import { lireTampons } from "../tampons";
import CarteEtudiant from "../components/CarteEtudiant";
import { Container } from "../components/ui";
import { mono } from "../components/styleAdmin";
import { site } from "../data/site";

/* ==================================================================
   Mon profil, d'après la maquette « 01 · Mon profil » (14 octobre
   2026) : un en-tête bleu qui dit qui tu es, ta carte d'étudiant, tes
   tampons, puis la fiche à remplir.

   Le détail des acquis reste sur « Ma progression » : ici, seulement
   trois chiffres et ce qu'ils ont donné.
   ================================================================== */

const LONGUEUR_PSEUDO = 20;

/* ------------------------------------------------------------------ */
/* Champ de formulaire                                                 */
/* ------------------------------------------------------------------ */

function Champ({ id, label, erreur, aide, facultatif, ...rest }) {
  return (
    <div>
      <label
        htmlFor={id}
        className="block text-sm font-medium text-ink-800 dark:text-ink-200"
      >
        {label}
        {facultatif && (
          <span className="ml-1 font-normal text-ink-500 dark:text-ink-400">(facultatif)</span>
        )}
      </label>
      <input
        id={id}
        aria-invalid={erreur ? true : undefined}
        aria-describedby={erreur ? `${id}-erreur` : aide ? `${id}-aide` : undefined}
        className={cx(
          "mt-1.5 w-full rounded-xl border bg-white px-4 py-2.5 text-sm text-ink-900 placeholder:text-ink-400 focus:ring-2 focus:ring-brand-500/20 dark:bg-ink-950 dark:text-white",
          erreur
            ? "border-red-400 focus:border-red-500"
            : "border-ink-200 focus:border-brand-500 dark:border-ink-700"
        )}
        {...rest}
      />
      {erreur ? (
        <p
          id={`${id}-erreur`}
          role="alert"
          className="mt-1.5 text-xs text-red-600 dark:text-red-400"
        >
          {erreur}
        </p>
      ) : aide ? (
        <p id={`${id}-aide`} className="mt-1.5 text-xs text-ink-500 dark:text-ink-400">
          {aide}
        </p>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Sélecteur d'avatar                                                  */
/* ------------------------------------------------------------------ */

function ChoixAvatar({ avatarId, onChoisir }) {
  const choisi = getAvatar(avatarId);

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Grand aperçu, avec un anneau à la couleur de l'avatar */}
      <div className="relative size-40">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 rounded-full transition-[box-shadow] duration-500"
          style={{
            boxShadow: `0 0 0 2px rgba(${choisi.rgb}, 0.55), 0 6px 24px rgba(${choisi.rgb}, 0.18)`,
          }}
        />
        <div className="relative size-full overflow-hidden rounded-full">
          <div className="absolute inset-0 grid place-items-center">
            {/* La vignette fait 40 px : ×4 pour remplir le cercle. */}
            <div className="scale-400">{choisi.svg}</div>
          </div>
        </div>
      </div>

      <span className="text-[11px] tracking-[0.12em] text-ink-500 uppercase dark:text-ink-400">
        {choisi.alt}
      </span>

      {/* Bande de vignettes */}
      <div
        className="flex flex-wrap justify-center gap-3"
        role="radiogroup"
        aria-label="Choisir un avatar"
      >
        {avatars.map((a) => {
          const actif = a.id === avatarId;
          return (
            <button
              key={a.id}
              type="button"
              role="radio"
              aria-checked={actif}
              aria-label={`Avatar ${a.alt}`}
              onClick={() => onChoisir(a.id)}
              className={cx(
                "relative size-14 overflow-hidden rounded-xl border transition-all duration-200",
                actif
                  ? "border-ink-900/20 opacity-100 ring-2 ring-ink-900/70 ring-offset-2 ring-offset-white dark:ring-white/70 dark:ring-offset-ink-900"
                  : "border-ink-200 opacity-50 hover:opacity-100 dark:border-ink-700"
              )}
            >
              <span className="absolute inset-0 grid place-items-center">
                <span className="scale-[2.3]">{a.svg}</span>
              </span>
              {actif && (
                <span className="absolute -right-0.5 -bottom-0.5 grid size-5 place-items-center rounded-full bg-ink-900 dark:bg-white">
                  <Icon
                    name="check"
                    className="size-3 text-white dark:text-ink-900"
                  />
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ================================================================== */

export default function Profil() {
  const { session } = useSession();
  const [profil, setProfil] = useState(lireProfil);
  const [erreurs, setErreurs] = useState({});
  const [enregistre, setEnregistre] = useState(false);
  const [confirmation, setConfirmation] = useState(false);


  const modifier = (champ) => (e) => {
    setProfil((p) => ({ ...p, [champ]: e.target.value }));
    setEnregistre(false);
  };

  const choisirAvatar = (avatarId) => {
    setProfil((p) => ({ ...p, avatarId }));
    setEnregistre(false);
  };

  const soumettre = (e) => {
    e.preventDefault();
    const suite = verifierProfil(profil);
    setErreurs(suite);
    if (Object.keys(suite).length > 0) return;
    setProfil(enregistrerProfil(profil));
    setEnregistre(true);
  };

  // Ce que l'en-tête et la carte montrent : trois chiffres, et les
  // tampons gagnés (src/tampons.js). Lus à l'affichage de la page.
  const [bilan] = useState(() => {
    const scores = lireScores();
    const exercices = lireExercicesTravailles();
    const chapitres = lireChapitresLus();
    return {
      chapitres: Object.keys(chapitres).length,
      qcm: Object.keys(scores).length,
      exercices: Object.keys(exercices).length,
      tampons: lireTampons({ scores, exercices, chapitres }),
    };
  });

  const toutEffacer = () => {
    setProfil(effacerProfil());
    setErreurs({});
    setEnregistre(false);
    setConfirmation(false);
  };

  const nom = nomAffiche(profil, session);
  const gagnes = bilan.tampons.filter((t) => t.gagne).length;

  return (
    <div className="pb-8">
      {/* ------------------------------------------------------ */}
      {/* En-tête : qui tu es, et ta carte d'étudiant             */}
      {/* ------------------------------------------------------ */}
      <header className="bg-brand-600 text-white">
        <Container className="py-10 sm:py-12">
          <div className="grid items-start gap-8 lg:grid-cols-[1.4fr_1fr]">
            <div className="min-w-0">
              <p className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-xs font-bold">
                <span className="size-2 rounded-full bg-lime-400" />
                {session?.mode === "compte" ? "Compte synchronisé sur tous tes appareils" : "Mode invité : rien n'est gardé"}
              </p>
              <p className={cx("mt-5 text-[11px] font-bold tracking-[0.18em] text-white/85", mono)}>MON PROFIL</p>
              <h1 className="mt-1 text-[clamp(2.4rem,7vw,4.5rem)] leading-[0.95] font-extrabold tracking-[-0.05em] break-words">
                {nom}
              </h1>
              <p className="mt-3 text-[15px] text-white/85">
                {[profil.pseudo && `@${profil.pseudo}`, profil.niveau, site.filiere].filter(Boolean).join(" · ")}
              </p>
              <dl className="mt-6 flex flex-wrap gap-2.5">
                {[
                  ["book", "Ton parcours", `${bilan.chapitres} chapitre${bilan.chapitres > 1 ? "s" : ""} lu${bilan.chapitres > 1 ? "s" : ""}`],
                  ["graduation", "Tes QCM", `${bilan.qcm} passé${bilan.qcm > 1 ? "s" : ""}`],
                  ["pencil", "Tes exercices", `${bilan.exercices} travaillé${bilan.exercices > 1 ? "s" : ""}`],
                ].map(([icone, titre, valeur]) => (
                  <div key={titre} className="inline-flex items-center gap-2 rounded-full border border-white/25 px-4 py-2 text-sm">
                    <Icon name={icone} className="size-4 text-lime-300" />
                    <dt className="font-bold">{titre}</dt>
                    <dd className="text-white/85">· {valeur}</dd>
                  </div>
                ))}
              </dl>
              <div className="mt-7 flex flex-wrap gap-3">
                <a
                  href="#ma-fiche"
                  className="inline-flex min-h-12 items-center gap-2 rounded-[14px] bg-lime-400 px-5 text-[15px] font-extrabold text-ink-950 transition-colors hover:bg-lime-300"
                >
                  <Icon name="pencil" className="size-4" />
                  Modifier ma fiche
                </a>
                <Link
                  to="/parametres"
                  className="inline-flex min-h-12 items-center gap-2 rounded-[14px] border border-white/30 px-5 text-[15px] font-extrabold text-white transition-colors hover:bg-white/10"
                >
                  <Icon name="settings" className="size-4" />
                  Paramètres
                </Link>
              </div>
            </div>

            <CarteEtudiant
              profil={profil}
              nom={nom}
              initiales={initiales(nom)}
              niveau={profil.niveau}
              filiere="LRSI"
              chiffres={[
                [bilan.chapitres, "chapitres lus"],
                [bilan.qcm, "QCM passés"],
                [bilan.exercices, "exercices faits"],
              ]}
            />
          </div>
        </Container>
      </header>

      {/* ------------------------------------------------------ */}
      {/* Tes tampons                                             */}
      {/* ------------------------------------------------------ */}
      <Container className="py-8">
        <section className="card p-6 sm:p-8">
          <h2 className="text-lg font-semibold text-ink-900 dark:text-white">Tes tampons</h2>
          <p className="mt-1 text-sm text-ink-600 dark:text-ink-400">
            Ils se gagnent en révisant. {gagnes} sur {bilan.tampons.length} pour l&apos;instant.
          </p>
          <ul className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {bilan.tampons.map((t) => (
              <li
                key={t.cle}
                className={cx(
                  "rounded-2xl border p-4",
                  t.gagne ? "border-lime-400/60 bg-lime-50 dark:border-lime-400/30 dark:bg-lime-400/10" : "border-ink-200 dark:border-ink-800"
                )}
              >
                <div className="flex items-center gap-2">
                  <span
                    className={cx(
                      "grid size-8 shrink-0 place-items-center rounded-full",
                      t.gagne ? "bg-lime-400 text-ink-950" : "bg-ink-100 text-ink-400 dark:bg-ink-800"
                    )}
                  >
                    <Icon name={t.gagne ? "check" : "lock"} className="size-4" />
                  </span>
                  <span className="font-bold text-ink-950 dark:text-white">{t.titre}</span>
                </div>
                <p className="mt-2 text-sm text-ink-600 dark:text-ink-300">{t.texte}</p>
                {!t.gagne && t.avancee[1] > 1 && (
                  <p className={cx("mt-2 text-xs text-ink-500 dark:text-ink-400", mono)}>
                    {t.avancee[0]} / {t.avancee[1]}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </section>
      </Container>

      <Container>
      <form id="ma-fiche" onSubmit={soumettre} noValidate className="max-w-3xl scroll-mt-24 space-y-5">
        {/* ------------------------------------------------------ */}
        {/* Avatar et nom d'utilisateur                             */}
        {/* ------------------------------------------------------ */}
        <section className="card p-6 sm:p-8">
          <div className="text-center">
            <h2 className="text-xl font-semibold tracking-tight text-ink-900 dark:text-white">
              Choisis ton avatar
            </h2>
            <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">
              Six motifs dessinés, aucune photo à téléverser.
            </p>
          </div>

          <div className="mt-8">
            <ChoixAvatar avatarId={profil.avatarId} onChoisir={choisirAvatar} />
          </div>

          <div className="mx-auto mt-8 max-w-sm">
            <div className="flex items-center justify-between">
              <label
                htmlFor="pseudo"
                className="text-sm font-medium text-ink-800 dark:text-ink-200"
              >
                Nom d'utilisateur
              </label>
              <span
                className={cx(
                  "text-xs tabular-nums",
                  profil.pseudo.length >= LONGUEUR_PSEUDO - 2
                    ? "text-sun-600 dark:text-sun-400"
                    : "text-ink-500 dark:text-ink-400"
                )}
              >
                {profil.pseudo.length}/{LONGUEUR_PSEUDO}
              </span>
            </div>

            <div className="relative mt-1.5">
              <Icon
                name="users"
                className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-500 dark:text-ink-400"
              />
              <input
                id="pseudo"
                type="text"
                maxLength={LONGUEUR_PSEUDO}
                autoComplete="username"
                spellCheck={false}
                value={profil.pseudo}
                onChange={modifier("pseudo")}
                placeholder="ton_pseudo…"
                aria-invalid={erreurs.pseudo ? true : undefined}
                aria-describedby={erreurs.pseudo ? "pseudo-erreur" : undefined}
                className={cx(
                  "w-full rounded-xl border bg-white py-2.5 pr-4 pl-9 text-sm text-ink-900 placeholder:text-ink-400 focus:ring-2 focus:ring-brand-500/20 dark:bg-ink-950 dark:text-white",
                  erreurs.pseudo
                    ? "border-red-400 focus:border-red-500"
                    : "border-ink-200 focus:border-brand-500 dark:border-ink-700"
                )}
              />
            </div>
            {erreurs.pseudo && (
              <p
                id="pseudo-erreur"
                role="alert"
                className="mt-1.5 text-xs text-red-600 dark:text-red-400"
              >
                {erreurs.pseudo}
              </p>
            )}
            <p className="mt-1.5 text-xs text-ink-500 dark:text-ink-400">
              C'est ce nom qui apparaît en haut de l'écran.
            </p>
          </div>
        </section>

        {/* ------------------------------------------------------ */}
        {/* Coordonnées                                             */}
        {/* ------------------------------------------------------ */}
        <section className="card p-6 sm:p-8">
          <h2 className="text-lg font-semibold text-ink-900 dark:text-white">
            Mes informations
          </h2>
          <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">
            Tous ces champs sont facultatifs. Ils servent uniquement à
            personnaliser ton espace.
          </p>

          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Champ
                id="nom-complet"
                label="Nom complet"
                type="text"
                autoComplete="name"
                placeholder="Ex. Aïssatou Diallo"
                value={profil.nomComplet}
                onChange={modifier("nomComplet")}
                facultatif
              />
            </div>

            <Champ
              id="age"
              label="Âge"
              type="number"
              inputMode="numeric"
              min="14"
              max="99"
              placeholder="Ex. 21"
              value={profil.age}
              onChange={modifier("age")}
              erreur={erreurs.age}
              facultatif
            />

            <div>
              <label
                htmlFor="niveau"
                className="block text-sm font-medium text-ink-800 dark:text-ink-200"
              >
                Niveau
              </label>
              <select
                id="niveau"
                value={profil.niveau}
                onChange={modifier("niveau")}
                className="mt-1.5 w-full rounded-xl border border-ink-200 bg-white px-4 py-2.5 text-sm text-ink-900 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-ink-700 dark:bg-ink-950 dark:text-white"
              >
                {niveaux.map((n) => (
                  <option key={n}>{n}</option>
                ))}
              </select>
            </div>

            <Champ
              id="telephone"
              label="Numéro de téléphone"
              type="tel"
              autoComplete="tel"
              placeholder="Ex. 77 123 45 67"
              value={profil.telephone}
              onChange={modifier("telephone")}
              erreur={erreurs.telephone}
              facultatif
            />

            <Champ
              id="email"
              label="Adresse e-mail"
              type="email"
              autoComplete="email"
              placeholder="Ex. prenom.nom@exemple.sn"
              value={profil.email}
              onChange={modifier("email")}
              erreur={erreurs.email}
              facultatif
            />

            <div className="sm:col-span-2">
              <Champ
                id="matricule"
                label="Matricule étudiant"
                type="text"
                placeholder="Ex. 21RSI0456"
                value={profil.matricule}
                onChange={modifier("matricule")}
                facultatif
              />
            </div>
          </div>

          <div className="mt-7 flex flex-wrap items-center gap-3 border-t border-ink-200 pt-6 dark:border-ink-800">
            <Bouton type="submit">Enregistrer mes modifications</Bouton>
            {enregistre && (
              <span
                role="status"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-accent-700 dark:text-accent-300"
              >
                <Icon name="check" className="size-4" />
                Profil enregistré.
              </span>
            )}
          </div>
        </section>

        {/* ------------------------------------------------------ */}
        {/* Données personnelles                                    */}
        {/* ------------------------------------------------------ */}
        <section className="card p-6 sm:p-8">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-ink-900 dark:text-white">
            <Icon name="lock" className="size-5" />
            Où vont ces informations
          </h2>
          <p className="mt-2 text-sm/6 text-ink-600 dark:text-ink-400">
            {session?.mode === "compte"
              ? "Elles sont enregistrées dans ton compte : tu les retrouves sur tous tes appareils. Toi seul y as accès ; l'équipe ne les partage avec personne."
              : "Sans compte, elles ne sont pas gardées : elles vivent le temps de ta visite et disparaissent quand tu recharges la page. Crée un compte, avec une adresse email et un mot de passe, pour qu'elles soient enregistrées sur le serveur et te suivent partout."}
          </p>

          <div className="mt-5">
            {confirmation ? (
              <div className="flex flex-wrap items-center gap-3">
                <p className="text-sm font-medium text-ink-900 dark:text-white">
                  Effacer toute ta fiche profil ?
                </p>
                <Bouton
                  taille="sm"
                  className="bg-red-600 hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-500"
                  onClick={toutEffacer}
                >
                  Oui, effacer
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
              >
                Effacer ma fiche profil
              </Bouton>
            )}
          </div>
        </section>
      </form>

      {/* Renvoi vers le suivi, qui a sa propre page */}
      <div className="mt-5 max-w-3xl">
        <Link
          to="/progression"
          className="card flex items-center gap-4 p-5 transition-shadow hover:shadow-md"
        >
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300">
            <Icon name="layers" className="size-5" />
          </span>
          <span className="flex-1">
            <span className="block font-semibold text-ink-900 dark:text-white">
              Ma progression
            </span>
            <span className="block text-sm text-ink-500 dark:text-ink-400">
              Exercices travaillés, scores des QCM et matières à reprendre.
            </span>
          </span>
          <Icon name="arrow" className="size-4 shrink-0 text-ink-500 dark:text-ink-400" />
        </Link>
      </div>
      </Container>
    </div>
  );
}
