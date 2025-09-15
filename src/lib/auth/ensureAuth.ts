import { getSupabaseClient } from '../supabaseClient';

export async function ensureAuth(): Promise<{ userId: string }> {
  const supabase = getSupabaseClient();

  let { data: u } = await supabase.auth.getUser();
  if (u?.user?.id) return { userId: u.user.id };

  const { data, error } = await supabase.auth.signInAnonymously();
  if (error) {
    // Friendly error for the common case
    if ((error as any).status === 422 || /anonymous sign-ins? are disabled/i.test(error.message)) {
      throw new Error(
        'Anonymous sign-ins are disabled in Supabase. Enable Auth → Providers → Anonymous.'
      );
    }
    throw new Error('Anonymous sign-in failed: ' + error.message);
  }
  return { userId: data.user!.id };
}
