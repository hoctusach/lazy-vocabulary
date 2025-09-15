import { getSupabaseClient } from '../supabaseClient';

export async function ensureAuth(): Promise<{ userId: string }> {
  const supabase = getSupabaseClient();
  let { data: u } = await supabase.auth.getUser();
  if (!u?.user?.id) {
    const { data, error } = await supabase.auth.signInAnonymously();
    if (error) throw new Error('Anonymous sign-in failed: ' + error.message);
    u = { user: data.user! };
  }
  return { userId: u.user!.id };
}
