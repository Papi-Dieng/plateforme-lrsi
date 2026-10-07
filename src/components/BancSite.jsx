import { useRef, useState } from "react";
import Icon from "./Icon";
import { cx } from "./classes";
import { messageErreurAdmin } from "../sessionAdmin";
import { repondre } from "../assistant";
import { demanderIA, lireFiche, raisonEchec, verifierReponse } from "../ia";
import { matieres } from "../data/matieres";
import { cas as casGeneraux } from "../banc-ia-questions";

/* ==================================================================
   Tester tout le site d'un coup, depuis « Éduquer l'IA ».

   Réunit le banc général (src/banc-ia-questions.js, le même que
   `npm run banc-ia`) et les tests écrits dans la fiche de chaque
   matière. Chaque question passe par le même chemin qu'un étudiant :
   le guide choisit les contenus, le relais interroge le modèle avec la
   fiche de la matière. On obtient un score, chaque réponse à relire, et
   un rapport à télécharger.

   Avec le mot de passe admin, le relais ne limite pas le nombre de
   questions ; une courte pause reste utile pour le quota du modèle.
   ================================================================== */

const PAUSE = 4000;

/* Comme dans l'onglet Tests : sans contenu de la matière testée dans
   les liens, on ajoute la matière pour que le relais joigne sa fiche. */
function liensPour(question, matiere) {
  const liens = repondre(question, []).liens;
  if (!matiere || liens.some((l) => l.matiere === matiere.id)) return liens;
  return [...liens, { type: "matiere", matiere: matiere.id, titre: matiere.nom, to: `/cours/${matiere.id}` }];
}

function rapportMarkdown(lignes) {
  const reussis = lignes.filter((l) => l.problemes?.length === 0).length;
  return [
    `# Banc de test de l'assistant IA — tout le site\n`,
    `${new Date().toLocaleString("fr-FR")} · ${reussis} / ${lignes.length} réussis\n`,
    ...lignes.map((l) =>
      [
        `## ${l.problemes?.length === 0 ? "✅" : "❌"} ${l.nom}\n`,
        `**Question :** ${l.question}\n`,
        l.erreur ? `**Erreur :** ${l.erreur}\n` : "",
        l.problemes?.length ? `**Problèmes :** ${l.problemes.join(" ; ")}\n` : "",
        l.texte ? `**Réponse :**\n\n${l.texte}\n` : "",
      ].join("\n")
    ),
  ].join("\n");
}

