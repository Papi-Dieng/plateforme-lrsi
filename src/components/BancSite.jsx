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

  return (
    <section className="card space-y-4 p-5">
      <div className="flex flex-wrap items-center gap-3">
        <span className="grid size-9 place-items-center rounded-xl bg-brand-600 text-white">
          <Icon name="target" className="size-4.5" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="font-semibold text-ink-900 dark:text-white">Tester tout le site</h2>
          <p className="text-xs text-ink-500 dark:text-ink-400">
            Les {casGeneraux.length} questions du banc général, puis les tests de chaque matière, posés
            comme par un étudiant. Compter quelques secondes par question.
          </p>
        </div>
        {enCours ? (
          <button
            type="button"
            onClick={() => (arret.current = true)}
            className="rounded-xl border border-ink-200 px-3.5 py-2 text-sm font-semibold text-ink-700 hover:bg-ink-50 dark:border-ink-700 dark:text-ink-200 dark:hover:bg-ink-800"
          >
            Arrêter
          </button>
        ) : (
          <button
            type="button"
            onClick={lancer}
            className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-3.5 py-2 text-sm font-semibold text-white hover:bg-brand-700"
          >
            <Icon name="rocket" className="size-4" />
            Lancer le banc complet
          </button>
        )}
      </div>

      {etat.texte && (
        <p role="status" className={cx("text-xs/5", etat.type === "erreur" ? "text-flame-600 dark:text-flame-400" : "text-ink-500")}>
          {etat.texte}
        </p>
      )}

      {lignes && (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-sm font-semibold text-ink-900 dark:text-white">
              {reussis} / {termines.length} réussis
              {termines.length < lignes.length && <span className="font-normal text-ink-500"> · {lignes.length} au total</span>}
            </p>
            {!enCours && termines.length > 0 && (
              <button type="button" onClick={telecharger} className="text-sm font-medium text-brand-600 hover:underline dark:text-brand-300">
                Télécharger le rapport (.md)
              </button>
            )}
          </div>
          <ul className="max-h-[60vh] space-y-2 overflow-y-auto">
            {lignes.map((l, i) => (
              <li
                key={i}
                className={cx(
                  "rounded-xl border p-3",
                  l.attente
                    ? "border-ink-200 dark:border-ink-800"
                    : l.problemes?.length === 0
                      ? "border-accent-400/60"
                      : "border-flame-400/60"
                )}
              >
                <details>
                  <summary className="flex cursor-pointer list-none items-start gap-2 text-sm">
                    <span className="shrink-0">{l.attente ? "…" : l.problemes?.length === 0 ? "✅" : "❌"}</span>
                    <span className="min-w-0 flex-1">
                      <span className="font-medium text-ink-900 dark:text-white">{l.nom}</span>
                      <span className="text-xs text-ink-500"> · {l.source}</span>
                      {l.problemes?.length > 0 && (
                        <span className="block text-xs text-flame-600 dark:text-flame-400">{l.erreur ?? l.problemes.join(" ; ")}</span>
                      )}
                    </span>
                  </summary>
                  <div className="mt-2 space-y-2 border-t border-ink-200 pt-2 dark:border-ink-800">
                    <p className="text-xs text-ink-500">Question : {l.question}</p>
                    {l.texte && <Reponse texte={l.texte} />}
                  </div>
                </details>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
