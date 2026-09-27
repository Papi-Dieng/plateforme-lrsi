import { Component } from "react";
import Icon from "./Icon";

/* ==================================================================
   Le filet : si une page plante, on affiche un message à sa place au
   lieu d'une page blanche, et le reste du site continue de marcher.

   Deux niveaux :
   - autour de chaque page, dans la coque (Layout.jsx) : la barre
     latérale et le menu restent utilisables, et le filet se remet à
     zéro quand on change de page (il reçoit l'adresse en `key`) ;
   - autour de toute l'application (main.jsx), pour le cas où la coque
     elle-même planterait : `pleinEcran`.

   Cas particulier : une page chargée à la demande (React.lazy) dont le
   fichier n'existe plus, parce qu'une nouvelle version du site a été
   mise en ligne entre-temps. Recharger suffit, et le message le dit.
   ================================================================== */

const estVersionPerimee = (erreur) =>
  /dynamically imported module|Importing a module script failed|error loading dynamically imported module|Failed to fetch/i.test(
    String(erreur?.message ?? "")
  );

export default class FiletErreur extends Component {
  // `erreurInitiale` : une erreur déjà survenue avant l'affichage, par
  // exemple l'application qui n'a pas pu se charger (main.jsx).
  state = { erreur: this.props.erreurInitiale ?? null };

  static getDerivedStateFromError(erreur) {
    return { erreur };
  }

  componentDidCatch(erreur, info) {
    console.error("Page plantée, filet affiché à la place :", erreur, info?.componentStack);
  }

  render() {
    const { erreur } = this.state;
    if (!erreur) return this.props.children;

    const perimee = estVersionPerimee(erreur);
    const bouton = "inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold";
    return (
      <div className={this.props.pleinEcran ? "grid min-h-screen place-items-center bg-ink-100 p-4 dark:bg-ink-950" : "px-4 py-16 sm:px-7"}>
        <div role="alert" className="card mx-auto flex max-w-lg flex-col items-center px-6 py-12 text-center">
          <div className="mb-4 grid size-12 place-items-center rounded-full bg-flame-100 text-flame-600 dark:bg-flame-500/15 dark:text-flame-400">
            <Icon name={perimee ? "rocket" : "info"} className="size-5" />
          </div>
          <h1 className="text-lg font-semibold text-ink-900 dark:text-white">
            {perimee ? "Une nouvelle version du site est en ligne" : "Cette page a rencontré un problème"}
          </h1>
          <p className="mt-2 max-w-sm text-sm/6 text-ink-600 dark:text-ink-400">
            {perimee
              ? "Recharge la page pour l'afficher. Ta progression est gardée dans ton navigateur : tu ne perds rien."
              : "Ta progression n'est pas touchée : elle est gardée dans ton navigateur. Recharge la page, ou reviens au tableau de bord. Si le problème revient, signale-le à l'équipe."}
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <button type="button" onClick={() => window.location.reload()} className={`${bouton} bg-brand-600 text-white hover:bg-brand-700`}>
              Recharger la page
            </button>
            <a
              href="#/tableau-de-bord"
              onClick={() => this.setState({ erreur: null })}
              className={`${bouton} border border-ink-200 text-ink-700 hover:bg-ink-50 dark:border-ink-700 dark:text-ink-200 dark:hover:bg-ink-800`}
            >
              Revenir au tableau de bord
            </a>
          </div>
        </div>
      </div>
    );
  }
}
