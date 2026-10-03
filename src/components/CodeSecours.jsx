import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Icon from "./Icon";
import { Bouton } from "./ui";
import { cx } from "./classes";
import { useSession } from "../session";
import {
  ajouterEmailSecours,
  codeAMontrer,
  confirmerEmailSecours,
  etatSecours,
  messageErreurCompte,
  nouveauCodeSecours,
  oublierCodeAMontrer,
  retirerEmailSecours,
} from "../comptes";

/* ==================================================================
   Secours des comptes téléphone, côté écran (voir serveur-ia/secours.js).

   - CarteCode : le code de secours en grand, avec un bouton pour le
     copier. Il n'est montré qu'une fois : le serveur n'en garde que
     l'empreinte.
   - AvisCodeSecours : la fenêtre qui s'ouvre dans l'application juste
     après l'inscription, ou après qu'un code a servi.
   - SecoursCompte : la partie « Récupérer mon compte » des paramètres,
     pour un nouveau code et l'email de secours.
   ================================================================== */

export function CarteCode({ code }) {
  const [copie, setCopie] = useState(false);
  const copier = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopie(true);
    } catch {
      /* copie refusée : le code reste lisible à l'écran */
    }
  };
  return (
    <div className="rounded-2xl border-2 border-dashed border-brand-300 bg-brand-50 p-5 text-center dark:border-brand-500/40 dark:bg-brand-500/10">
      <p className="text-xs font-semibold tracking-wide text-brand-700 uppercase dark:text-brand-300">
        Ton code de secours
      </p>
      <p className="mt-2 font-mono text-2xl font-bold tracking-widest text-ink-950 select-all sm:text-3xl dark:text-white">
        {code}
      </p>
      <button
        type="button"
        onClick={copier}
        className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-brand-700 hover:underline dark:text-brand-300"
      >
        <Icon name={copie ? "check" : "file"} className="size-4" />
        {copie ? "Copié" : "Copier le code"}
      </button>
    </div>
  );
}

const CONSEIL =
  "Note-le sur papier ou fais une capture d'écran, et garde-le à part. Avec ton numéro, il te permet de choisir un nouveau mot de passe si tu oublies le tien. Il ne sera plus affiché, et ne sert qu'une fois : un nouveau t'est donné juste après.";

