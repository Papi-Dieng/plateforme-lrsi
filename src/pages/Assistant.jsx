import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import Icon from "../components/Icon";
import ChargementIA from "../components/ChargementIA";
import SaisieIA from "../components/SaisieIA";
import { ETAPES_ASSISTANT } from "../chargementIA";
import { cx } from "../components/classes";
import { lireScores } from "../progression";
import { analyserCompetences } from "../competences";
import { RACCOURCIS, repondre, questionsRapides } from "../assistant";
import { decouperReponse, demanderIA, iaActive, raisonEchec } from "../ia";
import { getMatiere } from "../data/matieres";
import { themeMatiere } from "../data/couleurs";
import {
  ecrireActive,
  ecrireConversations,
  enregistrer,
  listeConversations,
  lireActive,
  lireConversations,
  nouvelIdentifiant,
  supprimerConversation,
} from "../conversations";

/* ==================================================================
   Assistant de révision.

   Deux étages. Le guide (`src/assistant.js`) répond toujours, tout de
   suite et sans réseau : il retrouve les chapitres, exercices et QCM
   qui existent vraiment. Quand le relais IA est configuré
   (`site.urlIA`), le modèle de langage rédige en plus l'explication,
   en s'appuyant sur ce que le guide a trouvé ; les liens restent ceux
   du guide, donc aucun contenu inventé ne peut apparaître en lien.

   Si l'IA échoue (saturée, hors connexion, quota gratuit atteint),
   l'écran en donne la raison, propose de réessayer, et affiche déjà
   les liens trouvés par le guide.

   « Par où commencer » reste au guide : la réponse vient d'un calcul
   sur les scores, qui ne quittent pas le navigateur.

   Chaque réponse rédigée par l'IA est signalée comme telle : un outil
   qui laisserait croire qu'il ne se trompe jamais tromperait
   l'étudiant au moment où il a le plus besoin d'être sûr.

   Chaque discussion est gardée (src/conversations.js) : l'historique la
   rouvre, et la suite repart avec les échanges précédents, comme si on
   ne l'avait jamais quittée.
   ================================================================== */

const INTENTIONS_SANS_IA = new Set(["priorite"]);

/* L'historique envoyé au relais : les échanges aboutis seulement. Un
   échange où l'IA a échoué est écarté, sinon le modèle lirait le texte
   de secours du guide comme s'il l'avait écrit lui-même. */
function historiqueAvant(messages, id) {
  const historique = [];
  for (let i = 0; i + 1 < messages.length && messages[i + 1].id < id; i += 2) {
    const [question, reponse] = [messages[i], messages[i + 1]];
    if (reponse.etat !== "ia" && reponse.etat !== "guide") continue;
    historique.push(
      { role: "etudiant", texte: question.pourIA ?? question.texte },
      {
        role: "assistant",
        texte: reponse.texteIA ?? reponse.reponse.texte.join("\n"),
      }
    );
  }
  return historique;
}

/* ---- Texte rédigé par l'IA, affiché comme du texte simple ---- */

function TexteIA({ texte }) {
  return decouperReponse(texte).map((b, i) =>
    b.type === "liste" ? (
      <ul key={i} className={cx("list-disc space-y-1 pl-5", i > 0 && "mt-2")}>
        {b.elements.map((e, j) => (
          <li key={j}>{e}</li>
        ))}
      </ul>
    ) : (
      <p key={i} className={i > 0 ? "mt-2" : undefined}>
        {b.texte}
      </p>
    )
  );
}

const iconesLien = {
  matiere: "folder",
  chapitre: "book",
  exercice: "pencil",
  qcm: "target",
  video: "video",
};

/* ---- Une réponse de l'assistant, avec ses liens ---- */

