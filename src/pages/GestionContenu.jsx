import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Icon from "../components/Icon";
import { Container, EnTetePage } from "../components/ui";
import { cx } from "../components/classes";
import ConnexionAdmin, { champAdmin as champ } from "../components/ConnexionAdmin";
import { ecrireSessionAdmin, lireSessionAdmin, messageErreurAdmin } from "../sessionAdmin";
import { iaActive } from "../ia";
import {
  copieContenu,
  copieContenuParDefaut,
  dateContenu,
  lireContenuAdmin,
  publierContenu,
  restaurerContenu,
} from "../contenu";
import { extraireTextePdf } from "../extrairePdf";
import { PanneauCompetencesIA, PanneauImportTD } from "../components/AssistantAdmin";
import { identifiant } from "./gestionContenu/outils";
import { pourPublier, problemes } from "./gestionContenu/brouillon";
import { Bouton } from "./gestionContenu/champs";
import { ONGLETS, TYPES } from "./gestionContenu/types";

/* ==================================================================
   Gérer le contenu : matières et cours, compétences, exercices, QCM,
   vidéos, devoirs et examens (`examens` et `annales` dans le code :
   les noms internes datent d'avant le renommage).

   On modifie un BROUILLON, gardé dans la page. Rien ne change pour les
   étudiants tant qu'on n'a pas cliqué « Publier » : le brouillon part
   alors au relais, qui le vérifie et le garde (Cloudflare KV). Les
   étudiants le voient au prochain chargement du site.

   Chaque publication garde la précédente : « Restaurer » annule la
   dernière publication.

   Les identifiants (adresse d'un exercice, d'un QCM…) sont fabriqués à
   la création et ne changent plus : la progression et les favoris des
   étudiants y sont attachés.
   ================================================================== */

