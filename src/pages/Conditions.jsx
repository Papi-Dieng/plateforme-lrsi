import { Link } from "react-router-dom";
import Icon from "../components/Icon";
import { Badge, Container, EnTetePage } from "../components/ui";
import { site } from "../data/site";
import { iaActive } from "../ia";

/* ==================================================================
   Conditions d'utilisation.

   Texte volontairement court et lisible. Il décrit ce que fait
   réellement la plateforme aujourd'hui, pas ce qu'elle fera peut-être.
   ================================================================== */

const articles = [
  {
    icone: "graduation",
    titre: "Ce qu'est cette plateforme",
    paragraphes: [
      `${site.nom} est un projet étudiant, gratuit et sans objectif commercial. Il rassemble des cours, des exercices corrigés, des QCM et des liens vidéo pour la filière Réseaux et Systèmes Informatiques.`,
      "Ce n'est pas un service officiel de l'établissement. Les contenus n'engagent que leur auteur et ne remplacent ni les cours ni les consignes des enseignants.",
    ],
  },
  {
    icone: "file",
    titre: "Contenus et droits d'auteur",
    paragraphes: [
      "Les énoncés d'exercices et les questions de QCM ont été rédigés pour la plateforme. Les ressources externes renvoient vers le site de leur auteur, avec leur licence indiquée : rien n'est recopié ni réhébergé.",
      "Aucun cours, support ou sujet d'examen appartenant à l'université ou à un enseignant n'est publié sans autorisation écrite. Toute ressource est retirée à la simple demande de son auteur.",
    ],
  },
  {
    icone: "video",
    titre: "Vidéos",
    paragraphes: [
      "Les vidéos ne sont pas hébergées ici. La plateforme conserve uniquement l'identifiant d'une vidéo YouTube, et la lecture se fait chez YouTube, avec ses propres conditions.",
      "Le lecteur n'est chargé qu'au moment où tu cliques. Chacun reste responsable des liens qu'il ajoute et doit avoir le droit de les partager.",
    ],
  },
  {
    icone: "lock",
    titre: "Données personnelles",
    paragraphes: [
      "En version 1, il n'y a ni serveur ni base de données. Ton profil, ta progression et tes vidéos sont enregistrés uniquement dans ton navigateur, sur cet appareil.",
      iaActive
        ? "Rien de tout cela n'est transmis, et aucun traceur publicitaire n'est utilisé. La seule exception est l'assistant de révision, décrit juste en dessous. Tu peux tout effacer à tout moment depuis les paramètres."
        : "Rien n'est transmis, rien n'est analysé, aucun traceur publicitaire n'est utilisé. Tu peux tout effacer à tout moment depuis les paramètres.",
      "Les formulaires de connexion et d'inscription sont des maquettes : ils ne vérifient rien et n'enregistrent aucun mot de passe. La véritable authentification arrivera en version 3, avec les règles de protection des données qui s'imposent.",
    ],
  },
  ...(iaActive
    ? [
        {
          icone: "sparkles",
          titre: "Assistant de révision et intelligence artificielle",
          paragraphes: [
            "Quand tu poses une question à l'assistant, elle est envoyée à Google Gemini, un service d'intelligence artificielle, pour rédiger la réponse. Partent avec elle : les autres messages de la conversation en cours, et les titres et résumés des contenus de la plateforme liés à ta question.",
            "Ne partent jamais : ton profil, ton nom, ta progression, tes scores ni tes favoris. La question « par où commencer » est calculée dans ton navigateur, sans IA.",
            "Le relais de la plateforme, hébergé chez Cloudflare, n'enregistre ni les questions ni les réponses. Google, en revanche, peut conserver et utiliser les échanges de son offre gratuite pour améliorer ses services : n'écris donc rien de personnel ou de confidentiel dans l'assistant.",
            "Une IA peut se tromper avec assurance. Ses réponses sont signalées comme telles ; en cas de doute, le cours et l'enseignant font foi.",
          ],
        },
      ]
    : []),
  {
    icone: "users",
    titre: "Usage attendu",
    paragraphes: [
      "La plateforme sert à apprendre. Les corrections sont là pour comprendre une méthode, pas pour rendre un devoir sans l'avoir travaillé.",
      "Si tu contribues, propose des contenus originaux ou libres de droits, et signale toute erreur repérée dans un corrigé.",
    ],
  },
  {
    icone: "info",
    titre: "Limites et responsabilité",
    paragraphes: [
      "Les contenus sont fournis en l'état, sans garantie d'exactitude ni de disponibilité. Une erreur reste toujours possible dans un corrigé ou une explication.",
      "En cas de doute sur une notion, l'enseignant et le support officiel du cours font foi.",
    ],
  },
];

export default function Conditions() {
  return (
    <>
      <EnTetePage
        surtitre="Cadre d'usage"
        titre="Conditions d'utilisation"
        texte="Ce que fait la plateforme, ce qu'elle ne fait pas, et ce qu'elle conserve."
      >
        <Badge ton="accent" icone="check">
          Version 1 — mise à jour continue
        </Badge>
      </EnTetePage>

      <Container className="py-10">
        <div className="max-w-3xl space-y-5">
          {articles.map((a, i) => (
            <section key={a.titre} className="card p-6 sm:p-7">
              <h2 className="flex items-center gap-3 text-lg font-semibold text-ink-900 dark:text-white">
                <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300">
                  <Icon name={a.icone} className="size-4.5" />
                </span>
                <span>
                  <span className="mr-2 font-mono text-sm text-ink-400">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  {a.titre}
                </span>
              </h2>
              <div className="mt-4 space-y-3">
                {a.paragraphes.map((p) => (
                  <p key={p} className="text-sm/7 text-ink-600 dark:text-ink-400">
                    {p}
                  </p>
                ))}
              </div>
            </section>
          ))}

          <section className="card p-6 sm:p-7">
            <h2 className="text-lg font-semibold text-ink-900 dark:text-white">
              Une question, une remarque ?
            </h2>
            <p className="mt-2 text-sm/6 text-ink-600 dark:text-ink-400">
              Pour signaler une erreur, demander le retrait d'une ressource ou
              proposer une contribution, écris à l'adresse de contact du projet.
            </p>
            <div className="mt-5 flex flex-wrap gap-4">
              <a
                href={`mailto:${site.contact}`}
                className="text-sm font-medium text-brand-600 hover:underline dark:text-brand-400"
              >
                {site.contact}
              </a>
              <Link
                to="/projet"
                className="text-sm font-medium text-brand-600 hover:underline dark:text-brand-400"
              >
                La démarche du projet
              </Link>
            </div>
          </section>
        </div>
      </Container>
    </>
  );
}
