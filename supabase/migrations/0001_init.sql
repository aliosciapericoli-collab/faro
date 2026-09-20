-- Faro — schema iniziale.
-- Utente singolo (il proprietario): le policy RLS restringono ogni riga alla
-- sua email. Le credenziali delle integrazioni (GA4, Search Console, Google
-- Ads, Meta Ads) non sono mai salvate in chiaro: passano dal Vault di
-- Supabase (KMS-backed) tramite le funzioni SECURITY DEFINER qui sotto,
-- chiamabili solo dal service role (mai dal client).

create extension if not exists supabase_vault;
create extension if not exists pgcrypto;

create table if not exists public.properties (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  url text,
  note text,
  created_at timestamptz not null default now()
);

do $$
begin
  if not exists (select 1 from pg_type where typname = 'integration_provider') then
    create type public.integration_provider as enum ('ga4', 'search_console', 'google_ads', 'meta_ads');
  end if;
end $$;

create table if not exists public.integrations (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  provider public.integration_provider not null,
  status text not null default 'not_connected' check (status in ('not_connected', 'connected')),
  vault_secret_id uuid references vault.secrets(id) on delete set null,
  connected_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (property_id, provider)
);

alter table public.properties enable row level security;
alter table public.integrations enable row level security;

-- Sostituisci l'email se il proprietario dell'account cambia.
drop policy if exists "solo owner" on public.properties;
create policy "solo owner" on public.properties
  for all
  using (auth.jwt() ->> 'email' = 'aliosciapericoli@gmail.com')
  with check (auth.jwt() ->> 'email' = 'aliosciapericoli@gmail.com');

drop policy if exists "solo owner" on public.integrations;
create policy "solo owner" on public.integrations
  for all
  using (auth.jwt() ->> 'email' = 'aliosciapericoli@gmail.com')
  with check (auth.jwt() ->> 'email' = 'aliosciapericoli@gmail.com');

-- Salva (o sostituisce) la credenziale di un'integrazione nel Vault e
-- aggiorna lo stato della riga. Chiamata solo dal server (service role) via
-- il server function salvaCredenziale, mai direttamente dal browser.
create or replace function public.salva_credenziale(
  p_property_id uuid,
  p_provider public.integration_provider,
  p_secret text,
  p_secret_name text default null
) returns public.integrations
language plpgsql
security definer
set search_path = public, vault
as $$
declare
  v_secret_id uuid;
  v_row public.integrations;
begin
  v_secret_id := vault.create_secret(
    p_secret,
    coalesce(p_secret_name, p_provider::text || ':' || p_property_id::text || ':' || extract(epoch from now())::text)
  );

  insert into public.integrations (property_id, provider, status, vault_secret_id, connected_at)
  values (p_property_id, p_provider, 'connected', v_secret_id, now())
  on conflict (property_id, provider)
  do update set
    vault_secret_id = excluded.vault_secret_id,
    status = 'connected',
    connected_at = now(),
    updated_at = now()
  returning * into v_row;

  return v_row;
end;
$$;

revoke all on function public.salva_credenziale(uuid, public.integration_provider, text, text) from public, anon, authenticated;
grant execute on function public.salva_credenziale(uuid, public.integration_provider, text, text) to service_role;

-- Rimuove la credenziale dal Vault e riporta l'integrazione a "non connessa".
create or replace function public.elimina_credenziale(p_integration_id uuid) returns void
language plpgsql
security definer
set search_path = public, vault
as $$
declare
  v_secret_id uuid;
begin
  select vault_secret_id into v_secret_id from public.integrations where id = p_integration_id;

  if v_secret_id is not null then
    delete from vault.secrets where id = v_secret_id;
  end if;

  update public.integrations
  set status = 'not_connected', vault_secret_id = null, connected_at = null, updated_at = now()
  where id = p_integration_id;
end;
$$;

revoke all on function public.elimina_credenziale(uuid) from public, anon, authenticated;
grant execute on function public.elimina_credenziale(uuid) to service_role;
