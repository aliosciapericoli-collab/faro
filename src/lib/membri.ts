import { supabase } from "@/integrations/supabase/client";

export type Membro = {
  id: string;
  property_id: string;
  email: string;
  role: "viewer";
  created_at: string;
};

/** Solo il proprietario può chiamare queste — le RLS di property_members lo impongono comunque. */

export async function listaMembri(propertyId: string): Promise<Membro[]> {
  const { data, error } = await supabase
    .from("property_members")
    .select("id, property_id, email, role, created_at")
    .eq("property_id", propertyId)
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as Membro[];
}

export async function invitaMembro(propertyId: string, email: string): Promise<void> {
  const { error } = await supabase
    .from("property_members")
    .insert({ property_id: propertyId, email: email.trim().toLowerCase() });
  if (error) throw new Error(error.message);
}

export async function rimuoviMembro(id: string): Promise<void> {
  const { error } = await supabase.from("property_members").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
