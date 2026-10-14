import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { SessionContext, ecrireSession, lireSession } from "./session";
import { client, comptesActifs, deconnecter, nettoyerAdresse, sessionDeCompte, supprimerCompte } from "./comptes";
import { lancerSynchro, oublierDonneesLocales, oublierReserve } from "./synchro";
import { definirStockage } from "./stockage";

// Retour d'un lien Supabase (Google, confirmation, mot de passe oublié).
const retourDeLien = () => /[?&](code|error)=/.test(window.location.search);

// Fournit la session à toute l'application. Voir src/session.js pour les
// deux modes, et src/comptes.js pour les comptes.
export function FournisseurSession({ children }) {
  const [session, setSession] = useState(lireSession);
  // Augmente quand des données venues du compte ont été recopiées ici :
  // Layout.jsx s'en sert pour faire relire la page affichée.
  const [versionDonnees, setVersionDonnees] = useState(0);
  const synchro = useRef(null);
  const branche = useRef(false);

  const arreterSynchro = () => {
    synchro.current?.arreter();
    synchro.current = null;
  };

  /* Écoute Supabase : connexion, déconnexion, session expirée, retour
     d'un lien. La bibliothèque n'est chargée qu'à ce moment-là. */
  const brancher = useCallback(() => {
    if (!comptesActifs || branche.current) return;
    branche.current = true;
    client()
      .then((sb) => {
        sb.auth.onAuthStateChange((evenement, s) => {
          // Supabase déconseille d'attendre ses propres appels ici : on
          // laisse d'abord son traitement se terminer.
          setTimeout(() => {
            if (evenement === "INITIAL_SESSION") nettoyerAdresse();
            if (evenement === "PASSWORD_RECOVERY") window.location.hash = "#/nouveau-mot-de-passe";

            const utilisateur = s?.user;
            if (utilisateur) {
              const suite = sessionDeCompte(utilisateur);
              // Ce que l'invité venait de faire rejoint le compte.
              definirStockage("compte");
              setSession(suite);
              ecrireSession(suite);
              if (synchro.current?.utilisateur !== utilisateur.id) {
                arreterSynchro();
                synchro.current = {
                  utilisateur: utilisateur.id,
                  ...lancerSynchro(sb, utilisateur.id, { surChangement: () => setVersionDonnees((v) => v + 1) }),
                };
              }
            } else if (lireSession()?.mode === "compte") {
              // Session expirée ou fermée sur un autre onglet : ce qui
              // n'a pas pu partir reste en réserve pour ce compte.
              arreterSynchro();
              oublierDonneesLocales(lireSession()?.id);
              definirStockage(null);
              setSession(null);
              ecrireSession(null);
            }
          }, 0);
        });
      })
      .catch((e) => console.log("Comptes indisponibles", e));
  }, []);

  useEffect(() => {
    if (lireSession()?.mode === "compte" || retourDeLien()) brancher();
    // Depuis le 14 octobre 2026, seul un compte conserve la progression
    // (src/stockage.js) : sans compte, ce qui traîne sur l'appareil est
    // effacé au démarrage.
    else oublierDonneesLocales();
  }, [brancher]);

  const entrer = useCallback((mode, nom) => {
    definirStockage(mode);
    // Sans compte, le navigateur ne garde rien : ce qu'une visite
    // précédente aurait laissé est effacé en entrant.
    if (mode !== "compte") oublierDonneesLocales();
    const suite = {
      mode,
      nom: mode === "invite" ? "Invité" : nom || "Étudiant",
      depuis: new Date().toISOString(),
    };
    setSession(suite);
    ecrireSession(suite);
  }, []);

  /* Quitter : pour un compte, on envoie d'abord les derniers changements,
     puis on efface tout de cet appareil. */
  const sortir = useCallback(async () => {
    const actuelle = lireSession();
    if (actuelle?.mode === "compte") {
      await synchro.current?.envoyerMaintenant();
      arreterSynchro();
      await deconnecter();
      // Sans réseau, l'envoi a échoué : la progression reste en réserve
      // pour ce compte, au lieu d'être perdue.
      oublierDonneesLocales(actuelle.id);
    }
    definirStockage(null);
    setSession(null);
    ecrireSession(null);
  }, []);

  const supprimer = useCallback(async () => {
    const id = lireSession()?.id;
    arreterSynchro();
    const r = await supprimerCompte();
    if (r.erreur) return r;
    if (id) oublierReserve(id);
    oublierDonneesLocales();
    definirStockage(null);
    setSession(null);
    ecrireSession(null);
    return r;
  }, []);

  const valeur = useMemo(
    () => ({ session, entrer, sortir, supprimer, brancher, versionDonnees }),
    [session, entrer, sortir, supprimer, brancher, versionDonnees]
  );

  return (
    <SessionContext.Provider value={valeur}>{children}</SessionContext.Provider>
  );
}
