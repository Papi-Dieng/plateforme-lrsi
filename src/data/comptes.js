/* ==================================================================
   Comptes étudiants : le projet Supabase.

   Les deux valeurs se trouvent dans Supabase, Project Settings → API :
     - « Project URL »            → url
     - « anon public » (ou « publishable ») → cleAnon

   La clé « anon » est faite pour être publique : elle est dans le site
   de toute façon. Ce qui protège les données, ce sont les règles de
   supabase/schema.sql. Ne JAMAIS mettre ici la clé « service_role ».

   Tant que l'une des deux est vide, les comptes sont éteints : les
   écrans de connexion le disent, et le mode invité reste disponible.
   ================================================================== */

export const comptes = {
  url: "https://coszkdebnemjfxbprmfi.supabase.co",
  cleAnon:
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNvc3prZGVibmVtamZ4YnBybWZpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA3MTQ3NDUsImV4cCI6MjEwNjI5MDc0NX0.18Mf3R64tRPvHpj5BUj3wgkmj1M9JlQUiJfSmZk0ZMw",
};

export const comptesActifs = Boolean(comptes.url && comptes.cleAnon);
