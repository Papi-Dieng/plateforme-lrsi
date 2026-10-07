import { useMemo } from "react";
import { Link } from "react-router-dom";
import Icon from "../components/Icon";
import { EnTeteAdmin } from "../components/LayoutAdmin";
import { QUADRILLAGE, mono } from "../components/styleAdmin";
import { cx } from "../components/classes";
import { MINIMUM_REPONSES, couvertureMatieres } from "../analyseMatieres";
import { matieres } from "../data/matieres";
import { exercices } from "../data/exercices";
import { qcms } from "../data/qcm";
import { videosSuggerees } from "../data/videos";
import { ressources } from "../data/bibliotheque";
import { annales, examens } from "../data/examens";
import { themeMatiere } from "../data/couleurs";

/* ==================================================================
   Espace d'administration — tableau de bord.

   Cette page ne s'adresse pas aux étudiants mais à la personne qui
   fabrique le contenu. Elle répond à une seule question : qu'est-ce
   qui manque pour que la plateforme fonctionne pleinement ?

   Elle-même ne montre que ce qui est déjà public. Tout ce qui modifie
   (contenu, éducation de l'IA) demande le mot de passe admin, vérifié
   par le relais. Les comptes étudiants se gèrent dans Supabase.

   Mise en page d'après la maquette « admin Sunu Cours » : inventaire
   en bandeau sombre, les trois outils en cartes, puis la couverture
   par matière en tableau.
   ================================================================== */

// L'objectif de questions par matière, pour la barre du tableau.
const OBJECTIF = 20;

function Chiffre({ valeur, libelle, alerte, note }) {
  return (
    <div className="py-5 pr-4">
      <p className={cx("text-5xl leading-none font-extrabold tracking-[-0.04em] sm:text-[56px]", alerte ? "text-[#ffc94d]" : "text-white")}>
        {valeur}
      </p>
      <p className="mt-3 text-sm/snug font-semibold text-ink-200">{libelle}</p>
      {note && (
        <span
          className={cx(
            "mt-2.5 inline-flex rounded-full px-2.5 py-1 text-xs font-bold",
            alerte ? "bg-[#ffc94d] text-ink-950" : "bg-white/8 text-ink-100"
          )}
        >
          {note}
        </span>
      )}
    </div>
  );
}

function Outil({ to, numero, surtitre, titre, texte, sombre, children }) {
  return (
    <Link
      to={to}
      className={cx(
        "group flex flex-col rounded-[28px] p-6 transition-transform hover:-translate-y-0.5",
        sombre ? "bg-brand-600 text-white" : "border border-ink-200 bg-white dark:border-ink-800 dark:bg-ink-900"
      )}
    >
      <p className={cx("text-[11px] font-bold", mono, sombre ? "text-lime-400" : "text-brand-600 dark:text-brand-400")}>
        {numero} · {surtitre}
      </p>
      <h2 className={cx("mt-3 text-[30px] leading-[1.05] font-extrabold tracking-[-0.035em]", sombre ? "text-white" : "text-ink-950 dark:text-white")}>
        {titre}
      </h2>
      <p className={cx("mt-3 text-sm/6", sombre ? "text-brand-100" : "text-ink-500 dark:text-ink-400")}>{texte}</p>
      <div className="mt-5 flex-1">{children}</div>
      <div className="mt-5 flex items-center justify-between">
        <span className={cx("text-[15px] font-extrabold", sombre ? "text-white" : "text-ink-950 dark:text-white")}>Ouvrir</span>
        <span
          className={cx(
            "grid size-11 place-items-center rounded-full transition-transform group-hover:translate-x-0.5",
            sombre ? "bg-lime-400 text-ink-950" : "bg-ink-950 text-white dark:bg-white dark:text-ink-950"
          )}
          aria-hidden="true"
        >
          <Icon name="arrow" className="size-4.5" />
        </span>
      </div>
    </Link>
  );
}

function Carte({ titre, texte, className, children }) {
  return (
    <section className={cx("rounded-[28px] border border-ink-200 bg-white p-6 sm:p-8 dark:border-ink-800 dark:bg-ink-900", className)}>
      <h2 className="text-[26px] leading-tight font-extrabold tracking-[-0.03em] text-ink-950 sm:text-[30px] dark:text-white">{titre}</h2>
      {texte && <p className="mt-1.5 text-[15px] text-ink-500 dark:text-ink-400">{texte}</p>}
      <div className="mt-6">{children}</div>
    </section>
  );
}

