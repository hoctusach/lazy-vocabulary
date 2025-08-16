export interface ParsedWord {
  main: string;
  annotations: string[];
}

export function parseWordAnnotations(word: string): ParsedWord {
  const annotations: string[] = [];
  const regex = /\[[^\]]+\]|\([^)]*\)|\/[^/]+\/(?=\s|$)/g;
  let main = word.replace(regex, (match) => {
    annotations.push(match.trim());
    return ' ';
  });

  main = main.replace(/\s+/g, ' ').trim();

  return { main, annotations };
}

export default parseWordAnnotations;
