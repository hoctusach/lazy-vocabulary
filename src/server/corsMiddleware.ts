// Generic types are used instead of Express types to avoid requiring the
// Express package just for type definitions.
export function lovableCors(
  _req: unknown,
  res: { setHeader(name: string, value: string): void },
  next: () => void
) {
  res.setHeader('Access-Control-Allow-Origin', 'https://lovable.dev');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  next();
}
