import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import Icon from "../components/Icon";
import {
  Badge,
  Bouton,
  Container,
  EnTetePage,
  NoteDemo,
  TitreSection,
  cx,
} from "../components/ui";
import { lireExercicesTravailles, lireScores } from "../progression";
import {
  MINIMUM_REPONSES,
  analyserCompetences,
  faiblesses,
  modulesAAmeliorer,
  reponsesEnregistrees,
} from "../competences";
import { repondre, questionsRapides } from "../assistant";
import { getMatiere } from "../data/matieres";
import { themeMatiere } from "../data/couleurs";

/* ==================================================================
   Assistant de révision.

   Il fonctionne, mais ce n'est PAS une IA générative : il ne rédige
   aucune explication. Il comprend l'intention d'une question,
   cherche dans le contenu de la plateforme et renvoie vers ce qui
   existe vraiment. Toute la logique est dans `src/assistant.js` ;
   cette page ne fait que l'afficher.

   Ce choix est dit à l'écran, pas seulement dans ce commentaire :
   un outil qui laisserait croire qu'il comprend la matière
   tromperait l'étudiant au moment où il a le plus besoin d'être sûr.
   ================================================================== */

const capacites = [
  {
    icone: "book",
    titre: "Retrouver un chapitre",
    texte:
      "Le cours qui traite la notion, avec les exercices et les QCM qui s'y rattachent.",
  },
  {
    icone: "pencil",
    titre: "Proposer un exercice",
    texte:
      "Sur un sujet précis, ou à défaut sur la compétence où tu es le plus faible.",
  },
  {
    icone: "layers",
    titre: "Dire par où commencer",
    texte:
      "D'après tes résultats de QCM, la compétence la plus basse et les chapitres liés.",
  },
];

const cequilNeFaitPas = [
  "Rédiger une explication : il cite le cours, il ne le réécrit pas.",
  "Donner la réponse d'un exercice sans que tu ouvres la correction.",
  "Inventer un contenu absent de la plateforme : il dit qu'il n'a rien trouvé.",
  "Juger ton niveau sur deux réponses : il lui en faut au moins trois.",
];

const iconesLien = {
  matiere: "folder",
  chapitre: "book",
  exercice: "pencil",
  qcm: "target",
  video: "video",
};

/* ---- Une réponse de l'assistant, avec ses liens ---- */

