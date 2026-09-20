import { supabase } from "@/integrations/supabase/client";
import type { Provider } from "@/lib/credenziali.functions";

export type Property = {
  id: string;
  name: string;
  url: string | null;
  note: string | null;
  created_at: string;
};

export type Integration = {
  id: string;
  property_id: string;
  provider: Provider;
  status: "connected" | "not_connected";
};

export async function listaProprieta(): Promise<Property[]> {
  const { data, error } = await supabase
    .from("properties")
    .select("id, name, url, note, created_at")
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as Property[];
}

export async function listaIntegrazioni(): Promise<Integration[]> {
  const { data, error } = await supabase
    .from("integrations")
    .select("id, property_id, provider, status");
  if (error) throw new Error(error.message);
  return (data ?? []) as Integration[];
}

export async function creaProprieta(input: { name: string; url?: string }): Promise<Property> {
  const { data, error } = await supabase
    .from("properties")
    .insert({ name: input.name, url: input.url || null })
    .select("id, name, url, note, created_at")
    .single();
  if (error) throw new Error(error.message);
  return data as Property;
}
