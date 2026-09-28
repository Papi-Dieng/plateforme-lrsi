/* ==================================================================
   Préparer une image jointe à une question pour l'IA.

   Une photo de téléphone pèse souvent 3 à 8 Mo : on la redessine dans
   le navigateur, au plus 1600 pixels de côté, en JPEG. Elle reste
   lisible (un énoncé photographié, un schéma) et descend autour de
   300 Ko : l'envoi est rapide, même en 3G, et le relais l'accepte (il
   refuse au-delà de 3 Mo, et tout autre type que JPEG, PNG ou WebP).

   Redessiner a un autre effet utile : les métadonnées de la photo
   (position GPS, modèle du téléphone) ne sont pas recopiées.
   ================================================================== */

export const TYPES_ACCEPTES = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif", "image/gif"];
export const TAILLE_MAX_FICHIER = 15 * 1024 * 1024;
const COTE_MAX = 1600;
const QUALITE = 0.85;

const lireImage = (fichier) =>
  new Promise((resoudre, rejeter) => {
    const url = URL.createObjectURL(fichier);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resoudre(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      rejeter(new Error("illisible"));
    };
    img.src = url;
  });

/* Renvoie { type, donnees (base64, sans préfixe), apercu (data URL),
   nom } ou lève une erreur « type », « taille » ou « illisible ». */
export async function preparerImage(fichier) {
  if (!fichier || !fichier.type.startsWith("image/")) throw new Error("type");
  if (fichier.size > TAILLE_MAX_FICHIER) throw new Error("taille");

  const img = await lireImage(fichier);
  const echelle = Math.min(1, COTE_MAX / Math.max(img.naturalWidth, img.naturalHeight));
  const largeur = Math.max(1, Math.round(img.naturalWidth * echelle));
  const hauteur = Math.max(1, Math.round(img.naturalHeight * echelle));

  const toile = document.createElement("canvas");
  toile.width = largeur;
  toile.height = hauteur;
  const ctx = toile.getContext("2d");
  // Fond blanc : une image transparente (PNG) ne devient pas noire en JPEG.
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, largeur, hauteur);
  ctx.drawImage(img, 0, 0, largeur, hauteur);

  const apercu = toile.toDataURL("image/jpeg", QUALITE);
  return {
    type: "image/jpeg",
    donnees: apercu.slice(apercu.indexOf(",") + 1),
    apercu,
    nom: fichier.name || "image",
  };
}

export function messageErreurImage(code) {
  if (code === "taille") return "Cette image est trop lourde (15 Mo au plus).";
  if (code === "illisible") return "Cette image n'a pas pu être lue. Essaie une photo en JPEG ou PNG.";
  return "Ce fichier n'est pas une image.";
}
