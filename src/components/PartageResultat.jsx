import { useState } from "react";
import Icon from "./Icon";
import { site } from "../data/site";

/* ==================================================================
   Partager un QCM réussi : une image dessinée dans le navigateur (le
   titre du QCM, le pourcentage, le nom du site), SANS aucune donnée
   personnelle (ni nom, ni compte, ni date de naissance). Sur téléphone,
   le partage du système (WhatsApp, etc.) ; ailleurs, l'image est
   téléchargée et un lien WhatsApp avec le texte est proposé.
   ================================================================== */

const COTE = 1080;

// Coupe un texte en lignes qui tiennent dans `largeur`.
function lignes(ctx, texte, largeur, max = 3) {
  const mots = texte.split(/\s+/);
  const res = [];
  let ligne = "";
  for (const mot of mots) {
    const essai = ligne ? `${ligne} ${mot}` : mot;
    if (ctx.measureText(essai).width > largeur && ligne) {
      res.push(ligne);
      ligne = mot;
    } else ligne = essai;
  }
  if (ligne) res.push(ligne);
  if (res.length > max) {
    res.length = max;
    res[max - 1] = `${res[max - 1].replace(/\s+\S*$/, "")}…`;
  }
  return res;
}

function dessinerImage({ titre, taux, score, total }) {
  const toile = document.createElement("canvas");
  toile.width = COTE;
  toile.height = COTE;
  const ctx = toile.getContext("2d");
  const fond = ctx.createLinearGradient(0, 0, COTE, COTE);
  fond.addColorStop(0, "#271627");
  fond.addColorStop(1, "#4a1f4a");
  ctx.fillStyle = fond;
  ctx.fillRect(0, 0, COTE, COTE);
  // Quadrillage discret.
  ctx.strokeStyle = "rgba(255,255,255,0.05)";
  for (let x = 0; x <= COTE; x += 54) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, COTE);
    ctx.moveTo(0, x);
    ctx.lineTo(COTE, x);
    ctx.stroke();
  }
  const police = (taille, graisse = 800) => `${graisse} ${taille}px system-ui, -apple-system, "Segoe UI", sans-serif`;
  ctx.fillStyle = "#a3e635";
  ctx.font = police(34, 700);
  ctx.fillText("QCM RÉUSSI", 90, 150);
  ctx.fillStyle = "#ffffff";
  ctx.font = police(64);
  lignes(ctx, titre, COTE - 180).forEach((l, i) => ctx.fillText(l, 90, 250 + i * 78));
  ctx.fillStyle = "#a3e635";
  ctx.font = police(300);
  ctx.fillText(`${taux}%`, 80, 760);
  ctx.fillStyle = "rgba(255,255,255,0.8)";
  ctx.font = police(40, 600);
  ctx.fillText(`${score} bonne${score > 1 ? "s" : ""} réponse${score > 1 ? "s" : ""} sur ${total}`, 90, 840);
  ctx.fillStyle = "#ffffff";
  ctx.font = police(46);
  ctx.fillText(site.nom, 90, 980);
  return toile;
}

export default function PartageResultat({ titre, taux, score, total, className }) {
  const [message, setMessage] = useState("");
  const texte = `J'ai réussi le QCM « ${titre} » avec ${taux} % sur ${site.nom} !`;

  const partager = async () => {
    setMessage("");
    const toile = dessinerImage({ titre, taux, score, total });
    const blob = await new Promise((ok) => toile.toBlob(ok, "image/png"));
    const fichier = blob && new File([blob], "resultat-qcm.png", { type: "image/png" });
    try {
      if (fichier && navigator.canShare?.({ files: [fichier] })) {
        await navigator.share({ files: [fichier], text: texte });
        return;
      }
    } catch (e) {
      if (e?.name === "AbortError") return; // partage annulé
    }
    // Pas de partage de fichiers ici : l'image est téléchargée.
    if (blob) {
      const lien = document.createElement("a");
      lien.href = URL.createObjectURL(blob);
      lien.download = "resultat-qcm.png";
      lien.click();
      setTimeout(() => URL.revokeObjectURL(lien.href), 2000);
    }
    setMessage("L'image est téléchargée : joins-la à ton message.");
  };

  return (
    <div className={className}>
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={partager}
          className="inline-flex min-h-12 items-center gap-2 rounded-[14px] border border-white/20 px-4.5 text-sm font-bold transition-colors hover:bg-white/10"
        >
          <Icon name="external" className="size-4" />
          Partager mon résultat
        </button>
        <a
          href={`https://wa.me/?text=${encodeURIComponent(texte)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm font-bold underline underline-offset-4 hover:text-lime-400"
        >
          Sur WhatsApp
        </a>
      </div>
      {message && (
        <p role="status" className="mt-2 text-[13px] text-ink-200">
          {message}
        </p>
      )}
    </div>
  );
}
