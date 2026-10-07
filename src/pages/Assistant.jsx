import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import Icon from "../components/Icon";
import ChargementIA from "../components/ChargementIA";
import SaisieIA from "../components/SaisieIA";
import { ETAPES_ASSISTANT } from "../chargementIA";
import { cx } from "../components/classes";
import { lireScores } from "../progression";
import { analyserMatieres } from "../analyseMatieres";
import { RACCOURCIS, repondre, questionsRapides } from "../assistant";
import { decouperReponse, demanderIA, iaActive, raisonEchec } from "../ia";
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

/* Mise en page d'après la maquette « Assistant de révision » (7 octobre
   2026) : salle sombre prune, un orbe pêche-rose pour l'assistant, les
   réponses sans bulle, et à droite, sur grand écran, « Les coulisses »
   — ce que l'assistant fait pour répondre et ce qu'il envoie à Gemini. */

const ORBE = "rounded-full bg-[radial-gradient(circle_at_30%_30%,#ffc1a0,#ff8fb8_55%,#b9a4ff)]";
const DEGRADE = "bg-gradient-to-r from-[#ffc1a0] to-[#ff9fbf]";
const mono = "font-mono text-[11px] font-bold tracking-[0.14em] uppercase";
const tonsLien = {
  matiere: "bg-[#b9a4ff]/15 text-[#d1c4ff]",
  chapitre: "bg-[#b9a4ff]/15 text-[#d1c4ff]",
  exercice: "bg-[#ffb38c]/15 text-[#ffc1a0]",
  qcm: "bg-[#ff8fb8]/15 text-[#ffb0cc]",
  video: "bg-[#ffd27a]/15 text-[#ffd27a]",
};

/* ---- Une réponse de l'assistant, avec ses liens ---- */

