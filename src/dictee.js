import { useEffect, useRef, useState } from "react";

/* ==================================================================
   Dictée : la voix devient du texte dans la zone de saisie.

   On utilise la reconnaissance vocale du navigateur (Web Speech API).
   Elle n'existe pas partout : Chrome, Edge et Safari la proposent,
   Firefox non. Sans elle, le bouton micro n'apparaît pas.

   Attention, et c'est dit dans la politique de confidentialité : dans
   Chrome, le son est envoyé aux serveurs de Google pour être transcrit
   (chez Apple pour Safari). La plateforme, elle, ne reçoit que le texte,
   et seulement si l'étudiant l'envoie.
   ================================================================== */

const Reconnaissance = () => (typeof window === "undefined" ? null : window.SpeechRecognition ?? window.webkitSpeechRecognition ?? null);

export const dicteePossible = () => Boolean(Reconnaissance());

/* `surTexte(texte)` reçoit, pendant la dictée, le texte d'avant la dictée
   suivi de ce qui a été dit jusqu'ici. */
export function useDictee(surTexte) {
  const [enCours, setEnCours] = useState(false);
  const [secondes, setSecondes] = useState(0);
  const [erreur, setErreur] = useState("");
  const reconnaissance = useRef(null);
  // Toujours la dernière version du rappel, sans relancer la dictée.
  const rappel = useRef(surTexte);
  useEffect(() => {
    rappel.current = surTexte;
  }, [surTexte]);

  useEffect(() => {
    if (!enCours) return undefined;
    const minuteur = setInterval(() => setSecondes((s) => s + 1), 1000);
    return () => clearInterval(minuteur);
  }, [enCours]);

  // Arrêter en quittant la page.
  useEffect(() => () => reconnaissance.current?.abort(), []);

  const demarrer = (texteAvant) => {
    const Classe = Reconnaissance();
    if (!Classe || enCours) return;
    const r = new Classe();
    r.lang = "fr-FR";
    r.continuous = true;
    r.interimResults = true;
    const debut = texteAvant.trim() ? `${texteAvant.trim()} ` : "";
    r.onresult = (e) => {
      const dit = Array.from(e.results, (x) => x[0].transcript).join("");
      rappel.current(debut + dit.trimStart());
    };
    r.onerror = (e) => {
      setErreur(
        e.error === "not-allowed" || e.error === "service-not-allowed"
          ? "Le micro est bloqué : autorise-le dans les réglages du navigateur (cadenas à gauche de l'adresse)."
          : e.error === "no-speech"
            ? "Je n'ai rien entendu. Réessaie en parlant plus près du micro."
            : "La dictée s'est arrêtée (connexion ?). Tu peux écrire ta question."
      );
    };
    r.onend = () => {
      setEnCours(false);
      reconnaissance.current = null;
    };
    reconnaissance.current = r;
    setErreur("");
    setSecondes(0);
    setEnCours(true);
    r.start();
  };

  const arreter = () => reconnaissance.current?.stop();

  return { enCours, secondes, erreur, demarrer, arreter };
}
