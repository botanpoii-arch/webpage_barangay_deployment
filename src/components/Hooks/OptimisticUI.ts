import { useState, useEffect, useCallback } from 'react';

// ============================================================================
// 1. REACT HOOK: USE MEMORY (The Reader)
// Binds your React components to the Memory.ts Observer instantly.
// ============================================================================
export function useMemoryStore<T>(store: any, maskFields: string[] = []) {
  const [data, setData] = useState<T[]>([]);

  useEffect(() => {
    // Function to extract data (Masked or Raw)
    const syncWithMemory = () => {
      if (maskFields.length > 0) {
        setData(store.getMaskedData(maskFields) as T[]);
      } else {
        setData(store.getRawData() as T[]);
      }
    };

    // Load initial data
    syncWithMemory();

    // Subscribe to future Memory.ts changes (Notifies when SHA-256 detects a change)
    const unsubscribe = store.subscribe(syncWithMemory);
    
    // Cleanup listener on component unmount
    return () => unsubscribe();
  }, [store, maskFields.join(',')]); // Re-bind if masking requirements change

  return data;
}

// ============================================================================
// 2. EXECUTOR: OPTIMISTIC MUTATION (The Writer)
// Handles the "Fake it till you make it" logic with automatic rollback.
// ============================================================================

type ActionType = 'ADD' | 'UPDATE' | 'DELETE';

export const executeOptimistic = async <T extends { id: string }>(
  store: any,                  // The Memory.ts instance (e.g., residentMemoryStore)
  apiPromise: Promise<any>,    // The actual Axios/Fetch call
  optimisticData: T,           // The data we WANT to show immediately
  action: ActionType,          // What are we doing?
  previousData?: T             // Required for UPDATE/DELETE rollbacks
) => {
  
  // --- STEP 1: OPTIMISTIC APPLY ---
  // Force the UI to update immediately before the server responds
  if (action === 'DELETE') {
    store.remove(optimisticData.id);
  } else {
    // Works for both ADD and UPDATE
    await store.upsert(optimisticData);
  }

  // --- STEP 2: BACKGROUND API SYNC ---
  try {
    const result = await apiPromise;
    
    // Optional: If the server returns the finalized object (e.g., with a DB-generated 
    // timestamp or formal ID), we upsert it one last time to be perfectly in sync.
    if (result && result.id && action !== 'DELETE') {
       await store.upsert(result);
    }
    
    return { success: true, data: result };

  } catch (error) {
    // --- STEP 3: THE ROLLBACK (SAFETY NET) ---
    console.warn('[OPTIMISTIC 🚨] Server rejected changes. Rolling back UI...', error);
    
    if (action === 'ADD') {
      // It failed to save to DB, so remove the fake item from the UI
      store.remove(optimisticData.id);
    } else if (action === 'UPDATE' && previousData) {
      // Put the old data back exactly as it was
      await store.upsert(previousData);
    } else if (action === 'DELETE' && previousData) {
      // Undelete the item because the server refused to drop it
      await store.upsert(previousData);
    }
    
    // Throw the error forward so the React component can show a red Toast/Alert message
    throw error; 
  }
};