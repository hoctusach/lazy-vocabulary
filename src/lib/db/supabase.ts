import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let client: SupabaseClient | null = null;
let hasShownMissingMessage = false;

function readImportMetaEnv(key: string): string | undefined {
  try {
    return ((import.meta as unknown as { env?: Record<string, string | undefined> })?.env ?? {})[key];
  } catch {
    return undefined;
  }
}

function readProcessEnv(key: string): string | undefined {
  return typeof process !== 'undefined' ? process.env?.[key] : undefined;
}

function showMissingEnvMessage() {
  if (hasShownMissingMessage) return;
  hasShownMissingMessage = true;
  const message =
    'Cloud sync features are disabled because Supabase credentials are missing. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to enable them.';

  if (typeof document === 'undefined' || typeof window === 'undefined') {
    console.warn(message);
    return;
  }

  const renderMessage = () => {
    if (document.getElementById('supabase-env-warning')) return;
    const banner = document.createElement('div');
    banner.id = 'supabase-env-warning';
    banner.textContent = message;
    banner.style.position = 'fixed';
    banner.style.bottom = '1.5rem';
    banner.style.left = '50%';
    banner.style.transform = 'translateX(-50%)';
    banner.style.zIndex = '2147483647';
    banner.style.background = '#fff7ed';
    banner.style.color = '#7c2d12';
    banner.style.padding = '0.9rem 1.4rem';
    banner.style.borderRadius = '0.75rem';
    banner.style.border = '1px solid rgba(124, 45, 18, 0.2)';
    banner.style.boxShadow = '0 10px 25px rgba(0, 0, 0, 0.1)';
    banner.style.fontFamily = 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    banner.style.fontSize = '0.95rem';
    banner.style.maxWidth = '90%';
    banner.style.textAlign = 'center';
    banner.style.pointerEvents = 'none';
    banner.style.lineHeight = '1.4';
    document.body?.appendChild(banner);
    window.setTimeout(() => {
      banner.remove();
    }, 12000);
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', renderMessage, { once: true });
  } else {
    renderMessage();
  }
}

function resolveSupabaseConfig() {
  const url = readImportMetaEnv('VITE_SUPABASE_URL') ?? readProcessEnv('NEXT_PUBLIC_SUPABASE_URL');
  const anon = readImportMetaEnv('VITE_SUPABASE_ANON_KEY') ?? readProcessEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY');
  return { url, anon };
}

export function getSupabaseClient(): SupabaseClient | null {
  if (client) return client;
  const { url, anon } = resolveSupabaseConfig();
  if (!url || !anon) {
    showMissingEnvMessage();
    return null;
  }
  client = createClient(url, anon);
  return client;
}