export default function GestionContenu() {
  const [motDePasse, setMotDePasse] = useState(lireSessionAdmin);
  const [brouillon, setBrouillon] = useState(null);
  const [modifie, setModifie] = useState(false);
  const [onglet, setOnglet] = useState("matieres");
  const [selection, setSelection] = useState({});
  const [filtre, setFiltre] = useState("");
  const [etat, setEtat] = useState({ type: "", texte: "" });
  const [publie, setPublie] = useState(null);

  const deconnecter = (message = "") => {
    ecrireSessionAdmin("");
    setMotDePasse("");
    setEtat({ type: message ? "erreur" : "", texte: message });
  };

  // Le brouillon part de la version publiée (annales en attente
  // comprises), ou du contenu du code si rien n'a jamais été publié.
  useEffect(() => {
    if (!motDePasse) return;
    let annule = false;
    lireContenuAdmin(motDePasse)
      .then((c) => {
        if (annule) return;
        // Une publication plus ancienne peut ne pas avoir toutes les
        // rubriques (les compétences sont arrivées après) : on complète
        // avec le contenu du code.
        setBrouillon(c ? { ...copieContenuParDefaut(), ...c } : copieContenuParDefaut());
        setPublie(c?.publieLe ?? null);
        setEtat({
          type: "",
          texte: c
            ? `Version publiée le ${new Date(c.publieLe).toLocaleString("fr-FR")}.`
            : "Rien n'a encore été publié : tu pars du contenu actuel du site.",
        });
      })
      .catch((e) => {
        if (annule) return;
        if (e.message === "mot-de-passe") deconnecter(messageErreurAdmin(e.message));
        else {
          // Relais injoignable : on peut préparer, pas publier.
          setBrouillon(copieContenu());
          setEtat({ type: "erreur", texte: messageErreurAdmin(e.message) });
        }
      });
    return () => {
      annule = true;
    };
  }, [motDePasse]);

  // Ne pas perdre un brouillon en fermant l'onglet par erreur.
  useEffect(() => {
    if (!modifie) return;
    const avertir = (e) => e.preventDefault();
    window.addEventListener("beforeunload", avertir);
    return () => window.removeEventListener("beforeunload", avertir);
  }, [modifie]);

  const alertes = useMemo(() => (brouillon ? problemes(brouillon) : []), [brouillon]);

  if (!iaActive) {
    return (
      <Container className="py-10">
        <div className="card p-6 text-sm">Le relais n'est pas configuré : `urlIA` est vide dans `src/data/site.js`.</div>
      </Container>
    );
  }

  const type = TYPES[onglet];
  const elements = brouillon?.[onglet] ?? [];
  const visibles =
    onglet === "matieres" || !filtre ? elements : elements.filter((e) => e.matiere === filtre);
  const selectionne = elements.find((e) => e.id === selection[onglet]) ?? null;

  const modifierListe = (cle, liste) => {
    setBrouillon((b) => ({ ...b, [cle]: liste }));
    setModifie(true);
  };
  const changer = (modif) => {
    // Renommer un chapitre met à jour les compétences qui le citent :
    // sans cela, « relis ce chapitre » pointerait vers un titre disparu.
    if (
      onglet === "matieres" &&
      modif.chapitres &&
      modif.chapitres.length === selectionne.chapitres.length
    ) {
      const renommages = new Map();
      selectionne.chapitres.forEach((c, i) => {
        if (c.titre !== modif.chapitres[i].titre) renommages.set(c.titre, modif.chapitres[i].titre);
      });
      if (renommages.size) {
        const matiere = selectionne.id;
        setBrouillon((b) => ({
          ...b,
          competences: b.competences.map((c) =>
            c.matiere !== matiere
              ? c
              : { ...c, chapitres: c.chapitres.map((t) => renommages.get(t) ?? t) }
          ),
        }));
      }
    }
    modifierListe(onglet, elements.map((e) => (e.id === selectionne.id ? { ...e, ...modif } : e)));
  };

  const usagesCompetence = (id) => ({
    exercices: brouillon.exercices.filter((e) => e.competence === id).length,
    questions: brouillon.qcms.reduce(
      (n, q) => n + q.questions.filter((x) => x.competence === id).length,
      0
    ),
  });

  const ajouter = () => {
    const nouveau = type.nouveau(elements, filtre || brouillon.matieres[0]?.id || "");
    modifierListe(onglet, [...elements, nouveau]);
    setSelection((s) => ({ ...s, [onglet]: nouveau.id }));
  };

  const supprimer = () => {
    if (onglet === "matieres") {
      const lies = ["competences", "exercices", "qcms", "videos", "examens", "annales", "ressources"].reduce(
        (n, cle) => n + brouillon[cle].filter((e) => e.matiere === selectionne.id).length,
        0
      );
      if (lies > 0) {
        window.alert(`Cette matière a encore ${lies} contenu(s) rattaché(s). Supprime-les ou change leur matière d'abord.`);
        return;
      }
    }
    if (onglet === "competences") {
      // Une compétence supprimée est détachée des exercices et des
      // questions, qui restent en place.
      const u = usagesCompetence(selectionne.id);
      const n = u.exercices + u.questions;
      const message =
        `Supprimer la compétence « ${selectionne.nom || selectionne.id} » ?` +
        (n
          ? `\n\n${u.exercices} exercice(s) et ${u.questions} question(s) y sont rattachés : ils seront détachés, pas supprimés.`
          : "");
      if (!window.confirm(message)) return;
      const id = selectionne.id;
      setBrouillon((b) => ({
        ...b,
        competences: b.competences.filter((c) => c.id !== id),
        exercices: b.exercices.map((e) => (e.competence === id ? { ...e, competence: "" } : e)),
        qcms: b.qcms.map((q) => ({
          ...q,
          questions: q.questions.map((x) => (x.competence === id ? { ...x, competence: "" } : x)),
        })),
      }));
      setModifie(true);
      setSelection((s) => ({ ...s, competences: null }));
      return;
    }
    if (!window.confirm(`Supprimer « ${type.titre(selectionne) || selectionne.id} » ?`)) return;
    modifierListe(onglet, elements.filter((e) => e.id !== selectionne.id));
    setSelection((s) => ({ ...s, [onglet]: null }));
  };

  const publier = async () => {
    if (alertes.length && !window.confirm(`Points à vérifier :\n\n- ${alertes.join("\n- ")}\n\nPublier quand même ?`)) return;
    setEtat({ type: "", texte: "Publication…" });
    try {
      const c = await publierContenu(pourPublier(brouillon), motDePasse);
      setBrouillon(c);
      setPublie(c.publieLe);
      setModifie(false);
      setEtat({ type: "ok", texte: `Publié à ${new Date(c.publieLe).toLocaleTimeString("fr-FR")}. Les étudiants le voient au prochain chargement du site.` });
    } catch (e) {
      if (e.message === "mot-de-passe") deconnecter(messageErreurAdmin(e.message));
      else setEtat({ type: "erreur", texte: messageErreurAdmin(e.message) });
    }
  };

  const restaurer = async () => {
    if (!window.confirm("Remettre en ligne la version publiée juste avant la dernière ? Le brouillon en cours sera perdu.")) return;
    try {
      const c = await restaurerContenu(motDePasse);
      setBrouillon(c);
      setPublie(c.publieLe);
      setModifie(false);
      setEtat({ type: "ok", texte: `Version du ${new Date(c.publieLe).toLocaleString("fr-FR")} remise en ligne.` });
    } catch (e) {
      setEtat({ type: "erreur", texte: messageErreurAdmin(e.message) });
    }
  };

  const Editeur = type.Editeur;

  return (
    <>
      <EnTetePage
        surtitre="Espace d'administration"
        titre="Gérer le contenu"
        texte="Matières et cours, exercices, QCM, vidéos et examens. Tu modifies un brouillon : rien ne change pour les étudiants avant « Publier »."
      >
        <Link to="/admin" className="text-sm font-medium text-brand-600 hover:underline dark:text-brand-300">
          ← Retour à l'administration
        </Link>
      </EnTetePage>

      <Container className="space-y-6 py-10">
        {!motDePasse ? (
          <>
            {etat.type === "erreur" && <p className="text-sm text-flame-600 dark:text-flame-400">{etat.texte}</p>}
            <ConnexionAdmin
              onConnecte={(mdp) => {
                setEtat({ type: "", texte: "" });
                setMotDePasse(mdp);
              }}
            />
          </>
        ) : !brouillon ? (
          <p className="text-sm text-ink-500">Chargement du contenu…</p>
        ) : (
          <>
            {/* ---- Barre de publication ---- */}
            <div className="card sticky top-2 z-10 flex flex-wrap items-center gap-3 p-4">
              <Bouton variante="principal" icone="rocket" disabled={!modifie} onClick={publier}>
                Publier
              </Bouton>
              <Bouton icone="arrow" disabled={!publie} onClick={restaurer} className="[&>svg]:rotate-180">
                Restaurer la version précédente
              </Bouton>
              <p
                className={cx(
                  "text-xs",
                  modifie
                    ? "font-medium text-sun-700 dark:text-sun-400"
                    : etat.type === "erreur"
                      ? "text-flame-600 dark:text-flame-400"
                      : etat.type === "ok"
                        ? "text-accent-700 dark:text-accent-400"
                        : "text-ink-500 dark:text-ink-400"
                )}
              >
                {modifie
                  ? `Brouillon non publié${alertes.length ? ` · ${alertes.length} point(s) à vérifier` : ""}.`
                  : etat.texte}
              </p>
              <button
                type="button"
                onClick={() => (!modifie || window.confirm("Le brouillon non publié sera perdu. Continuer ?")) && deconnecter()}
                className="ml-auto text-xs text-ink-500 hover:underline dark:text-ink-400"
              >
                Se déconnecter
              </button>
            </div>

            {/* ---- Onglets ---- */}
            <div role="tablist" className="flex gap-1 overflow-x-auto border-b border-ink-200 dark:border-ink-800">
              {ONGLETS.map((o) => (
                <button
                  key={o.cle}
                  role="tab"
                  type="button"
                  aria-selected={onglet === o.cle}
                  onClick={() => setOnglet(o.cle)}
                  className={cx(
                    "inline-flex shrink-0 items-center gap-2 border-b-2 px-3.5 py-2.5 text-sm transition-colors",
                    onglet === o.cle
                      ? "border-brand-500 font-semibold text-brand-700 dark:text-brand-300"
                      : "border-transparent text-ink-500 hover:text-ink-800 dark:hover:text-ink-200"
                  )}
                >
                  <Icon name={o.icone} className="size-4" />
                  {o.label}
                  <span className="rounded-full bg-ink-100 px-1.5 text-[11px] text-ink-500 dark:bg-ink-800">
                    {brouillon[o.cle].length}
                  </span>
                </button>
              ))}
            </div>

            {onglet === "exercices" && (
              <PanneauImportTD
                brouillon={brouillon}
                appliquer={(transformer) => {
                  setBrouillon(transformer);
                  setModifie(true);
                }}
                motDePasse={motDePasse}
                identifiant={identifiant}
                extraireTexte={extraireTextePdf}
              />
            )}

            {onglet === "competences" && (
              <PanneauCompetencesIA
                brouillon={brouillon}
                appliquer={(transformer) => {
                  setBrouillon(transformer);
                  setModifie(true);
                }}
                motDePasse={motDePasse}
                identifiant={identifiant}
              />
            )}

            <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
              {/* ---- Liste ---- */}
              <div className="space-y-3">
                {onglet !== "matieres" && (
                  <select
                    value={filtre}
                    onChange={(e) => setFiltre(e.target.value)}
                    aria-label="Filtrer par matière"
                    className={champ}
                  >
                    <option value="">Toutes les matières</option>
                    {brouillon.matieres.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.nom}
                      </option>
                    ))}
                  </select>
                )}
                <ul className="max-h-[60vh] space-y-1 overflow-y-auto">
                  {visibles.map((e) => (
                    <li key={e.id}>
                      <button
                        type="button"
                        onClick={() => setSelection((s) => ({ ...s, [onglet]: e.id }))}
                        className={cx(
                          "w-full rounded-xl px-3 py-2.5 text-left transition-colors",
                          e.id === selectionne?.id
                            ? "bg-brand-600 text-white"
                            : "hover:bg-ink-100 dark:hover:bg-ink-800"
                        )}
                      >
                        <span className="block truncate text-sm font-medium">{type.titre(e) || "Sans titre"}</span>
                        <span className={cx("block text-[11px]", e.id === selectionne?.id ? "text-white/70" : "text-ink-500")}>
                          {type.detail(e)}
                        </span>
                      </button>
                    </li>
                  ))}
                  {visibles.length === 0 && <li className="px-3 py-2 text-sm text-ink-500">Rien pour le moment.</li>}
                </ul>
                <Bouton icone="plus" onClick={ajouter} disabled={onglet !== "matieres" && brouillon.matieres.length === 0}>
                  Ajouter
                </Bouton>
              </div>

              {/* ---- Éditeur ---- */}
              <div className="card p-5 sm:p-6">
                {!selectionne ? (
                  <p className="text-sm text-ink-500 dark:text-ink-400">
                    Choisis un élément dans la liste, ou clique sur « Ajouter ».
                  </p>
                ) : (
                  <>
                    <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-ink-200 pb-4 dark:border-ink-800">
                      <p className="text-xs text-ink-500">
                        Identifiant : <code className="font-mono">{selectionne.id}</code>
                      </p>
                      <Bouton variante="danger" icone="trash" onClick={supprimer}>
                        Supprimer
                      </Bouton>
                    </div>
                    <Editeur
                      key={selectionne.id}
                      element={selectionne}
                      changer={changer}
                      matieres={brouillon.matieres}
                      competences={brouillon.competences}
                      motDePasse={motDePasse}
                      usages={onglet === "competences" ? usagesCompetence(selectionne.id) : null}
                    />
                  </>
                )}
              </div>
            </div>

            {alertes.length > 0 && (
              <div className="rounded-xl border border-sun-400/50 bg-sun-100/60 p-4 text-sm dark:bg-sun-500/10">
                <p className="font-semibold text-sun-900 dark:text-sun-300">À vérifier avant de publier</p>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sun-900 dark:text-sun-200">
                  {alertes.slice(0, 10).map((a) => (
                    <li key={a}>{a}</li>
                  ))}
                </ul>
              </div>
            )}

            {dateContenu && (
              <p className="text-xs text-ink-400">
                Contenu affiché sur ce site : version publiée le {new Date(dateContenu).toLocaleString("fr-FR")}.
              </p>
            )}
          </>
        )}
      </Container>
    </>
  );
}
