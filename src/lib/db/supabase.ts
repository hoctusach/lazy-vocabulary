let hasShownMissingMessage = false;

type DevSupabaseSettings = {
  url?: string;
  anonKey?: string;
};

const DEV_SUPABASE_STORAGE_KEY = 'lazyVocabulary.devSupabase';
const DEV_SETTINGS_MODAL_ID = 'supabase-dev-settings-modal';

function isLocalStorageAvailable(): boolean {
  try {
    return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
  } catch {
    return false;
  }
}

function readDevSupabaseSettings(): DevSupabaseSettings {
  if (!isLocalStorageAvailable()) return {};
  try {
    const raw = window.localStorage.getItem(DEV_SUPABASE_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as { url?: unknown; anonKey?: unknown };
    const url = typeof parsed.url === 'string' ? parsed.url.trim() : undefined;
    const anonKey = typeof parsed.anonKey === 'string' ? parsed.anonKey.trim() : undefined;
    return {
      url: url || undefined,
      anonKey: anonKey || undefined
    };
  } catch {
    return {};
  }
}

function writeDevSupabaseSettings(settings: DevSupabaseSettings): boolean {
  if (!isLocalStorageAvailable()) return false;
  try {
    window.localStorage.setItem(DEV_SUPABASE_STORAGE_KEY, JSON.stringify(settings));
    return true;
  } catch {
    return false;
  }
}

function saveDevSupabaseSettings(url: string, anonKey: string): boolean {
  return writeDevSupabaseSettings({ url, anonKey });
}

function clearStoredDevSupabaseSettings(): boolean {
  if (!isLocalStorageAvailable()) return false;
  try {
    window.localStorage.removeItem(DEV_SUPABASE_STORAGE_KEY);
    return true;
  } catch {
    return false;
  }
}

function isDevEnvironment(): boolean {
  const devFlag = readImportMetaEnv('DEV');
  if (devFlag !== undefined) {
    const normalized = devFlag.toLowerCase();
    if (normalized === 'true') return true;
    if (normalized === 'false') return false;
  }
  const mode = readImportMetaEnv('MODE');
  if (mode) {
    return mode.toLowerCase() !== 'production';
  }
  const nodeEnv = readProcessEnv('NODE_ENV');
  if (nodeEnv) {
    return nodeEnv.toLowerCase() !== 'production';
  }
  return false;
}

function canShowDevSupabaseSettings(): boolean {
  return isDevEnvironment() && isLocalStorageAvailable();
}

function openDevSupabaseSettingsModal() {
  if (!canShowDevSupabaseSettings() || typeof document === 'undefined') return;

  const existing = document.getElementById(DEV_SETTINGS_MODAL_ID);
  if (existing) {
    existing.remove();
  }

  const overlay = document.createElement('div');
  overlay.id = DEV_SETTINGS_MODAL_ID;
  overlay.style.position = 'fixed';
  overlay.style.inset = '0';
  overlay.style.background = 'rgba(15, 23, 42, 0.45)';
  overlay.style.display = 'flex';
  overlay.style.alignItems = 'center';
  overlay.style.justifyContent = 'center';
  overlay.style.padding = '1.5rem';
  overlay.style.zIndex = '2147483647';

  const modal = document.createElement('div');
  modal.style.background = '#ffffff';
  modal.style.borderRadius = '0.75rem';
  modal.style.boxShadow = '0 25px 60px rgba(15, 23, 42, 0.25)';
  modal.style.maxWidth = '480px';
  modal.style.width = '100%';
  modal.style.padding = '1.75rem';
  modal.style.fontFamily = 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
  modal.style.color = '#1f2937';

  const header = document.createElement('div');
  header.style.display = 'flex';
  header.style.alignItems = 'flex-start';
  header.style.justifyContent = 'space-between';
  header.style.gap = '1rem';
  header.style.marginBottom = '1rem';

  const title = document.createElement('h2');
  title.textContent = 'Supabase settings';
  title.style.fontSize = '1.25rem';
  title.style.fontWeight = '600';
  title.style.margin = '0';

  const closeButton = document.createElement('button');
  closeButton.type = 'button';
  closeButton.textContent = '×';
  closeButton.setAttribute('aria-label', 'Close Supabase settings');
  closeButton.style.background = 'transparent';
  closeButton.style.border = 'none';
  closeButton.style.color = '#6b7280';
  closeButton.style.fontSize = '1.6rem';
  closeButton.style.lineHeight = '1';
  closeButton.style.cursor = 'pointer';

  header.appendChild(title);
  header.appendChild(closeButton);
  modal.appendChild(header);

  const description = document.createElement('p');
  description.textContent =
    'Paste your Supabase project URL and anon key. They are stored in localStorage so you can work without editing .env files.';
  description.style.margin = '0 0 1.25rem';
  description.style.fontSize = '0.95rem';
  description.style.lineHeight = '1.5';
  description.style.color = '#374151';
  modal.appendChild(description);

  const form = document.createElement('form');
  form.style.display = 'flex';
  form.style.flexDirection = 'column';

  const urlLabel = document.createElement('label');
  const urlInputId = `${DEV_SETTINGS_MODAL_ID}-url`;
  urlLabel.setAttribute('for', urlInputId);
  urlLabel.textContent = 'Supabase URL';
  urlLabel.style.fontSize = '0.9rem';
  urlLabel.style.fontWeight = '500';
  urlLabel.style.color = '#374151';

  const urlInput = document.createElement('input');
  urlInput.type = 'url';
  urlInput.id = urlInputId;
  urlInput.placeholder = 'https://your-project.supabase.co';
  urlInput.style.marginTop = '0.35rem';
  urlInput.style.marginBottom = '1rem';
  urlInput.style.width = '100%';
  urlInput.style.padding = '0.6rem 0.75rem';
  urlInput.style.border = '1px solid #d1d5db';
  urlInput.style.borderRadius = '0.5rem';
  urlInput.style.fontSize = '0.95rem';

  const anonLabel = document.createElement('label');
  const anonInputId = `${DEV_SETTINGS_MODAL_ID}-anon`;
  anonLabel.setAttribute('for', anonInputId);
  anonLabel.textContent = 'Anon key';
  anonLabel.style.fontSize = '0.9rem';
  anonLabel.style.fontWeight = '500';
  anonLabel.style.color = '#374151';

  const anonInput = document.createElement('textarea');
  anonInput.id = anonInputId;
  anonInput.rows = 4;
  anonInput.placeholder = 'eyJhbGciOi...';
  anonInput.style.marginTop = '0.35rem';
  anonInput.style.marginBottom = '1rem';
  anonInput.style.width = '100%';
  anonInput.style.padding = '0.6rem 0.75rem';
  anonInput.style.border = '1px solid #d1d5db';
  anonInput.style.borderRadius = '0.5rem';
  anonInput.style.fontSize = '0.9rem';
  anonInput.style.fontFamily =
    'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace';

  const storedSettings = readDevSupabaseSettings();
  if (storedSettings.url) {
    urlInput.value = storedSettings.url;
  }
  if (storedSettings.anonKey) {
    anonInput.value = storedSettings.anonKey;
  }

  const helperText = document.createElement('p');
  helperText.textContent = 'These values stay in your browser and are ignored in production builds.';
  helperText.style.margin = '0 0 1rem';
  helperText.style.fontSize = '0.85rem';
  helperText.style.color = '#6b7280';

  const buttonRow = document.createElement('div');
  buttonRow.style.display = 'flex';
  buttonRow.style.flexWrap = 'wrap';
  buttonRow.style.gap = '0.5rem';
  buttonRow.style.marginTop = '0.5rem';

  const saveButton = document.createElement('button');
  saveButton.type = 'submit';
  saveButton.textContent = 'Save & reload';
  saveButton.style.background = '#2563eb';
  saveButton.style.color = '#ffffff';
  saveButton.style.border = 'none';
  saveButton.style.padding = '0.55rem 0.9rem';
  saveButton.style.borderRadius = '0.5rem';
  saveButton.style.fontWeight = '600';
  saveButton.style.cursor = 'pointer';

  const clearButton = document.createElement('button');
  clearButton.type = 'button';
  clearButton.textContent = 'Clear saved values';
  clearButton.style.background = '#f3f4f6';
  clearButton.style.color = '#374151';
  clearButton.style.border = '1px solid #e5e7eb';
  clearButton.style.padding = '0.55rem 0.9rem';
  clearButton.style.borderRadius = '0.5rem';
  clearButton.style.fontWeight = '500';
  clearButton.style.cursor = 'pointer';

  const cancelButton = document.createElement('button');
  cancelButton.type = 'button';
  cancelButton.textContent = 'Cancel';
  cancelButton.style.background = 'transparent';
  cancelButton.style.color = '#6b7280';
  cancelButton.style.border = 'none';
  cancelButton.style.padding = '0.55rem 0.9rem';
  cancelButton.style.borderRadius = '0.5rem';
  cancelButton.style.fontWeight = '500';
  cancelButton.style.cursor = 'pointer';

  buttonRow.appendChild(saveButton);
  buttonRow.appendChild(clearButton);
  buttonRow.appendChild(cancelButton);

  const statusMessage = document.createElement('p');
  statusMessage.setAttribute('role', 'status');
  statusMessage.setAttribute('aria-live', 'polite');
  statusMessage.style.marginTop = '0.75rem';
  statusMessage.style.fontSize = '0.85rem';
  statusMessage.style.minHeight = '1.2rem';
  statusMessage.style.color = '#6b7280';

  const updateStatus = (text: string, color = '#6b7280') => {
    statusMessage.textContent = text;
    statusMessage.style.color = color;
  };

  const handleSave = () => {
    const urlValue = urlInput.value.trim();
    const anonValue = anonInput.value.trim();
    if (!urlValue || !anonValue) {
      updateStatus('Please provide both the Supabase URL and anon key.', '#b91c1c');
      return;
    }
    if (!saveDevSupabaseSettings(urlValue, anonValue)) {
      updateStatus('Unable to save values to localStorage. Update your .env file instead.', '#b91c1c');
      return;
    }
    updateStatus('Saved! Reloading to apply your Supabase credentials…', '#15803d');
    window.setTimeout(() => {
      window.location.reload();
    }, 400);
  };

  const handleClear = () => {
    if (!clearStoredDevSupabaseSettings()) {
      updateStatus('No stored credentials found or localStorage is unavailable.', '#b91c1c');
      return;
    }
    urlInput.value = '';
    anonInput.value = '';
    updateStatus('Saved credentials cleared. Reloading…', '#15803d');
    window.setTimeout(() => {
      window.location.reload();
    }, 400);
  };

  function closeModal() {
    overlay.remove();
    document.removeEventListener('keydown', handleKeydown);
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      event.preventDefault();
      closeModal();
    }
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    handleSave();
  });
  saveButton.addEventListener('click', (event) => {
    event.preventDefault();
    handleSave();
  });
  clearButton.addEventListener('click', (event) => {
    event.preventDefault();
    handleClear();
  });
  cancelButton.addEventListener('click', (event) => {
    event.preventDefault();
    closeModal();
  });
  closeButton.addEventListener('click', (event) => {
    event.preventDefault();
    closeModal();
  });

  overlay.addEventListener('click', (event) => {
    if (event.target === overlay) {
      closeModal();
    }
  });
  document.addEventListener('keydown', handleKeydown);

  form.appendChild(urlLabel);
  form.appendChild(urlInput);
  form.appendChild(anonLabel);
  form.appendChild(anonInput);
  form.appendChild(helperText);
  form.appendChild(buttonRow);
  form.appendChild(statusMessage);

  modal.appendChild(form);
  overlay.appendChild(modal);
  document.body?.appendChild(overlay);

  window.setTimeout(() => {
    if (urlInput.value && !anonInput.value) {
      anonInput.focus();
      return;
    }
    urlInput.focus();
  }, 0);
}