function Liens({ liens }) {
  if (liens.length === 0) return null;

  return (
    <ul className="mt-3 space-y-2">
      {liens.map((l) => {
        const theme = themeMatiere(getMatiere(l.matiere));
        return (
          <li key={`${l.type}-${l.to}-${l.titre}`}>
            <Link
              to={l.to}
              className="flex items-start gap-3 rounded-xl border border-ink-200 bg-white p-3 transition-colors hover:border-brand-300 hover:bg-brand-50/50 dark:border-ink-700 dark:bg-ink-900 dark:hover:border-brand-500/40 dark:hover:bg-brand-500/10"
            >
              <span
                className={cx(
                  "grid size-8 shrink-0 place-items-center rounded-lg",
                  theme.pastille
                )}
              >
                <Icon name={iconesLien[l.type] ?? "file"} className="size-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-ink-900 dark:text-white">
                  {l.titre}
                </span>
                {l.detail && (
                  <span className="mt-0.5 line-clamp-2 block text-xs/5 text-ink-600 dark:text-ink-400">
                    {l.detail}
                  </span>
                )}
                {l.meta && (
                  <span
                    className={cx(
                      "mt-1 block text-[11px] font-medium",
                      l.indisponible
                        ? "text-sun-700 dark:text-sun-400"
                        : "text-ink-500 dark:text-ink-500"
                    )}
                  >
                    {l.meta}
                  </span>
                )}
              </span>
              <Icon
                name="chevron"
                className="mt-1 size-4 shrink-0 -rotate-90 text-ink-400"
              />
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

/* ================================================================== */

export default function Assistant() {
  const [scores, setScores] = useState({});
  const [exercicesTravailles, setExercicesTravailles] = useState([]);
  const [saisie, setSaisie] = useState("");
  const [messages, setMessages] = useState([]);
  const compteur = useRef(0);

  useEffect(() => {
    setScores(lireScores());
    setExercicesTravailles(lireExercicesTravailles());
  }, []);

  const analyse = useMemo(() => analyserCompetences(scores), [scores]);

  const reponses = reponsesEnregistrees(analyse);
  const fragiles = faiblesses(analyse);
  const modules = modulesAAmeliorer(analyse);

  const envoyer = (question) => {
    const texte = question.trim();
    if (!texte) return;

    const reponse = repondre(texte, analyse);
    compteur.current += 2;
    setMessages((liste) => [
      ...liste,
      { id: compteur.current - 1, role: "etudiant", texte },
      { id: compteur.current, role: "assistant", reponse },
    ]);
    setSaisie("");
  };

  /* Les trois compteurs de l'en-tête : à la place des statistiques
     flatteuses d'une maquette, les seuls nombres vérifiables. */
  const compteurs = [
    {
      icone: "target",
      valeur: reponses,
      label: reponses > 1 ? "réponses analysées" : "réponse analysée",
    },
    {
      icone: "layers",
      valeur: fragiles.length,
      label: fragiles.length > 1 ? "compétences fragiles" : "compétence fragile",
    },
    {
      icone: "book",
      valeur: modules.length,
      label: modules.length > 1 ? "chapitres à revoir" : "chapitre à revoir",
    },
  ];

  const detailProgression = [
    {
      icone: "target",
      valeur: reponses,
      label: reponses > 1 ? "réponses enregistrées" : "réponse enregistrée",
      detail: "chaque question de QCM terminée alimente l'analyse",
    },
    {
      icone: "layers",
      valeur: fragiles.length,
      label: fragiles.length > 1 ? "compétences fragiles" : "compétence fragile",
      detail: `repérées à partir de ${MINIMUM_REPONSES} réponses au minimum`,
    },
    {
      icone: "book",
      valeur: modules.length,
      label: modules.length > 1 ? "chapitres à revoir" : "chapitre à revoir",
      detail: "déduits des compétences fragiles, pas d'un jugement global",
    },
    {
      icone: "pencil",
      valeur: exercicesTravailles.length,
      label:
        exercicesTravailles.length > 1
          ? "exercices travaillés"
          : "exercice travaillé",
      detail: "pour éviter de reproposer ce qui est déjà maîtrisé",
    },
  ];

  return (
    <>
      <EnTetePage
        surtitre="Guide de révision"
        titre="Assistant de révision"
        texte="Pose ta question : il retrouve le chapitre, l'exercice ou le QCM qui traite le sujet, et il sait dire par où commencer d'après tes résultats. Il ne rédige aucune explication lui-même."
      >
        <Badge ton="neutre" icone="info">
          Guide, pas une IA générative
        </Badge>
      </EnTetePage>

      <Container className="space-y-12 py-10">
        {/* ============================================================
            La discussion
            ============================================================ */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* ---- Panneau de discussion ---- */}
          <div className="card flex flex-col overflow-hidden lg:col-span-2">
            <div className="bg-brand-950 px-6 py-5">
              <div className="flex items-center gap-3.5">
                <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-white/10 text-white ring-1 ring-white/15">
                  <Icon name="sparkles" className="size-5" />
                </span>
                <div>
                  <h2 className="text-lg font-bold tracking-tight text-white">
                    Assistant de révision
                  </h2>
                  <p className="mt-0.5 flex items-center gap-2 text-sm text-white/70">
                    <span
                      aria-hidden="true"
                      className="size-2 rounded-full bg-accent-400"
                    />
                    En service — cherche dans le contenu de la plateforme
                  </p>
                </div>
              </div>

              <dl className="mt-5 flex flex-wrap gap-x-6 gap-y-2 border-t border-white/10 pt-4">
                {compteurs.map((c) => (
                  <div key={c.label} className="flex items-center gap-2">
                    <Icon name={c.icone} className="size-4 text-white/50" />
                    <dt className="sr-only">{c.label}</dt>
                    <dd className="text-sm text-white/80">
                      <span className="font-semibold text-white">
                        {c.valeur}
                      </span>{" "}
                      {c.label}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>

            {/* ---- Fil de discussion ---- */}
            <div className="flex-1 space-y-5 px-6 py-6">
              {/* Message d'accueil : il dit ce qu'il est avant tout. */}
              <div className="flex gap-3">
                <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300">
                  <Icon name="sparkles" className="size-4" />
                </span>
                <div className="max-w-xl rounded-2xl rounded-bl-md bg-ink-100 px-4 py-3 text-sm/6 text-ink-700 dark:bg-ink-800 dark:text-ink-200">
                  <p>
                    Je suis un guide, pas une intelligence artificielle. Je ne
                    rédige aucune explication : je cherche dans les cours, les
                    exercices et les QCM de la plateforme, et je t'amène au bon
                    endroit.
                  </p>
                  <p className="mt-2">
                    C'est une limite, et c'est aussi une garantie : je ne peux
                    pas me tromper sur une notion, puisque je n'en explique
                    aucune. Si je ne trouve rien, je te le dirai.
                  </p>
                </div>
              </div>

              {messages.map((m) =>
                m.role === "etudiant" ? (
                  <div key={m.id} className="flex justify-end">
                    <p className="max-w-md rounded-2xl rounded-br-md bg-brand-600 px-4 py-3 text-sm/6 text-white">
                      {m.texte}
                    </p>
                  </div>
                ) : (
                  <div key={m.id} className="flex gap-3">
                    <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300">
                      <Icon name="sparkles" className="size-4" />
                    </span>
                    <div className="min-w-0 max-w-xl flex-1">
                      <div className="rounded-2xl rounded-bl-md bg-ink-100 px-4 py-3 text-sm/6 text-ink-700 dark:bg-ink-800 dark:text-ink-200">
                        {m.reponse.texte.map((p, i) => (
                          <p key={p} className={i > 0 ? "mt-2" : undefined}>
                            {p}
                          </p>
                        ))}
                      </div>

                      <Liens liens={m.reponse.liens} />

                      {m.reponse.suggestions && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {questionsRapides.map((q) => (
                            <button
                              key={q}
                              type="button"
                              onClick={() => envoyer(q)}
                              className="rounded-full border border-ink-200 px-3 py-1.5 text-xs text-ink-600 transition-colors hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700 dark:border-ink-700 dark:text-ink-300 dark:hover:border-brand-500/40 dark:hover:bg-brand-500/10 dark:hover:text-brand-200"
                            >
                              {q}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )
              )}
            </div>

            {/* ---- Saisie ---- */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                envoyer(saisie);
              }}
              className="border-t border-ink-200 px-6 py-5 dark:border-ink-800"
            >
              <label htmlFor="assistant-question" className="sr-only">
                Poser une question à l'assistant
              </label>
              <div className="flex items-center gap-3">
                <input
                  id="assistant-question"
                  type="text"
                  value={saisie}
                  onChange={(e) => setSaisie(e.target.value)}
                  placeholder="Une notion, un exercice, un chapitre à réviser…"
                  className="min-w-0 flex-1 rounded-xl border border-ink-200 bg-white px-4 py-3 text-sm text-ink-900 placeholder:text-ink-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-ink-700 dark:bg-ink-950 dark:text-white"
                />
                <button
                  type="submit"
                  disabled={!saisie.trim()}
                  className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-brand-600 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-ink-200 disabled:text-ink-400 dark:disabled:bg-ink-800 dark:disabled:text-ink-500"
                >
                  <Icon name="arrow" className="size-4" />
                  Envoyer
                </button>
              </div>
              <p className="mt-2 text-xs text-ink-500 dark:text-ink-400">
                La conversation n'est pas enregistrée : elle disparaît en
                quittant la page.
              </p>
            </form>
          </div>

          {/* ---- Colonne de droite ---- */}
          <div className="space-y-6">
            <div className="card p-5">
              <h2 className="flex items-center gap-2 font-semibold text-ink-900 dark:text-white">
                <Icon name="sparkles" className="size-4 text-flame-500" />
                Ce qu'il sait faire
              </h2>

              <ul className="mt-4 space-y-3">
                {capacites.map((c) => (
                  <li
                    key={c.titre}
                    className="flex gap-3 rounded-xl bg-ink-50 p-3.5 dark:bg-ink-950"
                  >
                    <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-white text-brand-600 ring-1 ring-ink-200 dark:bg-ink-900 dark:text-brand-300 dark:ring-ink-800">
                      <Icon name={c.icone} className="size-4.5" />
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-ink-900 dark:text-white">
                        {c.titre}
                      </p>
                      <p className="mt-0.5 text-xs/5 text-ink-600 dark:text-ink-400">
                        {c.texte}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <div className="card p-5">
              <h2 className="flex items-center gap-2 font-semibold text-ink-900 dark:text-white">
                <Icon name="bulb" className="size-4 text-flame-500" />
                Questions rapides
              </h2>
              <p className="mt-1 text-xs/5 text-ink-500 dark:text-ink-400">
                Clique pour envoyer directement.
              </p>

              <ul className="mt-4 space-y-2.5">
                {questionsRapides.map((q) => (
                  <li key={q}>
                    <button
                      type="button"
                      onClick={() => envoyer(q)}
                      className="block w-full rounded-xl border border-ink-200 px-3.5 py-2.5 text-left text-xs/5 text-ink-600 transition-colors hover:border-brand-300 hover:bg-brand-50 hover:text-brand-800 dark:border-ink-800 dark:text-ink-400 dark:hover:border-brand-500/40 dark:hover:bg-brand-500/10 dark:hover:text-brand-200"
                    >
                      {q}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* ============================================================
            Les données réelles sur lesquelles il s'appuie
            ============================================================ */}
        <section>
          <TitreSection
            surtitre="Sur quoi il s'appuie"
            titre="Ce qu'il sait de toi"
            texte="Ces chiffres ne sont pas des exemples : ils viennent de ta progression, enregistrée dans ce navigateur."
          />

          {reponses === 0 ? (
            <div className="mt-6 card p-6">
              <p className="text-sm/6 text-ink-700 dark:text-ink-300">
                Tu n'as pas encore terminé de QCM : si tu lui demandes par où
                commencer, il te le dira franchement plutôt que d'inventer une
                faiblesse. Il ne devine pas ton niveau, il le lit dans ce que tu
                as réellement fait. Une compétence n'est jugée qu'à partir de{" "}
                {MINIMUM_REPONSES} réponses, pour éviter de conclure sur un coup
                de chance ou un moment d'inattention.
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <Bouton to="/qcm">
                  <Icon name="target" className="size-4" />
                  Faire un premier QCM
                </Bouton>
                <Bouton to="/progression" variante="secondaire">
                  Voir ma progression
                </Bouton>
              </div>
            </div>
          ) : (
            <>
              <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {detailProgression.map((m) => (
                  <li key={m.label} className="card p-5">
                    <span className="grid size-9 place-items-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300">
                      <Icon name={m.icone} className="size-4.5" />
                    </span>
                    <p className="mt-3 text-3xl font-bold tracking-tight text-ink-900 dark:text-white">
                      {m.valeur}
                    </p>
                    <p className="text-sm font-medium text-ink-700 dark:text-ink-300">
                      {m.label}
                    </p>
                    <p className="mt-1.5 text-xs/5 text-ink-500 dark:text-ink-400">
                      {m.detail}
                    </p>
                  </li>
                ))}
              </ul>

              {modules.length > 0 && (
                <div className="mt-4 card p-5">
                  <p className="text-sm/6 text-ink-700 dark:text-ink-300">
                    Si tu lui demandes par où commencer, il répondra{" "}
                    <strong className="font-semibold text-ink-900 dark:text-white">
                      {modules[0].chapitre}
                    </strong>{" "}
                    en {modules[0].nomMatiere}, parce que la compétence «{" "}
                    {modules[0].motif} » est à {modules[0].taux} %. Ce choix
                    vient d'un calcul sur tes réponses, pas d'une préférence.
                  </p>
                  <div className="mt-4">
                    <Bouton to="/progression" variante="secondaire">
                      Voir le détail par compétence
                    </Bouton>
                  </div>
                </div>
              )}
            </>
          )}
        </section>

        {/* ============================================================
            Les limites
            ============================================================ */}
        <section>
          <TitreSection
            surtitre="Le cadre"
            titre="Ce qu'il ne fait pas"
            texte="Mieux vaut un outil qui dit « je n'ai rien trouvé » qu'un outil qui répond n'importe quoi avec assurance."
          />

          <ul className="mt-6 grid gap-3 sm:grid-cols-2">
            {cequilNeFaitPas.map((t) => (
              <li key={t} className="card flex gap-3 p-4">
                <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-flame-100 text-flame-600 dark:bg-flame-500/15 dark:text-flame-400">
                  <Icon name="close" className="size-4" />
                </span>
                <p className="text-sm/6 text-ink-700 dark:text-ink-300">{t}</p>
              </li>
            ))}
          </ul>
        </section>

        {/* ============================================================
            La suite
            ============================================================ */}
        <section>
          <TitreSection
            surtitre="Version 4"
            titre="Et la vraie IA, alors ?"
            texte="Elle viendra, mais elle demande une chose que le site n'a pas encore."
          />

          <div className="mt-6 card p-6">
            <p className="text-sm/6 text-ink-700 dark:text-ink-300">
              Brancher un modèle de langage exige une clé d'accès payante. Sur
              un site statique comme celui-ci, cette clé serait livrée au
              navigateur de chaque visiteur, donc lisible par tous et utilisable
              par n'importe qui. Il faudra d'abord un serveur pour la garder,
              c'est le chantier des versions 3 et 4.
            </p>
            <p className="mt-3 text-sm/6 text-ink-700 dark:text-ink-300">
              En attendant, ce guide fonctionne pour tout le monde, sans compte,
              sans frais, et même{" "}
              <Link
                to="/projet"
                className="font-medium text-brand-600 underline underline-offset-2 hover:text-brand-700 dark:text-brand-300"
              >
                hors connexion
              </Link>
              . C'est déjà l'essentiel de ce qu'on attend de lui : savoir où
              chercher.
            </p>
          </div>
        </section>

        <NoteDemo>
          Tout se passe dans ton navigateur : ta question n'est envoyée nulle
          part, et la conversation n'est pas enregistrée. Le jour où un vrai
          modèle de langage sera branché, ce qui lui sera transmis et ce qui ne
          le sera pas sera écrit dans les conditions d'utilisation avant la
          moindre mise en service.
        </NoteDemo>
      </Container>
    </>
  );
}
