import { emailTelephone, normaliserTelephone } from "../src/telephone.js";

/* ==================================================================
   Inscription par numéro de téléphone, sans SMS (voir src/telephone.js).

   Seul ce relais peut créer un compte déjà confirmé : il faut pour cela
   la clé « service_role » de Supabase, qui donne tous les droits et ne
   doit jamais être dans le site. Elle se dépose avec
     npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY
   et l'adresse du projet est dans wrangler.toml (SUPABASE_URL).

   Le relais crée le compte et s'arrête là : c'est le site qui se
   connecte ensuite, avec le numéro et le mot de passe. Le mot de passe
   n'est ni gardé ni journalisé ici. La limite de requêtes par visiteur
   (index.js) s'applique, contre les inscriptions en rafale.
   ================================================================== */

const MIN_MOT_DE_PASSE = 8;
const MAX_MOT_DE_PASSE = 72; // borne de bcrypt, utilisé par Supabase
const NIVEAUX = ["Licence 1", "Licence 2", "Licence 3"];

export async function inscrireTelephone(corps, env) {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    return { erreur: "comptes-non-configures", statut: 503 };
  }
  const numero = normaliserTelephone(corps?.telephone);
  if (!numero) return { erreur: "telephone", statut: 400 };
  const motDePasse = typeof corps?.motDePasse === "string" ? corps.motDePasse : "";
  if (motDePasse.length < MIN_MOT_DE_PASSE || motDePasse.length > MAX_MOT_DE_PASSE) {
    return { erreur: "mot-de-passe-faible", statut: 400 };
  }
  const nom = typeof corps?.nom === "string" ? corps.nom.trim().slice(0, 80) : "";
  if (nom.length < 2) return { erreur: "nom", statut: 400 };
  const niveau = NIVEAUX.includes(corps?.niveau) ? corps.niveau : NIVEAUX[0];

  const r = await fetch(`${env.SUPABASE_URL.replace(/\/$/, "")}/auth/v1/admin/users`, {
    method: "POST",
    headers: {
      apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: emailTelephone(numero),
      password: motDePasse,
      email_confirm: true,
      user_metadata: { nom, niveau, telephone: numero },
    }),
  });
  if (r.ok) return { resultat: { ok: true } };

  const detail = await r.json().catch(() => ({}));
  const code = detail?.error_code ?? detail?.code ?? "";
  if (r.status === 422 && /exists|registered/.test(`${code} ${detail?.msg ?? ""}`)) {
    return { erreur: "deja-inscrit", statut: 409 };
  }
  if (code === "weak_password") return { erreur: "mot-de-passe-faible", statut: 400 };
  console.log("Supabase, création de compte", r.status, code);
  return { erreur: "reseau", statut: 502 };
}