/* `Reponse` : l'affichage d'une réponse de l'IA, fourni par la page. */
export default function BancSite({ motDePasse, Reponse }) {
  const [lignes, setLignes] = useState(null);
  const [etat, setEtat] = useState({ type: "", texte: "" });
  const [enCours, setEnCours] = useState(false);
  const arret = useRef(false);

  const lancer = async () => {
    setEnCours(true);
    arret.current = false;
    setEtat({ type: "", texte: "Lecture des fiches des matières…" });

    // 1. Les cas : le banc général, puis les tests de chaque fiche.
    const aPoser = casGeneraux.map((c) => ({ ...c, source: "Banc général", matiere: null }));
    for (const m of matieres) {
      try {
        const fiche = await lireFiche(m.id, motDePasse);
        for (const t of fiche.tests ?? []) {
          if (t.question?.trim()) aPoser.push({ ...t, nom: t.question, source: m.nomCourt, matiere: m });
        }
      } catch (e) {
        setEtat({ type: "erreur", texte: messageErreurAdmin(e.message) });
        setEnCours(false);
        return;
      }
    }
    const depart = aPoser.map((c) => ({ nom: c.nom, source: c.source, question: c.question, attente: true }));
    setLignes(depart);

    // 2. Une question après l'autre.
    for (const [i, c] of aPoser.entries()) {
      if (arret.current) break;
      setEtat({ type: "", texte: `Question ${i + 1} sur ${aPoser.length}…` });
      let resultat;
      try {
        const texte = await demanderIA(
          [...(c.historique ?? []), { role: "etudiant", texte: c.question }],
          liensPour(c.question, c.matiere),
          motDePasse
        );
        resultat = { texte, problemes: verifierReponse(texte, c) };
      } catch (e) {
        resultat = { erreur: raisonEchec(e.message), problemes: ["le relais n'a pas répondu"] };
      }
      setLignes((l) => l.map((x, j) => (j === i ? { ...x, ...resultat, attente: false } : x)));
      if (i < aPoser.length - 1) await new Promise((r) => setTimeout(r, PAUSE));
    }
    setEtat({ type: "", texte: arret.current ? "Banc arrêté." : "Banc terminé." });
    setEnCours(false);
  };

  const telecharger = () => {
    const blob = new Blob([rapportMarkdown(lignes.filter((l) => !l.attente))], { type: "text/markdown" });
    const lien = document.createElement("a");
    lien.href = URL.createObjectURL(blob);
    lien.download = `banc-ia-${new Date().toISOString().slice(0, 10)}.md`;
    document.body.append(lien);
    lien.click();
    lien.remove();
    setTimeout(() => URL.revokeObjectURL(lien.href), 1000);
  };

  const termines = (lignes ?? []).filter((l) => !l.attente);
  const reussis = termines.filter((l) => l.problemes?.length === 0).length;

  // Avant le premier lancement, la grille montre les questions du banc
  // général, en attente.
  const cases = lignes ?? casGeneraux.map((c) => ({ nom: c.nom, source: "Banc général", question: c.question, avant: true }));

  return (
    <section
      className="rounded-[28px] bg-[#0b0e17] p-6 text-white sm:p-8 dark:ring-1 dark:ring-white/10"
      style={{
        backgroundImage:
          "linear-gradient(rgb(255 255 255/0.03) 1px,transparent 1px),linear-gradient(90deg,rgb(255 255 255/0.03) 1px,transparent 1px)",
        backgroundSize: "56px 56px",
      }}
    >
      <h2 className="text-[30px] leading-tight font-extrabold tracking-[-0.03em]">Tester tout le site</h2>
      <p className="mt-2 max-w-[560px] text-[15px]/6 text-ink-200">
        Les {casGeneraux.length} questions du banc général, puis les tests de chaque matière, posés comme par un étudiant.
        Compter quelques secondes par question.
      </p>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={telecharger}
          disabled={enCours || termines.length === 0}
          className="inline-flex min-h-11 items-center gap-2 rounded-[14px] border border-white/15 px-4 text-sm font-bold text-ink-100 transition-colors hover:bg-white/8 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Icon name="haut" className="size-4 rotate-180" />
          Télécharger le rapport (.md)
        </button>
        {enCours ? (
          <button
            type="button"
            onClick={() => (arret.current = true)}
            className="inline-flex min-h-11 items-center gap-2 rounded-[14px] bg-white px-4.5 text-sm font-extrabold text-ink-950 hover:bg-ink-100"
          >
            <Icon name="stop" className="size-4" />
            Arrêter
          </button>
        ) : (
          <button
            type="button"
            onClick={lancer}
            className="inline-flex min-h-11 items-center gap-2 rounded-[14px] bg-lime-400 px-4.5 text-sm font-extrabold text-ink-950 transition-colors hover:bg-lime-300"
          >
            <Icon name="play" className="size-4" />
            Lancer le banc complet
          </button>
        )}
        {lignes && (
          <p className="text-sm font-bold">
            {reussis} / {termines.length} réussis
            {termines.length < lignes.length && <span className="font-normal text-ink-300"> · {lignes.length} au total</span>}
          </p>
        )}
      </div>

      {etat.texte && (
        <p role="status" className={cx("mt-3 text-[13px]/5", etat.type === "erreur" ? "text-flame-300" : "text-ink-300")}>
          {etat.texte}
        </p>
      )}

      <ol className="mt-6 grid max-h-[70vh] gap-2.5 overflow-y-auto sm:grid-cols-2 xl:grid-cols-3">
        {cases.map((l, i) => {
          const etatCase = l.avant || l.attente ? "attente" : l.problemes?.length === 0 ? "ok" : "ko";
          return (
            <li
              key={i}
              className={cx(
                "rounded-[16px] border bg-white/4",
                etatCase === "ok" ? "border-lime-400/50" : etatCase === "ko" ? "border-flame-400/60" : "border-white/10"
              )}
            >
              <details className="group">
                <summary className="flex min-h-14 cursor-pointer list-none items-center gap-3 px-3.5 py-2.5 text-sm/5 font-bold">
                  <span className="w-5 shrink-0 font-mono text-[11px] font-medium text-[#8eaaff]">{String(i + 1).padStart(2, "0")}</span>
                  <span className="min-w-0 flex-1">
                    {l.nom}
                    {l.source !== "Banc général" && <span className="block text-xs font-medium text-ink-300">{l.source}</span>}
                  </span>
                  <span
                    className={cx(
                      "grid size-5 shrink-0 place-items-center rounded-full",
                      etatCase === "ok" ? "bg-lime-400 text-ink-950" : etatCase === "ko" ? "bg-flame-500 text-white" : "border-2 border-ink-500"
                    )}
                  >
                    {etatCase === "ok" && <Icon name="check" className="size-3" />}
                    {etatCase === "ko" && <Icon name="close" className="size-3" />}
                    <span className="sr-only">{etatCase === "ok" ? "réussi" : etatCase === "ko" ? "échoué" : "pas encore lancé"}</span>
                  </span>
                </summary>
                <div className="space-y-2 border-t border-white/10 px-3.5 py-3 text-[13px]/5">
                  <p className="text-ink-300">Question : {l.question}</p>
                  {l.problemes?.length > 0 && <p className="font-bold text-flame-300">{l.erreur ?? l.problemes.join(" ; ")}</p>}
                  {l.texte && (
                    <div className="rounded-xl bg-white p-3 text-ink-900">
                      <Reponse texte={l.texte} />
                    </div>
                  )}
                </div>
              </details>
            </li>
          );
        })}
      </ol>

      <div className={cx("mt-5 flex flex-wrap justify-between gap-2 text-xs text-ink-300")}>
        <span className="font-mono tracking-[0.06em]">
          BANC GÉNÉRAL · {casGeneraux.length} QUESTIONS{!lignes && " · PAS ENCORE LANCÉ"}
        </span>
        <span>Les tests ne sont jamais montrés à l&apos;IA.</span>
      </div>
    </section>
  );
}
