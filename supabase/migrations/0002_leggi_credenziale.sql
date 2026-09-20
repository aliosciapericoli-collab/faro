-- Legge (decifrata) la credenziale di un'integrazione dal Vault. Chiamabile
-- solo dal service role: usata dai server function che interrogano le API
-- esterne (GA4 Data API, Search Console, ecc.) per conto dell'utente.
create or replace function public.leggi_credenziale(
  p_property_id uuid,
  p_provider public.integration_provider
) returns text
language plpgsql
security definer
set search_path = public, vault
as $$
declare
  v_secret text;
begin
  select ds.decrypted_secret into v_secret
  from vault.decrypted_secrets ds
  join public.integrations i on i.vault_secret_id = ds.id
  where i.property_id = p_property_id
    and i.provider = p_provider
    and i.status = 'connected';

  return v_secret;
end;
$$;

revoke all on function public.leggi_credenziale(uuid, public.integration_provider) from public, anon, authenticated;
grant execute on function public.leggi_credenziale(uuid, public.integration_provider) to service_role;
