/* ==================================================================
   Banc de test de l'assistant IA : `npm run banc-ia`.

   Il pose chaque question de `banc-ia-questions.js` au relais EN
   LIGNE, par le même chemin que le site : le guide cherche les
   contenus, `construireExtraits` y joint les exercices, puis le relais
   interroge le modèle. On teste donc exactement ce que voit un
   étudiant.

   Deux sorties :
   - dans le terminal, un OK ou un ÉCHEC par question, puis le score ;
   - dans `scripts/banc-ia-resultats.md`, toutes les réponses en
     entier, à relire : un mot-clé présent ne garantit pas qu'une
     explication soit bonne.

   Le relais limite à 10 questions par minute : le banc attend entre
   deux questions, compter trois à quatre minutes.
   ================================================================== */

import { writeFileSync } from "node:fs";
import { createServer } from "vite";
import { cas } from "./banc-ia-questions.js";

const PAUSE_ENTRE_QUESTIONS = 7000;
const FICHIER_RESULTATS = "scripts/banc-ia-resultats.md";

// Vite charge les modules du site tels quels (imports sans extension,
// fichiers JSX), sans lancer de serveur web.
const vite = await createServer({
  server: { middlewareMode: true, hmr: false },
  appType: "custom",
  logLevel: "error",
});

try {
  const { repondre } = await vite.ssrLoadModule("/src/assistant.js");
  const { construireExtraits, verifierReponse: verifier } = await vite.ssrLoadModule("/src/ia.js");
  const { site } = await vite.ssrLoadModule("/src/data/site.js");

  if (!site.urlIA) throw new Error("urlIA est vide dans src/data/site.js");
  console.log(`Banc de test : ${cas.length} questions, relais ${site.urlIA}\n`);

  const rapport = [`# Banc de test de l'assistant IA\n`, `${new Date().toLocaleString("fr-FR")}\n`];
  let reussis = 0;

  for (const [i, c] of cas.entries()) {
    if (i > 0) await new Promise((r) => setTimeout(r, PAUSE_ENTRE_QUESTIONS));

    const guide = repondre(c.question, []);
    let texte, problemes;
    try {
      const r = await fetch(site.urlIA, {
        method: "POST",
        // Le relais n'accepte que les origines autorisées : on se
        // présente comme le serveur de développement local.
        headers: { "Content-Type": "application/json", Origin: "http://localhost:5173" },
        body: JSON.stringify({
          messages: [...(c.historique ?? []), { role: "etudiant", texte: c.question }],
          extraits: construireExtraits(guide.liens),
        }),
      });
      const donnees = await r.json();
      texte = donnees.texte ?? `(erreur du relais : ${donnees.erreur ?? r.status})`;
      problemes = donnees.texte ? verifier(texte, c) : ["le relais n'a pas répondu"];
    } catch (e) {
      texte = `(erreur réseau : ${e.message})`;
      problemes = ["le relais n'a pas répondu"];
    }

    const ok = problemes.length === 0;
    if (ok) reussis++;
    console.log(`${ok ? "OK    " : "ÉCHEC "} ${c.nom}`);
    for (const p of problemes) console.log(`         ${p}`);

    rapport.push(
      `## ${ok ? "✅" : "❌"} ${c.nom}\n`,
      `**Question :** ${c.question}\n`,
      `**Contenus envoyés :** ${guide.liens.map((l) => `${l.type} « ${l.titre} »`).join(", ") || "aucun"}\n`,
      problemes.length ? `**Problèmes :** ${problemes.join(" ; ")}\n` : "",
      `**Réponse :**\n\n${texte}\n`
    );
  }

  const score = `${reussis}/${cas.length}`;
  rapport.splice(2, 0, `**Score : ${score}**\n`);
  writeFileSync(FICHIER_RESULTATS, rapport.join("\n"));
  console.log(`\nScore : ${score}. Réponses complètes dans ${FICHIER_RESULTATS}`);
  process.exitCode = reussis === cas.length ? 0 : 1;
} finally {
  await vite.close();
}
