import { ensureSupabaseAuthSession } from '@/lib/auth';

export default function Dev() {
  if (process.env.NODE_ENV === 'production') return null;
  async function test() {
    const session = await ensureSupabaseAuthSession();
    alert(session ? `Custom auth OK: ${session.nickname}` : 'No active custom session');
  }
  return <button onClick={test}>Test Supabase</button>;
}
