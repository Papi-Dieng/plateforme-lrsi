import { typesRessource } from "../../data/bibliotheque";
import { identifiant } from "./outils";
import { EditeurCompetence, EditeurMatiere } from "./editeursCours";
import { EditeurExercice, EditeurQcm } from "./editeursExercices";
import { EditeurAnnale, EditeurExamen, EditeurRessource, EditeurVideo } from "./editeursDocuments";

/* ==================================================================
   Les onglets, et ce que chaque type de contenu sait faire : son
   éditeur, un élément neuf, son titre et son résumé dans la liste.
   ================================================================== */

export const ONGLETS = [
  { cle: "matieres", label: "Matières et cours", icone: "folder" },
  { cle: "competences", label: "Compétences", icone: "layers" },
  { cle: "exercices", label: "Exercices", icone: "pencil" },
  { cle: "qcms", label: "QCM", icone: "target" },
  { cle: "videos", label: "Vidéos", icone: "video" },
  { cle: "examens", label: "Devoirs", icone: "clock" },
  { cle: "annales", label: "Examens", icone: "file" },
  { cle: "ressources", label: "Bibliothèque", icone: "book" },
];

export const TYPES = {
  matieres: {
    Editeur: EditeurMatiere,
    nouveau: (tous) => ({
      id: identifiant("nouvelle-matiere", tous),
      nom: "Nouvelle matière",
      nomCourt: "",
      couleur: "bleu",
      icone: "book",
      semestre: "",
      resume: "",
      chapitres: [],
    }),
    titre: (m) => m.nom,
    detail: (m) => `${m.chapitres.length} chapitres`,
  },
  competences: {
    Editeur: EditeurCompetence,
    nouveau: (tous, matiere) => ({
      id: identifiant(`${matiere || "competence"}-competence`, tous),
      nom: "",
      matiere,
      chapitres: [],
    }),
    titre: (c) => c.nom,
    detail: (c) => `${c.chapitres.length} chapitre(s)`,
  },
  exercices: {
    Editeur: EditeurExercice,
    nouveau: (tous, matiere) => ({
      id: identifiant("exercice", tous),
      titre: "",
      matiere,
      competence: "",
      difficulte: "Moyen",
      duree: "",
      tags: [],
      enonce: "",
      indice: "",
      etapes: [],
      reponse: "",
      explication: "",
      verification: [],
    }),
    titre: (e) => e.titre,
    detail: (e) => `${e.difficulte}${e.pdfEnonce ? (e.enonce ? " · texte + PDF" : " · PDF") : ""}`,
  },
  qcms: {
    Editeur: EditeurQcm,
    nouveau: (tous, matiere) => ({
      id: identifiant("qcm", tous),
      titre: "",
      matiere,
      niveau: "Débutant",
      duree: "",
      description: "",
      questions: [],
    }),
    titre: (q) => q.titre,
    detail: (q) => `${q.questions.length} questions`,
  },
  videos: {
    Editeur: EditeurVideo,
    nouveau: (tous, matiere) => ({ id: identifiant("video", tous), titre: "", resume: "", matiere, duree: "", youtubeId: null }),
    titre: (v) => v.titre,
    detail: (v) => (v.youtubeId ? "lien ajouté" : "sans lien"),
  },
  examens: {
    Editeur: EditeurExamen,
    nouveau: (tous, matiere) => ({ id: identifiant("devoir", tous), titre: "", matiere, dureeMinutes: 60, consignes: "", parties: [] }),
    titre: (x) => x.titre,
    detail: (x) => `${x.dureeMinutes} min · ${x.format === "pdf" ? "sujet PDF" : `${x.parties.length} parties`}`,
  },
  annales: {
    Editeur: EditeurAnnale,
    nouveau: (tous, matiere) => ({
      id: identifiant("examen-passe", tous),
      titre: "",
      matiere,
      annee: "",
      session: "",
      lienSujet: "",
      lienCorrige: "",
      autorisation: { obtenue: false, detail: "" },
    }),
    titre: (a) => a.titre,
    detail: (a) => (a.autorisation?.obtenue && a.lienSujet ? "visible" : "en attente"),
  },
  ressources: {
    Editeur: EditeurRessource,
    nouveau: (tous, matiere) => ({
      id: identifiant("ressource", tous),
      titre: "",
      auteurs: "",
      type: typesRessource[0],
      langue: "Français",
      matiere,
      licence: "",
      statut: "attente",
      url: null,
      pdf: null,
      note: "",
    }),
    titre: (r) => r.titre,
    detail: (r) => `${r.type} · ${r.statut === "libre" ? "accès libre" : "en attente"}${r.pdf ? " · PDF" : ""}`,
  },
};
