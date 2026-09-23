/* ==================================================================
   Le contenu pédagogique publié depuis l'espace admin.

   Matières et cours, compétences, exercices, QCM, vidéos, examens
   blancs et annales : un seul document JSON dans Cloudflare KV, sous la clé
   `contenu`. Le site le charge à l'ouverture ; tant que rien n'est
   publié, il garde le contenu écrit dans `src/data/`.

   À chaque publication, la version précédente est gardée sous
   `contenu:precedent`, pour pouvoir annuler une erreur.

   Tout est revalidé ici. L'espace admin peut être contourné : seul ce
   qui passe par `nettoyerContenu` est enregistré, avec des bornes sur
   chaque texte et chaque liste. Le site affiche ces textes comme du
   texte, jamais comme du HTML.
   ================================================================== */

import { ID_FICHIER } from "./fichiers.js";

const CLE = "contenu";
const CLE_PRECEDENT = "contenu:precedent";
export const TAILLE_MAX = 3_000_000;

const ID = /^[a-z0-9][a-z0-9-]{0,79}$/;
const MOT = /^[a-z0-9-]{1,30}$/;
const YOUTUBE = /^[A-Za-z0-9_-]{11}$/;

const texte = (v, max) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const liste = (v, max) => (Array.isArray(v) ? v.slice(0, max) : []);
const entier = (v, min, max, defaut) => {
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? Math.min(Math.max(n, min), max) : defaut;
};
const id = (v) => (typeof v === "string" && ID.test(v) ? v : "");
const mot = (v, defaut = "") => (typeof v === "string" && MOT.test(v) ? v : defaut);
const unParmi = (v, valeurs, defaut) => (valeurs.includes(v) ? v : defaut);
const textes = (v, maxListe, maxTexte) =>
  liste(v, maxListe)
    .map((t) => texte(t, maxTexte))
    .filter(Boolean);

/* Un lien d'annale : https seulement, pour qu'aucun lien ne puisse
   exécuter de code (javascript:) ni passer en clair. */
function lien(v) {
  const t = texte(v, 500);
  if (!t) return "";
  try {
    const u = new URL(t);
    return u.protocol === "https:" ? u.href : "";
  } catch {
    return "";
  }
}

/* Des identifiants uniques : un doublon est écarté, sinon deux
   contenus partageraient la même page et la même progression. */
function uniques(elements) {
  const vus = new Set();
  return elements.filter((e) => e.id && !vus.has(e.id) && vus.add(e.id));
}

/* Une référence à un PDF téléversé : identifiant, nom affiché, taille. */
const pdfValide = (v) =>
  v && typeof v === "object" && ID_FICHIER.test(v.id)
    ? { id: v.id, nom: texte(v.nom, 120) || "document.pdf", taille: entier(v.taille, 0, 30_000_000, 0) }
    : null;

const nettoyerMatiere = (m) => ({
  id: id(m?.id),
  nomCourt: texte(m?.nomCourt, 30),
  nom: texte(m?.nom, 120),
  couleur: mot(m?.couleur, "bleu"),
  icone: mot(m?.icone, "book"),
  semestre: texte(m?.semestre, 40),
  resume: texte(m?.resume, 600),
  chapitres: liste(m?.chapitres, 40)
    .map((c) => {
      // Un cours s'écrit directement, ou se téléverse en PDF. Dans ce
      // cas, `texteIA` garde le texte extrait du PDF : l'assistant s'en
      // sert, les étudiants lisent le PDF.
      const pdf = pdfValide(c?.pdf);
      const format = c?.format === "pdf" && pdf ? "pdf" : "texte";
      return {
        titre: texte(c?.titre, 150),
        resume: texte(c?.resume, 600),
        duree: texte(c?.duree, 20),
        statut: unParmi(c?.statut, ["disponible", "bientot"], "bientot"),
        format,
        contenu: format === "texte" ? texte(c?.contenu, 30000) : "",
        pdf: format === "pdf" ? pdf : null,
        texteIA: format === "pdf" ? texte(c?.texteIA, 30000) : "",
      };
    })
    .filter((c) => c.titre),
});

