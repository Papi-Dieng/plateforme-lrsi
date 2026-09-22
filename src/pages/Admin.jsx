import { useMemo } from "react";
import { Link } from "react-router-dom";
import Icon from "../components/Icon";
import { Badge, Container, EnTetePage, cx } from "../components/ui";
import {
  MINIMUM_REPONSES,
  couvertureCompetences,
} from "../competences";
import { competences } from "../data/competences";
import { matieres } from "../data/matieres";
import { exercices } from "../data/exercices";
import { qcms } from "../data/qcm";
import { videosSuggerees } from "../data/videos";
import { ressources } from "../data/bibliotheque";
import { themeMatiere } from "../data/couleurs";

/* ==================================================================
   Espace d'administration — amorce.

   Cette page ne s'adresse pas aux étudiants mais à la personne qui
   fabrique le contenu. Elle répond à une seule question : qu'est-ce
   qui manque pour que la plateforme fonctionne pleinement ?

   En version 1 elle est en lecture seule et sans contrôle d'accès :
   il n'y a pas encore de serveur, donc pas de rôles. La gestion des
   utilisateurs, la publication et les autorisations arriveront en
   version 3, avec la véritable authentification.
   ================================================================== */

function Bloc({ icone, ton = "brand", titre, description, children }) {
  const tons = {
    brand: "bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300",
    violet: "bg-violet-50 text-violet-600 dark:bg-violet-500/15 dark:text-violet-300",
    flame: "bg-flame-100 text-flame-600 dark:bg-flame-500/15 dark:text-flame-400",
    sun: "bg-sun-100 text-sun-600 dark:bg-sun-500/15 dark:text-sun-400",
  };
  return (
    <section className="card p-5 sm:p-6">
      <header className="flex items-start gap-3">
        <span
          className={cx(
            "grid size-9 shrink-0 place-items-center rounded-xl",
            tons[ton]
          )}
        >
          <Icon name={icone} className="size-4.5" />
        </span>
        <div className="min-w-0">
          <h2 className="font-semibold text-ink-900 dark:text-white">{titre}</h2>
          <p className="mt-0.5 text-sm text-ink-500 dark:text-ink-400">
            {description}
          </p>
        </div>
      </header>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function Compteur({ valeur, libelle, alerte }) {
  return (
    <div
      className={cx(
        "rounded-2xl p-4",
        alerte
          ? "bg-sun-100/70 dark:bg-sun-500/10"
          : "bg-ink-50 dark:bg-ink-950"
      )}
    >
      <p className="text-2xl font-bold text-ink-900 dark:text-white">{valeur}</p>
      <p className="mt-0.5 text-xs text-ink-500 dark:text-ink-400">{libelle}</p>
    </div>
  );
}

export default function Admin() {
  const couverture = useMemo(couvertureCompetences, []);

  const nbQuestions = qcms.reduce((n, q) => n + q.questions.length, 0);
  const nbChapitres = matieres.reduce((n, m) => n + m.chapitres.length, 0);
  const videosAvecLien = videosSuggerees.filter((v) => v.youtubeId).length;
  const ressourcesLibres = ressources.filter((r) => r.statut === "libre").length;

  // Objectif : MINIMUM_REPONSES questions par compétence, au minimum.
  const objectifQuestions = competences.length * MINIMUM_REPONSES;
  const manquantes = Math.max(objectifQuestions - nbQuestions, 0);

  // Liste de travail : les compétences les plus démunies d'abord.
  const aTraiter = useMemo(
    () =>
      competences
        .map((c) => {
          const n = couverture.questionsPar[c.id] ?? 0;
          const matiere = matieres.find((m) => m.id === c.matiere);
          return {
            ...c,
            questions: n,
            matiere,
            etat:
              n === 0 ? "vide" : n < MINIMUM_REPONSES ? "incomplet" : "prete",
          };
        })
        .sort((a, b) => a.questions - b.questions || a.nom.localeCompare(b.nom)),
    [couverture]
  );

  const etats = {
    vide: { label: "Aucune question", ton: "sun" },
    incomplet: { label: "Sous le seuil", ton: "brand" },
    prete: { label: "Prête", ton: "accent" },
  };

  const matieresSansQcm = matieres.filter(
    (m) => !qcms.some((q) => q.matiere === m.id)
  );
  const matieresSansExercice = matieres.filter(
    (m) => !exercices.some((e) => e.matiere === m.id)
  );

  return (
    <>
      <EnTetePage
        surtitre="Coulisses"
        titre="Espace d'administration"
        texte="Cette page ne s'adresse pas aux étudiants. Elle sert à voir ce qui manque dans le contenu pour que la plateforme fonctionne pleinement."
      >
        <Badge ton="sun" icone="bulb">
          Amorce en lecture seule
        </Badge>
      </EnTetePage>

      <Container className="py-10">
        <div className="space-y-5">
          {/* ---- Avertissement ---- */}
          <div className="flex gap-3 rounded-2xl border border-sun-400/50 bg-sun-100/60 px-5 py-4 dark:border-sun-400/30 dark:bg-sun-400/10">
            <Icon
              name="lock"
              className="mt-0.5 size-4.5 shrink-0 text-sun-600 dark:text-sun-400"
            />
            <p className="text-sm/6 text-sun-900 dark:text-sun-100">
              <strong className="font-semibold">Accès.</strong>{" "}
              Ce tableau de bord est lisible par quiconque connaît son adresse,
              mais il ne montre que ce qui est déjà public. Modifier le contenu
              ou l'éducation de l'IA demande le mot de passe admin, vérifié par
              le relais. Les comptes et les rôles arriveront en version 3.
            </p>
          </div>

          {/* ---- Gérer le contenu ---- */}
          <Link
            to="/admin/contenu"
            className="card flex items-center gap-4 p-5 transition-colors hover:border-brand-300 sm:p-6 dark:hover:border-brand-500/40"
          >
            <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-accent-600 text-white">
              <Icon name="folder" className="size-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-semibold text-ink-900 dark:text-white">
                Gérer le contenu
              </span>
              <span className="mt-0.5 block text-sm text-ink-500 dark:text-ink-400">
                Matières et cours, exercices, QCM, vidéos, examens blancs et
                annales. Publié en un clic, visible tout de suite par les
                étudiants.
              </span>
            </span>
            <Icon name="chevron" className="size-5 shrink-0 -rotate-90 text-ink-400" />
          </Link>

          {/* ---- Éduquer l'IA ---- */}
          <Link
            to="/admin/ia"
            className="card flex items-center gap-4 p-5 transition-colors hover:border-brand-300 sm:p-6 dark:hover:border-brand-500/40"
          >
            <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-brand-600 text-white">
              <Icon name="sparkles" className="size-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-semibold text-ink-900 dark:text-white">
                Éduquer l'IA
              </span>
              <span className="mt-0.5 block text-sm text-ink-500 dark:text-ink-400">
                Par matière : consignes, questions-réponses modèles et tests
                de l'assistant. Protégé par le mot de passe admin.
              </span>
            </span>
            <Icon name="chevron" className="size-5 shrink-0 -rotate-90 text-ink-400" />
          </Link>

          {/* ---- Inventaire ---- */}
          <Bloc
            icone="layers"
            titre="Inventaire du contenu"
            description="Ce qui est publié aujourd'hui sur la plateforme."
          >
            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
              <Compteur valeur={matieres.length} libelle="matières" />
              <Compteur valeur={nbChapitres} libelle="chapitres" />
              <Compteur valeur={exercices.length} libelle="exercices corrigés" />
              <Compteur valeur={qcms.length} libelle="QCM" />
              <Compteur valeur={nbQuestions} libelle="questions de QCM" />
              <Compteur valeur={competences.length} libelle="compétences" />
              <Compteur
                valeur={`${videosAvecLien}/${videosSuggerees.length}`}
                libelle="vidéos avec un lien"
                alerte={videosAvecLien === 0}
              />
              <Compteur
                valeur={ressourcesLibres}
                libelle="ressources en accès libre"
              />
            </div>
          </Bloc>

          {/* ---- Couverture de l'analyse ---- */}
          <Bloc
            icone="sparkles"
            ton="violet"
            titre="Couverture de l'analyse par compétence"
            description="De quoi la plateforme est capable de juger, et ce qui l'en empêche."
          >
            <div className="grid gap-5 lg:grid-cols-3">
              <div className="lg:col-span-2">
                <p className="text-2xl font-bold text-ink-900 dark:text-white">
                  {couverture.avecQuestion}
                  <span className="ml-1 text-sm font-medium text-ink-400">
                    / {couverture.total} compétences
                  </span>
                </p>
                <p className="mt-0.5 text-xs text-ink-500 dark:text-ink-400">
                  ont au moins une question de QCM.
                </p>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-ink-200 dark:bg-ink-800">
                  <div
                    className="h-full rounded-full bg-violet-500 transition-[width] duration-700"
                    style={{
                      width: `${Math.round((couverture.avecQuestion / couverture.total) * 100)}%`,
                    }}
                  />
                </div>

                <ul className="mt-4 space-y-2 text-sm/6 text-ink-600 dark:text-ink-400">
                  <li className="flex gap-2">
                    <Icon
                      name="check"
                      className="mt-1 size-3.5 shrink-0 text-ink-400"
                    />
                    {couverture.evaluables}{" "}
                    {couverture.evaluables > 1 ? "atteignent" : "atteint"} le
                    seuil de {MINIMUM_REPONSES} réponses, donc{" "}
                    {couverture.evaluables > 1 ? "peuvent" : "peut"} recevoir un
                    verdict.
                  </li>
                  {matieresSansQcm.length > 0 && (
                    <li className="flex gap-2">
                      <Icon
                        name="bulb"
                        className="mt-1 size-3.5 shrink-0 text-sun-500"
                      />
                      {matieresSansQcm.map((m) => m.nom).join(", ")}{" "}
                      {matieresSansQcm.length > 1 ? "n'ont" : "n'a"} aucun QCM.
                    </li>
                  )}
                  <li className="flex gap-2">
                    <Icon
                      name="info"
                      className="mt-1 size-3.5 shrink-0 text-ink-400"
                    />
                    Le seuil est fixé à {MINIMUM_REPONSES} pendant la création.
                    À relever vers 8 ou 10 quand chaque filière approchera la
                    vingtaine de QCM.
                  </li>
                </ul>
              </div>

              <div className="rounded-2xl bg-ink-50 p-4 dark:bg-ink-950">
                <p className="text-xs font-semibold tracking-wide text-ink-500 uppercase">
                  Objectif d'écriture
                </p>
                <p className="mt-2 text-2xl font-bold text-ink-900 dark:text-white">
                  {manquantes}
                  <span className="ml-1 text-sm font-medium text-ink-400">
                    questions
                  </span>
                </p>
                <p className="mt-1 text-xs/5 text-ink-500 dark:text-ink-400">
                  Il en faut environ {objectifQuestions} pour que les{" "}
                  {competences.length} compétences franchissent le seuil de{" "}
                  {MINIMUM_REPONSES}. Tu en as écrit {nbQuestions}.
                </p>
              </div>
            </div>
          </Bloc>

          {/* ---- Liste de travail ---- */}
          <Bloc
            icone="pencil"
            ton="flame"
            titre="Compétences à alimenter"
            description="Les plus démunies en premier. C'est ta liste de rédaction."
          >
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="text-xs text-ink-400 dark:text-ink-500">
                    <th scope="col" className="pb-3 font-medium">
                      Compétence
                    </th>
                    <th scope="col" className="hidden pb-3 font-medium sm:table-cell">
                      Matière
                    </th>
                    <th scope="col" className="pb-3 text-right font-medium">
                      Questions
                    </th>
                    <th scope="col" className="pb-3 text-right font-medium">
                      État
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {aTraiter.map((c) => (
                    <tr
                      key={c.id}
                      className="border-t border-ink-200 dark:border-ink-800"
                    >
                      <td className="py-3 pr-4">
                        <span className="font-medium text-ink-900 dark:text-white">
                          {c.nom}
                        </span>
                        <span className="mt-0.5 block font-mono text-[11px] text-ink-400">
                          {c.id}
                        </span>
                      </td>
                      <td className="hidden py-3 pr-4 sm:table-cell">
                        <span className="flex items-center gap-2">
                          <span
                            className={cx(
                              "grid size-6 shrink-0 place-items-center rounded-full",
                              themeMatiere(c.matiere).pastille
                            )}
                          >
                            <Icon
                              name={c.matiere?.icone ?? "book"}
                              className="size-3"
                            />
                          </span>
                          <span className="text-ink-600 dark:text-ink-400">
                            {c.matiere?.nom}
                          </span>
                        </span>
                      </td>
                      <td className="py-3 pr-4 text-right font-mono text-ink-600 tabular-nums dark:text-ink-300">
                        {c.questions}
                      </td>
                      <td className="py-3 text-right">
                        <Badge ton={etats[c.etat].ton}>
                          {etats[c.etat].label}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Bloc>

          {/* ---- Autres manques ---- */}
          <Bloc
            icone="info"
            ton="sun"
            titre="Autres manques repérés"
            description="Ce qui empêche une matière d'être complète."
          >
            <ul className="space-y-3 text-sm/6 text-ink-600 dark:text-ink-400">
              {matieresSansQcm.length > 0 && (
                <li className="flex gap-3">
                  <Icon name="target" className="mt-1 size-4 shrink-0 text-sun-500" />
                  <span>
                    <strong className="font-semibold text-ink-900 dark:text-white">
                      Sans aucun QCM :
                    </strong>{" "}
                    {matieresSansQcm.map((m) => m.nom).join(", ")}.
                  </span>
                </li>
              )}
              {matieresSansExercice.length > 0 && (
                <li className="flex gap-3">
                  <Icon name="pencil" className="mt-1 size-4 shrink-0 text-sun-500" />
                  <span>
                    <strong className="font-semibold text-ink-900 dark:text-white">
                      Sans aucun exercice :
                    </strong>{" "}
                    {matieresSansExercice.map((m) => m.nom).join(", ")}.
                  </span>
                </li>
              )}
              {videosAvecLien === 0 && (
                <li className="flex gap-3">
                  <Icon name="video" className="mt-1 size-4 shrink-0 text-sun-500" />
                  <span>
                    <strong className="font-semibold text-ink-900 dark:text-white">
                      Vidéos :
                    </strong>{" "}
                    aucun emplacement n'a encore de lien YouTube dans le fichier
                    de données. Les liens ajoutés depuis le site restent locaux à
                    un navigateur.
                  </span>
                </li>
              )}
              {matieresSansQcm.length === 0 &&
                matieresSansExercice.length === 0 &&
                videosAvecLien > 0 && (
                  <li className="flex gap-3">
                    <Icon
                      name="check"
                      className="mt-1 size-4 shrink-0 text-accent-500"
                    />
                    Chaque matière a au moins un QCM, un exercice et une vidéo.
                  </li>
                )}
            </ul>
          </Bloc>

          {/* ---- Ce que fera le vrai espace d'administration ---- */}
          <Bloc
            icone="shield"
            titre="Ce que fera l'administration en version 3"
            description="Prévu dans la feuille de route, pas encore construit."
          >
            <ul className="grid gap-3 sm:grid-cols-2">
              {[
                "Gérer les comptes étudiants et les rôles",
                "Créer et modifier cours, exercices et QCM sans toucher au code",
                "Valider les ressources avant publication",
                "Contrôler les accès aux documents réservés",
                "Journaliser les actions d'administration",
                "Suivre l'activité de la promotion, sans profilage individuel",
              ].map((t) => (
                <li
                  key={t}
                  className="flex gap-2.5 rounded-xl bg-ink-50 p-3 text-sm/6 text-ink-600 dark:bg-ink-950 dark:text-ink-400"
                >
                  <Icon
                    name="chevron"
                    className="mt-1 size-3.5 shrink-0 -rotate-90 text-ink-400"
                  />
                  {t}
                </li>
              ))}
            </ul>
            <p className="mt-4 text-sm text-ink-500 dark:text-ink-400">
              Voir{" "}
              <Link
                to="/projet"
                className="font-medium text-brand-600 hover:underline dark:text-brand-400"
              >
                la feuille de route du projet
              </Link>
              .
            </p>
          </Bloc>
        </div>
      </Container>
    </>
  );
}
