import { useCallback, useMemo, useState } from "react";
import { SessionContext, ecrireSession, lireSession } from "./session";

// Fournit la session à toute l'application. Voir src/session.js pour ce
// qui est réellement conservé : le mode et le nom affiché, rien d'autre.
export function FournisseurSession({ children }) {
  const [session, setSession] = useState(lireSession);

  const entrer = useCallback((mode, nom) => {
    const suite = {
      mode,
      nom: mode === "invite" ? "Invité" : nom || "Étudiant",
      depuis: new Date().toISOString(),
    };
    setSession(suite);
    ecrireSession(suite);
  }, []);

  const sortir = useCallback(() => {
    setSession(null);
    ecrireSession(null);
  }, []);

  const valeur = useMemo(
    () => ({ session, entrer, sortir }),
    [session, entrer, sortir]
  );

  return (
    <SessionContext.Provider value={valeur}>{children}</SessionContext.Provider>
  );
}
