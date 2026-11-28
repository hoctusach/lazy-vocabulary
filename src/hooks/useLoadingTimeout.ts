import { useEffect, useState } from 'react';

/** [FB-83] true once `pending` has stayed true for `ms`; resets as soon as `pending` turns false. */
export function useLoadingTimeout(pending: boolean, ms: number): boolean {
  const [timedOut, setTimedOut] = useState(false);
  useEffect(() => {
    if (!pending) { setTimedOut(false); return; }
    const id = window.setTimeout(() => setTimedOut(true), ms);
    return () => window.clearTimeout(id);
  }, [pending, ms]);
  return pending && timedOut;
}
