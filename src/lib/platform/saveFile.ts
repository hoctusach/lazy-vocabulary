import { Capacitor } from '@capacitor/core';

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result ?? '');
      const comma = result.indexOf(',');
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.onerror = () => reject(reader.error ?? new Error('Could not read the file.'));
    reader.readAsDataURL(blob);
  });
}

function downloadInBrowser(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.rel = 'noopener';
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1500);
}

/**
 * Download a file in the browser. Inside the Capacitor WebView the download
 * attribute is unreliable, so the file is written to the cache and shared
 * with the system sheet (Files, Drive, Mail, and so on).
 */
export async function saveBlob(filename: string, blob: Blob): Promise<void> {
  if (!Capacitor.isNativePlatform()) {
    downloadInBrowser(filename, blob);
    return;
  }

  const [{ Filesystem, Directory }, { Share }] = await Promise.all([
    import('@capacitor/filesystem'),
    import('@capacitor/share'),
  ]);
  const data = await blobToBase64(blob);
  const written = await Filesystem.writeFile({
    path: filename,
    data,
    directory: Directory.Cache,
  });
  await Share.share({
    title: filename,
    dialogTitle: 'Save file',
    files: [written.uri],
  });
}

export async function saveTextFile(filename: string, contents: string, mime: string): Promise<void> {
  await saveBlob(filename, new Blob([contents], { type: mime }));
}
