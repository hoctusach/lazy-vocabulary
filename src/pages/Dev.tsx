import { getSupabaseClient } from '../lib/supabaseClient';

export default function Dev() {
  if (process.env.NODE_ENV === 'production') return null;
  async function test() {
    const supabase = getSupabaseClient();
    if (!supabase) {
      alert('Supabase NOT OK: Supabase credentials are missing.');
      return;
    }
    const { data, error } = await supabase.auth.getSession();
    alert(error ? 'Supabase NOT OK: ' + error.message : 'Supabase OK');
  }
  return <button onClick={test}>Test Supabase</button>;
}