/* Une compétence renvoie vers des chapitres par leur titre exact :
   c'est ce qui permet de dire « relis ce chapitre » sans rien inventer. */
const nettoyerCompetence = (c) => ({
  id: id(c?.id),
  nom: texte(c?.nom, 120),
  matiere: id(c?.matiere),
  chapitres: textes(c?.chapitres, 20, 150),
});

/* Un exercice s'écrit, ou se donne en deux PDF : l'énoncé, et la
   correction, montrée seulement quand l'étudiant la demande. Le texte
   lu dans chaque PDF sert à l'assistant IA. L'indice reste écrit. */
function nettoyerExercice(e) {
  const pdfEnonce = pdfValide(e?.pdfEnonce);
  const format = e?.format === "pdf" && pdfEnonce ? "pdf" : "texte";
  const pdf = format === "pdf";
  return {
    id: id(e?.id),
    titre: texte(e?.titre, 150),
    matiere: id(e?.matiere),
    competence: id(e?.competence),
    difficulte: unParmi(e?.difficulte, ["Facile", "Moyen", "Difficile"], "Moyen"),
    duree: texte(e?.duree, 20),
    tags: textes(e?.tags, 10, 30),
    format,
    enonce: pdf ? "" : texte(e?.enonce, 5000),
    indice: texte(e?.indice, 1500),
    etapes: pdf ? [] : textes(e?.etapes, 20, 1500),
    reponse: pdf ? "" : texte(e?.reponse, 5000),
    explication: pdf ? "" : texte(e?.explication, 2000),
    pdfEnonce: pdf ? pdfEnonce : null,
    pdfCorrige: pdf ? pdfValide(e?.pdfCorrige) : null,
    texteEnonce: pdf ? texte(e?.texteEnonce, 15000) : "",
    texteCorrige: pdf ? texte(e?.texteCorrige, 15000) : "",
  };
}

const nettoyerQcm = (q) => ({
  id: id(q?.id),
  titre: texte(q?.titre, 150),
  matiere: id(q?.matiere),
  niveau: texte(q?.niveau, 30),
  duree: texte(q?.duree, 20),
  description: texte(q?.description, 600),
  questions: liste(q?.questions, 60)
    .map((x) => {
      const options = textes(x?.options, 6, 300);
      return {
        enonce: texte(x?.enonce, 1000),
        options,
        competence: id(x?.competence),
        bonne: entier(x?.bonne, 0, Math.max(options.length - 1, 0), 0),
        explication: texte(x?.explication, 1500),
      };
    })
    .filter((x) => x.enonce && x.options.length >= 2),
});

const nettoyerVideo = (v) => ({
  id: id(v?.id),
  titre: texte(v?.titre, 150),
  resume: texte(v?.resume, 400),
  matiere: id(v?.matiere),
  duree: texte(v?.duree, 20) || "—",
  youtubeId: typeof v?.youtubeId === "string" && YOUTUBE.test(v.youtubeId) ? v.youtubeId : null,
});

/* Un examen blanc s'écrit partie par partie, ou se donne en deux PDF :
   le sujet, montré au lancement du minuteur, et le corrigé, montré à la
   fin. En PDF, la note se donne sur `pointsTotal`. */
