import "server-only";
import type { User } from "../demo-data/types";
import { toUiUser } from "../session-types";
import type { SupabaseServerClient } from "../supabase/server";

/** Loads the profiles for a set of user ids as UI users. RLS limits results to teammates. */
export async function loadPeople(supabase: SupabaseServerClient, ids: Array<string | null>): Promise<Map<string, User>> {
  const unique = Array.from(new Set(ids.filter((id): id is string => Boolean(id))));
  if (unique.length === 0) return new Map();
  const { data } = await supabase.from("profiles").select("id, full_name, email, job_title").in("id", unique);
  return new Map((data ?? []).map((p) => [p.id, toUiUser({ id: p.id, name: p.full_name, email: p.email ?? "", title: p.job_title })]));
}
