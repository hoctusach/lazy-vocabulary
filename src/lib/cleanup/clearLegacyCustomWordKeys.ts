export function clearLegacyCustomWordKeys() {
  try {
    localStorage.removeItem('customWords');
    // remove dynamic category keys that stored custom words
    const toDelete: string[] = [];
    for (let i=0;i<localStorage.length;i++){
      const k = localStorage.key(i)!;
      if (!k) continue;
      if (/^category:/i.test(k) || k === 'customWords') toDelete.push(k);
    }
    toDelete.forEach(k => localStorage.removeItem(k));
  } catch {}
}
