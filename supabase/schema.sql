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