function readImportMetaEnv(key: string): string | undefined {
  try {
    const raw = ((import.meta as unknown as { env?: Record<string, unknown> })?.env ?? {})[key];
    if (raw === undefined || raw === null) return undefined;
    return typeof raw === 'string' ? raw : String(raw);
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

  const devSettingsAvailable = canShowDevSupabaseSettings();
  const baseMessage =
    'Supabase URL or anon key is missing. Cloud sync features are disabled until both credentials are provided.';
  const consoleMessage = devSettingsAvailable
    ? `${baseMessage} Use the Supabase settings panel to store temporary credentials during development.`
    : `${baseMessage} Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your environment configuration.`;

  console.error(`[Lazy Vocabulary] ${consoleMessage}`);

  if (typeof document === 'undefined' || typeof window === 'undefined') {
    return;
  }

  const renderMessage = () => {
    if (document.getElementById('supabase-env-warning')) return;

    const banner = document.createElement('div');
    banner.id = 'supabase-env-warning';
    banner.setAttribute('role', 'alert');
    banner.setAttribute('aria-live', 'assertive');
    banner.style.position = 'fixed';
    banner.style.bottom = '1.5rem';
    banner.style.left = '50%';
    banner.style.transform = 'translateX(-50%)';
    banner.style.zIndex = '2147483647';
    banner.style.background = '#fef3c7';
    banner.style.color = '#7c2d12';
    banner.style.padding = '1rem 1.5rem';
    banner.style.borderRadius = '0.75rem';
    banner.style.border = '1px solid rgba(194, 65, 12, 0.25)';
    banner.style.boxShadow = '0 18px 38px rgba(120, 53, 15, 0.25)';
    banner.style.fontFamily = 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    banner.style.fontSize = '0.95rem';
    banner.style.maxWidth = '420px';
    banner.style.width = 'calc(100% - 2.5rem)';
    banner.style.textAlign = 'left';
    banner.style.pointerEvents = 'auto';
    banner.style.lineHeight = '1.45';

    const heading = document.createElement('h3');
    heading.textContent = 'Supabase credentials missing';
    heading.style.margin = '0 0 0.35rem';
    heading.style.fontSize = '1.05rem';
    heading.style.fontWeight = '600';

    const description = document.createElement('p');
    description.textContent =
      'Cloud sync features are disabled until VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are configured.';
    description.style.margin = '0 0 0.5rem';

    const envHint = document.createElement('p');
    envHint.textContent = devSettingsAvailable
      ? 'Add them to your .env file or store temporary credentials using the Supabase settings panel.'
      : 'Add them to your local .env file to enable sync features.';
    envHint.style.margin = '0';
    envHint.style.fontSize = '0.9rem';
    envHint.style.color = '#9a3412';

    banner.appendChild(heading);
    banner.appendChild(description);
    banner.appendChild(envHint);

    const buttonRow = document.createElement('div');
    buttonRow.style.display = 'flex';
    buttonRow.style.flexWrap = 'wrap';
    buttonRow.style.gap = '0.5rem';
    buttonRow.style.marginTop = '0.75rem';
    buttonRow.style.alignItems = 'center';

    if (devSettingsAvailable) {
      const configureButton = document.createElement('button');
      configureButton.type = 'button';
      configureButton.textContent = 'Open Supabase settings';
      configureButton.style.background = '#ea580c';
      configureButton.style.color = '#ffffff';
      configureButton.style.border = 'none';
      configureButton.style.padding = '0.55rem 0.95rem';
      configureButton.style.borderRadius = '0.5rem';
      configureButton.style.fontWeight = '600';
      configureButton.style.cursor = 'pointer';
      configureButton.style.boxShadow = '0 10px 25px rgba(234, 88, 12, 0.35)';
      configureButton.addEventListener('click', (event) => {
        event.preventDefault();
        openDevSupabaseSettingsModal();
      });
      buttonRow.appendChild(configureButton);
    }

    const dismissButton = document.createElement('button');
    dismissButton.type = 'button';
    dismissButton.textContent = 'Dismiss';
    dismissButton.style.background = 'transparent';
    dismissButton.style.color = '#9a3412';
    dismissButton.style.border = 'none';
    dismissButton.style.padding = '0.5rem 0.75rem';
    dismissButton.style.fontWeight = '500';
    dismissButton.style.cursor = 'pointer';
    dismissButton.style.textDecoration = 'underline';
    dismissButton.addEventListener('click', (event) => {
      event.preventDefault();
      banner.remove();
    });
    buttonRow.appendChild(dismissButton);

    banner.appendChild(buttonRow);

    if (devSettingsAvailable) {
      const devNote = document.createElement('p');
      devNote.textContent = 'Values entered in the settings panel are stored in localStorage for development only.';
      devNote.style.margin = '0.35rem 0 0';
      devNote.style.fontSize = '0.8rem';
      devNote.style.color = '#c2410c';
      banner.appendChild(devNote);
    }

    document.body?.appendChild(banner);
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', renderMessage, { once: true });
  } else {
    renderMessage();
  }
}

export function resolveSupabaseConfig() {
  let url = readImportMetaEnv('VITE_SUPABASE_URL') ?? readProcessEnv('NEXT_PUBLIC_SUPABASE_URL');
  let anon = readImportMetaEnv('VITE_SUPABASE_ANON_KEY') ?? readProcessEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY');

  if (!url || !anon) {
    const devSettings = readDevSupabaseSettings();
    if (!url && devSettings.url) {
      url = devSettings.url;
    }
    if (!anon && devSettings.anonKey) {
      anon = devSettings.anonKey;
    }
  }

  return { url, anon };
}

if (typeof window !== 'undefined') {
  const { url: initialUrl, anon: initialAnon } = resolveSupabaseConfig();
  if (!initialUrl || !initialAnon) {
    showMissingEnvMessage();
  }
}