export function AvisCodeSecours() {
  const [code, setCode] = useState(codeAMontrer);
  const [note, setNote] = useState(false);
  if (!code) return null;

  const fermer = () => {
    oublierCodeAMontrer();
    setCode(null);
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink-950/60 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="titre-code-secours"
        className="w-full max-w-md rounded-3xl bg-white p-6 shadow-xl dark:bg-ink-900"
      >
        <span className="grid size-11 place-items-center rounded-xl bg-brand-600 text-white">
          <Icon name="lock" className="size-5" />
        </span>
        <h2 id="titre-code-secours" className="mt-4 text-xl font-bold text-ink-950 dark:text-white">
          Garde ton code de secours
        </h2>
        <p className="mt-2 text-sm/6 text-ink-600 dark:text-ink-300">{CONSEIL}</p>
        <div className="mt-5">
          <CarteCode code={code} />
        </div>
        <label className="mt-5 flex items-start gap-3 text-sm/6 text-ink-700 dark:text-ink-200">
          <input
            type="checkbox"
            checked={note}
            onChange={(e) => setNote(e.target.checked)}
            className="mt-1 size-4 shrink-0 accent-brand-600"
          />
          J'ai noté mon code de secours.
        </label>
        <Bouton className="mt-5 w-full" disabled={!note} onClick={fermer}>
          Continuer
        </Bouton>
        <p className="mt-4 text-center text-xs text-ink-500 dark:text-ink-400">
          Tu peux aussi ajouter un email de secours dans{" "}
          <Link to="/parametres" onClick={() => note && fermer()} className="font-medium text-brand-600 hover:underline dark:text-brand-400">
            tes paramètres
          </Link>
          .
        </p>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- */
/* Paramètres : « Récupérer mon compte »                             */
/* ---------------------------------------------------------------- */

const champ =
  "w-full rounded-xl border border-ink-200 bg-white px-4 py-2.5 text-sm text-ink-900 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-ink-700 dark:bg-ink-950 dark:text-white";

function Erreur({ code }) {
  if (!code) return null;
  return (
    <p role="alert" className="mt-2 text-sm text-flame-700 dark:text-flame-400">
      {messageErreurCompte(code)}
    </p>
  );
}

export function SecoursCompte() {
  const { session } = useSession();
  const [etat, setEtat] = useState(null);
  const [erreurEtat, setErreurEtat] = useState(null);
  const [code, setCode] = useState(null);
  const [confirmerNouveau, setConfirmerNouveau] = useState(false);
  const [attente, setAttente] = useState(null);
  const [erreur, setErreur] = useState(null);
  const [email, setEmail] = useState("");
  const [codeEmail, setCodeEmail] = useState("");

  const telephone = session?.fournisseur === "telephone";

  useEffect(() => {
    if (!telephone) return undefined;
    let actif = true;
    etatSecours().then((r) => {
      if (!actif) return;
      if (r.erreur) setErreurEtat(r.erreur);
      else setEtat(r);
    });
    return () => {
      actif = false;
    };
  }, [telephone]);

  if (!telephone) return null;

  const agir = async (nom, action, apres) => {
    setAttente(nom);
    setErreur(null);
    const r = await action();
    setAttente(null);
    if (r.erreur) setErreur(r.erreur);
    else apres(r);
  };

  const obtenirCode = () =>
    agir("code", nouveauCodeSecours, (r) => {
      setCode(r.codeSecours);
      setConfirmerNouveau(false);
      setEtat((e) => ({ ...e, code: true }));
    });

  const envoyerEmail = (e) => {
    e.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setErreur("email_address_invalid");
      return;
    }
    agir("email", () => ajouterEmailSecours(email), () => setEtat((s) => ({ ...s, emailAttente: email.trim().toLowerCase() })));
  };

  const confirmer = (e) => {
    e.preventDefault();
    agir("confirmer", () => confirmerEmailSecours(codeEmail), (r) => {
      setEtat((s) => ({ ...s, email: r.email, emailAttente: null }));
      setEmail("");
      setCodeEmail("");
    });
  };

  const retirer = () => agir("retirer", retirerEmailSecours, () => setEtat((s) => ({ ...s, email: null, emailAttente: null })));

  return (
    <section id="secours" className="card p-6">
      <h2 className="flex items-center gap-2 text-lg font-semibold text-ink-900 dark:text-white">
        <Icon name="shield" className="size-5" />
        Récupérer mon compte
      </h2>
      <p className="mt-1.5 max-w-2xl text-sm/6 text-ink-600 dark:text-ink-400">
        Ton compte est lié à ton numéro, sans boîte mail. Si tu oublies ton mot de passe,
        ces deux moyens te permettent d'en choisir un nouveau tout seul, depuis
        « Mot de passe oublié ».
      </p>

      {erreurEtat && <Erreur code={erreurEtat} />}
      {!etat && !erreurEtat && <p className="mt-4 text-sm text-ink-500 dark:text-ink-400">Chargement…</p>}

      {etat && (
        <div className="mt-5 space-y-5">
          {/* ---- Code de secours ---- */}
          <div className="rounded-2xl border border-ink-200 p-5 dark:border-ink-800">
            <h3 className="text-sm font-semibold text-ink-900 dark:text-white">Code de secours</h3>
            <p className="mt-1 text-sm text-ink-600 dark:text-ink-400">
              {etat.code
                ? "Tu as un code de secours. S'il est perdu, demandes-en un nouveau : l'ancien ne marchera plus."
                : "Tu n'as pas encore de code de secours. Demande-le maintenant, et garde-le à part."}
            </p>
            {code ? (
              <div className="mt-4 space-y-3">
                <CarteCode code={code} />
                <p className="text-xs/5 text-ink-500 dark:text-ink-400">{CONSEIL}</p>
              </div>
            ) : etat.code && !confirmerNouveau ? (
              <Bouton variante="secondaire" taille="sm" className="mt-4" onClick={() => setConfirmerNouveau(true)}>
                Obtenir un nouveau code
              </Bouton>
            ) : (
              <div className="mt-4 flex flex-wrap items-center gap-3">
                {etat.code && <p className="text-sm font-medium text-ink-900 dark:text-white">L'ancien code ne marchera plus. Continuer ?</p>}
                <Bouton taille="sm" disabled={attente === "code"} onClick={obtenirCode}>
                  {attente === "code" ? "Création…" : etat.code ? "Oui, nouveau code" : "Obtenir mon code de secours"}
                </Bouton>
                {etat.code && (
                  <Bouton variante="fantome" taille="sm" onClick={() => setConfirmerNouveau(false)}>
                    Annuler
                  </Bouton>
                )}
              </div>
            )}
          </div>

          {/* ---- Email de secours ---- */}
          <div className="rounded-2xl border border-ink-200 p-5 dark:border-ink-800">
            <h3 className="text-sm font-semibold text-ink-900 dark:text-white">Email de secours (facultatif)</h3>
            {!etat.emailDisponible ? (
              <p className="mt-1 text-sm text-ink-600 dark:text-ink-400">
                Pas encore disponible sur le site. Ton code de secours suffit pour retrouver ton compte.
              </p>
            ) : etat.email ? (
              <>
                <p className="mt-1 text-sm text-ink-600 dark:text-ink-400">
                  Un code pour changer ton mot de passe peut être envoyé à{" "}
                  <strong className="font-semibold break-all text-ink-900 dark:text-white">{etat.email}</strong>.
                </p>
                <Bouton variante="secondaire" taille="sm" className="mt-4" disabled={attente === "retirer"} onClick={retirer}>
                  {attente === "retirer" ? "Retrait…" : "Retirer cet email"}
                </Bouton>
              </>
            ) : etat.emailAttente ? (
              <form onSubmit={confirmer} noValidate className="mt-2">
                <p className="text-sm text-ink-600 dark:text-ink-400">
                  Un code vient de partir vers{" "}
                  <strong className="font-semibold break-all text-ink-900 dark:text-white">{etat.emailAttente}</strong>.
                  Tape-le ici (regarde aussi dans les courriers indésirables).
                </p>
                <label htmlFor="code-email-secours" className="mt-3 block text-sm font-medium text-ink-800 dark:text-ink-200">
                  Code reçu par email
                </label>
                <div className="mt-1.5 flex flex-wrap gap-3">
                  <input
                    id="code-email-secours"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={8}
                    placeholder="123456"
                    value={codeEmail}
                    onChange={(e) => setCodeEmail(e.target.value)}
                    className={cx(champ, "max-w-40")}
                  />
                  <Bouton type="submit" taille="sm" disabled={attente === "confirmer"}>
                    {attente === "confirmer" ? "Vérification…" : "Confirmer"}
                  </Bouton>
                  <Bouton variante="fantome" taille="sm" onClick={() => setEtat((s) => ({ ...s, emailAttente: null }))}>
                    Changer d'adresse
                  </Bouton>
                </div>
              </form>
            ) : (
              <form onSubmit={envoyerEmail} noValidate className="mt-2">
                <p className="text-sm text-ink-600 dark:text-ink-400">
                  Si tu ajoutes un email, un code pour changer ton mot de passe pourra t'y être envoyé.
                  Il ne sert qu'à ça : aucune lettre d'information, aucune publicité.
                </p>
                <label htmlFor="email-secours" className="mt-3 block text-sm font-medium text-ink-800 dark:text-ink-200">
                  Adresse email
                </label>
                <div className="mt-1.5 flex flex-wrap gap-3">
                  <input
                    id="email-secours"
                    type="email"
                    autoComplete="email"
                    placeholder="Ex. awa@exemple.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={cx(champ, "max-w-xs")}
                  />
                  <Bouton type="submit" taille="sm" disabled={attente === "email"}>
                    {attente === "email" ? "Envoi…" : "Recevoir un code"}
                  </Bouton>
                </div>
              </form>
            )}
          </div>
          <Erreur code={erreur} />
        </div>
      )}
    </section>
  );
}
