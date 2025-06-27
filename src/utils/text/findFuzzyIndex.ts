export const findFuzzyIndex = (list: string[], target: string): number => {
  if (!target) return -1;
  const lower = target.toLowerCase();
  return list.findIndex(w => w.toLowerCase().startsWith(lower));
};
