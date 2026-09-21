-- Accesso esterno per singola proprietà: un utente invitato (creato a mano
-- in Supabase Auth, stessa procedura del proprietario) vede SOLO gli
-- analytics delle proprietà a cui è assegnato qui — mai le credenziali,
-- mai la gestione delle integrazioni, mai le altre proprietà.

create table if not exists public.property_members (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  email text not null,
  role text not null default 'viewer' check (role in ('viewer')),
  created_at timestamptz not null default now(),
  unique (property_id, email)
);

alter table public.property_members enable row level security;

-- Solo il proprietario invita/rimuove membri.
drop policy if exists "solo owner gestisce membri" on public.property_members;
create policy "solo owner gestisce membri" on public.property_members
  for all
  using (auth.jwt() ->> 'email' = 'aliosciapericoli@gmail.com')
  with check (auth.jwt() ->> 'email' = 'aliosciapericoli@gmail.com');

-- Un membro vede solo la propria riga (per sapere a cosa ha accesso).
drop policy if exists "membro legge le proprie righe" on public.property_members;
create policy "membro legge le proprie righe" on public.property_members
  for select
  using (auth.jwt() ->> 'email' = email);

-- Un membro vede (in sola lettura) le proprietà a cui è stato assegnato.
-- Si somma alla policy "solo owner" già esistente su properties (policy
-- permissive: per il proprietario vale comunque tutto).
drop policy if exists "membro legge le sue proprietà" on public.properties;
create policy "membro legge le sue proprietà" on public.properties
  for select
  using (
    exists (
      select 1 from public.property_members pm
      where pm.property_id = properties.id
        and pm.email = auth.jwt() ->> 'email'
    )
  );
