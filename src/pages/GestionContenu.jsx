import { useEffect, useMemo, useState } from "react";
import Icon from "../components/Icon";
import { EnTeteAdmin } from "../components/LayoutAdmin";
import { cx } from "../components/classes";
import ConnexionAdmin, { champAdmin as champ } from "../components/ConnexionAdmin";
import { ecrireSessionAdmin, messageErreurAdmin, useSessionAdmin } from "../sessionAdmin";
import { iaActive } from "../ia";
import { themeMatiere } from "../data/couleurs";
import {
  copieContenu,
  copieContenuParDefaut,
  dateContenu,
  lireContenuAdmin,
  publierContenu,
  restaurerContenu,
} from "../contenu";
import { extraireTextePdf } from "../extrairePdf";
import { PanneauImportTD } from "../components/AssistantAdmin";
import { identifiant } from "./gestionContenu/outils";
import { pourPublier, problemes } from "./gestionContenu/brouillon";
import { ONGLETS, TYPES } from "./gestionContenu/types";

/* ==================================================================
   Gérer le contenu : matières et cours, exercices, QCM,
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

   Mise en page d'après la maquette « admin Sunu Cours » : barre de
   publication sombre, onglets en pastilles, liste à gauche, éditeur à
   droite. La déconnexion est dans la barre latérale de l'admin.
   ================================================================== */

