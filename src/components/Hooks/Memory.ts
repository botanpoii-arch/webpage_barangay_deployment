import { hashObject } from './encryption';

/**
 * Memory.ts
 * Core In-Memory State Manager using Singleton, Observer, and Checksum patterns.
 */

type Listener = () => void;

class MemoryManager<T extends { id: string }> {
  // 1. HASH MAP (O(1) Lookup) for the actual data
  private store: Map<string, T> = new Map();
  
  // 2. CHECKSUM MAP: Stores the SHA-256 hash of each object to detect changes instantly
  private checksums: Map<string, string> = new Map();
  
  // 3. OBSERVERS: React components listening to this store
  private listeners: Set<Listener> = new Set();

  // ==========================================
  // OBSERVER METHODS (Reactivity)
  // ==========================================
  
  public subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    this.listeners.forEach(listener => listener());
  }

  // ==========================================
  // CRUD OPERATIONS (With SHA-256 Smart Checking)
  // ==========================================

  /**
   * Bulk insert (Used by the Autoloader)
   * Async because Web Crypto API hashing is asynchronous.
   */
  public async setAll(items: T[]): Promise<void> {
    let hasChanges = false;

    for (const item of items) {
      const newHash = await hashObject(item);
      const existingHash = this.checksums.get(item.id);

      // Only update if it's a new item or the data actually mutated
      if (newHash !== existingHash) {
        this.store.set(item.id, item);
        this.checksums.set(item.id, newHash);
        hasChanges = true;
      }
    }

    // Only force React to re-render if actual data changed!
    if (hasChanges) {
      this.notify();
    }
  }

  /**
   * Add or Update a single item (Optimistic UI updates)
   */
  public async upsert(item: T): Promise<void> {
    const newHash = await hashObject(item);
    const existingHash = this.checksums.get(item.id);

    if (newHash !== existingHash) {
      this.store.set(item.id, item);
      this.checksums.set(item.id, newHash);
      this.notify();
    }
  }

  /**
   * Remove a single item
   */
  public remove(id: string): void {
    if (this.store.delete(id)) {
      this.checksums.delete(id); // Clean up the hash too
      this.notify();
    }
  }

  public get(id: string): T | undefined {
    return this.store.get(id);
  }

  // ==========================================
  // DATA RETRIEVAL & MASKING
  // ==========================================

  /**
   * Returns the raw, unmasked data (For sending to API)
   */
  public getRawData(): T[] {
    return Array.from(this.store.values());
  }

  /**
   * Returns data with sensitive fields obscured (For the UI)
   * @param fieldsToMask Array of keys to hide (e.g., ['contactNumber', 'monthlyIncome'])
   */
  public getMaskedData(fieldsToMask: (keyof T)[]): Partial<T>[] {
    return Array.from(this.store.values()).map(item => {
      // Create a shallow copy so we don't accidentally mutate the master record
      const maskedItem: any = { ...item };

      fieldsToMask.forEach(field => {
        if (maskedItem[field] && typeof maskedItem[field] === 'string') {
          const str = maskedItem[field] as string;
          // Format: keep first 2 chars, mask middle, keep last 2 chars
          if (str.length > 4) {
             maskedItem[field] = str.slice(0, 2) + '*'.repeat(str.length - 4) + str.slice(-2);
          } else {
             maskedItem[field] = '***';
          }
        }
      });

      return maskedItem;
    });
  }
}

// Export the Singleton instances
export const residentMemoryStore = new MemoryManager<any>();
export const blotterMemoryStore = new MemoryManager<any>();
export const documentMemoryStore = new MemoryManager<any>();