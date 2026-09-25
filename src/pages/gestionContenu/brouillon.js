/* ==================================================================
   Le brouillon avant publication : ce qui serait écarté ou cassé
   (`problemes`), et ce qui part au relais (`pourPublier`). Sans
   affichage, pour être testé tel quel.
   ================================================================== */

/* Ce qui serait écarté ou cassé à la publication, dit avant. */
export function problemes(b) {
  const liste = [];
  const ids = new Set(b.matieres.map((m) => m.id));
  for (const m of b.matieres) if (!m.nom.trim()) liste.push(`Une matière n'a pas de nom (${m.id}).`);
  for (const c of b.competences) {
    if (!c.nom.trim()) {
      liste.push(`La compétence « ${c.id} » n'a pas de nom : elle serait supprimée.`);
      continue;
    }
    if (!ids.has(c.matiere)) liste.push(`La compétence « ${c.nom} » n'a pas de matière.`);
    const titres = b.matieres.find((m) => m.id === c.matiere)?.chapitres.map((ch) => ch.titre) ?? [];
    for (const t of c.chapitres) {
      if (!titres.includes(t)) liste.push(`La compétence « ${c.nom} » renvoie vers un chapitre introuvable : « ${t} ».`);
    }
  }
  for (const [cle, nom] of [
    ["exercices", "L'exercice"],
    ["qcms", "Le QCM"],
    ["videos", "La vidéo"],
    ["examens", "Le devoir"],
    ["annales", "L'examen"],
    ["ressources", "La ressource"],
  ]) {
    for (const e of b[cle]) {
      if (!e.titre.trim()) liste.push(`${nom} « ${e.id} » n'a pas de titre : il serait supprimé.`);
      else if (!ids.has(e.matiere)) liste.push(`${nom} « ${e.titre} » n'a pas de matière.`);
    }
  }
  for (const r of b.ressources) {
    if (r.statut === "libre" && !r.url && !r.pdf) {
      liste.push(`La ressource « ${r.titre || r.id} » est en accès libre sans lien ni PDF : les étudiants ne pourraient pas l'ouvrir.`);
    }
  }
  for (const e of b.exercices) {
    if ((e.verification ?? []).some((v) => !v.libelle.trim() || !v.attendu.trim())) {
      liste.push(`L'exercice « ${e.titre || e.id} » a une ligne de vérification incomplète : elle serait ignorée.`);
    }
  }
  for (const e of b.exercices) {
    if (!e.enonce?.trim() && !e.pdfEnonce) liste.push(`L'exercice « ${e.titre || e.id} » n'a ni énoncé écrit ni énoncé en PDF.`);
  }
  for (const x of b.examens) {
    if (x.format === "pdf" && !x.pdfEnonce) liste.push(`Le devoir « ${x.titre || x.id} » est en PDF sans sujet : il repasserait en parties, vides.`);
  }
  for (const q of b.qcms) {
    q.questions.forEach((x, i) => {
      if (!x.enonce.trim() || x.options.filter((o) => o.trim()).length < 2) {
        liste.push(`QCM « ${q.titre} », question ${i + 1} : il faut une question et au moins deux réponses.`);
      }
    });
  }
  return liste;
}

/* Ce qui part au relais : les étapes et réponses vides sont retirées. */
export const pourPublier = (b) => ({
  ...b,
  // `source` ne sert qu'à l'éditeur (lien ou PDF) : il ne part pas.
  ressources: b.ressources.map(({ source: _source, ...r }) => r),
  exercices: b.exercices.map((e) => ({ ...e, etapes: e.etapes.map((s) => s.trim()).filter(Boolean) })),
  qcms: b.qcms.map((q) => ({
    ...q,
    questions: q.questions.map((x) => {
      const gardees = x.options.map((o, k) => ({ o: o.trim(), k })).filter((y) => y.o);
      const bonne = Math.max(gardees.findIndex((y) => y.k === x.bonne), 0);
      return { ...x, options: gardees.map((y) => y.o), bonne };
    }),
  })),
});

/* ================================================================== */
