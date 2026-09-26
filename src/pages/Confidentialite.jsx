import PageJuridique from "../components/PageJuridique";
import { nomEditeur, site } from "../data/site";
import { iaActive } from "../ia";

/* ==================================================================
   Politique de confidentialité.

   Elle décrit ce que le code fait vraiment : chaque service extérieur
   cité ici est contacté par le site (voir le README, section « Où vit
   la progression », et e2e/outils.js pour la liste des appels au
   relais). Toute nouvelle donnée envoyée hors du navigateur doit être
   ajoutée ici, et la date de mise à jour changée dans src/data/site.js.
   ================================================================== */

const articles = [
  {
    icone: "check",
    titre: "En bref",
    paragraphes: [
      "Pas de compte, pas de publicité, pas de mesure d'audience, pas de cookie déposé par la plateforme. Ta fiche profil et ta progression restent dans ton navigateur, sur ton appareil.",
      iaActive
        ? "Pour fonctionner, le site contacte quelques services extérieurs : son hébergeur, son relais, YouTube pour les vidéos, et Google Gemini quand tu utilises un outil d'intelligence artificielle. Chacun est détaillé ci-dessous, avec ce qu'il reçoit."
        : "Pour fonctionner, le site contacte quelques services extérieurs : son hébergeur, son relais et YouTube pour les vidéos. Chacun est détaillé ci-dessous, avec ce qu'il reçoit.",
    ],
  },
  {
    icone: "users",
    titre: "Qui est responsable",
    paragraphes: [
      `${site.nom} est un projet étudiant, gratuit et sans but commercial, publié par ${nomEditeur}. Pour toute question sur tes données, écris à ${site.contact}.`,
    ],
    liens: [{ to: "/mentions-legales", label: "Mentions légales" }],
  },
  {
    icone: "lock",
    titre: "Ce qui reste sur ton appareil",
    paragraphes: [
      "Ces informations sont enregistrées dans le stockage local de ton navigateur. Elles ne sont envoyées nulle part, et ne suivent pas d'un appareil à l'autre :",
      {
        liste: [
          ["Ta fiche profil", "Avatar, nom d'utilisateur, âge, téléphone, e-mail, niveau et matricule. Tous ces champs sont facultatifs."],
          ["Ta progression", "Scores des QCM et détail des réponses, exercices travaillés, chapitres lus, favoris, vidéos ajoutées et vues, QCM à revoir."],
          ["Ton organisation", "Emploi du temps, examens, programme de révision et disponibilités de la semaine."],
          ["Tes réglages", "Thème, taille du texte en plein écran, rappels de révision, refus des statistiques anonymes, nom affiché dans la barre du haut."],
        ],
      },
      "Tu peux tout voir et tout effacer dans les paramètres. « Télécharger ma sauvegarde » crée un fichier que tu gardes toi-même : la plateforme n'en conserve pas de copie. Vider les données de ton navigateur efface aussi ces informations.",
    ],
    liens: [{ to: "/parametres", label: "Paramètres : voir et effacer mes données" }],
  },
  {
    icone: "network",
    titre: "Ce qui sort de ton appareil, et vers qui",
    paragraphes: [
      {
        liste: [
          [
            "L'hébergeur du site : GitHub Pages",
            "Comme pour tout site web, ton navigateur transmet ton adresse IP et quelques informations techniques (navigateur, page demandée) à chaque visite. GitHub peut les enregistrer dans ses journaux techniques, pour la sécurité de son service.",
          ],
          [
            "Le relais de la plateforme : Cloudflare",
            "À l'ouverture du site, il fournit le contenu publié (cours, exercices, QCM), ainsi que les PDF des cours. Il reçoit ton adresse IP, qu'il utilise un instant pour limiter chaque visiteur à 10 demandes par minute aux outils d'IA, sans l'enregistrer. Il ne garde ni tes questions ni ses réponses. Cloudflare, qui l'héberge, peut tenir ses propres journaux techniques.",
          ],
          [
            "Les statistiques anonymes des QCM",
            "À la fin d'un QCM, la réponse choisie à chaque question est envoyée au relais, sans ton nom, sans ton score et sans aucun identifiant. Il n'en garde que des compteurs par question, pour que l'équipe voie quelles questions sont le plus ratées. Tu peux refuser dans les paramètres : plus rien n'est alors envoyé.",
          ],
          ...(iaActive
            ? [
                [
                  "Google Gemini, seulement quand tu utilises un outil d'IA",
                  "Assistant de révision : ta question, les messages précédents de la conversation, et les titres et textes des contenus de la plateforme liés à ta question. Avis sur une rédaction : la réponse que tu recopies, avec l'énoncé et le corrigé. Programme de révision : les matières, dates et heures de tes examens, tes créneaux libres et les tâches proposées. Jamais ton profil, ton nom, tes scores ni tes favoris. Rien ne part tant que tu ne cliques pas.",
                ],
              ]
            : []),
          [
            "YouTube (Google)",
            "Les miniatures des vidéos sont chargées depuis les serveurs de YouTube dès qu'une vidéo s'affiche dans une liste : YouTube reçoit alors ton adresse IP. La vidéo elle-même ne se charge qu'au clic, en mode de confidentialité renforcée (youtube-nocookie.com) ; en la regardant, tu es soumis aux règles de Google.",
          ],
          [
            "Les rappels de révision",
            "Les notifications sont préparées par ton navigateur, à partir de ton planning. Aucun serveur d'envoi n'est utilisé, et rien n'est transmis pour les produire.",
          ],
        ],
      },
      ...(iaActive
        ? [
            "Attention : Google peut conserver et utiliser les échanges de l'offre gratuite de Gemini pour améliorer ses services, y compris en les faisant relire par des personnes. N'écris donc rien de personnel ou de confidentiel dans les outils d'IA.",
          ]
        : []),
    ],
    liens: [
      { href: "https://docs.github.com/fr/site-policy/privacy-policies/github-general-privacy-statement", label: "Confidentialité chez GitHub" },
      { href: "https://www.cloudflare.com/fr-fr/privacypolicy/", label: "Chez Cloudflare" },
      { href: "https://policies.google.com/privacy?hl=fr", label: "Chez Google" },
    ],
  },
  {
    icone: "shield",
    titre: "Ce que la plateforme ne fait pas",
    paragraphes: [
      "Elle ne vend ni ne partage aucune donnée, n'affiche aucune publicité, n'utilise aucun outil de mesure d'audience ni aucun traceur, et ne dépose aucun cookie. Elle ne dresse aucun profil de toi : l'analyse de tes points forts et de tes points faibles est calculée dans ton navigateur, et y reste.",
    ],
  },
  {
    icone: "clock",
    titre: "Combien de temps",
    paragraphes: [
      "Sur ton appareil : tant que tu ne les effaces pas. Sur le relais : les compteurs anonymes des QCM, tant que le projet existe ; l'équipe peut les remettre à zéro. Chez GitHub, Cloudflare et Google : selon leurs propres politiques, indiquées plus haut.",
    ],
  },
  {
    icone: "graduation",
    titre: "Hors du Sénégal",
    paragraphes: [
      "GitHub, Cloudflare et Google sont des entreprises établies aux États-Unis, dont les serveurs peuvent se trouver hors du Sénégal. Les informations qu'ils reçoivent, décrites plus haut, peuvent donc y être traitées.",
    ],
  },
  {
    icone: "file",
    titre: "Tes droits",
    paragraphes: [
      "La loi sénégalaise n° 2008-12 du 25 janvier 2008 sur la protection des données à caractère personnel te donne un droit d'accès, de rectification, d'opposition et de suppression.",
      "Comme tes informations restent sur ton appareil, tu les consultes, les corriges et les effaces toi-même, depuis ta fiche profil et les paramètres. Les statistiques des QCM sont anonymes : impossible de retrouver les tiennes, mais tu peux en refuser l'envoi. Pour toute autre demande, écris au contact du projet.",
      "Tu peux aussi t'adresser à la Commission de protection des données personnelles (CDP), l'autorité sénégalaise chargée de faire respecter cette loi.",
    ],
  },
  {
    icone: "bell",
    titre: "Modifications",
    paragraphes: [
      "Cette politique suit ce que fait la plateforme. Elle sera mise à jour avant toute nouvelle collecte, en particulier avant l'arrivée des comptes étudiants, qui enregistreront des données sur un serveur. La date de la dernière mise à jour figure en haut de la page.",
    ],
  },
];

export default function Confidentialite() {
  return (
    <PageJuridique
      surtitre="Données personnelles"
      titre="Politique de confidentialité"
      texte="Ce que la plateforme garde, ce qui sort de ton appareil, vers qui, et tes droits."
      articles={articles}
    />
  );
}
