import PageJuridique from "../components/PageJuridique";
import { nomEditeur, site } from "../data/site";
import { iaActive } from "../ia";
import { comptesActifs } from "../data/comptes";

/* ==================================================================
   Mentions légales : qui publie le site, qui l'héberge.

   L'éditeur, l'équipe et le contact viennent de src/data/site.js.
   ================================================================== */

const articles = [
  {
    icone: "users",
    titre: "Éditeur",
    paragraphes: [
      {
        liste: [
          ["Site", `${site.nom}, plateforme de révision de la ${site.filiere}.`],
          ["Publié par", `${nomEditeur}, dans le cadre d'un projet étudiant non commercial.`],
          ...(site.editeur ? [["Responsable de la publication", site.editeur]] : []),
          ["Contact", site.contact],
        ],
      },
      ...(site.equipe?.length
        ? ["L'équipe :", { liste: site.equipe.map((m) => [m.nom, m.role]) }]
        : []),
      "Ce site n'est pas un service officiel de l'établissement.",
    ],
  },
  {
    icone: "network",
    titre: "Hébergement",
    paragraphes: [
      {
        liste: [
          ["Le site", "GitHub Pages, service de GitHub, Inc., San Francisco, États-Unis."],
          ["Le relais et les fichiers publiés", "Cloudflare Workers, service de Cloudflare, Inc., San Francisco, États-Unis."],
          ...(comptesActifs
            ? [
                ["Les comptes et leur base de données", "Supabase, service de Supabase, Inc., San Francisco, États-Unis."],
                ["Les emails du compte", "Brevo, service de Sendinblue SAS, Paris, France."],
              ]
            : []),
          ...(iaActive ? [["L'intelligence artificielle", "Google Gemini, service de Google LLC, Mountain View, États-Unis."]] : []),
        ],
      },
    ],
    liens: [
      { href: "https://pages.github.com", label: "GitHub Pages" },
      { href: "https://workers.cloudflare.com", label: "Cloudflare Workers" },
      ...(comptesActifs
        ? [
            { href: "https://supabase.com", label: "Supabase" },
            { href: "https://www.brevo.com/fr/", label: "Brevo" },
          ]
        : []),
    ],
  },
  {
    icone: "file",
    titre: "Propriété intellectuelle",
    paragraphes: [
      "Les contenus rédigés pour la plateforme appartiennent à leurs auteurs. Les ressources externes restent la propriété de leurs auteurs et sont citées avec leur licence. Les marques citées (YouTube, GitHub, Cloudflare, Google, Supabase, Brevo) appartiennent à leurs propriétaires.",
      "Le site est construit avec des logiciels libres, notamment React, React Router, Vite et Tailwind CSS, sous licence MIT. Les icônes sont intégrées au site en SVG, et les avatars ont été dessinés pour le projet. L'animation d'attente de l'IA est adaptée d'un composant de kokonutUI (licence MIT) ; la zone de saisie de l'assistant s'inspire de l'apparence du composant « AI Prompt Box » publié sur 21st.dev, réécrit sans en reprendre le code ; de même pour le carrousel de l'équipe, qui s'inspire du « Team Carousel » de lightswind. Le pied de page reprend le composant « Beam Wordmark Footer » de Kedhar, publié sur 21st.dev.",
    ],
    liens: [{ to: "/conditions", label: "Conditions d'utilisation" }],
  },
  {
    icone: "info",
    titre: "Signaler un contenu",
    paragraphes: [
      `Pour signaler une erreur, un contenu qui pose problème ou une ressource publiée sans autorisation, écris à ${site.contact}. Toute ressource est retirée à la simple demande de son auteur.`,
    ],
  },
];

export default function MentionsLegales() {
  return (
    <PageJuridique
      surtitre="Informations légales"
      titre="Mentions légales"
      texte="Qui publie la plateforme, et qui l'héberge."
      articles={articles}
    />
  );
}