function Liens({ liens }) {
  if (liens.length === 0) return null;

  return (
    <>
      <p className={cx(mono, "mt-5 text-[10px] text-[#a99bb3]")}>Sur la plateforme</p>
      <ul className="mt-2 space-y-2.5">
        {liens.map((l) => (
          <li key={`${l.type}-${l.to}-${l.titre}`}>
            <Link
              to={l.to}
              className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-3.5 transition-colors hover:border-[#ff9fbf]/40 hover:bg-white/[0.07]"
            >
              <span className={cx("grid size-9 shrink-0 place-items-center rounded-xl", tonsLien[l.type] ?? tonsLien.chapitre)}>
                <Icon name={iconesLien[l.type] ?? "file"} className="size-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-bold text-white">{l.titre}</span>
                {l.detail && <span className="mt-0.5 line-clamp-2 block text-xs/5 text-[#cfc3d6]">{l.detail}</span>}
                {l.meta && (
                  <span className={cx("mt-1 block font-mono text-[11px]", l.indisponible ? "text-[#ffd27a]" : "text-[#a99bb3]")}>
                    {l.meta}
                  </span>
                )}
              </span>
              <Icon name="chevron" className="size-4 shrink-0 -rotate-90 text-[#a99bb3]" />
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}

/* ---- Les coulisses : ce que fait l'assistant pour répondre ---- */

const COULISSES = [
  { icone: "layers", titre: "Recherche dans la plateforme", texte: "Je lis ta question et je cherche les chapitres, exercices et QCM qui en parlent." },
  { icone: "database", titre: "Préparation de la demande", texte: "J'ajoute les consignes de la matière et des extraits du cours, puis j'envoie le tout à Gemini par le relais." },
  { icone: "sparkles", titre: "Rédaction de la réponse", texte: "Gemini rédige l'explication ; je la mets en forme et je t'amène aux contenus trouvés." },
];

function Coulisses({ trouves }) {
  return (
    <aside aria-label="Les coulisses" tabIndex={0} className="hidden w-[380px] shrink-0 overflow-y-auto rounded-[28px] border border-white/10 bg-[#1d1222]/80 p-6 xl:block">
      <p className={cx(mono, "flex items-center gap-2 text-[#cfc3d6]")}>
        <Icon name="layers" className="size-3.5" />
        Les coulisses
      </p>
      <h2 className="mt-3 text-lg font-extrabold text-white">Comment je réponds</h2>
      <p className="mt-1 text-sm/6 text-[#a99bb3]">
        {iaActive
          ? "Trois étapes à chaque question : le site cherche, le relais transmet, Gemini rédige."
          : "Ici, aucune IA : je cherche seulement dans le contenu de la plateforme."}
      </p>
      <ol className="mt-5 space-y-3">
        {(iaActive ? COULISSES : COULISSES.slice(0, 1)).map((e) => (
          <li key={e.titre} className="flex gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[#b9a4ff]/15 text-[#d1c4ff]">
              <Icon name={e.icone} className="size-4" />
            </span>
            <span>
              <span className="block text-sm font-extrabold text-white">{e.titre}</span>
              <span className="mt-1 block text-sm/6 text-[#cfc3d6]">{e.texte}</span>
            </span>
          </li>
        ))}
      </ol>
      {iaActive && (
        <div className="mt-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <p className={cx(mono, "flex items-center gap-2 text-[10px] text-[#ffc1a0]")}>
            <Icon name="target" className="size-3.5" />
            Sans IA
          </p>
          <p className="mt-2 text-sm/6 font-semibold text-white">
            Pour savoir sur quoi travailler en priorité, je lis seulement tes résultats de QCM : rien ne part chez Gemini.
          </p>
        </div>
      )}
      {trouves > 0 && (
        <p className={cx(mono, "mt-6 flex items-center justify-between border-t border-white/10 pt-4 text-[10px] text-[#cfc3d6]")}>
          Trouvé sur la plateforme, dernière réponse
          <span className="grid size-6 place-items-center rounded-full bg-white/10 text-white">{trouves}</span>
        </p>
      )}
      <p className="mt-6 flex gap-2 border-t border-white/10 pt-4 text-xs/5 text-[#a99bb3]">
        <Icon name="info" className="mt-0.5 size-3.5 shrink-0" />
        Une IA peut se tromper : en cas de doute, le cours et ton enseignant font foi.
      </p>
    </aside>
  );
}

/* ---- Historique des discussions ---- */

const dateCourte = (iso) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const aujourdhui = new Date().toDateString() === d.toDateString();
  return aujourdhui
    ? d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })
    : d.toLocaleDateString("fr-FR", { day: "numeric", month: "long" });
};

const estAujourdhui = (iso) => new Date(iso).toDateString() === new Date().toDateString();

function Historique({ liste, active, onOuvrir, onSupprimer, onFermer }) {
  useEffect(() => {
    const surTouche = (e) => e.key === "Escape" && onFermer();
    window.addEventListener("keydown", surTouche);
    return () => window.removeEventListener("keydown", surTouche);
  }, [onFermer]);

  const groupes = [
    ["Aujourd'hui", liste.filter((c) => estAujourdhui(c.date))],
    ["Plus tôt", liste.filter((c) => !estAujourdhui(c.date))],
  ].filter(([, l]) => l.length > 0);

  return (
    <div className="absolute inset-0 z-30 flex p-2 sm:p-4">
      <button type="button" aria-label="Fermer l'historique" tabIndex={-1} onClick={onFermer} className="absolute inset-0 bg-[#0f0b14]/60 backdrop-blur-sm" />
      <section
        aria-label="Historique des discussions"
        className="relative flex h-full w-full max-w-sm flex-col rounded-[28px] border border-white/10 bg-[#1d1222] shadow-2xl"
      >
        <div className="flex items-center justify-between gap-3 px-6 pt-6 pb-2">
          <h2 className="text-xl font-extrabold tracking-tight text-white">Mes discussions</h2>
          <button
            type="button"
            onClick={onFermer}
            aria-label="Fermer l'historique"
            className="grid size-10 place-items-center rounded-xl border border-white/15 text-white hover:bg-white/10"
          >
            <Icon name="close" className="size-4" />
          </button>
        </div>
        {liste.length === 0 ? (
          <p className="px-6 py-6 text-sm/6 text-[#cfc3d6]">
            Aucune discussion gardée pour l&apos;instant. Pose une question : elle apparaîtra ici,
            et tu pourras la rouvrir pour la continuer.
          </p>
        ) : (
          <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-3">
            {groupes.map(([titre, l]) => (
              <div key={titre}>
                <p className={cx(mono, "mt-4 mb-2 px-3 text-[10px] text-[#a99bb3]")}>{titre}</p>
                <ul className="space-y-1">
                  {l.map((c) => (
                    <li key={c.id} className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => onOuvrir(c.id)}
                        aria-current={c.id === active ? "true" : undefined}
                        className={cx(
                          "flex min-w-0 flex-1 gap-3 rounded-2xl border px-3 py-2.5 text-left transition-colors",
                          c.id === active ? "border-white/15 bg-white/[0.07]" : "border-transparent hover:bg-white/5"
                        )}
                      >
                        <span aria-hidden="true" className={cx("mt-1.5 size-2 shrink-0 rounded-full", c.id === active ? "bg-[#ff9fbf]" : "bg-white/25")} />
                        <span className="min-w-0">
                          <span className="line-clamp-2 block text-sm font-bold text-white">{c.titre}</span>
                          <span className="block font-mono text-[11px] text-[#a99bb3]">
                            {c.nombre} question{c.nombre > 1 ? "s" : ""} · {dateCourte(c.date)}
                          </span>
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => onSupprimer(c.id)}
                        aria-label={`Supprimer la discussion « ${c.titre} »`}
                        className="grid size-9 shrink-0 place-items-center rounded-xl text-[#a99bb3] hover:bg-[#ff8fb8]/10 hover:text-[#ffb0cc]"
                      >
                        <Icon name="trash" className="size-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
        <p className="mx-6 border-t border-white/10 py-4 text-xs/5 text-[#a99bb3]">
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

  const analyse = useMemo(() => analyserMatieres(scores), [scores]);

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


  const derniere = [...messages].reverse().find((m) => m.role === "assistant" && m.etat !== "attente");
  const icones = ["bulb", "pencil", "target", "graduation"];

  return (
    <div className="dark relative flex h-full gap-5 bg-[#0f0b14] bg-[radial-gradient(ellipse_at_top_left,#3a1d2e_0%,transparent_55%),radial-gradient(ellipse_at_bottom_right,#2a1d44_0%,transparent_50%)] p-0 text-[#f4eef7] xl:p-5">
      {historiqueOuvert && (
        <Historique
          liste={liste}
          active={conversation}
          onOuvrir={ouvrirDiscussion}
          onSupprimer={supprimerDiscussion}
          onFermer={() => setHistoriqueOuvert(false)}
        />
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        {/* ---- En-tête ---- */}
        <div className="shrink-0 px-4 pt-4 pb-2 sm:px-6">
          <div className="mx-auto flex max-w-3xl flex-wrap items-center gap-x-6 gap-y-3">
            <div className="flex items-center gap-3">
              <span aria-hidden="true" className={cx(ORBE, "size-10 shrink-0 shadow-[0_0_30px_#ff8fb855]")} />
              <div>
                <h1 className="text-xl font-extrabold tracking-tight text-white">Assistant de révision</h1>
                <p className="mt-1 inline-flex items-center gap-2 rounded-full border border-white/15 px-2.5 py-0.5 text-xs text-[#cfc3d6]">
                  <span aria-hidden="true" className="size-2 rounded-full bg-[#ffb38c]" />
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
                className="inline-flex min-h-11 items-center gap-2 rounded-full border border-white/15 px-4 text-sm font-bold text-white transition-colors hover:bg-white/10"
              >
                <Icon name="clock" className="size-4" />
                Historique
              </button>
              <button
                type="button"
                onClick={nouvelleDiscussion}
                disabled={messages.length === 0}
                className="inline-flex min-h-11 items-center gap-2 rounded-full border border-white/15 px-4 text-sm font-bold text-white transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
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
          className="min-h-0 flex-1 overflow-y-auto focus:outline-none focus-visible:ring-2 focus-visible:ring-[#ff9fbf] focus-visible:ring-inset"
        >
          <div className="mx-auto max-w-3xl space-y-8 px-4 py-6 sm:px-6">
            {messages.length === 0 && (
              <div className="pt-6 text-center">
                <span aria-hidden="true" className={cx(ORBE, "mx-auto block size-24 shadow-[0_0_80px_#ff8fb866]")} />
                <p className="mt-8 bg-gradient-to-r from-[#ffc1a0] via-[#ff9fbf] to-[#b9a4ff] bg-clip-text text-6xl font-extrabold tracking-[-0.05em] text-transparent">
                  Salut !
                </p>
                {iaActive ? (
                  <>
                    <p className="mx-auto mt-5 max-w-xl text-[17px]/7 text-[#f4eef7]">
                      Pose-moi une question sur une notion, un exercice ou un chapitre. Une intelligence
                      artificielle t'explique, et je t'amène aux cours, exercices et QCM de la plateforme
                      qui traitent le sujet.
                    </p>
                    <p className="mx-auto mt-3 max-w-xl text-sm/6 text-[#cfc3d6]">
                      Une IA peut se tromper : en cas de doute, le cours et ton enseignant font foi.
                      N'écris rien de personnel ici.
                    </p>
                  </>
                ) : (
                  <>
                    <p className="mx-auto mt-5 max-w-xl text-[17px]/7 text-[#f4eef7]">
                      Je suis un guide, pas une intelligence artificielle. Je ne rédige aucune explication :
                      je cherche dans les cours, les exercices et les QCM de la plateforme, et je t'amène au
                      bon endroit.
                    </p>
                    <p className="mx-auto mt-3 max-w-xl text-sm/6 text-[#cfc3d6]">
                      C'est une limite, et c'est aussi une garantie : je ne peux pas me tromper sur une
                      notion, puisque je n'en explique aucune. Si je ne trouve rien, je te le dirai.
                    </p>
                  </>
                )}
                <ul className="mt-10 grid gap-3 text-left sm:grid-cols-2">
                  {questionsRapides.map((q, i) => (
                    <li key={q}>
                      <button
                        type="button"
                        onClick={() => envoyer(q)}
                        className="flex h-full min-h-32 w-full flex-col justify-between gap-4 rounded-[22px] border border-white/10 bg-white/[0.04] p-5 text-left transition-colors hover:border-[#ff9fbf]/40 hover:bg-white/[0.07]"
                      >
                        <span className="flex w-full justify-between">
                          <span className={cx("grid size-9 place-items-center rounded-xl", Object.values(tonsLien)[i])}>
                            <Icon name={icones[i]} className="size-4" />
                          </span>
                          <Icon name="arrow" className="size-4 -rotate-90 text-[#a99bb3]" />
                        </span>
                        <span className="text-[15px] font-bold text-white">{q}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {messages.map((m, i) =>
              m.role === "etudiant" ? (
                <div key={m.id} className="flex flex-col items-end gap-1.5">
                  {m.image?.apercu ? (
                    <img
                      src={m.image.apercu}
                      alt={`Image jointe : ${m.image.nom}`}
                      className="max-h-48 max-w-[60%] rounded-2xl border border-white/15 object-contain"
                    />
                  ) : m.image ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs text-[#cfc3d6]">
                      <Icon name="trombone" className="size-3.5" />
                      Image jointe : {m.image.nom} (non gardée)
                    </span>
                  ) : null}
                  <p className={cx("max-w-md rounded-[22px] rounded-br-md px-5 py-3 text-[15px]/6 font-semibold whitespace-pre-line text-[#1d1222]", DEGRADE)}>
                    {m.mode && (
                      <span className="mr-1.5 inline-flex items-center gap-1 rounded-full bg-[#1d1222]/15 px-2 py-0.5 align-middle text-[11px] font-bold">
                        <Icon name={RACCOURCIS[m.mode].icone} className="size-3" />
                        {RACCOURCIS[m.mode].label}
                      </span>
                    )}
                    {m.texte}
                  </p>
                </div>
              ) : (
                <div key={m.id} ref={i === messages.length - 1 ? dernierMessage : undefined} className="flex scroll-my-6 gap-4">
                  <span aria-hidden="true" className={cx(ORBE, "mt-1 size-7 shrink-0")} />
                  <div className="min-w-0 flex-1">
                    <div aria-live="polite" className="text-[16px]/7 text-[#f4eef7]">
                      {m.etat === "attente" ? (
                        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm">
                          <ChargementIA etapes={ETAPES_ASSISTANT} />
                        </div>
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
                            className={cx("mt-3 inline-flex min-h-10 items-center gap-2 rounded-full px-4 text-sm font-bold text-[#1d1222] disabled:cursor-not-allowed disabled:opacity-50", DEGRADE)}
                          >
                            <Icon name="sparkles" className="size-3.5" />
                            Réessayer
                          </button>
                        </>
                      ) : (
                        m.reponse.texte.map((p, j) => (
                          <p key={p} className={j > 0 ? "mt-2" : undefined}>
                            {p}
                          </p>
                        ))
                      )}
                    </div>

                    {m.etat === "ia" && m.imageIgnoree && (
                      <p className="mt-2 text-sm text-[#ffb0cc]">
                        L&apos;image n&apos;a pas été lue : le relais de la plateforme n&apos;accepte pas
                        encore les images. Cette réponse ne porte que sur ton texte.
                      </p>
                    )}

                    {m.etat !== "attente" && <Liens liens={m.reponse.liens} />}

                    {m.etat === "ia" && (
                      <p className="mt-4 flex items-center gap-2 text-sm text-[#cfc3d6]">
                        <Icon name="info" className="size-3.5" />
                        Rédigé par une IA : elle peut se tromper, le cours fait foi.
                      </p>
                    )}

                    {m.etat !== "attente" && m.etat !== "ia" && m.reponse.suggestions && (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {questionsRapides.map((q) => (
                          <button
                            key={q}
                            type="button"
                            onClick={() => envoyer(q)}
                            className="rounded-full border border-white/15 px-3.5 py-2 text-sm text-white transition-colors hover:border-[#ff9fbf]/50 hover:bg-white/5"
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
        <div className="shrink-0 px-4 pt-2 pb-4">
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
            <p className="mt-2 text-center text-xs text-[#a99bb3]">
              {iaActive
                ? "Tes questions et tes images sont envoyées à Google Gemini : rien de personnel, pas de photo de personne. L'IA peut se tromper, le cours fait foi. "
                : "Tout se passe dans ton navigateur. "}
              <Link to="/confidentialite" className="text-[#f4eef7] underline underline-offset-2">
                Confidentialité
              </Link>
            </p>
          </div>
        </div>
      </div>

      <Coulisses trouves={derniere?.reponse.liens.length ?? 0} />
    </div>
  );
}
