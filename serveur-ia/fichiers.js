/* ==================================================================
   Les cours en PDF, téléversés depuis l'espace admin.

   Chaque fichier est gardé dans Cloudflare KV (gratuit, 25 Mo par
   valeur, 1 Go au total), sous la clé `fichier:<id>`, avec son nom et
   sa taille en métadonnées.

   - Téléverser demande le mot de passe admin, et seul un vrai PDF est
     accepté : le contenu doit commencer par la signature « %PDF- »,
     quel que soit le nom du fichier.
   - Lire est public : un étudiant ouvre le PDF depuis la page du cours,
     par un simple lien, sans en-tête d'origine.
   - Un PDF qui n'est plus cité par aucune version publiée (actuelle ou
     précédente) est supprimé au bout d'un jour, au moment d'une
     publication. Le délai laisse le temps de publier un fichier qu'on
     vient de téléverser.
   ================================================================== */

export const TAILLE_MAX_PDF = 20 * 1024 * 1024;
export const ID_FICHIER = /^[a-z0-9]{16,32}$/;
const PREFIXE = "fichier:";
const DELAI_AVANT_MENAGE = 24 * 60 * 60 * 1000;

const nomPropre = (nom) =>
  String(nom ?? "cours.pdf")
    .replace(/[^\p{L}\p{N} ._()-]/gu, "_")
    .slice(0, 120) || "cours.pdf";

export async function televerserPdf(requete, env) {
  const taille = Number(requete.headers.get("Content-Length") ?? 0);
  if (taille > TAILLE_MAX_PDF) return { erreur: "pdf-trop-gros", statut: 413 };

  const octets = await requete.arrayBuffer();
  if (octets.byteLength > TAILLE_MAX_PDF) return { erreur: "pdf-trop-gros", statut: 413 };
  const signature = new TextDecoder().decode(new Uint8Array(octets, 0, Math.min(5, octets.byteLength)));
  if (signature !== "%PDF-") return { erreur: "pas-un-pdf", statut: 415 };

  const id = [...crypto.getRandomValues(new Uint8Array(12))]
    .map((o) => o.toString(16).padStart(2, "0"))
    .join("");
  const fichier = {
    id,
    nom: nomPropre(decodeURIComponent(requete.headers.get("X-Nom-Fichier") ?? "")),
    taille: octets.byteLength,
  };
  await env.EDUCATION.put(PREFIXE + id, octets, {
    metadata: { ...fichier, televerseLe: Date.now() },
  });
  return { fichier };
}

export async function servirPdf(id, env) {
  if (!ID_FICHIER.test(id) || !env.EDUCATION) return new Response("Introuvable", { status: 404 });
  const { value, metadata } = await env.EDUCATION.getWithMetadata(PREFIXE + id, "arrayBuffer");
  if (!value) return new Response("Introuvable", { status: 404 });

  const nom = metadata?.nom ?? "cours.pdf";
  return new Response(value, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(nom)}`,
      // Le navigateur ne doit jamais le traiter comme autre chose qu'un PDF.
      "X-Content-Type-Options": "nosniff",
      // Un fichier ne change jamais : un nouveau PDF a un nouvel identifiant.
      "Cache-Control": "public, max-age=31536000, immutable",
      "Access-Control-Allow-Origin": "*",
    },
  });
}

/* Les identifiants de PDF cités par une version du contenu : cours des
   chapitres, énoncés et corrections des exercices et des examens. Un
   PDF absent d'ici serait supprimé par le ménage. */
export const pdfsCites = (contenu) =>
  [
    ...(contenu?.matieres ?? []).flatMap((m) => (m.chapitres ?? []).map((c) => c.pdf)),
    ...[...(contenu?.exercices ?? []), ...(contenu?.examens ?? [])].flatMap((e) => [
      e.pdfEnonce,
      e.pdfCorrige,
    ]),
  ]
    .map((p) => p?.id)
    .filter(Boolean);

export async function menagePdfs(env, versions) {
  const gardes = new Set(versions.flatMap(pdfsCites));
  const maintenant = Date.now();
  let curseur;
  do {
    const page = await env.EDUCATION.list({ prefix: PREFIXE, cursor: curseur });
    for (const cle of page.keys) {
      const id = cle.name.slice(PREFIXE.length);
      const ancien = maintenant - (cle.metadata?.televerseLe ?? 0) > DELAI_AVANT_MENAGE;
      if (!gardes.has(id) && ancien) await env.EDUCATION.delete(cle.name);
    }
    curseur = page.list_complete ? undefined : page.cursor;
  } while (curseur);
}
