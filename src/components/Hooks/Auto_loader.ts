import { useEffect, useRef } from 'react';
import { api } from './Api';
import { ResidentModel } from './graphql/Resident_model';

/**
 * AUTO LOADER
 * Functionality: Automatically fetches data at intervals.
 * Constraint: Maximum 20 requests per 5 minutes to prevent DB capping.
 */
export const useResidentAutoLoader = (intervalMs: number = 30000) => {
  const requestCount = useRef(0);
  const startTime = useRef(Date.now());

  const poll = async () => {
    // RATE LIMITING LOGIC (The "20x in 5 mins" rule)
    const now = Date.now();
    if (now - startTime.current > 300000) { // Reset every 5 mins
      requestCount.current = 0;
      startTime.current = now;
    }

    if (requestCount.current >= 20) {
      console.warn("[AUTOLOADER ⚠️] Rate limit reached. Skipping sync.");
      return;
    }

    try {
      const res = await api.get('/residents');
      // Pushes the data to the Main Distributor
      await ResidentModel.syncFromServer(res.data);
      requestCount.current++;
    } catch (err) {
      console.error("[AUTOLOADER 🚨] Background Sync Failed");
    }
  };

  useEffect(() => {
    poll(); // Initial load
    const timer = setInterval(poll, intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs]);
};