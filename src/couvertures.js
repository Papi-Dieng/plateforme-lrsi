import { useEffect, useState } from "react";

/* ==================================================================
   La couverture d'un livre de la bibliothèque, trouvée toute seule.

   Dans l'ordre :
   1. `couverture`, si la ressource en donne une ;
   2. une couverture rangée sur le site (public/couvertures), retrouvée
      par le titre : le relais ne garde pas ce champ, la page le
      reconnaît donc elle-même ;
   3. le lien du livre : une page d'archive.org, d'Open Library ou de
      Google Livres a une image de couverture connue, et un lien qui
      contient un ISBN se lit chez Open Library ;
   4. en dernier, une recherche chez Open Library par titre et auteur,
      acceptée seulement si le titre correspond exactement et que le
      nom de l'auteur s'y retrouve (sinon « Power » donnerait « The
      Power and the Glory »). Le résultat est gardé dans le navigateur.
   Rien trouvé, ou image qui ne vient pas : la page compose une
   couverture à partir du titre.
   ================================================================== */

const CLE = "lrsi-couvertures";

const normalise = (s = "") =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const LOCALES = {
  [normalise("Computer Networks: A Systems Approach")]: "couvertures/cn.jpg",
  [normalise("Operating Systems: Three Easy Pieces")]: "couvertures/ostep.jpg",
  [normalise("The Linux Command Line")]: "couvertures/tlcl.jpg",
  [normalise("Open Data Structures")]: "couvertures/ods.jpg",
  [normalise("Think Python")]: "couvertures/tp.jpg",
};

const surLeSite = (chemin) => (/^https?:/.test(chemin) ? chemin : `${import.meta.env.BASE_URL}${chemin}`);

export function couvertureDuLien(url) {
  if (!url) return null;
  let u;
  try {
    u = new URL(url);
  } catch {
    return null;
  }
  const hote = u.hostname.replace(/^www\./, "");
  if (hote === "archive.org") {
    const m = u.pathname.match(/^\/details\/([^/]+)/);
    if (m) return `https://archive.org/services/img/${m[1]}`;
  }
  if (hote === "openlibrary.org") {
    const m = u.pathname.match(/\/books\/(OL\d+M)/);
    if (m) return `https://covers.openlibrary.org/b/olid/${m[1]}-L.jpg?default=false`;
  }
  if (/^books\.google\./.test(hote) && u.searchParams.get("id")) {
    return `https://books.google.com/books/content?id=${encodeURIComponent(u.searchParams.get("id"))}&printsec=frontcover&img=1&zoom=1`;
  }
  const isbn = url.replace(/-/g, "").match(/(97[89]\d{10})|\/dp\/(\d{9}[\dX])/i);
  if (isbn) return `https://covers.openlibrary.org/b/isbn/${isbn[1] || isbn[2]}-L.jpg?default=false`;
  return null;
}

function couvertureImmediate(r) {
  if (r.couverture) return surLeSite(r.couverture);
  const locale = LOCALES[normalise(r.titre)];
  if (locale) return surLeSite(locale);
  return couvertureDuLien(r.url);
}

const cleDe = (r) => `${normalise(r.titre)}|${normalise(r.auteurs)}`;

function lireCache() {
  try {
    return JSON.parse(localStorage.getItem(CLE)) ?? {};
  } catch {
    return {};
  }
}

function ecrireCache(cle, valeur) {
  try {
    localStorage.setItem(CLE, JSON.stringify({ ...lireCache(), [cle]: valeur }));
  } catch {
    // Stockage indisponible : on cherchera de nouveau la prochaine fois.
  }
}

async function chercher(r) {
  const titre = normalise(r.titre);
  const nom = normalise(r.auteurs).split(" ").filter((m) => m.length > 2).pop();
  if (!titre || !nom) return "";
  const adresse = `https://openlibrary.org/search.json?title=${encodeURIComponent(r.titre)}&author=${encodeURIComponent(nom)}&fields=title,author_name,cover_i&limit=10`;
  const reponse = await fetch(adresse);
  if (!reponse.ok) return "";
  const { docs = [] } = await reponse.json();
  const bon = docs.find(
    (d) => d.cover_i && normalise(d.title) === titre && (d.author_name ?? []).some((a) => normalise(a).includes(nom))
  );
  return bon ? `https://covers.openlibrary.org/b/id/${bon.cover_i}-L.jpg` : "";
}

/* L'adresse de la couverture, ou null tant qu'on n'en a pas. */
export function useCouverture(r) {
  const immediate = couvertureImmediate(r);
  const cle = cleDe(r);
  const [trouvee, setTrouvee] = useState(() => lireCache()[cle]);

  const { titre, auteurs, type } = r;
  useEffect(() => {
    if (immediate || type !== "Livre" || lireCache()[cle] !== undefined) return;
    let actif = true;
    chercher({ titre, auteurs })
      .then((url) => {
        ecrireCache(cle, url);
        if (actif) setTrouvee(url);
      })
      .catch(() => {});
    return () => {
      actif = false;
    };
  }, [immediate, cle, titre, auteurs, type]);

  return immediate || trouvee || null;
}