function nettoyerExamen(x) {
  const pdfEnonce = pdfValide(x?.pdfEnonce);
  const format = x?.format === "pdf" && pdfEnonce ? "pdf" : "parties";
  const pdf = format === "pdf";
  return {
    id: id(x?.id),
    titre: texte(x?.titre, 150),
    matiere: id(x?.matiere),
    dureeMinutes: entier(x?.dureeMinutes, 5, 480, 60),
    consignes: texte(x?.consignes, 2000),
    format,
    parties: pdf
      ? []
      : liste(x?.parties, 20)
          .map((p) => ({
            titre: texte(p?.titre, 150),
            enonce: texte(p?.enonce, 8000),
            points: entier(p?.points, 0, 100, 0),
            corrige: texte(p?.corrige, 8000),
          }))
          .filter((p) => p.enonce),
    pdfEnonce: pdf ? pdfEnonce : null,
    pdfCorrige: pdf ? pdfValide(x?.pdfCorrige) : null,
    pointsTotal: pdf ? entier(x?.pointsTotal, 1, 200, 20) : 0,
  };
}

const nettoyerAnnale = (a) => ({
  id: id(a?.id),
  titre: texte(a?.titre, 150),
  matiere: id(a?.matiere),
  annee: texte(a?.annee, 20),
  session: texte(a?.session, 40),
  lienSujet: lien(a?.lienSujet),
  lienCorrige: lien(a?.lienCorrige),
  autorisation: {
    obtenue: a?.autorisation?.obtenue === true,
    detail: texte(a?.autorisation?.detail, 500),
  },
});

export function nettoyerContenu(brut) {
  return {
    matieres: uniques(liste(brut?.matieres, 30).map(nettoyerMatiere).filter((m) => m.nom)),
    // Absentes d'une publication (page admin d'avant leur arrivée,
    // restée en cache), les compétences ne sont pas vidées : la clé est
    // omise, et le site garde les siennes.
    competences: Array.isArray(brut?.competences)
      ? uniques(liste(brut.competences, 300).map(nettoyerCompetence).filter((c) => c.nom))
      : undefined,
    exercices: uniques(liste(brut?.exercices, 500).map(nettoyerExercice).filter((e) => e.titre)),
    qcms: uniques(liste(brut?.qcms, 200).map(nettoyerQcm).filter((q) => q.titre)),
    videos: uniques(liste(brut?.videos, 500).map(nettoyerVideo).filter((v) => v.titre)),
    examens: uniques(liste(brut?.examens, 100).map(nettoyerExamen).filter((x) => x.titre)),
    annales: uniques(liste(brut?.annales, 300).map(nettoyerAnnale).filter((a) => a.titre)),
  };
}

/* Ce que voit un étudiant : une annale n'apparaît qu'avec une
   autorisation déclarée et un lien vers le sujet. L'admin, lui, voit
   aussi les annales en attente. */
export const versionPublique = (c) => ({
  ...c,
  annales: c.annales.filter((a) => a.autorisation.obtenue && a.lienSujet),
});

export const lireContenu = (env) => env.EDUCATION.get(CLE, "json");

export async function publierContenu(env, brut) {
  const contenu = { ...nettoyerContenu(brut), publieLe: new Date().toISOString() };
  const serialise = JSON.stringify(contenu);
  if (serialise.length > TAILLE_MAX) return { erreur: "trop-gros" };

  const actuel = await env.EDUCATION.get(CLE);
  if (actuel) await env.EDUCATION.put(CLE_PRECEDENT, actuel);
  await env.EDUCATION.put(CLE, serialise);
  // Les deux versions gardées : les PDF qu'elles citent sont conservés.
  return { contenu, versions: [contenu, actuel ? JSON.parse(actuel) : null] };
}

/* Annuler la dernière publication : l'actuelle et la précédente
   s'échangent, on peut donc aussi annuler l'annulation. */
export async function restaurerContenu(env) {
  const [actuel, precedent] = await Promise.all([
    env.EDUCATION.get(CLE),
    env.EDUCATION.get(CLE_PRECEDENT),
  ]);
  if (!precedent) return { erreur: "aucune-version-precedente" };
  await env.EDUCATION.put(CLE, precedent);
  if (actuel) await env.EDUCATION.put(CLE_PRECEDENT, actuel);
  return { contenu: JSON.parse(precedent) };
}
