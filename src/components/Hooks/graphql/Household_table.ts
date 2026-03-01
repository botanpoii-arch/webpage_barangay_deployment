import { FastCache } from './Algorithm'; // Your existing Algorithm
import { api } from '../Api';     // The Gatekeeper (Axios Instance)

// --- INTERFACES ---
export interface Resident {
  id: string; // Changed to string to match UUIDs from Supabase
  name: string;
  age: number;
  occupation: string;
  zone: string | number; // Flexible to handle DB data
}

export interface Household {
  id: string; // Changed to string (UUID)
  head_name: string; // Aligned with your DB Schema (was 'head')
  zone: number;
  members: number;
  is_4ps: boolean;
  is_indigent: boolean;
}

// --- ALGORITHM INTEGRATION ---
// Static caches persist as long as the app is running
const residentCache = new FastCache<Resident[]>(120000); // 2 minutes RAM Cache
const householdCache = new FastCache<Household[]>(120000);

export class Resident_table {
  
  /**
   * Fetches all residents with Algorithm-backed Caching.
   * Uses caching to reduce API calls.
   */
  static async getAllResidents(): Promise<Resident[]> {
    try {
      // 1. ALGORITHM: O(1) Cache Lookup
      const cached = residentCache.get('ALL_RESIDENTS');
      if (cached) {
        console.log("⚡ [ALGO] Serving Residents from FastCache");
        return cached; 
      }

      // 2. NETWORK: Fetch via Gatekeeper
      console.log("🌐 [NETWORK] Fetching Residents from API...");
      const response = await api.get<Resident[]>('/residents');
      const data = response.data;

      // 3. ALGORITHM: Cache the result
      residentCache.set('ALL_RESIDENTS', data);
      
      return data;
    } catch (error) {
      console.error("Resident Fetch Error:", error);
      return [];
    }
  }

  /**
   * Fetches households with Algorithm-backed Caching.
   */
  static async getAllHouseholds(): Promise<Household[]> {
    try {
      // 1. ALGORITHM: Check Cache
      const cached = householdCache.get('ALL_HOUSEHOLDS');
      if (cached) {
        console.log("⚡ [ALGO] Serving Households from FastCache");
        return cached;
      }

      // 2. NETWORK: Real API Call
      console.log("🌐 [NETWORK] Fetching Households from API...");
      const response = await api.get<Household[]>('/households');
      const data = response.data;

      // 3. ALGORITHM: Update Cache
      householdCache.set('ALL_HOUSEHOLDS', data);
      
      return data;
    } catch (error) {
      console.error("Household Fetch Error:", error);
      return [];
    }
  }

  /**
   * Creates a household and clears cache to force a fresh fetch next time.
   * Cache Invalidation Strategy.
   */
  static async createHousehold(newRecord: Omit<Household, 'id'>): Promise<boolean> {
    try {
      // 1. NETWORK: Send to Backend
      await api.post('/households', newRecord);

      // 2. ALGORITHM: Invalidate Caches (The "Zeroing" Effect)
      // We wipe the cache so the next 'getAll' call gets the new data from DB
      console.log("🧹 [ALGO] Invalidating Caches...");
      householdCache.clear();
      residentCache.clear();

      return true;
    } catch (error) {
      console.error("Create Error:", error);
      return false;
    }
  }
}