export default function GestionContenu() {
  const motDePasse = useSessionAdmin();
  const [brouillon, setBrouillon] = useState(null);
  const [modifie, setModifie] = useState(false);
  const [onglet, setOnglet] = useState("matieres");
  const [selection, setSelection] = useState({});
  const [filtre, setFiltre] = useState("");
  const [etat, setEtat] = useState({ type: "", texte: "" });
  const [publie, setPublie] = useState(null);

  // Session fermée (barre latérale, mot de passe refusé) : le brouillon
  // part avec elle.
  const [sessionVue, setSessionVue] = useState(motDePasse);
  if (sessionVue !== motDePasse) {
    setSessionVue(motDePasse);
    if (!motDePasse) {
      setBrouillon(null);
      setModifie(false);
    }
  }

  const deconnecter = (message = "") => {
    ecrireSessionAdmin("");
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
        // rubriques (arrivées après elle) : on complète
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
      <div className="py-10">
        <div className="card p-6 text-sm">Le relais n&apos;est pas configuré : `urlIA` est vide dans `src/data/site.js`.</div>
      </div>
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
    modifierListe(onglet, elements.map((e) => (e.id === selectionne.id ? { ...e, ...modif } : e)));
  };

  const ajouter = () => {
    const nouveau = type.nouveau(elements, filtre || brouillon.matieres[0]?.id || "");
    modifierListe(onglet, [...elements, nouveau]);
    setSelection((s) => ({ ...s, [onglet]: nouveau.id }));
  };

  const supprimer = () => {
    if (onglet === "matieres") {
      const lies = ["exercices", "qcms", "videos", "examens", "annales", "ressources"].reduce(
        (n, cle) => n + brouillon[cle].filter((e) => e.matiere === selectionne.id).length,
        0
      );
      if (lies > 0) {
        window.alert(`Cette matière a encore ${lies} contenu(s) rattaché(s). Supprime-les ou change leur matière d'abord.`);
        return;
      }
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
      <EnTeteAdmin
        titre="Gérer le contenu"
        texte="Matières et cours, exercices, QCM, vidéos et examens. Tu modifies un brouillon : rien ne change pour les étudiants avant « Publier »."
      />

      <div className="space-y-5">
        {!motDePasse ? (
          <ConnexionAdmin
            message={etat.type === "erreur" ? etat.texte : ""}
            onConnecte={() => setEtat({ type: "", texte: "" })}
          />
        ) : !brouillon ? (
          <p className="text-sm text-ink-500 dark:text-ink-400">Chargement du contenu…</p>
        ) : (
          <>
            {/* ---- Barre de publication ---- */}
            <div className="sticky top-3 z-10 flex flex-wrap items-center gap-4 rounded-[24px] bg-[#0b0e17] px-5 py-4 text-white shadow-[0_20px_40px_-24px_rgb(0_0_0/0.6)] sm:px-6 dark:ring-1 dark:ring-white/10">
              <span
                aria-hidden="true"
                className={cx(
                  "size-3 shrink-0 rounded-full ring-4",
                  modifie
                    ? "bg-[#ffc94d] ring-[#ffc94d]/20"
                    : etat.type === "erreur"
                      ? "bg-flame-500 ring-flame-500/20"
                      : "bg-lime-400 ring-lime-400/20"
                )}
              />
              <div className="min-w-0 flex-1">
                <p className="text-[15px] font-extrabold">
                  {modifie ? "Brouillon non publié." : etat.type === "erreur" ? "Le relais n'a pas répondu." : "Tout est publié."}
                </p>
                <p role="status" className="text-[13px]/5 text-ink-300">
                  {modifie
                    ? alertes.length
                      ? `${alertes.length} point(s) à vérifier avant de publier.`
                      : "Rien ne change pour les étudiants avant « Publier »."
                    : etat.texte}
                </p>
              </div>
              <div className="flex flex-wrap gap-2.5">
                <button
                  type="button"
                  disabled={!publie}
                  onClick={restaurer}
                  className="inline-flex min-h-11 items-center gap-2 rounded-[14px] border border-white/15 px-4 text-sm font-bold text-ink-100 transition-colors hover:bg-white/8 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Icon name="arrow" className="size-4 rotate-180" />
                  Restaurer la version précédente
                </button>
                <button
                  type="button"
                  disabled={!modifie}
                  onClick={publier}
                  className="inline-flex min-h-11 items-center gap-2 rounded-[14px] bg-lime-400 px-5 text-sm font-extrabold text-ink-950 transition-colors hover:bg-lime-300 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Icon name="haut" className="size-4" />
                  Publier
                </button>
              </div>
            </div>

            {/* ---- Onglets ---- */}
            <div role="tablist" className="flex gap-1 overflow-x-auto rounded-[22px] border border-ink-200 bg-white p-1.5 dark:border-ink-800 dark:bg-ink-900">
              {ONGLETS.map((o) => (
                <button
                  key={o.cle}
                  role="tab"
                  type="button"
                  aria-selected={onglet === o.cle}
                  onClick={() => setOnglet(o.cle)}
                  className={cx(
                    "inline-flex min-h-11 shrink-0 items-center gap-2.5 rounded-2xl px-4 text-sm font-bold transition-colors",
                    onglet === o.cle
                      ? "bg-ink-950 text-white dark:bg-white dark:text-ink-950"
                      : "text-ink-700 hover:bg-ink-100 dark:text-ink-300 dark:hover:bg-ink-800"
                  )}
                >
                  {o.label}
                  <span
                    className={cx(
                      "rounded-lg px-1.5 py-0.5 font-mono text-[11px]",
                      onglet === o.cle ? "bg-lime-400 text-ink-950" : "bg-ink-100 text-ink-600 dark:bg-ink-800 dark:text-ink-300"
                    )}
                  >
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

            <div className="grid items-start gap-5 lg:grid-cols-[290px_1fr]">
              {/* ---- Liste ---- */}
              <div className="space-y-3 rounded-[24px] border border-ink-200 bg-white p-3.5 dark:border-ink-800 dark:bg-ink-900">
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
                <ul className="max-h-[65vh] space-y-1 overflow-y-auto">
                  {visibles.map((e) => {
                    const actif = e.id === selectionne?.id;
                    const matiere = brouillon.matieres.find((m) => m.id === (onglet === "matieres" ? e.id : e.matiere));
                    return (
                      <li key={e.id}>
                        <button
                          type="button"
                          onClick={() => setSelection((s) => ({ ...s, [onglet]: e.id }))}
                          className={cx(
                            "w-full rounded-2xl border-2 px-3 py-2.5 text-left transition-colors",
                            actif
                              ? "border-brand-600 bg-brand-50 dark:border-brand-400 dark:bg-brand-500/10"
                              : "border-transparent hover:bg-ink-50 dark:hover:bg-ink-800"
                          )}
                        >
                          <span className="block text-sm/5 font-bold text-ink-950 dark:text-white">{type.titre(e) || "Sans titre"}</span>
                          <span className="mt-1 flex items-center gap-1.5 text-xs text-ink-500 dark:text-ink-400">
                            {matiere && <i className={cx("size-2 shrink-0 rounded-full", themeMatiere(matiere).point)} aria-hidden="true" />}
                            <span className="truncate">{type.detail(e)}</span>
                          </span>
                        </button>
                      </li>
                    );
                  })}
                  {visibles.length === 0 && <li className="px-3 py-2 text-sm text-ink-500 dark:text-ink-400">Rien pour le moment.</li>}
                </ul>
                <button
                  type="button"
                  onClick={ajouter}
                  disabled={onglet !== "matieres" && brouillon.matieres.length === 0}
                  className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl border border-ink-200 text-sm font-bold text-ink-950 transition-colors hover:bg-ink-50 disabled:opacity-50 dark:border-ink-700 dark:text-white dark:hover:bg-ink-800"
                >
                  <Icon name="plus" className="size-4" />
                  Ajouter
                </button>
              </div>

              {/* ---- Éditeur ---- */}
              <div className="min-w-0">
                {!selectionne ? (
                  <p className="rounded-[24px] border border-dashed border-ink-300 p-8 text-sm text-ink-500 dark:border-ink-700 dark:text-ink-400">
                    Choisis un élément dans la liste, ou clique sur « Ajouter ».
                  </p>
                ) : (
                  <>
                    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                      <p className="text-sm text-ink-500 dark:text-ink-400">
                        Identifiant : <code className="font-mono text-ink-800 dark:text-ink-200">{selectionne.id}</code>
                      </p>
                      <button
                        type="button"
                        onClick={supprimer}
                        className="inline-flex min-h-11 items-center gap-2 rounded-[14px] border border-flame-200 bg-white px-4 text-sm font-bold text-flame-600 transition-colors hover:bg-flame-50 dark:border-flame-500/30 dark:bg-ink-900 dark:text-flame-400 dark:hover:bg-flame-500/10"
                      >
                        <Icon name="trash" className="size-4" />
                        Supprimer
                      </button>
                    </div>
                    {/* Un éditeur découpé en sections (Fiche, Énoncé, Correction)
                        dessine ses propres cartes ; les autres tiennent dans une seule. */}
                    <div className={cx(!type.enSections && "rounded-[24px] border border-ink-200 bg-white p-5 sm:p-7 dark:border-ink-800 dark:bg-ink-900")}>
                      <Editeur
                        key={selectionne.id}
                        element={selectionne}
                        changer={changer}
                        matieres={brouillon.matieres}
                        motDePasse={motDePasse}
                      />
                    </div>
                  </>
                )}
              </div>
            </div>

            {alertes.length > 0 && (
              <div className="rounded-[20px] border border-sun-400/50 bg-sun-100/60 p-5 text-sm dark:bg-sun-500/10">
                <p className="font-bold text-sun-900 dark:text-sun-100">À vérifier avant de publier</p>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sun-900 dark:text-sun-100">
                  {alertes.slice(0, 10).map((a) => (
                    <li key={a}>{a}</li>
                  ))}
                </ul>
              </div>
            )}

            {dateContenu && (
              <p className="text-xs text-ink-500 dark:text-ink-400">
                Contenu affiché sur ce site : version publiée le {new Date(dateContenu).toLocaleString("fr-FR")}.
              </p>
            )}
          </>
        )}
      </div>
    </>
  );
}
