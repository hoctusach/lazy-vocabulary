import { useEffect, useState } from 'react';
import { fetchIsAdmin } from './adminApi';

/** [FB-55] true only after the server confirmed admin for this session; false on any failure. */
export function useAdmin(): boolean {
  const [isAdmin, setIsAdmin] = useState(false);
  useEffect(() => {
    let alive = true;
    void fetchIsAdmin().then((v) => { if (alive) setIsAdmin(v); });
    return () => { alive = false; };
  }, []);
  return isAdmin;
}
