export const debug = (...args: unknown[]) => {
  if (import.meta.env.MODE === 'development') {
    console.log(...args);
  }
};
