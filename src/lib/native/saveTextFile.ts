/**
 * `<a download>` is ignored by several WebViews. On device we write a cache
 * file and open the system share sheet so the user can save it to Files.
 */

function triggerBrowserDownload(filename: string, blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.rel = 'noopener';
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

async function shareNativeFile(filename: string, data: string, encoding: 'utf8' | 'base64'): Promise<void> {
  const { Filesystem, Directory, Encoding } = await import('@capacitor/filesystem');
  const { Share } = await import('@capacitor/share');
  const safeName = filename.replace(/[^\w.-]+/g, '_');
  const result = await Filesystem.writeFile({
    path: safeName,
    data,
    directory: Directory.Cache,
    encoding: encoding === 'utf8' ? Encoding.UTF8 : undefined,
  });
  await Share.share({
    title: filename,
    url: result.uri,
    dialogTitle: 'Save file',
  });
}

export async function saveTextFile(filename: string, contents: string, mime = 'text/plain'): Promise<void> {
  const { Capacitor } = await import('@capacitor/core');
  if (Capacitor.isNativePlatform()) {
    await shareNativeFile(filename, contents, 'utf8');
    return;
  }
  triggerBrowserDownload(filename, new Blob([contents], { type: mime }));
}

export async function saveBinaryFile(filename: string, bytes: Uint8Array, mime: string): Promise<void> {
  const { Capacitor } = await import('@capacitor/core');
  if (Capacitor.isNativePlatform()) {
    await shareNativeFile(filename, bytesToBase64(bytes), 'base64');
    return;
  }
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  triggerBrowserDownload(filename, new Blob([copy], { type: mime }));
}