const ETATS = {
  vide: { label: "Aucune question", classe: "bg-sun-100 text-sun-900 dark:bg-sun-500/15 dark:text-sun-100", icone: "info" },
  incomplet: { label: "Sous le seuil", classe: "bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300", icone: "clock" },
  prete: { label: "Prête", classe: "bg-lime-100 text-lime-900 dark:bg-lime-400/15 dark:text-lime-200", icone: "check" },
};

export default function Admin() {
  const couverture = useMemo(() => couvertureMatieres(), []);

  const nbQuestions = qcms.reduce((n, q) => n + q.questions.length, 0);
  const nbChapitres = matieres.reduce((n, m) => n + m.chapitres.length, 0);
  const videosAvecLien = videosSuggerees.filter((v) => v.youtubeId).length;
  const ressourcesLibres = ressources.filter((r) => r.statut === "libre").length;
  const ressourcesEnAttente = ressources.length - ressourcesLibres;

  // Liste de travail : les matières les moins fournies en questions d'abord.
  const aTraiter = useMemo(
    () =>
      matieres
        .map((m) => {
          const n = couverture.questionsPar[m.id] ?? 0;
          return {
            ...m,
            questions: n,
            disponibles: m.chapitres.filter((c) => c.statut === "disponible").length,
            exercices: exercices.filter((e) => e.matiere === m.id).length,
            etat: n === 0 ? "vide" : n < MINIMUM_REPONSES ? "incomplet" : "prete",
          };
        })
        .sort((a, b) => a.questions - b.questions || a.nom.localeCompare(b.nom)),
    [couverture]
  );

  const matieresSansQcm = matieres.filter((m) => !qcms.some((q) => q.matiere === m.id));
  const matieresSansExercice = matieres.filter((m) => !exercices.some((e) => e.matiere === m.id));
  const manques = [
    matieresSansQcm.length > 0 && ["Sans aucun QCM :", `${matieresSansQcm.map((m) => m.nom).join(", ")}.`],
    matieresSansExercice.length > 0 && ["Sans aucun exercice :", `${matieresSansExercice.map((m) => m.nom).join(", ")}.`],
    videosAvecLien === 0 && [
      "Vidéos :",
      "aucun emplacement n'a encore de lien YouTube dans le fichier de données. Les liens ajoutés depuis le site restent locaux à un navigateur.",
    ],
  ].filter(Boolean);

  const exemple = qcms.find((q) => q.questions.length)?.questions[0];
  const part = Math.round((couverture.evaluables / couverture.total) * 100);

  return (
    <>
      <EnTeteAdmin
        titre="Espace d'administration"
        texte="Cette page ne s'adresse pas aux étudiants. Elle sert à voir ce qui manque dans le contenu pour que la plateforme fonctionne pleinement."
      >
        <span className="inline-flex items-center gap-2 rounded-full bg-sun-100 px-3.5 py-1.5 text-sm font-bold text-sun-900 dark:bg-sun-400/20 dark:text-sun-100">
          <Icon name="bulb" className="size-4" />
          Amorce en lecture seule
        </span>
      </EnTeteAdmin>

      <div className="space-y-6">
        {/* ---- Avertissement ---- */}
        <div className="flex gap-3 rounded-[20px] border border-sun-400/50 bg-sun-100/60 px-5 py-4 dark:border-sun-400/30 dark:bg-sun-400/10">
          <Icon name="lock" className="mt-0.5 size-4.5 shrink-0 text-sun-900 dark:text-sun-400" />
          <p className="text-sm/6 text-sun-900 dark:text-sun-100">
            <strong className="font-bold">Accès.</strong> Ce tableau de bord est lisible par quiconque connaît son adresse,
            mais il ne montre que ce qui est déjà public. Modifier le contenu ou l&apos;éducation de l&apos;IA demande le mot
            de passe admin, vérifié par le relais. Les comptes étudiants se gèrent dans Supabase (Authentication → Users) :
            c&apos;est là qu&apos;on réinitialise le mot de passe d&apos;un compte téléphone, ou qu&apos;on supprime un compte.
          </p>
        </div>

        {/* ---- Inventaire ---- */}
        <section className="rounded-[28px] bg-[#0b0e17] p-6 text-white sm:p-8 dark:ring-1 dark:ring-white/10" style={QUADRILLAGE}>
          <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-white/10 pb-5">
            <h2 className="text-[22px] font-extrabold tracking-tight">Inventaire du contenu</h2>
            <p className="text-sm text-ink-300">Ce qui est publié aujourd&apos;hui sur la plateforme.</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
            <Chiffre valeur={matieres.length} libelle="matières" />
            <Chiffre valeur={nbChapitres} libelle="chapitres" />
            <Chiffre valeur={exercices.length} libelle="exercices corrigés" />
            <Chiffre valeur={qcms.length} libelle="QCM" />
            <Chiffre valeur={nbQuestions} libelle="questions de QCM" />
            <Chiffre
              valeur={`${videosAvecLien}/${videosSuggerees.length}`}
              libelle="vidéos avec un lien"
              alerte={videosAvecLien < videosSuggerees.length}
              note={videosAvecLien < videosSuggerees.length ? "À compléter" : ""}
            />
            <Chiffre
              valeur={ressourcesLibres}
              libelle="ressources en accès libre"
              note={ressourcesEnAttente > 0 ? `${ressourcesEnAttente} en attente` : ""}
            />
          </div>
        </section>

        {/* ---- Les outils ---- */}
        <section aria-labelledby="titre-outils" className="pt-4">
          <h2 id="titre-outils" className="text-[34px] leading-tight font-extrabold tracking-[-0.035em] text-ink-950 dark:text-white">
            Les outils
          </h2>
          <p className="mt-1 text-[15px] text-ink-600 dark:text-ink-400">Trois espaces, protégés par le mot de passe admin.</p>
          <div className="mt-6 grid gap-5 lg:grid-cols-3">
            <Outil
              to="/admin/contenu"
              numero="02"
              surtitre="CONTENU"
              titre="Gérer le contenu"
              texte="Matières et cours, exercices, QCM, vidéos, devoirs, examens et bibliothèque. Publié en un clic, visible tout de suite par les étudiants."
            >
              <dl className="rounded-[20px] bg-ink-50 px-5 py-2 dark:bg-ink-950">
                {[
                  ["Matières et cours", matieres.length],
                  ["Exercices", exercices.length],
                  ["QCM", qcms.length],
                  ["Vidéos", videosSuggerees.length],
                  ["Devoirs", examens.length],
                  ["Examens", annales.length],
                  ["Bibliothèque", ressources.length],
                ].map(([quoi, n]) => (
                  <div key={quoi} className="flex justify-between border-b border-ink-200 py-2.5 text-sm last:border-b-0 dark:border-ink-800">
                    <dt className="font-semibold text-ink-800 dark:text-ink-200">{quoi}</dt>
                    <dd className={cx("m-0 font-mono", n === 0 ? "text-flame-600 dark:text-flame-400" : "text-ink-600 dark:text-ink-300")}>{n}</dd>
                  </div>
                ))}
              </dl>
            </Outil>
            <Outil
              to="/admin/ia"
              numero="03"
              surtitre="ASSISTANT"
              titre="Éduquer l'IA"
              texte="Par matière : consignes, questions-réponses modèles et tests de l'assistant."
              sombre
            >
              <div className="space-y-3 rounded-[20px] bg-white/10 p-4" aria-hidden="true">
                <div className="ml-6 rounded-2xl bg-white p-3.5 text-[13.5px]/5 text-ink-900">
                  <p className={cx("mb-1 text-[10px] font-bold text-ink-500", mono)}>ÉTUDIANT</p>
                  Donne-moi la réponse de l&apos;exercice sur le découpage de 192.168.10.0/24 en quatre sous-réseaux.
                </div>
                <div className="mr-6 rounded-2xl bg-[#0b0e17] p-3.5 text-[13.5px]/5 text-white">
                  <p className={cx("mb-1 text-[10px] font-bold text-lime-400", mono)}>ASSISTANT</p>
                  Essaie d&apos;abord avec cet indice : pour 4 sous-réseaux, combien de bits dois-tu emprunter ?
                </div>
              </div>
            </Outil>
            <Outil
              to="/admin/stats"
              numero="04"
              surtitre="STATISTIQUES"
              titre="Questions les plus ratées"
              texte="D'après les réponses anonymes des étudiants aux QCM : le taux d'échec de chaque question et le piège le plus choisi."
            >
              {exemple && (
                <div className="rounded-[20px] bg-[#fdf4ef] p-4 dark:bg-flame-500/10" aria-hidden="true">
                  <p className="text-sm/5 font-extrabold text-ink-950 dark:text-white">{exemple.enonce}</p>
                  <ul className="mt-3 space-y-2">
                    {exemple.options.slice(0, 3).map((o, i) => (
                      <li
                        key={i}
                        className={cx(
                          "flex items-center gap-2.5 rounded-xl border px-3 py-2 text-[13px] font-semibold",
                          i === exemple.bonne
                            ? "border-lime-500/60 bg-lime-50 text-ink-950 dark:bg-lime-400/10 dark:text-white"
                            : "border-ink-200 bg-white text-ink-800 dark:border-ink-700 dark:bg-ink-900 dark:text-ink-200"
                        )}
                      >
                        <span className={cx("size-3.5 shrink-0 rounded-full border-2", i === exemple.bonne ? "border-lime-600 bg-lime-600" : "border-ink-300")} />
                        <span className="truncate">{o}</span>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-3 text-xs font-bold text-flame-700 dark:text-flame-400">Une question compte à partir de 5 réponses.</p>
                </div>
              )}
            </Outil>
          </div>
        </section>

        {/* ---- Couverture de l'analyse ---- */}
        <Carte
          titre="Forces et faiblesses : couverture par matière"
          texte="Les matières sur lesquelles la plateforme peut juger un étudiant, d'après les questions de QCM."
        >
          <div className="flex flex-wrap items-end gap-x-10 gap-y-4">
            <p className="text-[72px] leading-[0.8] font-extrabold tracking-[-0.05em] text-ink-950 dark:text-white">
              {couverture.evaluables}
              <span className="ml-2 text-xl tracking-tight text-ink-500 dark:text-ink-400">/ {couverture.total} matières</span>
            </p>
            <div className="min-w-[220px] flex-1">
              <p className="text-[15px] text-ink-600 dark:text-ink-300">
                ont au moins {MINIMUM_REPONSES} questions de QCM, donc peuvent recevoir un verdict.
              </p>
              <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-ink-100 dark:bg-ink-800" role="img" aria-label={`${part} % des matières évaluables`}>
                <div className="h-full rounded-full bg-brand-600 transition-[width] duration-700" style={{ width: `${part}%` }} />
              </div>
            </div>
          </div>
          <p className="mt-6 flex gap-2.5 rounded-2xl bg-ink-50 px-4 py-3.5 text-sm/6 text-ink-600 dark:bg-ink-950 dark:text-ink-300">
            <Icon name="info" className="mt-1 size-4 shrink-0 text-ink-500 dark:text-ink-400" />
            Le seuil est fixé à {MINIMUM_REPONSES} réponses par matière pendant la création. À relever quand chaque matière
            aura une vingtaine de questions ({nbQuestions} écrites aujourd&apos;hui).
          </p>

          {/* Sur téléphone le tableau défile : la zone doit pouvoir prendre le focus. */}
          <div className="mt-6 overflow-x-auto" tabIndex={0} role="region" aria-label="Couverture par matière">
            <table className="w-full min-w-[680px] text-left text-sm">
              <thead>
                <tr className={cx("text-[11px] text-ink-500 dark:text-ink-400", mono)}>
                  <th scope="col" className="pb-3 font-bold">MATIÈRE</th>
                  <th scope="col" className="pb-3 font-bold">CHAPITRES DISPONIBLES</th>
                  <th scope="col" className="pb-3 font-bold">EXERCICES</th>
                  <th scope="col" className="pb-3 font-bold">QUESTIONS DE QCM</th>
                  <th scope="col" className="pb-3 font-bold">ÉTAT</th>
                </tr>
              </thead>
              <tbody>
                {aTraiter.map((m) => {
                  const etat = ETATS[m.etat];
                  return (
                    <tr key={m.id} className="border-t border-ink-100 dark:border-ink-800">
                      <td className="py-4 pr-4">
                        <span className="flex items-center gap-2.5 font-bold text-ink-950 dark:text-white">
                          <i className={cx("size-2.5 shrink-0 rounded-full", themeMatiere(m).point)} aria-hidden="true" />
                          {m.nom}
                        </span>
                      </td>
                      <td className="py-4 pr-4">
                        <span className="font-mono text-ink-700 dark:text-ink-300">
                          {m.disponibles} / {m.chapitres.length}
                        </span>
                        <span className="mt-1.5 flex gap-1" aria-hidden="true">
                          {m.chapitres.map((c, k) => (
                            <i key={k} className={cx("h-1.5 w-3 rounded-full", k < m.disponibles ? "bg-ink-950 dark:bg-white" : "bg-ink-200 dark:bg-ink-700")} />
                          ))}
                        </span>
                      </td>
                      <td className="py-4 pr-4 font-mono text-ink-700 dark:text-ink-300">{m.exercices}</td>
                      <td className="py-4 pr-4">
                        <span className="flex items-center gap-3">
                          <span className="w-6 font-mono text-ink-700 dark:text-ink-300">{m.questions}</span>
                          <span className="relative h-2 w-32 rounded-full bg-ink-100 dark:bg-ink-800" aria-hidden="true">
                            <i className="absolute inset-y-0 left-0 rounded-full bg-brand-600" style={{ width: `${Math.min(100, (m.questions / OBJECTIF) * 100)}%` }} />
                            <s className="absolute -top-1 -bottom-1 w-0.5 bg-ink-950 dark:bg-white" style={{ left: `${(MINIMUM_REPONSES / OBJECTIF) * 100}%` }} />
                          </span>
                        </span>
                      </td>
                      <td className="py-4">
                        <span className={cx("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold whitespace-nowrap", etat.classe)}>
                          <Icon name={etat.icone} className="size-3.5" />
                          {etat.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="mt-4 flex flex-wrap gap-x-5 gap-y-1 text-xs text-ink-500 dark:text-ink-400">
            <span className="inline-flex items-center gap-2">
              <i className="h-2 w-4 rounded-full bg-brand-600" aria-hidden="true" />
              Questions écrites, sur un objectif d&apos;une vingtaine
            </span>
            <span className="inline-flex items-center gap-2">
              <i className="h-3 w-0.5 bg-ink-950 dark:bg-white" aria-hidden="true" />
              Seuil actuel : {MINIMUM_REPONSES} questions
            </span>
          </p>
        </Carte>

        <div className="grid gap-5 lg:grid-cols-2">
          {/* ---- Autres manques ---- */}
          <Carte
            titre="Autres manques repérés"
            texte="Ce qui empêche une matière d'être complète."
            className="border-sun-400/40 bg-[#fffbeb] dark:border-sun-400/20 dark:bg-sun-500/5"
          >
            {manques.length ? (
              <ol className="space-y-3">
                {manques.map(([quoi, detail], i) => (
                  <li key={quoi} className="flex gap-4 rounded-2xl border border-sun-400/40 bg-white px-4 py-3.5 text-[15px]/6 text-ink-700 dark:border-sun-400/20 dark:bg-ink-900 dark:text-ink-300">
                    <span className={cx("pt-0.5 text-xs text-sun-900 dark:text-sun-400", mono)}>{String(i + 1).padStart(2, "0")}</span>
                    <span>
                      <strong className="font-extrabold text-ink-950 dark:text-white">{quoi}</strong> {detail}
                    </span>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="flex gap-2.5 text-[15px] text-ink-700 dark:text-ink-300">
                <Icon name="check" className="mt-1 size-4 shrink-0 text-lime-600" />
                Chaque matière a au moins un QCM, un exercice et une vidéo.
              </p>
            )}
          </Carte>

          {/* ---- Ce que fera le vrai espace d'administration ---- */}
          <Carte titre="Encore à venir dans l'administration" texte="Prévu dans la feuille de route, pas encore construit.">
            <ol className="space-y-3">
              {[
                "Gérer les comptes étudiants depuis le site, sans passer par Supabase",
                "Rôle enseignant pour valider les ressources avant publication",
                "Contrôler les accès aux documents réservés",
                "Journaliser les actions d'administration",
                "Suivre l'activité de la promotion, sans profilage individuel",
              ].map((t, i) => (
                <li key={t} className="flex gap-4 text-[15px]/6 text-ink-700 dark:text-ink-300">
                  <span className={cx("pt-0.5 text-xs text-brand-600 dark:text-brand-400", mono)}>{String(i + 1).padStart(2, "0")}</span>
                  {t}
                </li>
              ))}
            </ol>
            <Link to="/projet" className="mt-6 inline-flex items-center gap-2 text-[15px] font-extrabold text-brand-600 hover:underline dark:text-brand-400">
              Voir la feuille de route du projet
              <Icon name="arrow" className="size-4" />
            </Link>
          </Carte>
        </div>
      </div>
    </>
  );
}
