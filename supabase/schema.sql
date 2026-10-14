-- ==================================================================
-- Base de données des comptes étudiants (Supabase).
--
-- À coller une fois dans Supabase : SQL Editor → New query → Run.
-- Le script peut être relancé sans rien casser.
--
-- Les comptes eux-mêmes (email, téléphone, Google, mots de passe
-- hachés) sont gérés par Supabase Auth, dans le schéma `auth` : on n'y
-- touche pas. Ici, une seule table : les données de révision de chaque
-- étudiant (progression, scores, favoris, planning…), la même chose que
-- le fichier de sauvegarde du site (src/sauvegarde.js), rangée en JSON.
--
-- Sécurité : la clé « anon » du site est publique. Ce sont les règles
-- RLS ci-dessous qui protègent les données : chaque étudiant ne peut
-- lire et écrire que SA ligne, et personne ne peut lire celle des autres.
-- ==================================================================

create table if not exists public.donnees_etudiants (
  utilisateur uuid primary key references auth.users (id) on delete cascade,
  donnees jsonb not null default '{}'::jsonb,
  mis_a_jour timestamptz not null default now(),
  -- Même borne que le fichier de sauvegarde : 2 Mo.
  constraint donnees_objet check (jsonb_typeof(donnees) = 'object'),
  constraint donnees_taille check (pg_column_size(donnees) < 2 * 1024 * 1024)
);

alter table public.donnees_etudiants enable row level security;

drop policy if exists "lire ses donnees" on public.donnees_etudiants;
create policy "lire ses donnees" on public.donnees_etudiants
  for select to authenticated using ((select auth.uid()) = utilisateur);

drop policy if exists "creer ses donnees" on public.donnees_etudiants;
create policy "creer ses donnees" on public.donnees_etudiants
  for insert to authenticated with check ((select auth.uid()) = utilisateur);

drop policy if exists "modifier ses donnees" on public.donnees_etudiants;
create policy "modifier ses donnees" on public.donnees_etudiants
  for update to authenticated
  using ((select auth.uid()) = utilisateur)
  with check ((select auth.uid()) = utilisateur);

drop policy if exists "effacer ses donnees" on public.donnees_etudiants;
create policy "effacer ses donnees" on public.donnees_etudiants
  for delete to authenticated using ((select auth.uid()) = utilisateur);

-- La date de mise à jour est posée par la base, pas par le navigateur.
create or replace function public.dater_donnees() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.mis_a_jour := now();
  return new;
end;
$$;

drop trigger if exists dater_donnees on public.donnees_etudiants;
create trigger dater_donnees before insert or update on public.donnees_etudiants
  for each row execute function public.dater_donnees();

-- Supprimer son compte depuis le site (page Paramètres) : la fonction
-- tourne avec les droits du propriétaire, mais n'efface QUE le compte
-- de l'étudiant connecté. Ses données partent avec (on delete cascade).
create or replace function public.supprimer_mon_compte() returns void
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then
    raise exception 'non connecte';
  end if;
  delete from auth.users where id = auth.uid();
end;
$$;

revoke all on function public.supprimer_mon_compte() from public, anon;
grant execute on function public.supprimer_mon_compte() to authenticated;

-- ------------------------------------------------------------------
-- Récupération des comptes téléphone (serveur-ia/secours.js).
--
-- Un compte téléphone n'a pas de boîte mail : pour retrouver l'accès,
-- il a un code de secours (seule son empreinte est gardée) et, s'il le
-- veut, un email de secours confirmé.
--
-- Aucune règle RLS n'autorise qui que ce soit : seul le relais, avec la
-- clé service_role (qui passe outre RLS), lit et écrit cette table. Le
-- site ne la lit jamais directement. Les droits donnés par défaut à
-- anon et authenticated sont retirés en plus, par prudence.
-- ------------------------------------------------------------------

create table if not exists public.secours_comptes (
  utilisateur uuid primary key references auth.users (id) on delete cascade,
  telephone text not null unique,
  code_empreinte text,
  echecs integer not null default 0,
  bloque_jusqua timestamptz,
  email text,
  email_attente text,
  email_attente_empreinte text,
  email_attente_expire timestamptz,
  email_attente_essais integer not null default 0,
  email_envoye_le timestamptz,
  mis_a_jour timestamptz not null default now()
);

alter table public.secours_comptes enable row level security;
revoke all on table public.secours_comptes from anon, authenticated;

drop trigger if exists dater_secours on public.secours_comptes;
create trigger dater_secours before insert or update on public.secours_comptes
  for each row execute function public.dater_donnees();

-- ------------------------------------------------------------------
-- Les avis sur la plateforme (page « Ton avis », src/pages/Avis.jsx,
-- adresse #/avis).
--
-- Une note de 1 à 5, ce qui plaît, ce qui manque et, si on veut, un
-- prénom et un niveau. Pas besoin de compte : tout visiteur peut donner
-- son avis, et tout le monde peut lire les avis publiés.
--
-- Ce qu'un visiteur peut faire, et rien de plus :
--   - lire les avis visibles ;
--   - en ajouter un, en ne remplissant que note, aime, propose, prenom
--     et niveau. La date et la visibilité sont posées par la base.
-- Personne ne peut modifier ni effacer un avis depuis le site. Pour
-- cacher un avis déplacé : Table Editor → avis → décocher `visible`.
-- Contre l'envoi en masse, la base refuse plus de 20 avis par minute,
-- tous visiteurs confondus.
-- ------------------------------------------------------------------

create table if not exists public.avis (
  id bigint generated always as identity primary key,
  cree_le timestamptz not null default now(),
  note smallint not null constraint avis_note check (note between 1 and 5),
  aime text not null default '' constraint avis_aime check (char_length(aime) <= 600),
  propose text not null default '' constraint avis_propose check (char_length(propose) <= 600),
  prenom text not null default '' constraint avis_prenom check (char_length(prenom) <= 40),
  niveau text not null default '' constraint avis_niveau check (niveau in ('', 'L1', 'L2', 'L3', 'Master', 'Autre')),
  visible boolean not null default true
);

create index if not exists avis_recents on public.avis (cree_le desc) where visible;

alter table public.avis enable row level security;

revoke all on table public.avis from anon, authenticated;
grant select on table public.avis to anon, authenticated;
grant insert (note, aime, propose, prenom, niveau) on table public.avis to anon, authenticated;

drop policy if exists "lire les avis" on public.avis;
create policy "lire les avis" on public.avis
  for select to anon, authenticated using (visible);

drop policy if exists "donner son avis" on public.avis;
create policy "donner son avis" on public.avis
  for insert to anon, authenticated with check (visible);

-- Pose la date et la visibilité, et freine l'envoi en masse.
create or replace function public.limiter_avis() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if (select count(*) from public.avis where cree_le > now() - interval '1 minute') >= 20 then
    raise exception 'trop-d-avis' using errcode = 'P0001';
  end if;
  new.cree_le := now();
  new.visible := true;
  return new;
end;
$$;

revoke all on function public.limiter_avis() from public, anon, authenticated;

drop trigger if exists limiter_avis on public.avis;
create trigger limiter_avis before insert on public.avis
  for each row execute function public.limiter_avis();