function Liens({ liens }) {
  if (liens.length === 0) return null;

  return (
    <ul className="mt-3 space-y-2">
      {liens.map((l) => {
        const theme = themeMatiere(getMatiere(l.matiere));
        return (
          <li key={`${l.type}-${l.to}-${l.titre}`}>
            <Link
              to={l.to}
              className="flex items-start gap-3 rounded-xl border border-ink-200 bg-white p-3 transition-colors hover:border-brand-300 hover:bg-brand-50/50 dark:border-ink-700 dark:bg-ink-900 dark:hover:border-brand-500/40 dark:hover:bg-brand-500/10"
            >
              <span
                className={cx(
                  "grid size-8 shrink-0 place-items-center rounded-lg",
                  theme.pastille
                )}
              >
                <Icon name={iconesLien[l.type] ?? "file"} className="size-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-ink-900 dark:text-white">
                  {l.titre}
                </span>
                {l.detail && (
                  <span className="mt-0.5 line-clamp-2 block text-xs/5 text-ink-600 dark:text-ink-400">
                    {l.detail}
                  </span>
                )}
                {l.meta && (
                  <span
                    className={cx(
                      "mt-1 block text-[11px] font-medium",
                      l.indisponible
                        ? "text-sun-700 dark:text-sun-400"
                        : "text-ink-500 dark:text-ink-400"
                    )}
                  >
                    {l.meta}
                  </span>
                )}
              </span>
              <Icon
                name="chevron"
                className="mt-1 size-4 shrink-0 -rotate-90 text-ink-500 dark:text-ink-400"
              />
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

/* ---- Historique des discussions ---- */

const dateCourte = (iso) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const aujourdhui = new Date().toDateString() === d.toDateString();
  return aujourdhui
    ? `aujourd'hui à ${d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}`
    : d.toLocaleDateString("fr-FR", { day: "numeric", month: "long" });
};

function Historique({ liste, active, onOuvrir, onSupprimer, onFermer }) {
  useEffect(() => {
    const surTouche = (e) => e.key === "Escape" && onFermer();
    window.addEventListener("keydown", surTouche);
    return () => window.removeEventListener("keydown", surTouche);
  }, [onFermer]);

  return (
    <div className="absolute inset-0 z-30 flex">
      <button type="button" aria-label="Fermer l'historique" tabIndex={-1} onClick={onFermer} className="absolute inset-0 bg-ink-950/40" />
      <section
        aria-label="Historique des discussions"
        className="relative flex h-full w-full max-w-sm flex-col border-r border-ink-200 bg-white shadow-xl dark:border-ink-800 dark:bg-ink-900"
      >
        <div className="flex items-center justify-between gap-3 border-b border-ink-200 px-4 py-3 dark:border-ink-800">
          <h2 className="font-semibold text-ink-900 dark:text-white">Mes discussions</h2>
          <button
            type="button"
            onClick={onFermer}
            aria-label="Fermer l'historique"
            className="grid size-9 place-items-center rounded-lg text-ink-500 hover:bg-ink-100 dark:text-ink-400 dark:hover:bg-ink-800"
          >
            <Icon name="close" className="size-4.5" />
          </button>
        </div>
        {liste.length === 0 ? (
          <p className="px-4 py-6 text-sm/6 text-ink-600 dark:text-ink-300">
            Aucune discussion gardée pour l&apos;instant. Pose une question : elle apparaîtra ici,
            et tu pourras la rouvrir pour la continuer.
          </p>
        ) : (
          <ul className="min-h-0 flex-1 space-y-1 overflow-y-auto p-2">
            {liste.map((c) => (
              <li key={c.id} className="group flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => onOuvrir(c.id)}
                  aria-current={c.id === active ? "true" : undefined}
                  className={cx(
                    "min-w-0 flex-1 rounded-xl px-3 py-2.5 text-left transition-colors",
                    c.id === active ? "bg-brand-50 dark:bg-brand-500/15" : "hover:bg-ink-100 dark:hover:bg-ink-800"
                  )}
                >
                  <span className="block truncate text-sm font-medium text-ink-900 dark:text-white">{c.titre}</span>
                  <span className="block text-xs text-ink-500 dark:text-ink-400">
                    {dateCourte(c.date)} · {c.nombre} question{c.nombre > 1 ? "s" : ""}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => onSupprimer(c.id)}
                  aria-label={`Supprimer la discussion « ${c.titre} »`}
                  className="grid size-9 shrink-0 place-items-center rounded-lg text-ink-400 hover:bg-flame-50 hover:text-flame-600 dark:hover:bg-flame-500/10 dark:hover:text-flame-400"
                >
                  <Icon name="trash" className="size-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
        <p className="border-t border-ink-200 px-4 py-3 text-xs/5 text-ink-500 dark:border-ink-800 dark:text-ink-400">
          Les {liste.length > 0 ? "20 " : ""}discussions les plus récentes sont gardées, sans les images. Avec un
          compte, tu les retrouves sur tous tes appareils.
        </p>
      </section>
    </div>
  );
}

// La discussion ouverte à l'arrivée : celle de l'onglet, si elle existe.
function discussionDeDepart() {
  const id = lireActive();
  const conv = id ? lireConversations()[id] : null;
  return conv ? { id, messages: conv.messages } : { id: null, messages: [] };
}

const plusGrandId = (messages) => messages.reduce((max, m) => Math.max(max, m.id ?? 0), 0);

/* ================================================================== */

export default function Assistant() {
  // Lus une fois, à l'ouverture de la page.
  const [scores] = useState(lireScores);
  const [saisie, setSaisie] = useState("");
  const [depart] = useState(discussionDeDepart);
  const [messages, setMessages] = useState(depart.messages);
  const [conversation, setConversation] = useState(depart.id);
  const [historiqueOuvert, setHistoriqueOuvert] = useState(false);
  const [liste, setListe] = useState(() => listeConversations(lireConversations()));
  // Les messages tels qu'ouverts depuis l'historique : les rouvrir ne
  // doit pas changer la date de la discussion.
  const ouverts = useRef(depart.messages);
  const compteur = useRef(plusGrandId(depart.messages));
  // Change à chaque changement de discussion : une réponse de l'IA qui
  // arrive après coup ne doit pas atterrir dans une autre discussion.
  const generation = useRef(0);
  const dernierMessage = useRef(null);
  // La demande à l'IA en cours, pour pouvoir l'arrêter.
  const enCours = useRef(null);

  const analyse = useMemo(() => analyserCompetences(scores), [scores]);

  // Chaque changement de la discussion est gardé aussitôt.
  useEffect(() => {
    if (!conversation || messages === ouverts.current) return;
    const toutes = enregistrer(lireConversations(), { id: conversation, messages, date: new Date().toISOString() });
    ecrireConversations(toutes);
    setListe(listeConversations(toutes));
  }, [messages, conversation]);

  const enAttente = messages.some((m) => m.etat === "attente");

  // Le dernier message reste à l'écran : sur téléphone, sans cela, la
  // réponse (et son attente) arrive hors de l'écran. « nearest » : on ne
  // bouge que s'il le faut, et juste assez pour le montrer en entier.
  useEffect(() => {
    if (messages.length === 0) return;
    const reduit = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    dernierMessage.current?.scrollIntoView({ block: "nearest", behavior: reduit ? "auto" : "smooth" });
  }, [messages]);

  /* `demande` : une question toute faite (texte), ou ce que renvoie la
     zone de saisie : { texte, mode, image }. */
  const envoyer = async (demande) => {
    const { texte: saisi = "", mode = null, image = null } = typeof demande === "string" ? { texte: demande } : demande;
    const texte = saisi.trim() || (image ? "Que montre cette image ? Explique-la-moi." : "");
    if (!texte || enAttente) return;

    const reponse = repondre(texte, analyse, mode);
    const avecIA = iaActive && !INTENTIONS_SANS_IA.has(reponse.intention);
    const pourIA = mode ? RACCOURCIS[mode].consigneIA + texte : texte;

    if (!conversation) {
      const nouvelle = nouvelIdentifiant();
      setConversation(nouvelle);
      ecrireActive(nouvelle);
    }

    compteur.current += 2;
    const id = compteur.current;
    const question = { id: id - 1, role: "etudiant", texte, mode, pourIA, image };
    setMessages((liste) => [...liste, question, { id, role: "assistant", reponse, etat: avecIA ? "attente" : "guide" }]);
    setSaisie("");
    if (avecIA) interrogerIA(id, question, reponse.liens, messages);
  };

  const interrogerIA = async (id, question, liens, precedents) => {
    const historique = [...historiqueAvant(precedents, id), { role: "etudiant", texte: question.pourIA }];
    const controle = new AbortController();
    enCours.current = controle;
    const pour = generation.current;

    let maj;
    try {
      // Une image rouverte depuis l'historique n'est plus là : le texte seul.
      const image = question.image?.donnees ? question.image : undefined;
      const resultat = await demanderIA(historique, liens, undefined, { signal: controle.signal, image });
      maj = image
        ? { etat: "ia", texteIA: resultat.texte, imageIgnoree: !resultat.imageLue }
        : { etat: "ia", texteIA: resultat };
    } catch (e) {
      maj = { etat: "secours", echec: e.message };
    } finally {
      if (enCours.current === controle) enCours.current = null;
    }
    if (pour !== generation.current) return;
    setMessages((liste) => liste.map((m) => (m.id === id ? { ...m, ...maj } : m)));
  };

  const arreter = () => enCours.current?.abort();

  const nouvelleDiscussion = () => {
    generation.current += 1;
    enCours.current?.abort();
    setMessages([]);
    ouverts.current = [];
    setConversation(null);
    ecrireActive(null);
    setHistoriqueOuvert(false);
  };

  const ouvrirDiscussion = (id) => {
    const conv = lireConversations()[id];
    if (!conv) return;
    generation.current += 1;
    enCours.current?.abort();
    ouverts.current = conv.messages;
    setMessages(conv.messages);
    compteur.current = plusGrandId(conv.messages);
    setConversation(id);
    ecrireActive(id);
    setHistoriqueOuvert(false);
  };

  const supprimerDiscussion = (id) => {
    const toutes = supprimerConversation(id);
    setListe(listeConversations(toutes));
    if (id === conversation) {
      generation.current += 1;
      enCours.current?.abort();
      setMessages([]);
      ouverts.current = [];
      setConversation(null);
      ecrireActive(null);
    }
  };

  const reessayer = (id) => {
    if (enAttente) return;
    const question = messages.find((m) => m.id === id - 1);
    const cible = messages.find((m) => m.id === id);
    setMessages((liste) =>
      liste.map((m) => (m.id === id ? { ...m, etat: "attente" } : m))
    );
    interrogerIA(id, question, cible.reponse.liens, messages);
  };


  return (
    <div className="relative flex h-full flex-col">
      {historiqueOuvert && (
        <Historique
          liste={liste}
          active={conversation}
          onOuvrir={ouvrirDiscussion}
          onSupprimer={supprimerDiscussion}
          onFermer={() => setHistoriqueOuvert(false)}
        />
      )}

      {/* ---- En-tête ---- */}
      <div className="shrink-0 bg-brand-950 px-4 py-3.5 sm:px-6">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center gap-x-6 gap-y-2">
          <div className="flex items-center gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-white/10 text-white ring-1 ring-white/15">
              <Icon name="sparkles" className="size-4.5" />
            </span>
            <div>
              <h1 className="font-bold tracking-tight text-white">Assistant de révision</h1>
              <p className="flex items-center gap-2 text-xs text-white/70">
                <span aria-hidden="true" className="size-2 rounded-full bg-accent-400" />
                {iaActive ? "IA Gemini et contenu de la plateforme" : "Cherche dans le contenu de la plateforme"}
              </p>
            </div>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setListe(listeConversations(lireConversations()));
                setHistoriqueOuvert(true);
              }}
              className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2 text-sm font-medium text-white ring-1 ring-white/15 transition-colors hover:bg-white/20"
            >
              <Icon name="clock" className="size-4" />
              Historique
            </button>
            <button
              type="button"
              onClick={nouvelleDiscussion}
              disabled={messages.length === 0}
              className="inline-flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-sm font-semibold text-brand-950 transition-colors hover:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Icon name="plus" className="size-4" />
              <span className="hidden sm:inline">Nouvelle discussion</span>
              <span className="sm:hidden">Nouvelle</span>
            </button>
          </div>
        </div>
      </div>

      {/* ---- Fil de discussion : seul à défiler ---- */}
      {/* Focalisable : on peut la faire défiler au clavier (flèches, Page suivante). */}
      <div
        tabIndex={0}
        role="region"
        aria-label="Conversation avec l'assistant"
        className="min-h-0 flex-1 overflow-y-auto focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-500"
      >
        <div className="mx-auto max-w-3xl space-y-5 px-4 py-6 sm:px-6">
              {/* Message d'accueil : il dit ce qu'il est avant tout. */}
              <div className="flex gap-3">
                <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300">
                  <Icon name="sparkles" className="size-4" />
                </span>
                {iaActive ? (
                  <div className="max-w-xl rounded-2xl rounded-bl-md bg-ink-100 px-4 py-3 text-sm/6 text-ink-700 dark:bg-ink-800 dark:text-ink-200">
                    <p>
                      Salut ! Pose-moi une question sur une notion, un exercice
                      ou un chapitre. Une intelligence artificielle t'explique,
                      et je t'amène aux cours, exercices et QCM de la plateforme
                      qui traitent le sujet.
                    </p>
                    <p className="mt-2">
                      Une IA peut se tromper : en cas de doute, le cours et ton
                      enseignant font foi. N'écris rien de personnel ici.
                    </p>
                  </div>
                ) : (
                  <div className="max-w-xl rounded-2xl rounded-bl-md bg-ink-100 px-4 py-3 text-sm/6 text-ink-700 dark:bg-ink-800 dark:text-ink-200">
                    <p>
                      Je suis un guide, pas une intelligence artificielle. Je ne
                      rédige aucune explication : je cherche dans les cours, les
                      exercices et les QCM de la plateforme, et je t'amène au
                      bon endroit.
                    </p>
                    <p className="mt-2">
                      C'est une limite, et c'est aussi une garantie : je ne peux
                      pas me tromper sur une notion, puisque je n'en explique
                      aucune. Si je ne trouve rien, je te le dirai.
                    </p>
                  </div>
                )}
              </div>

              {messages.map((m, i) =>
                m.role === "etudiant" ? (
                  <div key={m.id} className="flex flex-col items-end gap-1.5">
                    {m.image?.apercu ? (
                      <img
                        src={m.image.apercu}
                        alt={`Image jointe : ${m.image.nom}`}
                        className="max-h-48 max-w-[60%] rounded-2xl border border-ink-200 object-contain dark:border-ink-700"
                      />
                    ) : m.image ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-ink-100 px-3 py-1 text-xs text-ink-600 dark:bg-ink-800 dark:text-ink-300">
                        <Icon name="trombone" className="size-3.5" />
                        Image jointe : {m.image.nom} (non gardée)
                      </span>
                    ) : null}
                    <p className="max-w-md rounded-2xl rounded-br-md bg-brand-600 px-4 py-3 text-sm/6 whitespace-pre-line text-white">
                      {m.mode && (
                        <span className="mr-1.5 inline-flex items-center gap-1 rounded-full bg-white/20 px-2 py-0.5 align-middle text-[11px] font-semibold">
                          <Icon name={RACCOURCIS[m.mode].icone} className="size-3" />
                          {RACCOURCIS[m.mode].label}
                        </span>
                      )}
                      {m.texte}
                    </p>
                  </div>
                ) : (
                  <div key={m.id} ref={i === messages.length - 1 ? dernierMessage : undefined} className="flex scroll-my-6 gap-3">
                    <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300">
                      <Icon name="sparkles" className="size-4" />
                    </span>
                    <div className="min-w-0 max-w-xl flex-1">
                      <div
                        aria-live="polite"
                        className="rounded-2xl rounded-bl-md bg-ink-100 px-4 py-3 text-sm/6 text-ink-700 dark:bg-ink-800 dark:text-ink-200"
                      >
                        {m.etat === "attente" ? (
                          <ChargementIA etapes={ETAPES_ASSISTANT} />
                        ) : m.etat === "ia" ? (
                          <TexteIA texte={m.texteIA} />
                        ) : m.etat === "secours" ? (
                          <>
                            <p>{raisonEchec(m.echec)}</p>
                            {m.reponse.intention !== "aide" && (
                              <p className="mt-2">
                                {m.reponse.liens.length > 0
                                  ? "En attendant, voici ce que la plateforme propose sur ce sujet."
                                  : "Je n'ai rien trouvé sur ce sujet dans le contenu de la plateforme."}
                              </p>
                            )}
                            <button
                              type="button"
                              onClick={() => reessayer(m.id)}
                              disabled={enAttente}
                              className="mt-3 inline-flex items-center gap-2 rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              <Icon name="sparkles" className="size-3.5" />
                              Réessayer
                            </button>
                          </>
                        ) : (
                          m.reponse.texte.map((p, i) => (
                            <p key={p} className={i > 0 ? "mt-2" : undefined}>
                              {p}
                            </p>
                          ))
                        )}
                      </div>

                      {m.etat === "ia" && m.imageIgnoree && (
                        <p className="mt-1.5 text-xs text-flame-700 dark:text-flame-300">
                          L&apos;image n&apos;a pas été lue : le relais de la plateforme n&apos;accepte pas
                          encore les images. Cette réponse ne porte que sur ton texte.
                        </p>
                      )}
                      {m.etat === "ia" && (
                        <p className="mt-1.5 text-[11px] text-ink-500 dark:text-ink-400">
                          Rédigé par une IA : elle peut se tromper, le cours
                          fait foi.
                        </p>
                      )}

                      {m.etat !== "attente" && <Liens liens={m.reponse.liens} />}

                      {m.etat !== "attente" && m.etat !== "ia" && m.reponse.suggestions && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {questionsRapides.map((q) => (
                            <button
                              key={q}
                              type="button"
                              onClick={() => envoyer(q)}
                              className="rounded-full border border-ink-200 px-3 py-1.5 text-xs text-ink-600 transition-colors hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700 dark:border-ink-700 dark:text-ink-300 dark:hover:border-brand-500/40 dark:hover:bg-brand-500/10 dark:hover:text-brand-200"
                            >
                              {q}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )
              )}
        </div>
      </div>

      {/* ---- Saisie ---- */}
      <div className="shrink-0 border-t border-ink-200 px-4 py-4 dark:border-ink-800">
        <div className="mx-auto max-w-3xl">
          <SaisieIA
            id="assistant-question"
            libelle="Poser une question à l'assistant"
            valeur={saisie}
            onChange={setSaisie}
            onEnvoyer={envoyer}
            enAttente={enAttente}
            onArreter={arreter}
            avecImage={iaActive}
            placeholder="Une notion, un exercice, un chapitre à réviser…"
          />
          <p className="mt-2 text-center text-xs text-ink-500 dark:text-ink-400">
            {iaActive
              ? "Tes questions et tes images sont envoyées à Google Gemini : rien de personnel, pas de photo de personne. L'IA peut se tromper, le cours fait foi. "
              : "Tout se passe dans ton navigateur. "}
            <Link to="/confidentialite" className="underline underline-offset-2">
              Confidentialité
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
